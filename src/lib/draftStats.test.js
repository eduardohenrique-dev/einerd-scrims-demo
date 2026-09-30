import { describe, it, expect } from 'vitest'
import {
  collectPickRecords, matchupsForChamp,
  champKey, matchGridTeamId, resolveGridTeamId, aggregateKdaByChampion, kdaRatio,
} from './draftStats.js'

// Bloco mínimo: EiNerd (blue) vs Tigres (red), 2 jogos com resultado.
const BLOCKS = [
  {
    date: '2026-07-10',
    games: [
      {
        result: 'win', ourSide: 'blue',
        blue: { team: 'EiNerd', picks: [{ role: 'Mid', championId: 'ahri' }, { role: 'Top', championId: 'ornn' }] },
        red: { team: 'Tigres', picks: [{ role: 'Mid', championId: 'ryze' }, { role: 'Top', championId: 'rumble' }] },
      },
      {
        result: 'loss', ourSide: 'red',
        blue: { team: 'Tigres', picks: [{ role: 'Mid', championId: 'ryze' }] },
        red: { team: 'EiNerd', picks: [{ role: 'Mid', championId: 'ahri' }, { role: 'Jng', championId: 'vi' }] },
      },
    ],
  },
]

describe('collectPickRecords (matchups)', () => {
  const records = collectPickRecords(BLOCKS)

  it('emite oppChampionId da mesma lane do outro lado', () => {
    const ahriG1 = records.find((r) => r.championId === 'ahri' && r.win)
    expect(ahriG1.oppChampionId).toBe('ryze')
    expect(ahriG1.oppTeamName).toBe('Tigres')
    expect(ahriG1.date).toBe('2026-07-10')
  })

  it('lane sem pick adversário → oppChampionId null', () => {
    const vi = records.find((r) => r.championId === 'vi')
    expect(vi.oppChampionId).toBe(null)
  })

  it('resultado invertido para o adversário', () => {
    const ryzeRecs = records.filter((r) => r.championId === 'ryze')
    expect(ryzeRecs.map((r) => r.win).sort()).toEqual([false, true])
  })
})

describe('matchupsForChamp', () => {
  const records = collectPickRecords(BLOCKS)

  it('agrupa por campeão adversário com V/D e jogos', () => {
    const { matchups } = matchupsForChamp(records, 'EiNerd', 'ahri')
    expect(matchups).toHaveLength(1)
    expect(matchups[0].championId).toBe('ryze')
    expect(matchups[0].wins).toBe(1)
    expect(matchups[0].losses).toBe(1)
    expect(matchups[0].games).toHaveLength(2)
    expect(matchups[0].games.every((g) => g.oppTeamName === 'Tigres')).toBe(true)
  })

  it('picks sem matchup vão para unknown', () => {
    const { matchups, unknown } = matchupsForChamp(records, 'EiNerd', 'vi')
    expect(matchups).toHaveLength(0)
    expect(unknown.losses).toBe(1)
  })

  it('filtro por role não mistura lanes', () => {
    const { matchups } = matchupsForChamp(records, 'EiNerd', 'ahri', 'Mid')
    expect(matchups[0].wins + matchups[0].losses).toBe(2)
    const empty = matchupsForChamp(records, 'EiNerd', 'ahri', 'Top')
    expect(empty.matchups).toHaveLength(0)
  })
})

describe('KDA via GRID', () => {
  it('champKey normaliza e aplica aliases da Riot', () => {
    expect(champKey('Lee Sin')).toBe('leesin')
    expect(champKey('LeeSin')).toBe('leesin')
    expect(champKey("Cho'Gath")).toBe('chogath')
    expect(champKey('MonkeyKing')).toBe('wukong')
    expect(champKey('Wukong')).toBe('wukong')
  })

  it('matchGridTeamId casa nomes que não batem 1:1', () => {
    const grid = [
      { id: '900001', name: 'Ei Nerd Esports' },
      { id: '52835', name: 'Tigres Gaming Academy' },
      { id: 'roster:farol-cblol', name: 'Farol CBLOL' },
    ]
    expect(matchGridTeamId(grid, 'EiNerd')).toBe('900001')            // contido
    expect(matchGridTeamId(grid, 'Farol CBLOL')).toBe('roster:farol-cblol') // exato
    expect(matchGridTeamId(grid, 'Tigres Academy')).toBe('52835')      // por tokens
    expect(matchGridTeamId(grid, 'Time Inexistente')).toBe(null)
  })

  it('resolveGridTeamId prioriza o vínculo fixado sobre o nome', () => {
    const grid = [
      { id: '900001', name: 'Ei Nerd Esports' },
      { id: '52835', name: 'Tigres Gaming Academy' },
      { id: '4104', name: 'RED Kalunga Academy' },
    ]
    // Sem gridTeamId: cai no palpite por nome (comportamento antigo).
    expect(resolveGridTeamId({ name: 'EiNerd' }, grid)).toBe('900001')
    // Com gridTeamId: o nome deixa de importar — é isso que sobrevive a um
    // rename em Configurações, que antes trocava/perdia o vínculo em silêncio.
    expect(resolveGridTeamId({ name: 'RED', gridTeamId: '4104' }, grid)).toBe('4104')
    expect(resolveGridTeamId({ name: 'Ei Nerd Esports', gridTeamId: '52835' }, grid)).toBe('52835')
    // Id fixado que sumiu dos dados não pode travar o time sem KPI: volta pro nome.
    expect(resolveGridTeamId({ name: 'EiNerd', gridTeamId: '99999' }, grid)).toBe('900001')
    expect(resolveGridTeamId(null, grid)).toBe(null)
  })

  it('aggregateKdaByChampion soma K/D/A e jogos por campeão', () => {
    const rows = [
      { champion: 'Ahri', kills: 5, deaths: 2, assists: 7 },
      { champion: 'ahri', kills: 3, deaths: 0, assists: 5 },
      { champion: 'Vi', kills: 1, deaths: 4, assists: 2 },
    ]
    const m = aggregateKdaByChampion(rows)
    expect(m.get('ahri')).toEqual({ games: 2, kills: 8, deaths: 2, assists: 12 })
    expect(m.get('vi').games).toBe(1)
  })

  it('kdaRatio calcula (K+A)/D e trata D=0', () => {
    expect(kdaRatio({ kills: 8, deaths: 2, assists: 12 })).toBe(10)
    expect(kdaRatio({ kills: 3, deaths: 0, assists: 5 })).toBe(Infinity)
  })
})
