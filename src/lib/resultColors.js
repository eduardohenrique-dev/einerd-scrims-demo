// ═══════════════════════════════════════════════════════════════════
// Regra ÚNICA de "que cor tem este resultado" — camada pura.
//
// Antes cada tela repetia `wr >= 0.5 ? verde : vermelho` com hexes
// próprios (7 cópias), então 50% contava como vitória e empate de bloco
// se confundia com "em andamento". Aqui fica só a DECISÃO (win/draw/loss);
// cada tela continua com a sua paleta — Dados usa verde, Histórico usa
// ciano, Configurações usa azul — porque isso é identidade visual, não
// regra de negócio.
// ═══════════════════════════════════════════════════════════════════

// Amarelo de empate/equilíbrio. Mesmo GOLD já usado nos gráficos de Dados,
// pra não introduzir um amarelo novo no sistema.
export const DRAW = '#FFBE00'

// Winrate → 'win' | 'draw' | 'loss' | null (sem dado).
//
// `scale` é a escala do valor recebido: 1 para 0–1 (dados da GRID) e 100
// para 0–100 (winrate dos blocos). A comparação usa a porcentagem JÁ
// ARREDONDADA, a mesma que aparece na tela — assim um valor que exibe
// "50%" nunca sai pintado de verde ou vermelho.
export function wrTone(wr, scale = 1) {
  if (wr == null || Number.isNaN(wr)) return null
  const p = Math.round(scale === 100 ? wr : wr * 100)
  if (p === 50) return 'draw'
  return p > 50 ? 'win' : 'loss'
}

// Açúcar: resolve direto pra cor, dada a paleta da tela.
// `none` é a cor de "sem dado" (winrate null).
export function wrColorWith(wr, { win, loss, draw = DRAW, none = 'var(--text-faint)' }, scale = 1) {
  const tone = wrTone(wr, scale)
  if (tone === null) return none
  return tone === 'win' ? win : tone === 'loss' ? loss : draw
}
