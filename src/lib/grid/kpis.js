// ═══════════════════════════════════════════════════════════════════
// Camada de KPIs (PURA — sem I/O, sem rede, sem Supabase).
// Recebe o estado bruto de jogos da GRID (series-state) e produz:
//   1. normalizeGame()  → linhas normalizadas por time e por jogador.
//   2. aggregate*()     → KPIs agregados a partir dessas linhas.
//
// Tudo aqui é testável isoladamente (ver kpis.test.js). As fórmulas de
// cada KPI derivado estão documentadas em comentário, como pedido.
//
// ⚠️ FASE 1: só usa o series-state (estado final do jogo). KPIs que
// dependem da timeline da Riot (@15min, dano, vision score, wards
// colocadas) NÃO são calculados aqui — ficam para a Fase 2 (File Download).
// ═══════════════════════════════════════════════════════════════════

// Unidades que contam como CS (creep score) em LoL. `ward` NÃO é CS —
// mas guardamos separado porque "wards clearadas" é um KPI de visão.
const CS_UNITS = new Set(['minion', 'neutralMinion'])
const WARD_UNIT = 'ward'

// ── Sanidade de jogo (descarta remakes e capturas quebradas) ────────
// A GRID às vezes entrega jogos com clock bugado (60–90+ min com ~0 kills)
// ou roster incompleto. Só contam jogos que TERMINARAM (nexus ou FF),
// com duração plausível e os dois times com o time completo.
const MIN_GAME_SEC = 300      // < 5 min → remake / não terminou
const MAX_GAME_SEC = 3600     // > 60 min → captura quebrada (clock não resetou)
const PLAYERS_PER_TEAM = 5    // LoL 5v5; menos que isso = captura parcial

// ── Duração ISO-8601 → segundos ─────────────────────────────────────
// A GRID entrega a duração do jogo como ISO-8601 (ex.: "PT36M25.013S").
export function parseIsoDurationSec(iso) {
  if (typeof iso !== 'string') return 0
  const m = iso.match(/^PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?$/)
  if (!m) return 0
  const [, h, min, s] = m
  return (Number(h || 0) * 3600) + (Number(min || 0) * 60) + Number(s || 0)
}

// ── Soma de unitKills por classe ────────────────────────────────────
function sumUnits(unitKills, predicate) {
  if (!Array.isArray(unitKills)) return 0
  return unitKills.reduce((acc, u) => acc + (predicate(u.unitName) ? (u.count || 0) : 0), 0)
}
const csOf   = (uk) => sumUnits(uk, (n) => CS_UNITS.has(n))
const wardsClearedOf = (uk) => sumUnits(uk, (n) => n === WARD_UNIT)

// ── Objetivos (strings reais validadas na API da GRID) ──────────────
// Ex.: slayDragon (total de dragões), slayRiftHerald, slayBaron,
// destroyTower, destroyTurretPlate{Top,Mid,Bot}{1,2,3}.
// Voidgrubs: string ainda não confirmada num jogo com grubs — o matcher
// é tolerante (grub/voidmite/horde) e deve ser revisado quando aparecer.
function objCount(objectives, type) {
  const o = (objectives || []).find((x) => x.type === type)
  return o ? (o.completionCount || 0) : 0
}
function objFirst(objectives, type) {
  const o = (objectives || []).find((x) => x.type === type)
  return o ? !!o.completedFirst : false
}
function platesInLane(objectives, lane) {
  // Soma destroyTurretPlate<Lane>1..3 (a torre externa tem até 5 plates,
  // mas a GRID separa por posição de torre 1/2/3; somamos todas da lane).
  const re = new RegExp(`^destroyTurretPlate${lane}\\d+$`)
  return (objectives || []).reduce((acc, o) => acc + (re.test(o.type) ? (o.completionCount || 0) : 0), 0)
}
function voidgrubs(objectives) {
  return (objectives || []).reduce(
    (acc, o) => acc + (/grub|voidmite|horde/i.test(o.type) ? (o.completionCount || 0) : 0), 0,
  )
}

// Override manual de identidade de time — por ELENCO, não por team_id.
// Times adversários sem branding configurado na GRID aparecem com nome
// genérico ("LOL-1", "LOL-2"...) e a GRID pode REAPROVEITAR o mesmo team_id
// numérico pra ORGANIZAÇÕES DIFERENTES em dias diferentes. Por isso não dá pra
// confiar no team_id sozinho: identificamos o time pela ASSINATURA DO ELENCO
// (ids dos 5 jogadores) e mapeamos pra um id canônico FIXO por organização.
// Maioria do elenco (3/5) já basta pra bater, tolerando a troca pontual de 1-2
// jogadores.
//
// A lista fica vazia neste repositório. Exemplo de entrada:
//   { canonicalId: 'roster:exemplo', name: 'Exemplo', playerIds: ['1', '2', '3', '4', '5'] }
export const ROSTER_OVERRIDES = []
function applyTeamOverride(t) {
  const ids = new Set((t.players || []).map((p) => p.id))
  for (const ov of ROSTER_OVERRIDES) {
    const matches = ov.playerIds.filter((id) => ids.has(id)).length
    if (matches >= 3) return { ...t, id: ov.canonicalId, name: ov.name }
  }
  return t
}

