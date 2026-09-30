// ═══════════════════════════════════════════════════════════════════
// Região de um time — camada PURA (sem rede, sem Supabase).
//
// A GRID não expõe região nem no tipo Team nem no Tournament (checado por
// introspecção do schema). O que dá pra saber é em quais torneios o time
// jogou; a LIGA DOMÉSTICA (LCK, LEC, CBLOL…) identifica a região com
// segurança. Eventos internacionais (MSI, EWC, First Stand) misturam
// regiões e por isso são descartados na hora de decidir.
// ═══════════════════════════════════════════════════════════════════

// Torneios que NÃO dizem nada sobre a região do time (juntam todo mundo).
// Comparado em minúsculo por "contém".
const INTERNATIONAL = [
  'msi', 'esports world cup', 'ewc', 'first stand', 'worlds',
  'world championship', 'americas cup', 'kespa cup', 'demacia cup',
]

export function isInternational(tournament = '') {
  const t = tournament.toLowerCase()
  return INTERNATIONAL.some((k) => t.includes(k))
}

// "Torneios" que não são competição oficial nenhuma — scrim e backfill manual
// de .rofl. Aparecem em grid_series como qualquer outro torneio, então sem
// descartar aqui um time que treina muito viraria da liga "League of Legends
// Scrims".
const NON_LEAGUE = ['scrim', 'backfill manual']

export function isNonLeague(tournament = '') {
  const t = tournament.toLowerCase()
  return NON_LEAGUE.some((k) => t.includes(k))
}

// Um torneio só vale como voto de liga doméstica se for competição oficial
// E de uma região só.
export function countsAsLeague(tournament = '') {
  return Boolean(tournament) && !isInternational(tournament) && !isNonLeague(tournament)
}

// Liga → região. A chave é comparada por "contém" (minúsculo), então
// "LCK Challengers" cai em LCK e "Circuito Desafiante" em BR. Ordem importa:
// chaves mais específicas primeiro (senão "lck" engoliria "lck cl").
const LEAGUE_REGION = [
  ['circuito desafiante', 'BR'],
  ['cblol', 'BR'],
  ['lta south', 'BR'],
  ['lta north', 'NA'],
  ['lcs', 'NA'],
  ['lck', 'KR'],
  ['lpl', 'CN'],
  ['lec', 'EMEA'],
  ['nlc', 'EMEA'],
  ['lfl', 'EMEA'],
  ['prime league', 'EMEA'],
  ['superliga', 'EMEA'],
  ['ultraliga', 'EMEA'],
  ['emea masters', 'EMEA'],
  ['lcp', 'APAC'],
  ['ljl', 'APAC'],
  ['pcs', 'APAC'],
  ['vcs', 'APAC'],
  ['lla', 'LATAM'],
  ['lrn', 'LATAM'],
]

// Rótulos exibidos na UI (código curto → nome legível).
export const REGION_LABELS = {
  BR: 'Brasil',
  NA: 'América do Norte',
  EMEA: 'EMEA',
  KR: 'Coreia',
  CN: 'China',
  APAC: 'Ásia-Pacífico',
  LATAM: 'LATAM',
}

export const REGION_ORDER = ['BR', 'NA', 'LATAM', 'EMEA', 'KR', 'CN', 'APAC']

export function regionForLeague(league = '') {
  const l = league.toLowerCase()
  for (const [key, region] of LEAGUE_REGION) if (l.includes(key)) return region
  return null
}

// Nome curto da liga a partir do nome cheio do torneio na GRID.
// "Circuito Desafiante - Split 2 2026 (Regular Season: …)" → "Circuito Desafiante"
export function shortLeague(tournament = '') {
  return tournament.split(' - ')[0].split(' (')[0].trim()
}

// Decide a liga doméstica de um time a partir dos torneios que ele disputou.
// `tournaments` = array de nomes cheios (pode repetir — a repetição é o voto).
// Vence a liga não-internacional mais frequente; só eventos internacionais →
// null (time sem liga doméstica conhecida, ex.: roster montado só pra EWC).
// Override manual de liga — pra times cuja afiliação é conhecida mas ainda
// não aparece nos dados (liga que não começou, ou roster só visto até agora
// em evento internacional). Mesma ideia do ROSTER_OVERRIDES em kpis.js:
// dado que não dá para deduzir sozinho, fica registrado à mão. Tem prioridade
// máxima sobre deriveLeague(). Chave: team_id da GRID (string).
// A tabela fica vazia neste repositório. Exemplo: { '123': 'CBLOL' }.
export const MANUAL_TEAM_LEAGUE = {}

export function deriveLeague(tournaments = []) {
  const votes = new Map()
  for (const t of tournaments) {
    if (!countsAsLeague(t)) continue
    const l = shortLeague(t)
    if (!l) continue
    votes.set(l, (votes.get(l) || 0) + 1)
  }
  if (!votes.size) return null
  return [...votes.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0]
}
