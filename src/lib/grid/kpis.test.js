// Testes da camada de KPIs (vitest). Rode com: npm test
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  parseIsoDurationSec, normalizeGame, aggregatePlayers, aggregateTeams, mergeMatchStats,
  extractTimeline15, mergeTimelineStats, classifyWards, buildProGame, patchAtLeast, parseLeague,
  aggregateObjectives, ROSTER_OVERRIDES, PLAYER_ID_ALIASES,
} from './kpis.js'

describe('aggregateObjectives (Macro Intel)', () => {
  const rows = [
    { won: true, barons: 1, dragons: 4, heralds: 1, grubs: 3, first_tower: true, first_dragon: true, first_blood: true },
    { won: true, barons: 2, dragons: 4, heralds: 0, grubs: 5, first_tower: true, first_dragon: false, first_blood: false },
    { won: false, barons: 0, dragons: 2, heralds: 1, grubs: 1, first_tower: false, first_dragon: true, first_blood: true },
    { won: false, barons: 0, dragons: 0, heralds: 0, grubs: 0, first_tower: false, first_dragon: false, first_blood: false },
  ]
  it('calcula rate/WR/avg condicional dos objetivos', () => {
    const o = aggregateObjectives(rows)
    expect(o.games).toBe(4)
    // baron em 2/4 jogos, ambos vitórias
    expect(o.baron.games).toBe(2)
    expect(o.baron.rate).toBeCloseTo(0.5)
    expect(o.baron.wr).toBeCloseTo(1)
    expect(o.baron.avg).toBeCloseTo(0.75) // (1+2+0+0)/4
    // alma (>=4 dragões) em 2/4, ambas vitórias
    expect(o.soul.games).toBe(2)
    expect(o.soul.wr).toBeCloseTo(1)
    // 1º dragão em 2/4 (1 vitória, 1 derrota) → WR 50%
    expect(o.firstDragon.games).toBe(2)
    expect(o.firstDragon.wr).toBeCloseTo(0.5)
    // grubs >=3 em 2/4, ambas vitórias
    expect(o.grubs.games).toBe(2)
    expect(o.grubs.wr).toBeCloseTo(1)
  })
  it('não quebra com lista vazia', () => {
    const o = aggregateObjectives([])
    expect(o.games).toBe(0)
    expect(o.baron.wr).toBeNull()
    expect(o.baron.rate).toBe(0)
  })
  it('first_dragon/first_tower/first_blood nulos (ex.: backfill de replay) não diluem a taxa', () => {
    // 2 jogos com dado normal (GRID) + 2 jogos sem esse dado (null, ex.: .rofl).
    // A taxa deve considerar só os jogos com dado conhecido, não os 4.
    const rows = [
      { won: true, first_tower: true, first_dragon: true, first_blood: true },
      { won: false, first_tower: false, first_dragon: false, first_blood: false },
      { won: true, first_tower: null, first_dragon: null, first_blood: null },
      { won: false, first_tower: null, first_dragon: null, first_blood: null },
    ]
    const o = aggregateObjectives(rows)
    expect(o.firstTower.games).toBe(1)
    expect(o.firstTower.rate).toBeCloseTo(0.5) // 1/2 jogos com dado conhecido, não 1/4
    expect(o.firstDragon.rate).toBeCloseTo(0.5)
    expect(o.firstBlood.rate).toBeCloseTo(0.5)
  })
})