// Contas reserva/smurf que são a MESMA pessoa de um jogador canônico
// (player_id da conta reserva → player_id canônico). Os KPIs de jogador são
// agrupados por player_id, então remapear aqui funde os dados das duas contas
// num só jogador. O NOME certo vem depois, pelo id canônico.
//
// A tabela fica vazia neste repositório. Exemplo: { '123': '456' } faz os jogos
// jogados pela conta 123 contarem para o jogador 456.
export const PLAYER_ID_ALIASES = {}
export const canonPlayerId = (id) => PLAYER_ID_ALIASES[id] || id

// ═══════════════════════════════════════════════════════════════════
// normalizeGame — transforma UM jogo do series-state em linhas planas.
// `meta` = { seriesId, gameSeq, seriesType, titleId, startedAt }.
// Retorna { teams: [...], players: [...] } ou null se o jogo não tem
// dados válidos (a GRID não capturou stats — gold total 0, sem duração).
// ═══════════════════════════════════════════════════════════════════
export function normalizeGame(meta, game) {
  if (!game || !Array.isArray(game.teams) || game.teams.length < 2) return null
  // 1. Só jogos que terminaram de verdade (nexus destruído ou FF). Remakes
  //    e jogos em andamento têm finished=false → fora.
  if (game.finished !== true) return null
  // 2. Duração plausível: descarta remake (<5min) e captura quebrada (>60min).
  const durationSec = parseIsoDurationSec(game.duration)
  if (durationSec < MIN_GAME_SEC || durationSec > MAX_GAME_SEC) return null

  const [a, b] = game.teams.map(applyTeamOverride)
  const opp = (t) => (t === a ? b : a)

  // Um time só é CONTABILIZADO quando foi totalmente capturado (5 jogadores +
  // ouro). Isso mantém a MESMA contagem de jogos para todos os jogadores de um
  // mesmo time, sem descartar o jogo inteiro se o ADVERSÁRIO veio incompleto
  // (ex.: 5x4 — a GRID às vezes não itemiza 1 jogador do outro lado).
  const teamComplete = (t) => Array.isArray(t.players)
    && t.players.length === PLAYERS_PER_TEAM
    && (t.netWorth || 0) > 0

  const teamRow = (t) => {
    const o = opp(t)
    return {
      id: `${meta.seriesId}:${meta.gameSeq}:${t.id}`,
      series_id: meta.seriesId, game_seq: meta.gameSeq,
      series_type: meta.seriesType, title_id: meta.titleId,
      started_at: meta.startedAt, duration_sec: Math.round(durationSec),
      team_id: t.id, team_name: t.name, side: t.side, won: !!t.won,
      opponent_team_id: o.id, opponent_team_name: o.name,
      // assists = killAssistsGiven (assists DADOS = "assists" do placar).
      // killAssistsReceived seria assists RECEBIDOS nos próprios abates (errado).
      kills: t.kills || 0, deaths: t.deaths || 0, assists: t.killAssistsGiven || 0,
      gold: t.netWorth || 0, cs: csOf(t.unitKills),
      towers: t.structuresDestroyed || 0,
      first_tower: objFirst(t.objectives, 'destroyTower'),
      first_blood: !!t.firstKill,
      dragons: objCount(t.objectives, 'slayDragon'),
      first_dragon: objFirst(t.objectives, 'slayDragon'),
      heralds: objCount(t.objectives, 'slayRiftHerald'),
      barons: objCount(t.objectives, 'slayBaron'),
      grubs: voidgrubs(t.objectives),
      plates_top: platesInLane(t.objectives, 'Top'),
      plates_mid: platesInLane(t.objectives, 'Mid'),
      plates_bot: platesInLane(t.objectives, 'Bot'),
      wards_cleared: wardsClearedOf(t.unitKills),
      // Espelho do oponente (facilita diffs sem join):
      opp_gold: o.netWorth || 0, opp_kills: o.kills || 0,
      opp_towers: o.structuresDestroyed || 0, opp_cs: csOf(o.unitKills),
    }
  }

  const playerRow = (t, p) => {
    const o = opp(t)
    const teamKills = t.kills || 0
    const teamGold = t.netWorth || 0
    const pid = canonPlayerId(p.id) // funde conta reserva no jogador canônico
    return {
        id: `${meta.seriesId}:${meta.gameSeq}:${pid}`,
        series_id: meta.seriesId, game_seq: meta.gameSeq,
        series_type: meta.seriesType, title_id: meta.titleId,
        started_at: meta.startedAt, duration_sec: Math.round(durationSec),
        team_id: t.id, team_name: t.name, side: t.side, won: !!t.won,
        opponent_team_id: o.id, opponent_team_name: o.name,
        player_id: pid, player_name: p.name,
        champion: p.character ? p.character.name : null,
        role: null, // series-state não traz role; enriquecer na Fase 2
        kills: p.kills || 0, deaths: p.deaths || 0, assists: p.killAssistsGiven || 0,
        gold: p.netWorth || 0, cs: csOf(p.unitKills),
      first_blood: !!p.firstKill,
      team_kills: teamKills, team_gold: teamGold,
    }
  }

  const teams = []
  const players = []
  for (const t of [a, b]) {
    if (!teamComplete(t)) continue // pula o time capturado parcialmente
    teams.push(teamRow(t))
    for (const p of t.players) players.push(playerRow(t, p))
  }
  if (teams.length === 0) return null // nenhum time completo → jogo inútil
  return { teams, players }
}

