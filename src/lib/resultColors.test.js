import { describe, it, expect } from 'vitest'
import { wrTone, wrColorWith, DRAW } from './resultColors.js'

const PAL = { win: '#00FF00', loss: '#FF0000' }

describe('wrTone', () => {
  it('trata 50% como empate nas duas escalas', () => {
    expect(wrTone(0.5)).toBe('draw')
    expect(wrTone(50, 100)).toBe('draw')
  })

  it('separa vitória e derrota fora de 50%', () => {
    expect(wrTone(0.51)).toBe('win')
    expect(wrTone(0.49)).toBe('loss')
    expect(wrTone(51, 100)).toBe('win')
    expect(wrTone(49, 100)).toBe('loss')
    expect(wrTone(1)).toBe('win')
    expect(wrTone(0)).toBe('loss')
  })

  it('usa a porcentagem ARREDONDADA, a mesma que aparece na tela', () => {
    // 0.498 é exibido como "50%" — pintar de vermelho contradiria o número.
    expect(wrTone(0.498)).toBe('draw')
    expect(wrTone(0.502)).toBe('draw')
    // 0.505 arredonda pra 51% e volta a ser vitória.
    expect(wrTone(0.505)).toBe('win')
  })

  it('empate real de matchup (1V-1D) cai em amarelo', () => {
    expect(wrTone(1 / 2)).toBe('draw')
    expect(wrTone(3 / 6)).toBe('draw')
    expect(wrColorWith(2 / 4, PAL)).toBe(DRAW)
  })

  it('sem dado devolve null / a cor neutra', () => {
    expect(wrTone(null)).toBe(null)
    expect(wrTone(undefined)).toBe(null)
    expect(wrTone(NaN)).toBe(null)
    expect(wrColorWith(null, PAL)).toBe('var(--text-faint)')
    expect(wrColorWith(null, { ...PAL, none: '#123' })).toBe('#123')
  })

  it('wrColorWith respeita a paleta de cada tela', () => {
    expect(wrColorWith(0.8, PAL)).toBe('#00FF00')
    expect(wrColorWith(0.2, PAL)).toBe('#FF0000')
    expect(wrColorWith(80, { win: '#29CEF9', loss: '#FF2E4D' }, 100)).toBe('#29CEF9')
  })
})
