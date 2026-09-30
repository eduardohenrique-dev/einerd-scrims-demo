// ═══════════════════════════════════════════════════════════════════
// Dados da GRID INVENTADOS para o modo demo.
//
// Nenhum número aqui veio da GRID ou da Riot: times, jogadores e partidas são
// gerados por um sorteio com semente fixa (sempre o mesmo resultado), no
// formato das tabelas grid_* do Supabase. Serve para a área de Dados ter o
// que mostrar sem expor scrims reais nem redistribuir dados licenciados.
// ═══════════════════════════════════════════════════════════════════

// Sorteio determinístico (mulberry32): a demo é igual em toda visita.
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const ROLES = ['Top', 'Jng', 'Mid', 'Bot', 'Sup']

const POOL = {
  Top: ['Aatrox', 'Renekton', 'Gnar', 'Jax', 'Rumble', 'Ornn'],
  Jng: ['Vi', 'Sejuani', 'Maokai', 'Viego', 'Nidalee', 'Wukong'],
  Mid: ['Azir', 'Orianna', 'Syndra', 'Ahri', 'Taliyah', 'Corki'],
  Bot: ['Varus', 'Ezreal', 'Xayah', 'Jinx', 'Ashe', 'Caitlyn'],
  Sup: ['Nautilus', 'Rakan', 'Rell', 'Alistar', 'Braum', 'Leona'],
}

// Itens/runas com ids do Data Dragon (só para a aba Builds ter ícones).
const ITENS = {
  starter: { Top: 1054, Jng: 1101, Mid: 1056, Bot: 1055, Sup: 3865 },
  boots: [3047, 3111, 3020, 3006, 3158],
  lendarios: {
    Top: [3071, 6333, 3053, 3065, 6610],
    Jng: [3071, 6333, 3742, 3068, 6631],
    Mid: [3089, 3157, 4645, 3135, 6655],
    Bot: [3031, 3094, 3036, 3072, 6672],
    Sup: [3190, 3050, 3109, 2065, 3107],
  },
}
const RUNAS = {
  Top: { keystone: [8010, 8437], primary: 8000, sub: 8400, perks: [8010, 9111, 9104, 8299, 8444, 8451] },
  Jng: { keystone: [8010, 8128], primary: 8000, sub: 8100, perks: [8010, 9111, 9104, 8014, 8143, 8135] },
  Mid: { keystone: [8112, 8214], primary: 8100, sub: 8200, perks: [8112, 8139, 8138, 8106, 8226, 8237] },
  Bot: { keystone: [8008, 8021], primary: 8000, sub: 8300, perks: [8008, 9111, 9103, 8014, 8345, 8347] },
  Sup: { keystone: [8439, 8465], primary: 8400, sub: 8300, perks: [8439, 8446, 8429, 8451, 8345, 8347] },
}

// Id (fictício) do nosso time: a aba Dados abre filtrada nele (EINERD_ID).
export const DEMO_OUR_TEAM_ID = '900001'

const SCRIM_TEAMS = [
  { id: DEMO_OUR_TEAM_ID, name: 'EiNerd', league: 'Circuito Desafiante', region: 'BR',
    players: ['Rocha', 'Cipó', 'Lume', 'Faísca', 'Âncora'] },
  { id: 'demo-tigres', name: 'Tigres Academy', league: 'Circuito Desafiante', region: 'BR',
    players: ['Garra', 'Listra', 'Rugido', 'Presa', 'Juba'] },
  { id: 'demo-aurora', name: 'Aurora Five', league: 'Circuito Desafiante', region: 'BR',
    players: ['Brisa', 'Orvalho', 'Prisma', 'Neon', 'Halo'] },
  { id: 'demo-lobo', name: 'Lobo Esports', league: 'Circuito Desafiante', region: 'BR',
    players: ['Uivo', 'Matilha', 'Faro', 'Caninos', 'Alfa'] },
]

const PRO_TEAMS = [
  { id: 'demo-pro-a', name: 'Dragões de Jade', league: 'LCK', region: 'KR', players: ['Jade', 'Musgo', 'Esmeralda', 'Trevo', 'Hera'] },
  { id: 'demo-pro-b', name: 'Tempestade', league: 'LCK', region: 'KR', players: ['Raio', 'Trovão', 'Nimbo', 'Garoa', 'Vento'] },
  { id: 'demo-pro-c', name: 'Farol Gaming', league: 'CBLOL', region: 'BR', players: ['Maré', 'Âmbar', 'Lanterna', 'Recife', 'Boia'] },
  { id: 'demo-pro-d', name: 'Cometa', league: 'CBLOL', region: 'BR', players: ['Órbita', 'Poeira', 'Cauda', 'Astro', 'Luar'] },
]

const PATCHES = ['16.14', '16.15', '16.16', '16.17']