// ═══════════════════════════════════════════════════════════════════
// FASE 2A — enriquece as linhas com stats do arquivo Match-V5 da Riot
// (dano, vision score, wards). Casa por lado (blue=100/red=200) + nome de
// campeão normalizado, com fallback por eliminação (cada time tem 5 campeões
// únicos, então sobras são pareadas 1:1).
// ═══════════════════════════════════════════════════════════════════
const CHAMP_ALIASES = { monkeyking: 'wukong' } // nome interno Riot ↔ display
function normChamp(name = '') {
  const n = name.toLowerCase().replace(/[^a-z0-9]/g, '')
  return CHAMP_ALIASES[n] || n
}
const ctrlWards = (p) => (p.detectorWardsPlaced ?? p.visionWardsBoughtInGame ?? 0)

// ── Build final e página de runas (Match-V5) ────────────────────────
// Estes campos já vinham no arquivo que a ingestão baixa; eram descartados.
// `item0..item6` inclui o trinket no slot 6 e usa 0 para slot vazio — o 0 é
// removido aqui pra não virar "item" na agregação.
export const itemsOf = (p) => {
  const l = [0, 1, 2, 3, 4, 5, 6].map((i) => p[`item${i}`]).filter((x) => Number.isFinite(x) && x > 0)
  return l.length ? l : null
}

// A Riot entrega as runas aninhadas em styles[].selections[]: o primeiro
// estilo é a árvore primária (e sua 1ª seleção é o KEYSTONE) e o segundo é a
// secundária. Achatamos para uma lista simples, mantendo a ordem de escolha.
export function perksOf(p) {
  const styles = p?.perks?.styles
  if (!Array.isArray(styles) || !styles.length) return null
  const primary = styles.find((s) => s.description === 'primaryStyle') || styles[0]
  const sub = styles.find((s) => s.description === 'subStyle') || styles[1]
  const sel = (s) => (s?.selections || []).map((x) => x.perk).filter(Number.isFinite)
  const todas = [...sel(primary), ...sel(sub)]
  if (!todas.length) return null
  return {
    keystone: sel(primary)[0] ?? null,
    primary: primary?.style ?? null,
    sub: sub?.style ?? null,
    perks: todas,
    statPerks: p.perks.statPerks || null,
  }
}

// Casa os player rows de um lado com os participantes do match file.
function matchSide(playerRows, participants) {
  const parts = [...participants]
  const pairs = new Map()
  // 1ª passada: por nome de campeão normalizado.
  for (const pr of playerRows) {
    const i = parts.findIndex((mp) => normChamp(mp.championName) === normChamp(pr.champion || ''))
    if (i >= 0) { pairs.set(pr, parts[i]); parts.splice(i, 1) }
  }
  // 2ª passada: sobras pareadas por eliminação (mantém a ordem restante).
  const leftovers = playerRows.filter((pr) => !pairs.has(pr))
  leftovers.forEach((pr, idx) => { if (parts[idx]) pairs.set(pr, parts[idx]) })
  return pairs
}

export function mergeMatchStats(norm, match) {
  if (!norm || !match || !Array.isArray(match.participants)) return norm
  const byTeam = { 100: [], 200: [] }
  for (const p of match.participants) (byTeam[p.teamId] || (byTeam[p.teamId] = [])).push(p)
  const sideTid = (side) => (side === 'blue' ? 100 : 200)

  const teamAgg = (tid) => {
    const ps = byTeam[tid] || []
    return {
      damage: ps.reduce((a, x) => a + (x.totalDamageDealtToChampions || 0), 0),
      vision: ps.reduce((a, x) => a + (x.visionScore || 0), 0),
      wardsPlaced: ps.reduce((a, x) => a + (x.wardsPlaced || 0), 0),
      wardsKilled: ps.reduce((a, x) => a + (x.wardsKilled || 0), 0),
      controlWards: ps.reduce((a, x) => a + ctrlWards(x), 0),
    }
  }
  const agg = { 100: teamAgg(100), 200: teamAgg(200) }

  // players
  const bySide = { blue: [], red: [] }
  for (const pr of norm.players) bySide[pr.side]?.push(pr)
  for (const side of ['blue', 'red']) {
    const tid = sideTid(side)
    const pairs = matchSide(bySide[side], byTeam[tid] || [])
    for (const pr of bySide[side]) {
      const mp = pairs.get(pr)
      pr.participant_id = mp ? mp.participantId : null // p/ linkar com o timeline (Fase 2B)
      pr.damage = mp ? (mp.totalDamageDealtToChampions || 0) : null
      pr.vision_score = mp ? (mp.visionScore || 0) : null
      pr.wards_placed = mp ? (mp.wardsPlaced || 0) : null
      pr.wards_killed = mp ? (mp.wardsKilled || 0) : null
      pr.control_wards = mp ? ctrlWards(mp) : null
      pr.team_damage = agg[tid].damage
      // Build final + runas (aba Builds & Runas).
      pr.items = mp ? itemsOf(mp) : null
      const rp = mp ? perksOf(mp) : null
      pr.keystone = rp?.keystone ?? null
      pr.perk_primary = rp?.primary ?? null
      pr.perk_sub = rp?.sub ?? null
      pr.perks = rp?.perks ?? null
      pr.stat_perks = rp?.statPerks ?? null
    }
  }
  // teams
  for (const tr of norm.teams) {
    const tid = sideTid(tr.side)
    const otid = tid === 100 ? 200 : 100
    tr.damage = agg[tid].damage
    tr.vision_score = agg[tid].vision
    tr.wards_placed = agg[tid].wardsPlaced
    tr.wards_killed = agg[tid].wardsKilled
    tr.control_wards = agg[tid].controlWards
    tr.opp_wards_placed = agg[otid].wardsPlaced
  }
  return norm
}

