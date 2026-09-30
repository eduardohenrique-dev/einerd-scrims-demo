// Testes da camada de Builds & Runas (vitest). Rode com: npm test
import { describe, it, expect } from 'vitest'
import { classifyItem, slotsOfBuild, aggregateBuilds, aggregateMatchups } from './buildStats.js'

// Metadados mínimos no formato do item.json do Data Dragon.
const INFO = {
  1055: { name: "Doran's Blade", gold: { total: 450 }, tags: ['Lane'], into: [] },
  2003: { name: 'Health Potion', gold: { total: 50 }, tags: ['Consumable'] },
  3340: { name: 'Stealth Ward', gold: { total: 0 }, tags: ['Trinket'] },
  1001: { name: 'Boots', gold: { total: 300 }, tags: ['Boots'], into: [3006] },
  3047: { name: 'Plated Steelcaps', gold: { total: 1100 }, tags: ['Boots'], into: [] },
  3133: { name: 'Caulfield’s Warhammer', gold: { total: 1100 }, tags: ['Damage'], into: [6631] },
  6631: { name: 'Stridebreaker', gold: { total: 3300 }, tags: ['Damage'], into: [] },
  3071: { name: 'Black Cleaver', gold: { total: 3000 }, tags: ['Damage'], into: [] },
  3053: { name: "Sterak's Gage", gold: { total: 3200 }, tags: ['Health'], into: [] },
  6333: { name: "Death's Dance", gold: { total: 3100 }, tags: ['Damage'], into: [] },
}

describe('classifyItem', () => {
  it('separa consumível, trinket, componente, inicial, botas e lendário', () => {
    expect(classifyItem(2003, INFO)).toBe('consumable')
    expect(classifyItem(3340, INFO)).toBe('trinket')
    expect(classifyItem(1055, INFO)).toBe('starter')
    expect(classifyItem(1001, INFO)).toBe('component')  // botas tier 1 = componente
    expect(classifyItem(3047, INFO)).toBe('boots')      // botas tier 2 = slot
    expect(classifyItem(3133, INFO)).toBe('component')  // constrói em outro
    expect(classifyItem(6631, INFO)).toBe('legendary')
  })
  it('sem metadados vira unknown (degrada em vez de classificar errado)', () => {
    expect(classifyItem(99999, INFO)).toBe('unknown')
    expect(classifyItem(6631, null)).toBe('unknown')
  })
})

describe('slotsOfBuild', () => {
  it('pega o 1º inicial, as 1ªs botas e os lendários EM ORDEM', () => {
    const ordem = [
      { id: 1055, t: 0 }, { id: 2003, t: 0 },   // inicial + poção
      { id: 3133, t: 6 },                        // componente (ignorado)
      { id: 6631, t: 11 },                       // 1º lendário
      { id: 1001, t: 12 }, { id: 3047, t: 14 },  // botas t1 (ignorada) + t2
      { id: 3071, t: 20 },                       // 2º lendário
      { id: 3340, t: 1 },                        // trinket (ignorado)
    ]
    const s = slotsOfBuild(ordem, INFO)
    expect(s.starter).toBe(1055)
    expect(s.boots).toBe(3047)
    expect(s.legendaries).toEqual([6631, 3071])
  })
  it('não duplica lendário recomprado', () => {
    const s = slotsOfBuild([{ id: 3071 }, { id: 3071 }, { id: 3053 }], INFO)
    expect(s.legendaries).toEqual([3071, 3053])
  })
})

describe('aggregateBuilds', () => {
  const linha = (won, keystone, ordem, items) => ({
    won, keystone, perk_primary: 8000, perk_sub: 8300,
    perks: [keystone, 9111], stat_perks: { offense: 5008, flex: 5008, defense: 5011 },
    build_order: ordem, items,
  })
  const rows = [
    linha(true, 8010, [{ id: 1055 }, { id: 6631 }, { id: 3047 }, { id: 3071 }], [6631, 3071, 3047]),
    linha(false, 8010, [{ id: 1055 }, { id: 6631 }, { id: 3053 }], [6631, 3053]),
    linha(true, 8437, [{ id: 1055 }, { id: 3071 }, { id: 3047 }], [3071, 3047]),
  ]

  it('conta keystone com jogos, vitórias e WR', () => {
    const a = aggregateBuilds(rows, INFO)
    expect(a.games).toBe(3)
    expect(a.wins).toBe(2)
    const [conq] = a.keystone
    expect(conq.id).toBe(8010)
    expect(conq.games).toBe(2)
    expect(conq.wins).toBe(1)
    expect(conq.wr).toBeCloseTo(0.5)
    expect(conq.pick).toBeCloseTo(2 / 3)
  })

  it('separa 1º e 2º item pela ORDEM de compra', () => {
    const a = aggregateBuilds(rows, INFO)
    // 1º item: Stridebreaker 2x (1V), Black Cleaver 1x (1V)
    expect(a.item1.find((x) => x.id === 6631).games).toBe(2)
    expect(a.item1.find((x) => x.id === 3071).games).toBe(1)
    // 2º item: Black Cleaver 1x e Sterak's 1x
    expect(a.item2.map((x) => x.id).sort()).toEqual([3053, 3071])
  })

  it('pick rate do slot usa o universo daquele slot, não o total de jogos', () => {
    // Só 2 dos 3 jogos têm botas (3047).
    const a = aggregateBuilds(rows, INFO)
    const botas = a.boots.find((x) => x.id === 3047)
    expect(botas.games).toBe(2)
    expect(botas.pick).toBeCloseTo(1) // 2/2 dos jogos COM botas, não 2/3
  })

  it('ignora jogos sem build_order sem quebrar', () => {
    const a = aggregateBuilds([...rows, linha(true, 8010, null, null)], INFO)
    expect(a.games).toBe(4)
    expect(a.gamesComOrdem).toBe(3)
    expect(a.keystone.find((x) => x.id === 8010).games).toBe(3)
  })
})

describe('aggregateMatchups', () => {
  it('agrupa por campeão adversário da mesma lane', () => {
    const m = aggregateMatchups([
      { row: { won: true }, oponente: 'Rumble' },
      { row: { won: false }, oponente: 'Rumble' },
      { row: { won: true }, oponente: 'Jayce' },
      { row: { won: true }, oponente: null },   // sem oponente identificado
    ])
    expect(m).toHaveLength(2)
    const rumble = m.find((x) => x.champion === 'Rumble')
    expect(rumble.games).toBe(2)
    expect(rumble.wr).toBeCloseTo(0.5)
  })
})