describe('pro play (buildProGame)', () => {
  it('patchAtLeast e parseLeague', () => {
    expect(patchAtLeast('16.13')).toBe(true)
    expect(patchAtLeast('16.12')).toBe(true)
    expect(patchAtLeast('16.11')).toBe(false)
    expect(patchAtLeast('15.24')).toBe(false)
    expect(parseLeague('LCK - Split 2 2026 (Road to MSI)')).toBe('LCK')
    expect(parseLeague('LEC - Summer 2026')).toBe('LEC')
    expect(parseLeague('CBLOL 2026 Split 2')).toBe('CBLOL')
    expect(parseLeague('Esports World Cup - 2026 (Playoffs: Playoffs)')).toBe('EWC')
  })
  it('extrai draft, resultado e objetivos', () => {
    // firstPickId = quem faz a 1ª ação de PICK (varia; não é sempre blue)
    const mkDraft = (blueId, redId, firstPickId) => {
      const acts = []; let seq = 1
      for (let i = 0; i < 5; i++) { acts.push({ sequenceNumber: String(seq++), type: 'ban', drafter: { id: blueId }, draftable: { name: `bb${i}` } }); acts.push({ sequenceNumber: String(seq++), type: 'ban', drafter: { id: redId }, draftable: { name: `rb${i}` } }) }
      const first = firstPickId, second = firstPickId === blueId ? redId : blueId
      const nameFor = (id, i) => (id === blueId ? `bp${i}` : `rp${i}`)
      for (let i = 0; i < 5; i++) { acts.push({ sequenceNumber: String(seq++), type: 'pick', drafter: { id: first }, draftable: { name: nameFor(first, i) } }); acts.push({ sequenceNumber: String(seq++), type: 'pick', drafter: { id: second }, draftable: { name: nameFor(second, i) } }) }
      return acts
    }
    const game = {
      finished: true, titleVersion: { name: '16.13' },
      teams: [
        { id: 'B', name: 'Blue', side: 'blue', won: true, structuresDestroyed: 9, firstKill: true, objectives: [{ type: 'slayDragon', completedFirst: true, completionCount: 3 }, { type: 'slayBaron', completionCount: 1 }] },
        { id: 'R', name: 'Red', side: 'red', won: false, structuresDestroyed: 2, firstKill: false, objectives: [] },
      ],
      draftActions: mkDraft('B', 'R', 'B'),
    }
    const pg = buildProGame({ seriesId: 'S', gameSeq: 1, startTime: '2026-07-01', tournamentName: 'LEC - Summer 2026' }, game)
    expect(pg.winner).toBe('blue')
    expect(pg.league).toBe('LEC')
    expect(pg.patch).toBe('16.13')
    expect(pg.first_pick).toBe('blue')
    expect(pg.blue_picks).toEqual(['bp0', 'bp1', 'bp2', 'bp3', 'bp4'])
    expect(pg.red_bans).toHaveLength(5)
    expect(pg.blue_obj.dragons).toBe(3)
    expect(pg.blue_obj.firstBlood).toBe(true)
  })

  it('first_pick pode ser RED side (não é sempre blue)', () => {
    const acts = []; let seq = 1
    for (let i = 0; i < 10; i++) acts.push({ sequenceNumber: String(seq++), type: 'ban', drafter: { id: i % 2 ? 'R' : 'B' }, draftable: { name: `b${i}` } })
    // RED faz o 1º pick
    const order = ['R', 'B', 'B', 'R', 'R', 'B', 'B', 'R', 'R', 'B']
    order.forEach((id, i) => acts.push({ sequenceNumber: String(seq++), type: 'pick', drafter: { id }, draftable: { name: `${id}${i}` } }))
    const game = {
      finished: true, titleVersion: { name: '16.13' },
      teams: [{ id: 'B', name: 'Blue', side: 'blue', won: false, objectives: [] }, { id: 'R', name: 'Red', side: 'red', won: true, objectives: [] }],
      draftActions: acts,
    }
    const pg = buildProGame({ seriesId: 'S', gameSeq: 2, tournamentName: 'MSI' }, game)
    expect(pg.first_pick).toBe('red')
    expect(pg.winner).toBe('red')
  })
})

describe('classifyWards (Vision Radar)', () => {
  it('separa pink (control) de amarela e agrupa por lado, ignorando unknown', () => {
    const raw = [
      { t: 1, x: 100, y: 200, placer: 2, type: 'yellowTrinket' },
      { t: 2, x: 300, y: 400, placer: 4, type: 'control' },
      { t: 3, x: 500, y: 600, placer: 8, type: 'sight' },
      { t: 4, x: 700, y: 800, placer: 9, type: 'control' },
      { t: 0, x: 900, y: 100, placer: 5, type: 'unknown' },   // descartada
      { t: 0, x: 900, y: 100, placer: 0, type: 'control' },   // placer inválido
    ]
    const cw = classifyWards(raw)
    expect(cw.blue).toHaveLength(2)
    expect(cw.red).toHaveLength(2)
    expect(cw.blue.filter((w) => w.kind === 'pink')).toHaveLength(1)
    expect(cw.red.filter((w) => w.kind === 'pink')).toHaveLength(1)
    expect(cw.blue[0]).toEqual({ t: 1, x: 100, y: 200, kind: 'yellow' })
  })
})