let r0 = rng(2026)
const int = (a, b) => Math.floor(a + r0() * (b - a + 1))
const pick = (arr) => arr[Math.floor(r0() * arr.length)]
const chance = (p) => r0() < p

function diasAtras(d, hora = 19) {
  const x = new Date()
  x.setUTCHours(hora, 0, 0, 0)
  x.setUTCDate(x.getUTCDate() - d)
  return x.toISOString()
}

// Caminho do jungler: sai da base, passa pelos campos e circula pelo mapa.
function caminhoJungle(side) {
  const base = side === 'blue' ? [1200, 1200] : [13600, 13600]
  const campos = side === 'blue'
    ? [[3800, 7900], [7800, 4000], [6900, 5400], [3900, 6500], [8200, 2500], [2200, 8400]]
    : [[11000, 7000], [7000, 10900], [7900, 9500], [10900, 8300], [6600, 12300], [12600, 6400]]
  const out = []
  let [x, y] = base
  for (let t = 1; t <= 20; t++) {
    const alvo = t < 4 ? campos[t % campos.length] : (chance(0.35) ? [int(3000, 12000), int(3000, 12000)] : pick(campos))
    x += (alvo[0] - x) * 0.7 + int(-400, 400)
    y += (alvo[1] - y) * 0.7 + int(-400, 400)
    out.push({ t, x: Math.round(x), y: Math.round(y) })
  }
  return out
}

function wardsDoLado(side) {
  const out = []
  const n = int(55, 80)
  for (let i = 0; i < n; i++) {
    const t = int(1, 30)
    const avanco = Math.min(1, t / 25)
    const cx = side === 'blue' ? 4500 + avanco * 5000 : 10500 - avanco * 5000
    const cy = side === 'blue' ? 4500 + avanco * 5000 : 10500 - avanco * 5000
    out.push({ t, x: Math.round(cx + int(-3500, 3500)), y: Math.round(cy + int(-3500, 3500)), kind: chance(0.22) ? 'pink' : 'yellow' })
  }
  return out
}

