// Leitura (browser) dos dados GRID já ingeridos no Supabase.
// NÃO fala com a GRID — só lê as tabelas normalizadas e devolve as
// linhas; a agregação em KPIs fica na camada pura (kpis.js).
import { supabase } from '../supabase.js'
import { patchAtLeast } from './kpis.js'

// Mapeia a escolha de origem da UI para os series_type do banco.
export const ORIGIN_TYPES = {
  scrim: ['SCRIM'],
  championship: ['COMPETITIVE', 'ESPORTS'],
  both: ['SCRIM', 'COMPETITIVE', 'ESPORTS'],
}

// Data mínima fixa do produto: só partidas a partir de 03/07/2026
// (início das scrims registradas; os dados anteriores foram descartados).
// ⚠️ Esse piso vale só para SCRIM (o lixo do dia 02 era scrim). Dados de
// campeonato (pro play) são limpos e podem ser anteriores, então não aplicamos.
export const MIN_DATE = '2026-07-03T00:00:00Z'
const EARLY_DATE = '2020-01-01T00:00:00Z'
const isScrimOnly = (types) => Array.isArray(types) && types.length === 1 && types[0] === 'SCRIM'

// O PostgREST corta TODA resposta num teto de linhas (1000 por padrão) e não
// avisa: a query volta "ok" com os dados truncados. Como grid_game_players já
// passa disso, jogadores inteiros sumiam da agregação (e do combo de comparar).
// Por isso toda leitura aqui pagina explicitamente via .range() até o fim.
const PAGE = 1000

async function fetchPaged(build) {
  const out = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1)
    if (error) { console.error('[grid] paginação:', error.message); return out }
    out.push(...(data || []))
    if (!data || data.length < PAGE) return out
  }
}

// `teamId` = um time específico. `teamIds` = conjunto de times (usado pelo
// filtro de região, que vira uma lista de team_ids no DadosView). Uma lista
// VAZIA significa "nenhum time se encaixa" e devolve nada — diferente de
// undefined, que significa "sem restrição de time".
// `since`/`until` = intervalo de datas escolhido na UI ('YYYY-MM-DD'). O
// `until` vira o FIM do dia escolhido: quem digita 28/08 espera incluir os
// jogos de 28/08, não parar à meia-noite do dia 28.
async function readRows(table, { types, teamId, teamIds, since, until }) {
  const piso = since ? `${since}T00:00:00Z` : (isScrimOnly(types) ? MIN_DATE : EARLY_DATE)
  const teto = until ? `${until}T23:59:59Z` : null
  if (teamIds && teamIds.length === 0) return []
  return fetchPaged(() => {
    let q = supabase.from(table).select('*').gte('started_at', piso)
    if (teto) q = q.lte('started_at', teto)
    if (types?.length) q = q.in('series_type', types)
    if (teamId) q = q.eq('team_id', teamId)
    else if (teamIds) q = q.in('team_id', teamIds)
    // .range() precisa de ordem estável, senão as páginas podem repetir/pular.
    return q.order('id', { ascending: true })
  })
}

export const fetchTeamRows   = (opts) => readRows('grid_game_teams', opts)
export const fetchPlayerRows = (opts) => readRows('grid_game_players', opts)

// ── Pro play (Match History / Meta War Room) ───────────────────────
export async function fetchProGames({ league, patch } = {}) {
  return fetchPaged(() => {
    let q = supabase.from('grid_pro_games').select('*').order('start_time', { ascending: false }).order('id', { ascending: true })
    if (league) q = q.eq('league', league)
    if (patch) q = q.eq('patch', patch)
    return q
  })
}

// Ligas e patches distintos presentes (para os filtros).
export async function fetchProFacets() {
  const data = await fetchPaged(() => supabase.from('grid_pro_games').select('id, league, patch').order('id', { ascending: true }))
  const leagues = [...new Set(data.map((r) => r.league).filter(Boolean))].sort()
  const patches = [...new Set(data.map((r) => r.patch).filter(Boolean))].sort().reverse()
  return { leagues, patches }
}