// helper: gera N jogadores "filler" para completar o roster 5v5.
const fillers = (prefix, n) => Array.from({ length: n }, (_, i) => ({
  id: `${prefix}${i}`, name: `${prefix}${i}`, character: { name: 'Champ' },
  kills: 1, deaths: 1, killAssistsGiven: 1, netWorth: 5000, firstKill: false,
  unitKills: [{ unitName: 'minion', count: 100 }],
}))

const META = { seriesId: 'S1', gameSeq: 1, seriesType: 'SCRIM', titleId: '3', startedAt: '2026-07-02T17:00:00Z' }

// Jogo válido: terminou, 20min, 5v5. Time A (blue) vence.
const GAME = {
  finished: true, duration: 'PT20M0S',
  teams: [
    {
      id: 'A', name: 'EiNerd', side: 'blue', won: true,
      kills: 20, deaths: 10, killAssistsGiven: 45, netWorth: 40000, structuresDestroyed: 8, firstKill: true,
      objectives: [
        { type: 'slayDragon', completedFirst: true, completionCount: 3 },
        { type: 'slayRiftHerald', completedFirst: true, completionCount: 1 },
        { type: 'slayBaron', completedFirst: false, completionCount: 1 },
        { type: 'destroyTower', completedFirst: true, completionCount: 8 },
        { type: 'destroyTurretPlateTop1', completedFirst: true, completionCount: 3 },
        { type: 'destroyTurretPlateMid1', completedFirst: false, completionCount: 2 },
        { type: 'destroyTurretPlateBot1', completedFirst: false, completionCount: 1 },
      ],
      unitKills: [{ unitName: 'minion', count: 600 }, { unitName: 'neutralMinion', count: 120 }, { unitName: 'ward', count: 30 }],
      players: [
        { id: 'p1', name: 'Rocha', character: { name: 'Jinx' }, kills: 8, deaths: 2, killAssistsGiven: 10, netWorth: 12000, firstKill: true,
          unitKills: [{ unitName: 'minion', count: 220 }, { unitName: 'ward', count: 2 }] },
        { id: 'p2', name: 'Cipó', character: { name: 'Lee Sin' }, kills: 4, deaths: 3, killAssistsGiven: 12, netWorth: 9000, firstKill: false,
          unitKills: [{ unitName: 'neutralMinion', count: 150 }, { unitName: 'minion', count: 20 }] },
        ...fillers('af', 3),
      ],
    },
    {
      id: 'B', name: 'Tigres Academy', side: 'red', won: false,
      kills: 10, deaths: 20, killAssistsGiven: 22, netWorth: 32000, structuresDestroyed: 2, firstKill: false,
      objectives: [{ type: 'slayDragon', completedFirst: false, completionCount: 1 }],
      unitKills: [{ unitName: 'minion', count: 500 }, { unitName: 'neutralMinion', count: 100 }],
      players: fillers('bf', 5),
    },
  ],
}

describe('parseIsoDurationSec', () => {
  it('converte ISO-8601 em segundos', () => {
    expect(parseIsoDurationSec('PT20M0S')).toBe(1200)
    expect(parseIsoDurationSec('PT36M25.013S')).toBeCloseTo(2185.013, 2)
    expect(parseIsoDurationSec('PT1H2M3S')).toBe(3723)
    expect(parseIsoDurationSec('PT0S')).toBe(0)
    expect(parseIsoDurationSec(null)).toBe(0)
  })
})

describe('normalizeGame — filtros de sanidade', () => {
  it('descarta jogo não finalizado (remake/andamento)', () => {
    expect(normalizeGame(META, { ...GAME, finished: false })).toBeNull()
  })
  it('descarta remake curto (<5min)', () => {
    expect(normalizeGame(META, { ...GAME, duration: 'PT3M0S' })).toBeNull()
  })
  it('descarta captura quebrada (>60min)', () => {
    expect(normalizeGame(META, { ...GAME, duration: 'PT1H32M0S' })).toBeNull()
  })
  it('pula só o time incompleto (5x4), mantendo o time completo', () => {
    // Time A com 4 jogadores (incompleto), time B com 5 (completo).
    const g = { ...GAME, teams: [{ ...GAME.teams[0], players: fillers('x', 4) }, GAME.teams[1]] }
    const norm = normalizeGame(META, g)
    expect(norm.teams).toHaveLength(1)          // só o time B entra
    expect(norm.teams[0].team_id).toBe('B')
    expect(norm.players.every((p) => p.team_id === 'B')).toBe(true)
  })
  it('retorna null se NENHUM time está completo', () => {
    const g = { ...GAME, teams: [{ ...GAME.teams[0], players: fillers('x', 4) }, { ...GAME.teams[1], players: fillers('y', 3) }] }
    expect(normalizeGame(META, g)).toBeNull()
  })
  it('descarta jogo sem ouro (vazio)', () => {
    const g = { ...GAME, teams: GAME.teams.map((t) => ({ ...t, netWorth: 0 })) }
    expect(normalizeGame(META, g)).toBeNull()
  })
})