// ═══════════════════════════════════════════════════════════════════
// FASE 2B — @15min a partir do timeline Match-V5 da Riot (arquivo "details").
// Frames de 60s: usa o frame mais próximo de 15:00. Time = participantId
// 1–5 (blue/100) e 6–10 (red/200). Diffs de TIME são confiáveis (somas por
// lado, sem depender de role). Diffs de JOGADOR pareiam por índice de lane
// (1↔6, 2↔7, …), o que assume ordem de draft por role — aproximação, já que
// a Riot não entrega role confiável em scrim.
// ═══════════════════════════════════════════════════════════════════
const T15 = 900000
const pidTeam = (pid) => (pid <= 5 ? 100 : 200)
const oppPid = (pid) => (pid <= 5 ? pid + 5 : pid - 5)

export function extractTimeline15(timeline) {
  if (!timeline || !Array.isArray(timeline.frames) || !timeline.frames.length) return null
  const frame = timeline.frames.reduce((best, f) => (Math.abs(f.timestamp - T15) < Math.abs(best.timestamp - T15) ? f : best))
  const byPid = {}
  const teamGold = { 100: 0, 200: 0 }, teamCs = { 100: 0, 200: 0 }
  for (const pid of Object.keys(frame.participantFrames)) {
    const pf = frame.participantFrames[pid]
    const cs = (pf.minionsKilled || 0) + (pf.jungleMinionsKilled || 0)
    byPid[pid] = { gold: pf.totalGold || 0, cs, xp: pf.xp || 0 }
    teamGold[pidTeam(+pid)] += pf.totalGold || 0
    teamCs[pidTeam(+pid)] += cs
  }
  const towers = { 100: 0, 200: 0 }, dragons = { 100: 0, 200: 0 }
  let fbVictim = null
  for (const f of timeline.frames) {
    for (const e of (f.events || [])) {
      if (e.timestamp > T15) continue
      if (e.type === 'BUILDING_KILL' && e.buildingType === 'TOWER_BUILDING' && e.killerId) towers[pidTeam(e.killerId)]++
      if (e.type === 'ELITE_MONSTER_KILL' && e.monsterType === 'DRAGON' && e.killerTeamId) dragons[e.killerTeamId]++
      if (e.type === 'CHAMPION_KILL' && fbVictim === null && e.victimId) fbVictim = e.victimId
    }
  }
  return { byPid, teamGold, teamCs, towers, dragons, fbVictim }
}

// ═══════════════════════════════════════════════════════════════════
// ORDEM DE COMPRA (aba Builds & Runas) — dos eventos ITEM_PURCHASED da
// timeline. O build final (item0..item6) diz o QUE foi comprado, mas não a
// ORDEM: é ela que separa "1º item" de "3º item", que é como o jogador
// realmente decide.
//
// ITEM_UNDO precisa ser tratado: o jogador compra e desfaz na fonte o tempo
// todo (testar preço, comprar errado). Sem isso, itens que nunca existiram
// entrariam na build. O evento traz `beforeId` (o que foi desfeito), então
// removemos a última compra correspondente daquele jogador.
// ═══════════════════════════════════════════════════════════════════
export function extractBuildOrders(timeline) {
  if (!timeline || !Array.isArray(timeline.frames)) return null
  const porPid = {}
  for (const f of timeline.frames) {
    for (const e of (f.events || [])) {
      const pid = e.participantId
      if (!pid) continue
      if (e.type === 'ITEM_PURCHASED' && Number.isFinite(e.itemId)) {
        (porPid[pid] ||= []).push({ id: e.itemId, t: Math.round((e.timestamp || 0) / 60000) })
      } else if (e.type === 'ITEM_UNDO') {
        const l = porPid[pid]
        if (!l?.length) continue
        const alvo = e.beforeId || e.afterId
        const i = alvo ? l.map((x) => x.id).lastIndexOf(alvo) : l.length - 1
        if (i >= 0) l.splice(i, 1)
      }
    }
  }
  return Object.keys(porPid).length ? porPid : null
}

// Injeta a ordem de compra nas linhas de jogador (precisa do participant_id,
// setado no mergeMatchStats). Sem timeline, o campo fica null.
export function mergeBuildOrder(norm, timeline) {
  if (!norm) return norm
  const porPid = extractBuildOrders(timeline)
  if (!porPid) return norm
  for (const pr of norm.players) {
    if (pr.participant_id == null) continue
    pr.build_order = porPid[pr.participant_id] || null
  }
  return norm
}

