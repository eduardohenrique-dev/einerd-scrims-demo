// ───────────────────────────────────────────────────────────────
// Camada de persistência — LocalStorage (100% offline).
// Tudo é salvo sob chaves versionadas. Se o schema mudar,
// suba a versão e migre. Leitura tolera JSON corrompido.
// ───────────────────────────────────────────────────────────────
import { uid } from './utils.js'
import { OUR_TEAM, DEFAULT_ROSTER, ROLES } from '../data/constants.js'

const VERSION = 'v1'
export const KEYS = {
  blocks:    `einerd:${VERSION}:blocks`,
  events:    `einerd:${VERSION}:events`,
  champions: `einerd:v4:champions`,   // v4 → 173 campeões oficiais DDragon 16.13.1 (+Locke)
  roster:    `einerd:${VERSION}:roster`,
  seeded:    `einerd:${VERSION}:seeded`,
  teams:     `einerd:${VERSION}:teams`,
  theme:     `einerd:${VERSION}:theme`,
}

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch (e) {
    console.warn(`[storage] falha ao ler ${key}:`, e)
    return fallback
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error(`[storage] falha ao salvar ${key}:`, e)
  }
}

export function wipeAll() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k))
}

// ── Fábricas (factory) ─────────────────────────────────
// Um "lado" do draft: 5 bans + 5 picks.
function emptySide(team) {
  return {
    team,
    bans: Array(5).fill(null), // championId | null
    picks: Array(5).fill(null).map((_, i) => ({
      championId: null,
      role: ROLES[i],
      player: '',
    })),
  }
}

// Um jogo dentro do bloco. ourSide define em que lado jogamos.
export function makeGame(index, ourSide = 'blue', opponent = 'Adversário') {
  const us = emptySide(OUR_TEAM)
  const them = emptySide(opponent)
  // aplica roster padrão nos nossos picks
  us.picks.forEach((p) => { p.player = DEFAULT_ROSTER[p.role] || '' })
  return {
    id: uid('gm'),
    index,
    result: null, // 'win' | 'loss' | null  (sempre do nosso ponto de vista)
    duration: '', // "33:03"
    ourSide, // 'blue' | 'red'
    notes: '',
    blue: ourSide === 'blue' ? us : them,
    red: ourSide === 'red' ? us : them,
  }
}

// Cria um Bloco de Treino com N jogos.
export function makeBlock({ opponent, date, gamesCount = 5, ourSide = 'blue' }) {
  const now = Date.now()
  return {
    id: uid('blk'),
    opponent,
    date, // 'YYYY-MM-DD'
    gamesCount,
    vodUrl: '',
    createdAt: now,
    updatedAt: now,
    games: Array.from({ length: gamesCount }, (_, i) =>
      makeGame(i + 1, ourSide, opponent),
    ),
  }
}

// Helper p/ montar o lado de um seed rapidamente.
function side(team, bans, picks) {
  return {
    team,
    bans,
    picks: picks.map((p) => ({ championId: p[0], role: p[1], player: p[2] })),
  }
}

// Cria um jogo de seed já preenchido.
function seedGame(index, result, ourSide, duration, blue, red, notes = '') {
  return {
    id: uid('gm'),
    index,
    result,
    duration,
    ourSide,
    notes,
    blue,
    red,
  }
}