describe('normalizeGame — ROSTER_OVERRIDES', () => {
  // A lista de overrides vem vazia; estes testes registram uma entrada fictícia e a removem depois.
  const entrada = { canonicalId: 'roster:aurora', name: 'Aurora Five', playerIds: ['9001', '9002', '9003', '9004', '9005'] }
  beforeAll(() => { ROSTER_OVERRIDES.push(entrada) })
  afterAll(() => { ROSTER_OVERRIDES.splice(ROSTER_OVERRIDES.indexOf(entrada), 1) })
  // Regressão: quando um time tem override (ex.: um elenco → "Aurora Five", nome
  // provisório "LOL-1" na GRID), o LOOP que monta teams/players tinha um bug
  // em que iterava sobre `game.teams` (cru, sem override) em vez de `[a, b]`
  // (com override aplicado). Isso quebrava a comparação por referência
  // dentro de `opp()`, fazendo o time virar "adversário de si mesmo" e o
  // nome ficar desatualizado.
  const rmdPlayers = ['9001', '9002', '9003', '9004', '9005'].map((id) => ({ id, name: 'x', character: { name: 'Ahri' }, kills: 0, deaths: 0, killAssistsGiven: 0, netWorth: 0, unitKills: [] }))
  it('identifica o time pelo elenco (não pelo team_id, que a GRID reaproveita) e mantém o adversário correto', () => {
    const g = { ...GAME, teams: [{ ...GAME.teams[0], id: '52987', name: 'LOL-1', players: rmdPlayers }, { ...GAME.teams[1], id: '900001', name: 'Ei Nerd Esports' }] }
    const { teams } = normalizeGame(META, g)
    const rmd = teams.find((t) => t.team_id === 'roster:aurora')
    const einerd = teams.find((t) => t.team_id === '900001')
    expect(rmd.team_name).toBe('Aurora Five')
    expect(rmd.opponent_team_id).toBe('900001')
    expect(rmd.opponent_team_name).toBe('Ei Nerd Esports')
    expect(einerd.opponent_team_id).toBe('roster:aurora')
    expect(einerd.opponent_team_name).toBe('Aurora Five')
  })
  it('NÃO aplica o override se o team_id bate mas o elenco é outro (GRID reaproveitou o id pra outra org)', () => {
    // Mesmo team_id "52987", mas elenco totalmente diferente (outra org usando
    // o id que a GRID reciclou) — não deve virar "Aurora Five".
    const g = { ...GAME, teams: [{ ...GAME.teams[0], id: '52987', name: 'LOL-1' }, GAME.teams[1]] }
    const { teams } = normalizeGame(META, g)
    const t = teams.find((t) => t.team_id === '52987')
    expect(t.team_name).toBe('LOL-1') // não some, mas também não vira Aurora Five por engano
  })
  it('funde LOL-1 e LOL-2 (dois team_ids genéricos) no mesmo time canônico "Aurora Five" pelo elenco', () => {
    const juvePlayers = ['9001', '9002', '9003', '9004', '9005'].map((id) => ({ id, name: 'x', character: { name: 'Ahri' }, kills: 0, deaths: 0, killAssistsGiven: 0, netWorth: 1, unitKills: [] }))
    // LOL-1 (52987) e LOL-2 (52988) são o MESMO time (mesmo elenco) → mesmo id canônico.
    const g1 = { ...GAME, teams: [{ ...GAME.teams[0], id: '52987', name: 'LOL-1', players: juvePlayers }, { ...GAME.teams[1], id: '900001', name: 'Ei Nerd Esports' }] }
    const g2 = { ...GAME, teams: [{ ...GAME.teams[0], id: '52988', name: 'LOL-2', players: juvePlayers }, { ...GAME.teams[1], id: '900001', name: 'Ei Nerd Esports' }] }
    const t1 = normalizeGame(META, g1).teams.find((t) => t.team_name === 'Aurora Five')
    const t2 = normalizeGame(META, g2).teams.find((t) => t.team_name === 'Aurora Five')
    expect(t1.team_id).toBe('roster:aurora')
    expect(t2.team_id).toBe('roster:aurora') // LOL-2 cai no MESMO id → agrega junto
  })
})

