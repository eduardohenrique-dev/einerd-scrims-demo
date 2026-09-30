// Estatísticas de draft derivadas dos blocos do Histórico de Treinos.
// Cada jogo com resultado definido gera 1 registro por pick (campeão).
// O resultado é do ponto de vista do EiNerd; para o adversário, invertemos.
import { normName, playerForRole } from '../data/teams.js'

// Percorre todos os jogos com resultado e emite um registro por pick com campeão:
//   { teamName, role, championId, win, oppChampionId, oppTeamName, date }
// oppChampionId é o pick da MESMA lane do outro lado (o matchup direto);
// fica null se o draft adversário não tiver a lane preenchida.
export function collectPickRecords(blocks = []) {
  const records = []
  for (const b of blocks) {
    for (const g of b.games || []) {
      if (g.result !== 'win' && g.result !== 'loss') continue
      for (const side of ['blue', 'red']) {
        const other = side === 'blue' ? 'red' : 'blue'
        const isUs = g.ourSide === side
        const win = isUs ? g.result === 'win' : g.result === 'loss'
        const teamName = g[side]?.team
        const oppTeamName = g[other]?.team
        const oppByRole = new Map()
        for (const op of g[other]?.picks || []) {
          if (op.role && op.championId) oppByRole.set(op.role, op.championId)
        }
        for (const p of g[side]?.picks || []) {
          if (!p.championId) continue
          records.push({
            teamName, role: p.role, championId: p.championId, win,
            oppChampionId: (p.role && oppByRole.get(p.role)) || null,
            oppTeamName: oppTeamName || null,
            date: b.date || null,
          })
        }
      }
    }
  }
  return records
}

// Agrupa registros por chave arbitrária, contando vitórias/derrotas.
export function tally(records, keyFn) {
  const map = new Map()
  for (const r of records) {
    const key = keyFn(r)
    if (key == null) continue
    if (!map.has(key)) map.set(key, { wins: 0, losses: 0 })
    const e = map.get(key)
    if (r.win) e.wins++
    else e.losses++
  }
  return map
}

export function winrate(wins, losses) {
  const total = wins + losses
  return total ? Math.round((wins / total) * 100) : 0
}

// Ordena linhas de campeão: mais jogos primeiro, depois maior WR.
export function sortChampRows(rows) {
  return [...rows].sort((a, b) => {
    const ta = a.wins + a.losses
    const tb = b.wins + b.losses
    if (tb !== ta) return tb - ta
    return winrate(b.wins, b.losses) - winrate(a.wins, a.losses)
  })
}

// WR de campeões de UM time (por nome). Retorna [{ championId, wins, losses }].
export function champStatsForTeam(records, teamName) {
  const q = normName(teamName)
  const filtered = records.filter((r) => normName(r.teamName) === q)
  const map = tally(filtered, (r) => r.championId)
  return sortChampRows([...map.entries()].map(([championId, s]) => ({ championId, ...s })))
}

// Matchups de UM campeão de um time: contra quem ele jogou (pick da mesma
// lane do outro lado), com V/D por adversário e a lista dos jogos individuais.
// `role` (opcional) restringe à lane — usado no modo "Por Jogador" pra não
// misturar o mesmo campeão jogado em lanes diferentes.
// Retorna { matchups: [{ championId, wins, losses, games: [{date, oppTeamName, win}] }],
//           unknown: { wins, losses } } — unknown = picks sem matchup registrado
// (draft adversário incompleto naquela lane).
export function matchupsForChamp(records, teamName, championId, role = null) {
  const q = normName(teamName)
  const recs = records.filter((r) =>
    normName(r.teamName) === q && r.championId === championId && (!role || r.role === role))
  const map = new Map()
  const unknown = { wins: 0, losses: 0 }
  for (const r of recs) {
    if (!r.oppChampionId) { r.win ? unknown.wins++ : unknown.losses++; continue }
    if (!map.has(r.oppChampionId)) map.set(r.oppChampionId, { championId: r.oppChampionId, wins: 0, losses: 0, games: [] })
    const e = map.get(r.oppChampionId)
    if (r.win) e.wins++
    else e.losses++
    e.games.push({ date: r.date, oppTeamName: r.oppTeamName, win: r.win })
  }
  return { matchups: sortChampRows([...map.values()]), unknown }
}