function montarJogo({ seriesId, seq, seriesType, startedAt, blue, red, ehPro }) {
  const blueWon = chance(0.5 + (blue.id === DEMO_OUR_TEAM_ID ? 0.08 : 0) - (red.id === DEMO_OUR_TEAM_ID ? 0.08 : 0))
  const duration = int(1560, 2280)
  const min = duration / 60
  const usados = new Set()
  const escolhe = (role) => {
    let c
    do c = pick(POOL[role]); while (usados.has(c))
    usados.add(c)
    return c
  }

  const lados = [
    { team: blue, side: 'blue', won: blueWon },
    { team: red, side: 'red', won: !blueWon },
  ]
  const teams = []
  const players = []

  for (const l of lados) {
    const vence = l.won
    const kills = vence ? int(16, 28) : int(5, 15)
    const gold = Math.round((vence ? 1850 : 1650) * min + int(-1500, 1500))
    const cs = Math.round(min * int(29, 34))
    const towers = vence ? int(8, 11) : int(1, 5)
    const dragons = vence ? int(2, 4) : int(0, 2)
    teams.push({
      l, kills, gold, cs, towers, dragons,
      deaths: 0, assists: 0, damage: 0, vision: 0, wardsPlaced: 0, wardsKilled: 0, controlWards: 0,
    })
  }
  teams[0].deaths = teams[1].kills
  teams[1].deaths = teams[0].kills
  const fb = chance(0.5) ? 0 : 1
  const ft = chance(teams[0].l.won ? 0.65 : 0.35) ? 0 : 1
  const fd = chance(teams[0].l.won ? 0.6 : 0.4) ? 0 : 1

  for (const [i, t] of teams.entries()) {
    const o = teams[1 - i]
    const ahead = t.l.won ? chance(0.7) : chance(0.3)
    const goldDiff15 = (ahead ? 1 : -1) * int(300, 3200)
    ROLES.forEach((role, ri) => {
      const participant = i * 5 + ri + 1
      const champion = escolhe(role)
      const k = role === 'Sup' ? int(0, 2) : Math.max(0, Math.round(t.kills * [0.18, 0.2, 0.26, 0.3, 0.06][ri] + int(-2, 2)))
      const d = Math.max(0, Math.round(t.deaths / 5 + int(-2, 2)))
      const a = Math.max(0, Math.round(t.kills * [0.35, 0.6, 0.5, 0.4, 0.7][ri] + int(-2, 3)))
      const dmg = Math.round(min * [650, 420, 780, 820, 230][ri] * (t.l.won ? 1.1 : 0.95) + int(-2000, 2000))
      const vis = Math.round(min * [0.9, 1.6, 1.1, 1.0, 3.2][ri] + int(-4, 4))
      const wp = Math.round(min * [0.4, 0.5, 0.45, 0.45, 1.3][ri])
      const wk = Math.round(min * [0.15, 0.3, 0.2, 0.2, 0.4][ri])
      const cw = Math.round(min * [0.08, 0.14, 0.1, 0.07, 0.25][ri])
      const csP = role === 'Sup' ? Math.round(min * 1.2) : role === 'Jng' ? Math.round(min * 5.8) : Math.round(min * int(8, 10))
      const goldP = Math.round(t.gold * [0.21, 0.19, 0.22, 0.25, 0.13][ri])
      t.assists += a; t.damage += dmg; t.vision += vis; t.wardsPlaced += wp; t.wardsKilled += wk; t.controlWards += cw

      const run = RUNAS[role]
      const keystone = pick(run.keystone)
      const lend = [...ITENS.lendarios[role]].sort(() => r0() - 0.5).slice(0, 3)
      const botas = role === 'Sup' || chance(0.85) ? pick(ITENS.boots) : null
      const ordem = [{ id: ITENS.starter[role], t: 0 }]
      if (botas) ordem.push({ id: botas, t: int(6, 10) })
      lend.forEach((id, n) => ordem.push({ id, t: 11 + n * 7 + int(0, 3) }))

      players.push({
        id: `${seriesId}:${seq}:${t.l.team.id}-${ri}`,
        series_id: seriesId, game_seq: seq, series_type: seriesType, title_id: '3',
        started_at: startedAt, duration_sec: duration,
        team_id: t.l.team.id, team_name: t.l.team.name, side: t.l.side, won: t.l.won,
        opponent_team_id: o.l.team.id, opponent_team_name: o.l.team.name,
        player_id: `${t.l.team.id}-p${ri}`, player_name: t.l.team.players[ri],
        champion, role,
        kills: k, deaths: d, assists: a, gold: goldP, cs: csP,
        first_blood: fb === i && ri === 1,
        team_kills: t.kills, team_gold: t.gold,
        damage: dmg, vision_score: vis, wards_placed: wp, wards_killed: wk, control_wards: cw, team_damage: null,
        participant_id: participant,
        gold15: 5200 + int(-600, 900), cs15: role === 'Sup' ? int(15, 30) : int(95, 140), xp15: 6800 + int(-700, 900),
        gold15_diff: Math.round(goldDiff15 / 5 + int(-400, 400)), cs15_diff: int(-18, 18), xp15_diff: int(-600, 600),
        first_blood_victim: fb !== i && ri === pick([0, 1, 2]) && chance(0.4),
        items: ehPro ? [...(botas ? [botas] : []), ...lend] : null,
        build_order: ehPro ? ordem : null,
        keystone: ehPro ? keystone : null,
        perk_primary: ehPro ? run.primary : null,
        perk_sub: ehPro ? run.sub : null,
        perks: ehPro ? [keystone, ...run.perks.slice(1)] : null,
        stat_perks: ehPro ? { offense: 5005, flex: 5008, defense: pick([5011, 5001]) } : null,
      })
    })
    t.gold15diff = goldDiff15
    t.ahead15 = goldDiff15 > 0
  }
  for (const [i, t] of teams.entries()) {
    const pl = players.filter((p) => p.team_id === t.l.team.id)
    for (const p of pl) p.team_damage = t.damage
    t.i = i
  }

  const linhasTime = teams.map((t, i) => {
    const o = teams[1 - i]
    return {
      id: `${seriesId}:${seq}:${t.l.team.id}`,
      series_id: seriesId, game_seq: seq, series_type: seriesType, title_id: '3',
      started_at: startedAt, duration_sec: duration,
      team_id: t.l.team.id, team_name: t.l.team.name, side: t.l.side, won: t.l.won,
      opponent_team_id: o.l.team.id, opponent_team_name: o.l.team.name,
      kills: t.kills, deaths: t.deaths, assists: t.assists, gold: t.gold, cs: t.cs,
      towers: t.towers, first_tower: ft === i, first_blood: fb === i,
      dragons: t.dragons, first_dragon: fd === i,
      heralds: chance(t.l.won ? 0.7 : 0.3) ? 1 : 0,
      barons: t.l.won ? int(1, 2) : (chance(0.15) ? 1 : 0),
      grubs: int(0, 6),
      plates_top: int(0, 4), plates_mid: int(0, 4), plates_bot: int(0, 5),
      wards_cleared: t.wardsKilled,
      opp_gold: o.gold, opp_kills: o.kills, opp_towers: o.towers, opp_cs: o.cs,
      damage: t.damage, vision_score: t.vision, wards_placed: t.wardsPlaced, wards_killed: t.wardsKilled,
      control_wards: t.controlWards, opp_wards_placed: o.wardsPlaced,
      gold15_diff: t.gold15diff, cs15_diff: int(-35, 35), tower15_diff: t.ahead15 ? int(0, 2) : -int(0, 2),
      dragons15: Math.min(t.dragons, int(0, 2)), ahead15: t.ahead15,
      jungle_path: caminhoJungle(t.l.side),
      wards: wardsDoLado(t.l.side),
    }
  })

  let proGame = null
  if (ehPro) {
    const b = players.filter((p) => p.side === 'blue')
    const r = players.filter((p) => p.side === 'red')
    const todosUsados = new Set(players.map((p) => p.champion))
    const bans = () => {
      const out = []
      const todos = Object.values(POOL).flat()
      while (out.length < 5) {
        const c = pick(todos)
        if (!todosUsados.has(c) && !out.includes(c)) { out.push(c); todosUsados.add(c) }
      }
      return out
    }
    const obj = (t, i) => ({
      dragons: t.dragons, barons: linhasTime[i].barons, heralds: linhasTime[i].heralds, grubs: linhasTime[i].grubs,
      towers: t.towers, firstDragon: fd === i, firstTower: ft === i, firstBaron: t.l.won && linhasTime[i].barons > 0, firstBlood: fb === i,
    })
    proGame = {
      id: `${seriesId}:${seq}`, series_id: seriesId, game_seq: seq, start_time: startedAt,
      patch: null, league: null, tournament_name: null,
      blue_team: blue.name, red_team: red.name, winner: blueWon ? 'blue' : 'red',
      first_pick: chance(0.6) ? 'blue' : 'red',
      blue_picks: b.map((p) => p.champion), blue_bans: bans(),
      red_picks: r.map((p) => p.champion), red_bans: bans(),
      blue_obj: obj(teams[0], 0), red_obj: obj(teams[1], 1),
    }
  }
  return { linhasTime, players, proGame }
}