describe('normalizeGame — PLAYER_ID_ALIASES (conta reserva)', () => {
  // A tabela de aliases vem vazia; estes testes registram entradas fictícias e as removem depois.
  const aliases = { 9101: '9001', 9102: '9002', 9103: '9003' }
  beforeAll(() => { Object.assign(PLAYER_ID_ALIASES, aliases) })
  afterAll(() => { for (const k of Object.keys(aliases)) delete PLAYER_ID_ALIASES[k] })
  it('remapeia a conta reserva (9101) para o jogador canônico (9001)', () => {
    // O jogador usou a conta reserva num jogo; o dado deve contar para a conta principal.
    const g = { ...GAME, teams: [{ ...GAME.teams[0], players: [{ id: '9101', name: 'Reserva', character: { name: 'Aatrox' }, kills: 1, deaths: 1, killAssistsGiven: 1, netWorth: 1, unitKills: [] }, ...fillers('af', 4)] }, GAME.teams[1]] }
    const { players } = normalizeGame(META, g)
    expect(players.some((p) => p.player_id === '9101')).toBe(false) // conta reserva some
    const drake = players.find((p) => p.player_id === '9001')
    expect(drake).toBeTruthy()
    expect(drake.id).toBe('S1:1:9001') // row id usa o id canônico (agrega por player_id)
  })
  it('funde duas contas reserva (9102→9002 e 9103→9003) nas principais', () => {
    const mk = (id) => ({ id, name: 'x', character: { name: 'Ziggs' }, kills: 1, deaths: 1, killAssistsGiven: 1, netWorth: 1, unitKills: [] })
    const g = { ...GAME, teams: [{ ...GAME.teams[0], players: [mk('9102'), mk('9103'), ...fillers('af', 3)] }, GAME.teams[1]] }
    const { players } = normalizeGame(META, g)
    expect(players.some((p) => p.player_id === '9102' || p.player_id === '9103')).toBe(false)
    expect(players.some((p) => p.player_id === '9002')).toBe(true)
    expect(players.some((p) => p.player_id === '9003')).toBe(true)
  })
})

describe('normalizeGame — normalização', () => {
  it('usa killAssistsGiven como assists (não Received)', () => {
    const { players } = normalizeGame(META, GAME)
    const makes = players.find((p) => p.player_id === 'p1')
    expect(makes.assists).toBe(10) // killAssistsGiven, não Received
  })
  it('normaliza CS, objetivos e espelho do oponente', () => {
    const { teams } = normalizeGame(META, GAME)
    const a = teams.find((t) => t.team_id === 'A')
    expect(a.cs).toBe(720)          // 600 minion + 120 neutral (ward fora)
    expect(a.wards_cleared).toBe(30)
    expect(a.dragons).toBe(3)
    expect(a.first_dragon).toBe(true)
    expect(a.plates_top).toBe(3)
    expect(a.opp_gold).toBe(32000)
    expect(a.duration_sec).toBe(1200)
  })
})

