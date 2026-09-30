import { describe, it, expect } from 'vitest'
import {
  deriveLeague, regionForLeague, isInternational, isNonLeague, countsAsLeague, shortLeague,
  MANUAL_TEAM_LEAGUE,
} from './regions.js'

describe('regions', () => {
  it('shortLeague corta split e fase do nome do torneio', () => {
    expect(shortLeague('Circuito Desafiante - Split 2 2026 (Regular Season: Regular Season)')).toBe('Circuito Desafiante')
    expect(shortLeague('LCK - Summer 2026')).toBe('LCK')
    expect(shortLeague('MSI - 2026 (Knockouts: Knockouts)')).toBe('MSI')
  })

  it('isInternational reconhece os eventos que misturam regiões', () => {
    expect(isInternational('MSI - 2026 (Knockouts: Knockouts)')).toBe(true)
    expect(isInternational('Esports World Cup - 2026 (Playoffs: Playoffs)')).toBe(true)
    expect(isInternational('First Stand - 2026')).toBe(true)
    expect(isInternational('LCK - Summer 2026')).toBe(false)
    expect(isInternational('Circuito Desafiante - Split 2 2026')).toBe(false)
  })

  it('regionForLeague mapeia as ligas conhecidas', () => {
    expect(regionForLeague('Circuito Desafiante')).toBe('BR')
    expect(regionForLeague('CBLOL')).toBe('BR')
    expect(regionForLeague('LCK')).toBe('KR')
    expect(regionForLeague('LPL')).toBe('CN')
    expect(regionForLeague('LEC')).toBe('EMEA')
    expect(regionForLeague('LCS')).toBe('NA')
    expect(regionForLeague('LCP')).toBe('APAC')
    expect(regionForLeague('Liga Inventada')).toBe(null)
  })

  it('deriveLeague ignora eventos internacionais e escolhe a liga mais frequente', () => {
    // Caso real do T1: LCK doméstico + MSI/EWC/KeSPA por cima.
    const t1 = [
      ...Array(35).fill('LCK - Summer 2026'),
      ...Array(6).fill('MSI - 2026 (Knockouts: Knockouts)'),
      ...Array(6).fill('Esports World Cup - 2026 (Playoffs: Playoffs)'),
      ...Array(5).fill('KeSPA Cup - 2026 (Group Stage: Alpha Group)'),
    ]
    expect(deriveLeague(t1)).toBe('LCK')
  })

  it('isNonLeague descarta scrim e backfill manual', () => {
    expect(isNonLeague('League of Legends Scrims')).toBe(true)
    expect(isNonLeague('Backfill manual (.rofl)')).toBe(true)
    expect(isNonLeague('Backfill manual (.rofl sem stats de jogador)')).toBe(true)
    expect(isNonLeague('CBLOL - Split 2 2026')).toBe(false)
  })

  it('countsAsLeague só aceita competição oficial de uma região', () => {
    expect(countsAsLeague('Circuito Desafiante - Split 2 2026')).toBe(true)
    expect(countsAsLeague('League of Legends Scrims')).toBe(false)
    expect(countsAsLeague('MSI - 2026')).toBe(false)
    expect(countsAsLeague('')).toBe(false)
  })

  it('deriveLeague não deixa um time virar da liga "Scrims" por treinar muito', () => {
    // Caso real do roster:estral — 30 scrims contra 5 jogos de Desafiante.
    // Sem descartar scrim, "League of Legends Scrims" ganharia a votação.
    const estral = [
      ...Array(30).fill('League of Legends Scrims'),
      ...Array(5).fill('Circuito Desafiante - Split 2 2026 (Regular Season: Regular Season)'),
      ...Array(2).fill('Backfill manual (.rofl)'),
    ]
    expect(deriveLeague(estral)).toBe('Circuito Desafiante')
    expect(regionForLeague(deriveLeague(estral))).toBe('BR')
  })

  it('deriveLeague devolve null pra roster que só jogou evento internacional', () => {
    expect(deriveLeague(['Esports World Cup - 2026 (Group Stage: Group D)'])).toBe(null)
    expect(deriveLeague([])).toBe(null)
  })

  it('deriveLeague ignora entradas vazias', () => {
    expect(deriveLeague([null, undefined, '', 'LEC - Summer 2026'])).toBe('LEC')
  })

  it('MANUAL_TEAM_LEAGUE (vazia aqui) só aceita ligas com região mapeada', () => {
    // A tabela é preenchida à mão por quem usa os dados; toda entrada precisa cair numa região.
    for (const [teamId, league] of Object.entries(MANUAL_TEAM_LEAGUE)) {
      expect(regionForLeague(league), `time ${teamId} → liga "${league}" sem região mapeada`).not.toBe(null)
    }
    expect(regionForLeague('CBLOL')).toBe('BR')
  })
})