// ── JG Heatmap: caminho do jungler por time (posições x,y por minuto) ──
// Jungler = participante com mais jungleMinionsKilled (por lado) no frame ~15.
// Coords da Riot: x,y em [0..~15000], origem no canto inferior-esquerdo.
// Coleta até o minuto 20 (janelas 0-2 / 2-10 / 10-20 são filtradas na UI).
const T20 = 1200000
export function extractJunglePaths(timeline) {
  if (!timeline || !Array.isArray(timeline.frames) || !timeline.frames.length) return null
  const f15 = timeline.frames.reduce((b, f) => (Math.abs(f.timestamp - T15) < Math.abs(b.timestamp - T15) ? f : b))
  const jgByTeam = { 100: null, 200: null }
  for (const side of [100, 200]) {
    let best = null, bestCs = -1
    for (const pid of Object.keys(f15.participantFrames)) {
      if (pidTeam(+pid) !== side) continue
      const jcs = f15.participantFrames[pid].jungleMinionsKilled || 0
      if (jcs > bestCs) { bestCs = jcs; best = +pid }
    }
    jgByTeam[side] = best
  }
  const paths = { 100: [], 200: [] }
  for (const f of timeline.frames) {
    if (f.timestamp > T20) break
    const min = Math.round(f.timestamp / 60000)
    for (const side of [100, 200]) {
      const pid = jgByTeam[side]
      const pf = pid && f.participantFrames[pid]
      if (pf && pf.position) paths[side].push({ t: min, x: pf.position.x, y: pf.position.y })
    }
  }
  return { jgByTeam, paths }
}

// ── Lane detection (matchups do pro): infere a lane de cada participante
// pela POSIÇÃO no início de jogo na timeline. A Riot NÃO entrega role
// confiável em jogos de torneio (teamPosition vem embaralhado/AFK), então
// derivamos da geometria do mapa (origem no canto inferior-esquerdo, base azul):
//   • mid corre na diagonal (x≈y);
//   • top no corredor superior-esquerdo (y > x → diff = y−x positivo);
//   • bot no inferior-direito (x > y → diff negativo).
// Jungler = quem tem mais jungleMinionsKilled. Na dupla bot, ADC = mais CS,
// Suporte = menos. Retorna { [participantId]: 'Top'|'Jng'|'Mid'|'Bot'|'Sup' }
// ou null se faltar dado (jogo sem timeline/posições → role fica indefinida).
const T_LANE_POS = 120000 // ~2min: lanes já formadas, antes das rotações
const T_LANE_CS = 600000  // ~10min: separa ADC (mais CS) do Suporte
export function extractLanes(timeline) {
  if (!timeline || !Array.isArray(timeline.frames) || !timeline.frames.length) return null
  const nearest = (t) => timeline.frames.reduce((b, f) => (Math.abs(f.timestamp - t) < Math.abs(b.timestamp - t) ? f : b))
  const fPos = nearest(T_LANE_POS)
  const fCs = nearest(T_LANE_CS)
  if (!fPos?.participantFrames || !fCs?.participantFrames) return null
  const out = {}
  for (const side of [100, 200]) {
    const pids = (side === 100 ? [1, 2, 3, 4, 5] : [6, 7, 8, 9, 10]).map(String)
    // Jungler = mais jungleMinionsKilled (no frame ~10min).
    let jg = null, jgMax = -1
    for (const pid of pids) {
      const j = fCs.participantFrames[pid]?.jungleMinionsKilled || 0
      if (j > jgMax) { jgMax = j; jg = pid }
    }
    if (!jg) return null
    out[jg] = 'Jng'
    // Suporte = MENOR CS entre os 4 restantes (o suporte quase não farma — é o
    // sinal mais confiável, bem melhor que posição pra separar a dupla bot).
    const others = pids.filter((p) => p !== jg)
    let sup = null, supMin = Infinity
    for (const pid of others) {
      const pf = fCs.participantFrames[pid]
      const cs = pf ? (pf.minionsKilled || 0) : Infinity
      if (cs < supMin) { supMin = cs; sup = pid }
    }
    out[sup] = 'Sup'
    // Os 3 restantes (top/mid/bot) pela posição no início (diff = y − x):
    // maior = top (superior-esq), menor = bot (inferior-dir), meio = mid.
    const rest = others.filter((p) => p !== sup).map((pid) => {
      const pf = fPos.participantFrames[pid]
      return pf?.position ? { pid, diff: pf.position.y - pf.position.x } : null
    })
    if (rest.some((x) => x == null)) return null
    rest.sort((a, b) => b.diff - a.diff)
    out[rest[0].pid] = 'Top'
    out[rest[1].pid] = 'Mid'
    out[rest[2].pid] = 'Bot'
  }
  return out
}

// ── Wards (Vision Radar): classifica por cor e agrupa por lado ──────
// LiveStats wardType: control = rosa (pink); yellowTrinket/sight/blueTrinket
// = amarela (visão normal); unknown = descartado (ruído/duplicado no min 0).
// `placer` (participantId 1-10) define o lado (1-5 blue / 6-10 red).
const PINK_WARDS = new Set(['control'])
const YELLOW_WARDS = new Set(['yellowTrinket', 'sight', 'blueTrinket'])
export function classifyWards(rawWards) {
  const out = { blue: [], red: [] }
  for (const w of (rawWards || [])) {
    const kind = PINK_WARDS.has(w.type) ? 'pink' : (YELLOW_WARDS.has(w.type) ? 'yellow' : null)
    if (!kind) continue
    if (!w.placer || w.placer < 1 || w.placer > 10) continue
    const side = w.placer <= 5 ? 'blue' : 'red'
    out[side].push({ t: w.t, x: w.x, y: w.y, kind })
  }
  return out
}