describe('aggregatePlayers', () => {
  it('KP nunca passa de 100% e usa assists corretos', () => {
    const { players } = normalizeGame(META, GAME)
    const agg = aggregatePlayers(players)
    const makes = agg.find((p) => p.name === 'Rocha')
    expect(makes.kda).toBeCloseTo((8 + 10) / 2, 5)
    expect(makes.csPerMin).toBeCloseTo(220 / 20, 5)
    expect(makes.goldShare).toBeCloseTo(12000 / 40000, 5)
    expect(makes.killParticipation).toBeCloseTo((8 + 10) / 20, 5) // 0.90
    expect(makes.killParticipation).toBeLessThanOrEqual(1)
    // todos os jogadores do time têm KP <= 100%
    for (const p of agg) expect(p.killParticipation).toBeLessThanOrEqual(1)
  })

  it('mesma contagem de jogos para todos ao empilhar jogos válidos', () => {
    const g2 = { ...GAME, seriesId: 'S2' }
    const rows = [
      ...normalizeGame({ ...META, seriesId: 'S1' }, GAME).players,
      ...normalizeGame({ ...META, seriesId: 'S2' }, g2).players,
    ]
    const agg = aggregatePlayers(rows.filter((r) => r.team_id === 'A'))
    for (const p of agg) expect(p.games).toBe(2)
  })

  it('jogo sem stats (backfill .rofl) conta no games e no pool, mas NÃO dilui as médias', () => {
    // 1 jogo real (Rocha: 8/2/10, Jinx, 220 CS em 20min) + 1 jogo só com
    // campeão/role (stats null, ex.: .rofl sem statsJson — Aatrox).
    const real = normalizeGame(META, GAME).players.find((p) => p.player_id === 'p1')
    const statless = {
      ...real, id: 'S2:1:p1', series_id: 'S2', champion: 'Aatrox', role: 'Top',
      kills: null, deaths: null, assists: null, gold: null, cs: null,
      duration_sec: 1500, team_kills: null, team_gold: null, damage: null,
    }
    const [makes] = aggregatePlayers([real, statless])
    expect(makes.games).toBe(2)                       // conta os 2 jogos
    expect(Object.keys(makes.champions).sort()).toEqual(['Aatrox', 'Jinx']) // pool com os 2
    expect(makes.kda).toBeCloseTo((8 + 10) / 2, 5)    // KDA idêntico ao do jogo real
    expect(makes.csPerMin).toBeCloseTo(220 / 20, 5)   // não diluído pelo jogo sem stats
    expect(makes.kills).toBeCloseTo(8, 5)             // por jogo COM stats, não /2
  })
})

describe('mergeMatchStats (Fase 2A)', () => {
  // match file com championName no formato Riot (Chogath sem apóstrofo; MonkeyKing=Wukong)
  const MATCH = {
    participants: [
      // time azul (100) = mesmos campeões do GAME.teams[0]... mas GAME usa fillers "Champ".
      { teamId: 100, championName: 'Jinx', totalDamageDealtToChampions: 20000, visionScore: 20, wardsPlaced: 10, wardsKilled: 4, detectorWardsPlaced: 2 },
      { teamId: 100, championName: 'LeeSin', totalDamageDealtToChampions: 12000, visionScore: 30, wardsPlaced: 12, wardsKilled: 8, detectorWardsPlaced: 5 },
      { teamId: 100, championName: 'Champ', totalDamageDealtToChampions: 8000, visionScore: 10, wardsPlaced: 5, wardsKilled: 2, detectorWardsPlaced: 1 },
      { teamId: 100, championName: 'Champ', totalDamageDealtToChampions: 8000, visionScore: 10, wardsPlaced: 5, wardsKilled: 2, detectorWardsPlaced: 1 },
      { teamId: 100, championName: 'Champ', totalDamageDealtToChampions: 8000, visionScore: 10, wardsPlaced: 5, wardsKilled: 2, detectorWardsPlaced: 1 },
      ...Array.from({ length: 5 }, () => ({ teamId: 200, championName: 'Champ', totalDamageDealtToChampions: 5000, visionScore: 12, wardsPlaced: 6, wardsKilled: 3, detectorWardsPlaced: 1 })),
    ],
  }
  it('casa por campeão e injeta dano/visão/wards', () => {
    const norm = normalizeGame(META, GAME)
    mergeMatchStats(norm, MATCH)
    const makes = norm.players.find((p) => p.player_id === 'p1') // Jinx
    expect(makes.damage).toBe(20000)
    expect(makes.vision_score).toBe(20)
    expect(makes.wards_placed).toBe(10)
    expect(makes.control_wards).toBe(2)
    expect(makes.team_damage).toBe(20000 + 12000 + 8000 * 3) // soma do time azul
    const teamA = norm.teams.find((t) => t.team_id === 'A')
    expect(teamA.damage).toBe(20000 + 12000 + 8000 * 3)
    expect(teamA.opp_wards_placed).toBe(6 * 5) // wards do time vermelho
  })
  it('aggregatePlayers calcula Dano% e vision/min', () => {
    const norm = normalizeGame(META, GAME)
    mergeMatchStats(norm, MATCH)
    const agg = aggregatePlayers(norm.players.filter((p) => p.team_id === 'A'))
    const makes = agg.find((p) => p.name === 'Rocha')
    expect(makes.damageShare).toBeCloseTo(20000 / (20000 + 12000 + 24000), 5)
    expect(makes.visionPerMin).toBeCloseTo(20 / 20, 5)
  })
})