// Lista de times presentes nos dados (para o filtro de time), enriquecida com
// liga/região de grid_teams quando disponível (ver scripts/gridTeams.mjs).
export async function fetchTeamsList() {
  const [rows, meta] = await Promise.all([
    fetchPaged(() => supabase.from('grid_game_teams').select('id, team_id, team_name').order('id', { ascending: true })),
    fetchTeamMeta(),
  ])
  const map = new Map()
  for (const r of rows) if (r.team_id && !map.has(r.team_id)) map.set(r.team_id, r.team_name)
  return [...map.entries()]
    .map(([id, name]) => ({ id, name, league: meta.get(id)?.league || null, region: meta.get(id)?.region || null }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

// Liga/região por team_id (tabela grid_teams). Map vazio se a tabela ainda não
// existir — o filtro de região some sozinho em vez de quebrar a tela.
export async function fetchTeamMeta() {
  const { data, error } = await supabase.from('grid_teams').select('team_id, league, region')
  if (error) { console.warn('[grid] teamMeta:', error.message); return new Map() }
  return new Map((data || []).map((r) => [r.team_id, { league: r.league, region: r.region }]))
}

// ═══════════════════════════════════════════════════════════════════
// BUILDS & RUNAS — só CAMPEONATO e do patch mínimo pra frente (mesmo
// recorte da Tierlist Meta). Build de scrim/soloq não representa decisão
// profissional, e patch velho distorce o meta atual.
// ═══════════════════════════════════════════════════════════════════
export const BUILDS_MIN_PATCH = [16, 13]

// series_id:game_seq → patch (o patch só existe em grid_pro_games).
// Cacheado por sessão: é o mesmo mapa pra qualquer campeão consultado.
let cachePatches = null
async function patchMap() {
  if (cachePatches) return cachePatches
  const rows = await fetchPaged(() => supabase.from('grid_pro_games').select('id, series_id, game_seq, patch').order('id', { ascending: true }))
  cachePatches = new Map(rows.map((g) => [`${g.series_id}:${g.game_seq}`, g.patch]))
  return cachePatches
}

// Campeões que já têm build registrada (alimenta o seletor da aba).
export async function fetchChampionsWithBuilds() {
  const [rows, patches] = await Promise.all([
    fetchPaged(() => supabase.from('grid_game_players')
      .select('id, champion, role, series_id, game_seq')
      .eq('series_type', 'ESPORTS').not('items', 'is', null).order('id', { ascending: true })),
    patchMap(),
  ])
  const m = new Map()
  for (const r of rows) {
    if (!r.champion) continue
    if (!patchAtLeast(patches.get(`${r.series_id}:${r.game_seq}`), BUILDS_MIN_PATCH)) continue
    const c = m.get(r.champion) || { champion: r.champion, games: 0, roles: {} }
    c.games++
    if (r.role) c.roles[r.role] = (c.roles[r.role] || 0) + 1
    m.set(r.champion, c)
  }
  return [...m.values()]
    .map((c) => ({ ...c, role: Object.entries(c.roles).sort((a, b) => b[1] - a[1])[0]?.[0] || null }))
    .sort((a, b) => b.games - a.games || a.champion.localeCompare(b.champion))
}

// Linhas de UM campeão + o oponente de lane de cada jogo (para os matchups).
// O oponente é o jogador do OUTRO time com a MESMA role no mesmo jogo. A role
// vem da detecção por posição na timeline (extractLanes); em jogo sem timeline
// ela falta, e aí o matchup fica sem par — contabilizado como null, não como
// um matchup errado.
export async function fetchBuildData({ champion, role = null, patch = null } = {}) {
  const vazio = { rows: [], matchups: [], patches: [] }
  if (!champion) return vazio

  const [minhas, patches] = await Promise.all([
    fetchPaged(() => supabase.from('grid_game_players').select('*')
      .eq('series_type', 'ESPORTS').eq('champion', champion)
      .not('items', 'is', null).order('id', { ascending: true })),
    patchMap(),
  ])
  const patchDe = (r) => patches.get(`${r.series_id}:${r.game_seq}`)
  const rows = minhas.filter((r) => {
    const p = patchDe(r)
    if (!patchAtLeast(p, BUILDS_MIN_PATCH)) return false
    if (patch && p !== patch) return false
    if (role && r.role !== role) return false
    return true
  })
  if (!rows.length) return vazio

  // Oponentes de lane: uma leitura só, cobrindo todas as séries envolvidas.
  const seriesIds = [...new Set(rows.map((r) => r.series_id))]
  const todas = await fetchPaged(() => supabase.from('grid_game_players')
    .select('id, series_id, game_seq, team_id, role, champion')
    .in('series_id', seriesIds).order('id', { ascending: true }))
  const porJogo = new Map()
  for (const r of todas) {
    const k = `${r.series_id}:${r.game_seq}`
    if (!porJogo.has(k)) porJogo.set(k, [])
    porJogo.get(k).push(r)
  }
  const matchups = rows.map((r) => ({
    row: r,
    oponente: (porJogo.get(`${r.series_id}:${r.game_seq}`) || [])
      .find((x) => x.team_id !== r.team_id && x.role && x.role === r.role)?.champion || null,
  }))

  const disponiveis = [...new Set(minhas.map(patchDe).filter((p) => patchAtLeast(p, BUILDS_MIN_PATCH)))]
  return { rows, matchups, patches: disponiveis.sort().reverse() }
}
