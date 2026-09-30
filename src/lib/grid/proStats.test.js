import { describe, it, expect } from 'vitest'
import { aggregateChampions, aggregateMacro, tierOf, aggregateLaneChampions, championMatchups } from './proStats.js'
import { extractLanes } from './kpis.js'

const mkGame = (o) => ({
  blue_picks: o.bp || [], red_picks: o.rp || [], blue_bans: o.bb || [], red_bans: o.rb || [],
  winner: o.w, blue_obj: o.bo || {}, red_obj: o.ro || {},
})

describe('aggregateChampions', () => {
  it('conta pick/ban/win e presença, com tier', () => {
    const games = [
      mkGame({ bp: ['Vi', 'Ahri'], rp: ['Lee Sin'], bb: ['Kaisa'], rb: [], w: 'blue' }),
      mkGame({ bp: ['Vi'], rp: ['Ahri'], bb: [], rb: ['Kaisa'], w: 'red' }),
    ]
    const c = aggregateChampions(games)
    const vi = c.find((x) => x.name === 'Vi')
    expect(vi.picks).toBe(2); expect(vi.wins).toBe(1); expect(vi.winrate).toBe(0.5)
    const kaisa = c.find((x) => x.name === 'Kaisa')
    expect(kaisa.bans).toBe(2); expect(kaisa.picks).toBe(0)
    expect(vi.presence).toBe(1) // apareceu nos 2 jogos
  })
  it('tierOf por presença', () => {
    expect(tierOf(0.5)).toBe('S'); expect(tierOf(0.3)).toBe('A'); expect(tierOf(0.1)).toBe('B'); expect(tierOf(0.02)).toBe('C')
  })
})

describe('extractLanes (lane pela timeline)', () => {
  // Posições no início (origem inferior-esquerda): top=y>x, bot=x>y, mid=x≈y.
  const pf = (x, y, jg = 0, cs = 30) => ({ position: { x, y }, jungleMinionsKilled: jg, minionsKilled: cs })
  const frame = (ts, teamPos) => ({ timestamp: ts, participantFrames: teamPos })
  it('classifica as 5 roles por posição/CS/jungle', () => {
    // blue (1-5): top(2000,12000) jg(cs jungle) mid(7000,7000) adc(12000,2000,cs alto) sup(11000,3000,cs baixo)
    const posFrame = {
      1: pf(2000, 12000), 2: pf(6000, 6000, 20), 3: pf(7000, 7000),
      4: pf(12000, 2000, 0, 80), 5: pf(11000, 3000, 0, 5),
      6: pf(2500, 11500), 7: pf(9000, 9000, 20), 8: pf(8000, 8000),
      9: pf(12500, 2500, 0, 85), 10: pf(11500, 3500, 0, 4),
    }
    const csFrame = {
      1: pf(0, 0, 0, 70), 2: pf(0, 0, 60, 5), 3: pf(0, 0, 0, 75),
      4: pf(0, 0, 0, 90), 5: pf(0, 0, 0, 15),
      6: pf(0, 0, 0, 72), 7: pf(0, 0, 60, 5), 8: pf(0, 0, 0, 74),
      9: pf(0, 0, 0, 95), 10: pf(0, 0, 0, 12),
    }
    const lanes = extractLanes({ frames: [frame(120000, posFrame), frame(600000, csFrame)] })
    expect(lanes['1']).toBe('Top')
    expect(lanes['2']).toBe('Jng')
    expect(lanes['3']).toBe('Mid')
    expect(lanes['4']).toBe('Bot') // mais CS na dupla bot
    expect(lanes['5']).toBe('Sup')
    // red (top-right é a base; mesma lógica de diff)
    expect(lanes['7']).toBe('Jng')
    expect(lanes['9']).toBe('Bot')
    expect(lanes['10']).toBe('Sup')
  })
  it('retorna null sem frames', () => { expect(extractLanes(null)).toBeNull() })
})

describe('aggregateLaneChampions / championMatchups', () => {
  // 2 jogos, lane Mid: G1 Ahri(blue,vence) vs Syndra(red); G2 Ahri(red,perde) vs Viktor(blue,vence)
  const rows = [
    { series_id: 'S', game_seq: 1, role: 'Mid', side: 'blue', champion: 'Ahri', won: true },
    { series_id: 'S', game_seq: 1, role: 'Mid', side: 'red', champion: 'Syndra', won: false },
    { series_id: 'S', game_seq: 2, role: 'Mid', side: 'red', champion: 'Ahri', won: false },
    { series_id: 'S', game_seq: 2, role: 'Mid', side: 'blue', champion: 'Viktor', won: true },
  ]
  it('agrega campeões da lane com winrate e presença', () => {
    const c = aggregateLaneChampions(rows)
    const ahri = c.find((x) => x.name === 'Ahri')
    expect(ahri.picks).toBe(2); expect(ahri.wins).toBe(1); expect(ahri.winrate).toBe(0.5)
    expect(ahri.presence).toBe(1) // apareceu nos 2 jogos
  })
  it('matchups do campeão pareando a MESMA lane do adversário', () => {
    const { games, wins, matchups } = championMatchups(rows, 'Ahri', 'Mid')
    expect(games).toBe(2); expect(wins).toBe(1)
    const vsSyndra = matchups.find((m) => m.opponent === 'Syndra')
    const vsViktor = matchups.find((m) => m.opponent === 'Viktor')
    expect(vsSyndra.winrate).toBe(1) // venceu a Syndra
    expect(vsViktor.winrate).toBe(0) // perdeu pro Viktor
  })
})

describe('aggregateMacro', () => {
  it('WR condicional de objetivos', () => {
    const games = [
      mkGame({ w: 'blue', bo: { barons: 1, dragons: 4, firstDragon: true }, ro: { barons: 0, dragons: 1 } }),
      mkGame({ w: 'red', bo: { barons: 0, dragons: 2 }, ro: { barons: 1, dragons: 4, firstDragon: true } }),
    ]
    const m = aggregateMacro(games)
    expect(m.teamGames).toBe(4)
    expect(m.baron.games).toBe(2); expect(m.baron.wr).toBe(1)     // quem pegou barão venceu nos 2
    expect(m.soul.games).toBe(2); expect(m.soul.wr).toBe(1)       // quem fez alma (4 drag) venceu
  })
})
