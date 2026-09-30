// Helpers puros (sem dependências de UI).

// ID curto e único o suficiente para uso local.
export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

export function cx(...parts) {
  return parts.filter(Boolean).join(' ')
}

// ── Datas ─────────────────────────────────────────────
const MESES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]
const MESES_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// 'YYYY-MM-DD' → partes (evita fuso: parse manual).
export function parseISODate(iso) {
  const [y, m, d] = (iso || '').split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayISO() {
  return toISODate(new Date())
}

export function formatDateShort(iso) {
  const d = parseISODate(iso)
  return { day: String(d.getDate()).padStart(2, '0'), month: MESES[d.getMonth()].toUpperCase() }
}

export function formatDateLong(iso) {
  const d = parseISODate(iso)
  return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()].toUpperCase()} ${d.getFullYear()}`
}

export { MESES, MESES_FULL, DIAS_SEMANA }

// ── Draft / placar ─────────────────────────────────────
// Resultado é sempre do NOSSO ponto de vista: 'win' | 'loss' | null.
export function blockScore(block) {
  let wins = 0
  let losses = 0
  for (const g of block.games) {
    if (g.result === 'win') wins++
    else if (g.result === 'loss') losses++
  }
  return { wins, losses }
}

// Um bloco só "conta" (winrate/estatísticas) quando o último jogo tem resultado
// definido — ou seja, quando a scrim inteira terminou.
export function isBlockFinished(block) {
  if (!block?.games?.length) return false
  const last = block.games.reduce((a, b) => (a.index > b.index ? a : b))
  return last.result != null
}

// 'pending' enquanto o bloco não terminou (mesmo com jogos parciais decididos).
export function blockOutcome(block) {
  if (!isBlockFinished(block)) return 'pending'
  const { wins, losses } = blockScore(block)
  if (wins === losses) return 'draw'
  return wins > losses ? 'win' : 'loss'
}

export function formatLabel(gamesCount) {
  return `Bo${gamesCount}`
}

// ── Estatísticas por adversário ────────────────────────
// Agrega todos os blocos contra um time (match por nome, case-insensitive).
export function teamStats(blocks = [], teamName = '') {
  const q = (teamName || '').trim().toLowerCase()
  const vs = blocks
    .filter((b) => (b.opponent || '').trim().toLowerCase() === q)
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  let blockWins = 0, blockLosses = 0, blockDraws = 0
  let gameWins = 0, gameLosses = 0
  for (const b of vs) {
    if (!isBlockFinished(b)) continue // só conta quando o bloco termina
    const { wins, losses } = blockScore(b)
    gameWins += wins
    gameLosses += losses
    if (wins > losses) blockWins++
    else if (wins < losses) blockLosses++
    else blockDraws++
  }
  const decided = blockWins + blockLosses
  const winrate = decided ? Math.round((blockWins / decided) * 100) : null
  const gamesPlayed = gameWins + gameLosses
  const gameWinrate = gamesPlayed ? Math.round((gameWins / gamesPlayed) * 100) : null

  return {
    blocks: vs,
    count: vs.length,
    blockWins, blockLosses, blockDraws,
    gameWins, gameLosses,
    winrate, gameWinrate,
  }
}