// Bloco vs Tigres Academy totalmente preenchido (Jogo 1). Tudo fictício.
function seedTigresBlock() {
  const g1 = seedGame(
    1, 'win', 'blue', '33:03',
    side(
      OUR_TEAM,
      ['leesin', 'monkeyking', 'poppy', 'camille', 'zeri'],
      [
        ['jinx', 'Top', DEFAULT_ROSTER.Top],
        ['syndra', 'Jng', DEFAULT_ROSTER.Jng],
        ['sivir', 'Mid', DEFAULT_ROSTER.Mid],
        ['khazix', 'Bot', DEFAULT_ROSTER.Bot],
        ['renata', 'Sup', DEFAULT_ROSTER.Sup],
      ],
    ),
    side(
      'Tigres Academy',
      ['zyra', 'yuumi', 'jax', 'jhin', 'senna'],
      [
        ['yone', 'Top', 'Garra'],
        ['rell', 'Jng', 'Listra'],
        ['nautilus', 'Mid', 'Rugido'],
        ['kaisa', 'Bot', 'Presa'],
        ['gwen', 'Sup', 'Juba'],
      ],
    ),
    'Perdemos prio de visão no river. Melhorar o controle de wards entrando no late.',
  )
  const results = ['win', 'loss', 'loss', 'win', 'win'] // 3-2
  const games = [g1]
  for (let i = 1; i < 5; i++) {
    const g = makeGame(i + 1, i % 2 === 0 ? 'blue' : 'red', 'Tigres Academy')
    g.result = results[i]
    games.push(g)
  }
  return {
    id: uid('blk'), opponent: 'Tigres Academy', date: '2026-06-28', gamesCount: 5,
    vodUrl: 'https://example.com/vod/demo', createdAt: Date.now(), updatedAt: Date.now(), games,
  }
}

// Demais blocos: só placar/resultados (drafts vazios) p/ popular o dashboard.
function quickBlock(opponent, date, gamesCount, results) {
  const games = results.map((r, i) => {
    const g = makeGame(i + 1, i % 2 === 0 ? 'blue' : 'red', opponent)
    g.result = r
    return g
  })
  return {
    id: uid('blk'), opponent, date, gamesCount,
    vodUrl: '', createdAt: Date.now(), updatedAt: Date.now(), games,
  }
}

export function seedBlocks() {
  return [
    seedTigresBlock(),
    quickBlock('Aurora Five', '2026-06-26', 5, ['win', 'loss', 'win', 'loss', 'win']), // 3-2
    quickBlock('Lobo Esports', '2026-06-25', 3, ['loss', 'loss', 'loss']), // 0-3
    quickBlock('Farol Gaming', '2026-06-19', 5, ['win', 'win', 'win', 'win', 'win']), // 5-0
    quickBlock('Cometa', '2026-06-12', 5, ['loss', 'win', 'loss', 'loss', 'loss']), // 1-4
    quickBlock('Dragões de Jade', '2026-06-05', 3, ['win', 'loss', 'win']), // 2-1
  ]
}

export function seedEvents() {
  const e = (title, date, time, type) => ({ id: uid('evt'), title, date, time, type, notes: '' })
  return [
    e('Scrim vs Tigres Academy', '2026-06-02', '19:00', 'scrim'),
    e('Review Bloco Tigres', '2026-06-04', '15:00', 'review'),
    e('Scrim vs Aurora Five', '2026-06-05', '19:00', 'scrim'),
    e('Reunião de equipe', '2026-06-09', '14:00', 'reuniao'),
    e('Scrim vs Lobo Esports', '2026-06-11', '19:00', 'scrim'),
    e('Folga', '2026-06-12', '00:00', 'folga'),
    e('Tryouts', '2026-06-16', '16:00', 'scrim'),
    e('Review de VODs', '2026-06-18', '15:00', 'review'),
    e('Scrim vs Farol Gaming', '2026-06-19', '19:00', 'scrim'),
    e('Reunião de Draft', '2026-06-23', '14:00', 'reuniao'),
    e('Scrim vs Cometa', '2026-06-25', '19:00', 'scrim'),
    e('Scrim vs Dragões de Jade', '2026-06-26', '19:00', 'scrim'),
    e('Scrim vs Tigres Academy', '2026-06-28', '19:00', 'scrim'),
    e('Review pós-treino', '2026-06-28', '22:00', 'review'),
    e('Scrim vs Tempestade', '2026-06-30', '19:00', 'scrim'),
  ]
}