describe('mergeTimelineStats (Fase 2B @15)', () => {
  // timeline mínimo: 1 frame @15min. Blue (1-5) na frente em ouro/cs.
  const TL = {
    frames: [
      { timestamp: 900000, participantFrames: {
        1: { totalGold: 6000, minionsKilled: 120, jungleMinionsKilled: 0, xp: 9000 },
        2: { totalGold: 5000, minionsKilled: 20, jungleMinionsKilled: 90, xp: 8000 },
        3: { totalGold: 5500, minionsKilled: 110, jungleMinionsKilled: 0, xp: 8500 },
        4: { totalGold: 6500, minionsKilled: 130, jungleMinionsKilled: 0, xp: 9200 },
        5: { totalGold: 4000, minionsKilled: 15, jungleMinionsKilled: 0, xp: 6000 },
        6: { totalGold: 5500, minionsKilled: 110, jungleMinionsKilled: 0, xp: 8500 },
        7: { totalGold: 4800, minionsKilled: 18, jungleMinionsKilled: 80, xp: 7500 },
        8: { totalGold: 5200, minionsKilled: 100, jungleMinionsKilled: 0, xp: 8100 },
        9: { totalGold: 5800, minionsKilled: 115, jungleMinionsKilled: 0, xp: 8800 },
        10: { totalGold: 3800, minionsKilled: 12, jungleMinionsKilled: 0, xp: 5500 },
      },
        events: [
          { type: 'CHAMPION_KILL', timestamp: 120000, killerId: 1, victimId: 10 },
          { type: 'BUILDING_KILL', buildingType: 'TOWER_BUILDING', killerId: 4, timestamp: 800000 },
          { type: 'ELITE_MONSTER_KILL', monsterType: 'DRAGON', killerTeamId: 100, timestamp: 500000 },
        ] },
    ],
  }
  it('extractTimeline15 soma por time e conta objetivos', () => {
    const t = extractTimeline15(TL)
    expect(t.teamGold[100]).toBe(6000 + 5000 + 5500 + 6500 + 4000) // 27000
    expect(t.teamGold[200]).toBe(5500 + 4800 + 5200 + 5800 + 3800) // 25100
    expect(t.towers[100]).toBe(1)
    expect(t.dragons[100]).toBe(1)
    expect(t.fbVictim).toBe(10)
  })
  it('mergeTimelineStats injeta diffs por time e por jogador', () => {
    const norm = normalizeGame(META, GAME)
    // seta participant_id nos jogadores do time A (blue) → pids 1..5
    norm.players.filter((p) => p.side === 'blue').forEach((p, i) => { p.participant_id = i + 1 })
    mergeTimelineStats(norm, TL)
    const teamA = norm.teams.find((t) => t.team_id === 'A') // blue
    expect(teamA.gold15_diff).toBe(27000 - 25100) // +1900
    expect(teamA.tower15_diff).toBe(1)
    expect(teamA.dragons15).toBe(1)
    expect(teamA.ahead15).toBe(true)
    const p1 = norm.players.find((p) => p.participant_id === 1)
    expect(p1.gold15).toBe(6000)
    expect(p1.gold15_diff).toBe(6000 - 5500) // vs pid 6
  })
})

describe('aggregateTeams', () => {
  it('calcula winrate por lado, diffs e objetivos por jogo', () => {
    const { teams } = normalizeGame(META, GAME)
    const agg = aggregateTeams(teams)
    const einerd = agg.find((t) => t.name === 'EiNerd')
    expect(einerd.winrate).toBe(1)
    expect(einerd.winrateBlue).toBe(1)
    expect(einerd.goldPerMin).toBeCloseTo(40000 / 20, 5)
    expect(einerd.goldDiffPerMin).toBeCloseTo((40000 - 32000) / 20, 5)
    expect(einerd.avgTowerDiff).toBe(8 - 2)
    expect(einerd.dragonPriority).toBe(1)
    expect(einerd.platesTop).toBe(3)
  })
})