export function seedGrid() {
  r0 = rng(2026)
  const grid_game_teams = []
  const grid_game_players = []
  const grid_pro_games = []
  const grid_series = []

  // Scrims do EiNerd (fictício): 3 jogos por bloco, a cada ~4 dias.
  const [nos, ...rivais] = SCRIM_TEAMS
  let s = 0
  for (let dias = 78; dias >= 2; dias -= int(3, 5)) {
    const rival = rivais[s % rivais.length]
    const seriesId = `demo-scrim-${++s}`
    const startedAt = diasAtras(dias)
    for (let seq = 1; seq <= 3; seq++) {
      const nosAzul = seq % 2 === 1
      const g = montarJogo({
        seriesId, seq, seriesType: 'SCRIM', startedAt,
        blue: nosAzul ? nos : rival, red: nosAzul ? rival : nos, ehPro: false,
      })
      grid_game_teams.push(...g.linhasTime)
      grid_game_players.push(...g.players)
    }
    grid_series.push({ series_id: seriesId, series_type: 'SCRIM', start_time: startedAt, tournament_name: null, team_ids: [nos.id, rival.id], valid: true, games_ingested: 3 })
  }

  // Campeonato (fictício): séries MD3 entre os times "pro" de mentira.
  const confrontos = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]]
  let p = 0
  for (let rodada = 0; rodada < 4; rodada++) {
    for (const [a, b] of confrontos) {
      const A = PRO_TEAMS[a], B = PRO_TEAMS[b]
      if (A.league !== B.league && rodada < 2) continue
      const seriesId = `demo-pro-${++p}`
      const dias = 60 - rodada * 14 - int(0, 6)
      const startedAt = diasAtras(Math.max(1, dias), 16)
      const patch = PATCHES[Math.min(PATCHES.length - 1, rodada)]
      const league = A.league === B.league ? A.league : 'MSI'
      const tournament = league === 'MSI' ? 'MSI 2026 (demo)' : `${league} 2026 Split 2 (demo)`
      const jogos = int(2, 3)
      for (let seq = 1; seq <= jogos; seq++) {
        const g = montarJogo({
          seriesId, seq, seriesType: 'ESPORTS', startedAt,
          blue: seq % 2 ? A : B, red: seq % 2 ? B : A, ehPro: true,
        })
        grid_game_teams.push(...g.linhasTime)
        grid_game_players.push(...g.players)
        grid_pro_games.push({ ...g.proGame, patch, league, tournament_name: tournament })
      }
      grid_series.push({ series_id: seriesId, series_type: 'ESPORTS', start_time: startedAt, tournament_name: tournament, team_ids: [A.id, B.id], valid: true, games_ingested: jogos })
    }
  }

  const grid_teams = [...SCRIM_TEAMS, ...PRO_TEAMS].map((t) => ({ team_id: t.id, team_name: t.name, league: t.league, region: t.region }))

  return { grid_game_teams, grid_game_players, grid_pro_games, grid_series, grid_teams, grid_pro_cursor: [] }
}