// ── KDA via GRID ────────────────────────────────────────────────────
// O Draft Stats nasce dos BLOCOS (draft manual); o KDA vem de outra fonte:
// as linhas por jogador da GRID (grid_game_players). O elo entre os dois é
// o NOME do campeão + o time — sem jogo na GRID, fica sem dado (por design).

// Chave de campeão para casar draft ↔ GRID: minúsculo, sem acento/espaço.
// Aliases cobrem nomes internos da Riot que diferem do nome de exibição.
const CHAMP_KEY_ALIASES = { monkeyking: 'wukong', renataglasc: 'renata', nunuwillump: 'nunu' }
export function champKey(name = '') {
  const k = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')
  return CHAMP_KEY_ALIASES[k] || k
}

// Acha o team_id da GRID para um time do app (nomes raramente batem 1:1 —
// ex.: "EiNerd" vs "Ei Nerd Esports"). Tenta: igual → um contém o outro →
// todos os tokens do nome presentes ("Tigres Academy" ⊂ "Tigres Gaming Academy").
export function matchGridTeamId(gridTeams = [], appName = '') {
  if (!appName) return null
  const key = champKey(appName)
  if (!key) return null
  const tokens = appName.toLowerCase().split(/\s+/).map((t) => champKey(t)).filter(Boolean)
  let contains = null
  for (const t of gridTeams) {
    const gk = champKey(t.name || '')
    if (!gk) continue
    if (gk === key) return t.id
    if (!contains && (gk.includes(key) || key.includes(gk))) contains = t.id
  }
  if (contains) return contains
  if (tokens.length > 1) {
    for (const t of gridTeams) {
      const gk = champKey(t.name || '')
      if (gk && tokens.every((tok) => gk.includes(tok))) return t.id
    }
  }
  return null
}

// Resolve o time do app → team_id da GRID de forma ESTÁVEL.
//
// O casamento por nome (matchGridTeamId) é um palpite: renomear um time em
// Configurações ("RED Academy" → "RED") silenciosamente muda ou perde o
// vínculo, e os KPIs somem sem erro nenhum. Por isso o vínculo, uma vez
// confirmado, fica gravado em `team.gridTeamId` e tem prioridade absoluta.
// O nome só é usado como palpite inicial, para times ainda não vinculados.
//
// O id gravado só é aceito se ainda existir na lista da GRID — assim um id
// obsoleto (time que sumiu dos dados) cai de volta no palpite por nome em vez
// de travar o time sem dado algum.
export function resolveGridTeamId(team, gridTeams = []) {
  if (!team) return null
  if (team.gridTeamId && gridTeams.some((t) => t.id === team.gridTeamId)) return team.gridTeamId
  return matchGridTeamId(gridTeams, team.name)
}

// Agrega as linhas da GRID por campeão: jogos + somas de K/D/A.
// Retorna Map champKey → { games, kills, deaths, assists }.
export function aggregateKdaByChampion(rows = []) {
  const m = new Map()
  for (const r of rows) {
    const k = champKey(r.champion || '')
    if (!k) continue
    if (!m.has(k)) m.set(k, { games: 0, kills: 0, deaths: 0, assists: 0 })
    const e = m.get(k)
    e.games++
    e.kills += r.kills || 0; e.deaths += r.deaths || 0; e.assists += r.assists || 0
  }
  return m
}

// KDA ratio agregado: (K+A)/D sobre os totais. D=0 → Infinity ("perfeito").
export function kdaRatio({ kills = 0, deaths = 0, assists = 0 }) {
  return deaths ? (kills + assists) / deaths : Infinity
}

// WR de campeões por JOGADOR de um time — usa a lane do pick + roster do time.
// Retorna [{ player, role, champs: [{championId, wins, losses}], wins, losses }].
export function playerStatsForTeam(records, team) {
  if (!team) return []
  const q = normName(team.name)
  const teamRecords = records.filter((r) => normName(r.teamName) === q)
  const players = team.players || []

  return players.map((ply) => {
    const recs = teamRecords.filter((r) => r.role === ply.role)
    const map = tally(recs, (r) => r.championId)
    const champs = sortChampRows([...map.entries()].map(([championId, s]) => ({ championId, ...s })))
    const wins = champs.reduce((n, c) => n + c.wins, 0)
    const losses = champs.reduce((n, c) => n + c.losses, 0)
    return { id: ply.id, player: ply.name || playerForRole(team, ply.role) || ply.role, role: ply.role, champs, wins, losses }
  })
}