// ═══════════════════════════════════════════════════════════════════
// PRO PLAY (Fase 3.3) — extrai draft + resultado + objetivos de um jogo
// de campeonato (series-state, sem arquivos pesados). Base do Match
// History e do Meta War Room.
// ═══════════════════════════════════════════════════════════════════
// patch "16.13" >= mínimo [16,12] ?
export function patchAtLeast(patch, min = [16, 12]) {
  if (!patch) return false
  const [a, b] = String(patch).split('.').map(Number)
  if (Number.isNaN(a) || Number.isNaN(b)) return false
  return a > min[0] || (a === min[0] && b >= min[1])
}

// Liga a partir do nome do torneio: "LCK - Split 2 2026 (...)" → "LCK".
export function parseLeague(name = '') {
  // Siglas para torneios cujo nome oficial na GRID é longo demais pro filtro
  // ("Esports World Cup - 2026 (Playoffs)" → "EWC").
  if (/esports world cup/i.test(name)) return 'EWC'
  const cut = name.split(/ - | Split| Summer| Spring| Season| \d{4}/)[0]
  return (cut || name).trim()
}

export function buildProGame(meta, game) {
  if (!game || game.finished !== true || !Array.isArray(game.teams) || game.teams.length < 2) return null
  const blue = game.teams.find((t) => t.side === 'blue')
  const red = game.teams.find((t) => t.side === 'red')
  if (!blue || !red) return null
  const draft = game.draftActions || []
  if (draft.length < 20) return null // draft incompleto (não capturado)

  // Ordena pela sequência real do draft (o first pick NÃO é sempre o blue side:
  // o lado com a 1ª ação de PICK é quem tem first pick — varia por jogo).
  const ordered = [...draft].sort((a, b) => Number(a.sequenceNumber) - Number(b.sequenceNumber))
  const picks = { blue: [], red: [] }, bans = { blue: [], red: [] }
  let firstPick = null
  for (const a of ordered) {
    const side = a.drafter?.id === blue.id ? 'blue' : (a.drafter?.id === red.id ? 'red' : null)
    if (!side || !a.draftable?.name) continue
    if (a.type === 'pick' && !firstPick) firstPick = side
    ;(a.type === 'ban' ? bans : picks)[side].push(a.draftable.name)
  }
  if (picks.blue.length !== 5 || picks.red.length !== 5) return null

  const obj = (t) => ({
    dragons: objCount(t.objectives, 'slayDragon'),
    barons: objCount(t.objectives, 'slayBaron'),
    heralds: objCount(t.objectives, 'slayRiftHerald'),
    grubs: voidgrubs(t.objectives),
    towers: t.structuresDestroyed || 0,
    firstDragon: objFirst(t.objectives, 'slayDragon'),
    firstTower: objFirst(t.objectives, 'destroyTower'),
    firstBaron: objFirst(t.objectives, 'slayBaron'),
    firstBlood: !!t.firstKill,
  })

  return {
    id: `${meta.seriesId}:${meta.gameSeq}`,
    series_id: meta.seriesId, game_seq: meta.gameSeq,
    start_time: meta.startTime, patch: game.titleVersion?.name || null,
    league: parseLeague(meta.tournamentName || ''), tournament_name: meta.tournamentName || null,
    blue_team: blue.name, red_team: red.name,
    winner: blue.won ? 'blue' : (red.won ? 'red' : null),
    first_pick: firstPick,
    blue_picks: picks.blue, blue_bans: bans.blue,
    red_picks: picks.red, red_bans: bans.red,
    blue_obj: obj(blue), red_obj: obj(red),
  }
}

// Injeta os @15 nas linhas normalizadas (precisa do participant_id, setado
// no mergeMatchStats). Sem timeline, deixa os campos null.
export function mergeTimelineStats(norm, timeline) {
  if (!norm) return norm
  const t = extractTimeline15(timeline)
  if (!t) return norm
  for (const pr of norm.players) {
    const pid = pr.participant_id
    if (!pid || !t.byPid[pid]) continue
    const me = t.byPid[pid], op = t.byPid[oppPid(pid)]
    pr.gold15 = me.gold; pr.cs15 = me.cs; pr.xp15 = me.xp
    pr.gold15_diff = op ? me.gold - op.gold : null
    pr.cs15_diff = op ? me.cs - op.cs : null
    pr.xp15_diff = op ? me.xp - op.xp : null
    pr.first_blood_victim = t.fbVictim != null && Number(pid) === Number(t.fbVictim)
  }
  for (const tr of norm.teams) {
    const tid = tr.side === 'blue' ? 100 : 200
    const otid = tid === 100 ? 200 : 100
    tr.gold15_diff = t.teamGold[tid] - t.teamGold[otid]
    tr.cs15_diff = t.teamCs[tid] - t.teamCs[otid]
    tr.tower15_diff = t.towers[tid] - t.towers[otid]
    tr.dragons15 = t.dragons[tid]
    tr.ahead15 = (t.teamGold[tid] - t.teamGold[otid]) > 0
  }
  return norm
}

// ── helpers de agregação ────────────────────────────────────────────
const sum = (rows, f) => rows.reduce((a, r) => a + (f(r) || 0), 0)
const share = (rows, f) => (rows.length ? rows.filter(f).length / rows.length : 0)
const div = (n, d) => (d ? n / d : 0)
const perMin = (total, sec) => (sec ? total / (sec / 60) : 0)
// Média/proporção ignorando valores ausentes (jogos sem timeline = null).
const avgDef = (rows, f) => { const v = rows.map(f).filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null }
const shareDef = (rows, f) => { const v = rows.map(f).filter((x) => x != null); return v.length ? v.filter(Boolean).length / v.length : null }

// ═══════════════════════════════════════════════════════════════════
// aggregatePlayers — agrupa linhas de jogador por player_id e calcula
// os KPIs de jogador da Fase 1.
// ═══════════════════════════════════════════════════════════════════
export function aggregatePlayers(rows) {
  const byPlayer = new Map()
  for (const r of rows) {
    if (!byPlayer.has(r.player_id)) byPlayer.set(r.player_id, [])
    byPlayer.get(r.player_id).push(r)
  }
  const out = []
  for (const [playerId, gs] of byPlayer) {
    const games = gs.length
    // Jogos COM estatística. Um backfill sem stats de jogador (ex.: .rofl com
    // statsJson vazio) entra só pra CONTAR o jogo e o campeão jogado, mas não
    // pode diluir médias de KDA/CS/gold (não tem esses números). Detectamos
    // pela ausência de `kills` (linhas reais sempre têm ao menos 0).
    const st = gs.filter((r) => r.kills != null)
    const sg = st.length
    const K = sum(st, (r) => r.kills), D = sum(st, (r) => r.deaths), A = sum(st, (r) => r.assists)
    const sec = sum(st, (r) => r.duration_sec)
    const gold = sum(st, (r) => r.gold), cs = sum(st, (r) => r.cs)
    const teamKills = sum(st, (r) => r.team_kills), teamGold = sum(st, (r) => r.team_gold)
    // campeões mais jogados (contagem) — considera TODOS os jogos (com ou sem
    // stats), pra o pool refletir o que o jogador realmente pegou.
    const champs = {}
    for (const r of gs) if (r.champion) champs[r.champion] = (champs[r.champion] || 0) + 1
    out.push({
      playerId,
      name: gs[0].player_name,
      teamName: gs[0].team_name,
      games,
      champions: champs,
      kda: div(K + A, Math.max(D, 1)),        // (K+A)/max(D,1)
      kills: div(K, sg), deaths: div(D, sg), assists: div(A, sg), // por jogo COM stats
      csPerMin: perMin(cs, sec),               // ΣCS / Σmin
      goldPerMin: perMin(gold, sec),           // Σgold / Σmin
      goldShare: div(gold, teamGold),          // Σgold / Σgold_do_time
      killParticipation: div(K + A, teamKills),// Σ(K+A) / Σkills_do_time
      kaPerMin: perMin(K + A, sec),            // Σ(K+A) / Σmin
      firstBloodPct: shareDef(gs, (r) => r.first_blood), // % de jogos com 1º abate (ignora jogos sem esse dado)
      // ── Fase 2A (Match-V5 da Riot) ──
      damagePerMin: perMin(sum(st, (r) => r.damage), sec),          // Σdano / Σmin
      damageShare: div(sum(st, (r) => r.damage), sum(st, (r) => r.team_damage)), // Σdano / Σdano_do_time
      visionPerMin: perMin(sum(st, (r) => r.vision_score), sec),    // Σvision / Σmin
      wardsPerMin: perMin(sum(st, (r) => r.wards_placed), sec),     // Σwards colocadas / Σmin
      controlWardsPerMin: perMin(sum(st, (r) => r.control_wards), sec),
      wardsClearedPerMin: perMin(sum(st, (r) => r.wards_killed), sec),
      // ── Fase 2B (@15min, timeline) ──
      csDiff15: avgDef(gs, (r) => r.cs15_diff),          // média(CS − CS do oponente de lane @15)
      goldDiff15: avgDef(gs, (r) => r.gold15_diff),
      xpDiff15: avgDef(gs, (r) => r.xp15_diff),
      aheadCs15Pct: shareDef(gs, (r) => (r.cs15_diff == null ? null : r.cs15_diff > 0)), // % jogos à frente em CS @15
      firstBloodVictimPct: shareDef(gs, (r) => r.first_blood_victim), // % jogos onde sofreu o 1º abate
    })
  }
  return out.sort((x, y) => y.games - x.games || y.kda - x.kda)
}

// ═══════════════════════════════════════════════════════════════════
// aggregateTeams — agrupa linhas de time por team_id e calcula os KPIs
// coletivos da Fase 1.
// ═══════════════════════════════════════════════════════════════════
export function aggregateTeams(rows) {
  const byTeam = new Map()
  for (const r of rows) {
    if (!byTeam.has(r.team_id)) byTeam.set(r.team_id, [])
    byTeam.get(r.team_id).push(r)
  }
  const out = []
  for (const [teamId, gs] of byTeam) {
    const games = gs.length
    // Jogos COM estatística. Backfill sem stats (ex.: .rofl com statsJson vazio)
    // conta no winrate/lado (é uma vitória/derrota real), mas NÃO nas médias por
    // jogo/por minuto (não tem gold/objetivos). Detectamos pela ausência de gold.
    const st = gs.filter((r) => r.gold != null)
    const sgTeam = st.length
    const sec = sum(st, (r) => r.duration_sec)
    const gold = sum(st, (r) => r.gold), oppGold = sum(st, (r) => r.opp_gold)
    const blue = gs.filter((r) => r.side === 'blue'), red = gs.filter((r) => r.side === 'red')
    out.push({
      teamId,
      name: gs[0].team_name,
      games,
      wins: gs.filter((r) => r.won).length,
      winrate: share(gs, (r) => r.won),                 // % vitórias
      winrateBlue: share(blue, (r) => r.won),           // % vitórias lado azul
      winrateRed: share(red, (r) => r.won),             // % vitórias lado vermelho
      gamesBlue: blue.length, gamesRed: red.length,
      goldPerMin: perMin(gold, sec),                    // Σgold / Σmin
      goldDiffPerMin: perMin(gold - oppGold, sec),      // Σ(gold-oppGold) / Σmin
      avgTowerDiff: div(sum(st, (r) => r.towers - r.opp_towers), sgTeam), // média(torres - oppTorres)
      firstTowerPct: shareDef(gs, (r) => r.first_tower),   // % 1ª torre (ignora jogos sem esse dado, ex.: backfill de replay)
      dragonPriority: shareDef(gs, (r) => r.first_dragon), // % 1º dragão (prioridade)
      dragonsPerGame: div(sum(st, (r) => r.dragons), sgTeam),
      heraldsPerGame: div(sum(st, (r) => r.heralds), sgTeam),
      baronsPerGame: div(sum(st, (r) => r.barons), sgTeam),
      grubsPerGame: div(sum(st, (r) => r.grubs), sgTeam),
      platesTop: div(sum(st, (r) => r.plates_top), sgTeam),
      platesMid: div(sum(st, (r) => r.plates_mid), sgTeam),
      platesBot: div(sum(st, (r) => r.plates_bot), sgTeam),
      firstBloodPct: shareDef(gs, (r) => r.first_blood),   // % 1º abate
      avgKills: div(sum(st, (r) => r.kills), sgTeam),
      avgDeaths: div(sum(st, (r) => r.deaths), sgTeam),
      // ── Fase 2A (Match-V5 da Riot) ──
      damagePerMin: perMin(sum(st, (r) => r.damage), sec),
      visionPerMin: perMin(sum(st, (r) => r.vision_score), sec),
      wardsPerMin: perMin(sum(st, (r) => r.wards_placed), sec),
      visionWardsPerMin: perMin(sum(st, (r) => r.control_wards), sec),
      wardsClearedPerMin: perMin(sum(st, (r) => r.wards_killed), sec),  // wards inimigas destruídas
      pctWardsCleared: div(sum(st, (r) => r.wards_killed), sum(st, (r) => r.opp_wards_placed)), // limpas / colocadas pelo oponente
      // ── Fase 2B (@15min, timeline) ──
      goldDiff15: avgDef(gs, (r) => r.gold15_diff),      // média(gold do time − oponente @15)
      csDiff15: avgDef(gs, (r) => r.cs15_diff),
      towerDiff15: avgDef(gs, (r) => r.tower15_diff),
      dragons15: avgDef(gs, (r) => r.dragons15),         // média de dragões até 15min
      // WR quando está à frente em ouro @15 (só entre jogos em que liderou):
      wrWhenAhead15: (() => { const a = gs.filter((r) => r.ahead15 === true); return a.length ? a.filter((r) => r.won).length / a.length : null })(),
    })
  }
  return out.sort((x, y) => y.games - x.games || y.winrate - x.winrate)
}

// ═══════════════════════════════════════════════════════════════════
// aggregateObjectives (Macro Intel) — WR CONDICIONAL de objetivos a partir
// das linhas grid_game_teams (funciona igual para scrim e pro play). Cada
// linha = um time num jogo, com `won` e as contagens de objetivo. Responde:
// "quando este time garante o objetivo X, qual a taxa de vitória?".
//   rate = % de jogos em que conquistou · wr = vitórias entre esses jogos
//   avg  = média por jogo (quando faz sentido contar)
// ═══════════════════════════════════════════════════════════════════
export function aggregateObjectives(teamRows) {
  const rows = teamRows || []
  const g = rows.length
  const cond = (pred) => {
    const s = rows.filter(pred)
    return { games: s.length, rate: g ? s.length / g : 0, wr: s.length ? s.filter((r) => r.won).length / s.length : null }
  }
  // Variante null-safe: pra campos que podem faltar (ex.: first_blood/first_tower/
  // first_dragon em jogos vindos de backfill de replay, sem timeline de eventos).
  // O "games"/"rate" usam só as linhas com dado definido, senão um time com vários
  // jogos sem esse dado teria a taxa artificialmente diluída pra baixo.
  const condDef = (getBool) => {
    const known = rows.filter((r) => getBool(r) != null)
    const s = known.filter((r) => getBool(r))
    return { games: s.length, rate: known.length ? s.length / known.length : 0, wr: s.length ? s.filter((r) => r.won).length / s.length : null }
  }
  const avg = (f) => (g ? rows.reduce((a, r) => a + (f(r) || 0), 0) / g : 0)
  return {
    games: g,
    baron: { ...cond((r) => (r.barons || 0) >= 1), avg: avg((r) => r.barons) },
    soul: cond((r) => (r.dragons || 0) >= 4),
    firstDragon: condDef((r) => r.first_dragon),
    dragonAvg: avg((r) => r.dragons),
    herald: { ...cond((r) => (r.heralds || 0) >= 1), avg: avg((r) => r.heralds) },
    grubs: { ...cond((r) => (r.grubs || 0) >= 3), avg: avg((r) => r.grubs) },
    firstTower: condDef((r) => r.first_tower),
    firstBlood: condDef((r) => r.first_blood),
  }
}
