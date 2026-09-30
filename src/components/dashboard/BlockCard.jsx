// BlockCard.jsx — exporta DUAS formas de exibir um bloco de treino na lista:
//   • BlockCard → cartão grande (modo "grade")
//   • BlockRow  → linha compacta (modo "lista")
// Ambos mostram data, adversário, placar (V-D), bolinhas de resultado e o status
// (Vitória/Derrota/Empate/Em andamento). Envolvidos em memo() por performance:
// só re-renderizam quando as props do bloco realmente mudam.
import { memo } from 'react'
import { ArrowRight } from 'lucide-react'
import { blockScore, blockOutcome, formatLabel, formatDateShort, cx } from '../../lib/utils.js'
import { getTeamInfo, teamGradient } from '../../data/teams.js'
import { DRAW } from '../../lib/resultColors.js'

// Empate tem cor PRÓPRIA (amarelo). Antes dividia o cinza com "em andamento",
// então um bloco 2-2 encerrado parecia um bloco ainda em aberto.
const DRAW_SOFT = 'rgba(255,190,0,0.22)'  // trilho/sombra do amarelo
const NEUTRAL = 'rgba(120,140,220,0.35)'  // "em andamento" (sem resultado)

// Sequência de "bolinhas" (uma por jogo) coloridas pelo resultado.
function ResultDots({ games, compact = false }) {
  return (
    <div className="flex items-center gap-1">
      {games.map((g) => (
        <span
          key={g.id}
          title={`Jogo ${g.index}: ${g.result === 'win' ? 'Vitória' : g.result === 'loss' ? 'Derrota' : '—'}`}
          style={{ transform: 'skewX(-14deg)' }}
          className={cx(
            'transition-all',
            compact ? 'h-2 w-1' : 'h-3 w-1.5',
            g.result === 'win'  ? 'bg-sky shadow-[0_0_8px_rgba(41,206,249,0.7)]' :
            g.result === 'loss' ? 'bg-loss shadow-[0_0_8px_rgba(255,46,77,0.6)]' :
            'bg-white/15',
          )}
        />
      ))}
    </div>
  )
}

// ── Modo GRID ──────────────────────────────────────────────────────
export const BlockCard = memo(function BlockCard({ block, teams, onOpen }) {
  const { wins, losses } = blockScore(block)
  const { day, month } = formatDateShort(block.date)
  const outcome  = blockOutcome(block)
  const pending  = outcome === 'pending'
  const isWin    = outcome === 'win'
  const isLoss   = outcome === 'loss'
  const isDraw   = outcome === 'draw'
  const info = getTeamInfo(teams, block.opponent)

  const edge = isWin ? '#29CEF9' : isLoss ? '#FF2E4D' : isDraw ? DRAW : NEUTRAL
  return (
    <button
      onClick={() => onOpen(block)}
      className="clip-notch group relative w-full overflow-hidden text-left transition-all duration-200 hover:-translate-y-1"
      style={{
        background: 'var(--card-bg)',
        boxShadow: `inset 0 0 0 1px ${isWin ? 'rgba(41,206,249,0.25)' : isLoss ? 'rgba(255,46,77,0.22)' : isDraw ? DRAW_SOFT : 'var(--card-border)'}`,
      }}
    >
      {/* Barra lateral diagonal */}
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: edge, transform: 'skewX(-10deg)', transformOrigin: 'top' }} />

      <div className="p-4 pl-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="clip-notch flex h-11 w-11 flex-col items-center justify-center" style={{ background: 'rgba(41,206,249,0.10)' }}>
              <span className="display text-lg leading-none" style={{ color: 'var(--text)' }}>{day}</span>
              <span className="condensed text-[9px]" style={{ color: 'var(--text-faint)' }}>{month}</span>
            </div>
            <div>
              <p className="condensed text-[12px]" style={{ color: 'var(--text-muted)' }}>Scrim Block</p>
              <p className="condensed text-[10px]" style={{ color: 'var(--text-faint)' }}>{formatLabel(block.gamesCount)}</p>
            </div>
          </div>
          {/* Empate usa texto escuro como a vitória — o amarelo é claro demais
              pra texto branco por cima. */}
          <span className={cx('tag-skew', (isWin || isDraw) ? 'text-ink-900' : isLoss ? 'text-white' : '')}
            style={{ background: isWin ? '#29CEF9' : isLoss ? '#FF2E4D' : isDraw ? DRAW : 'rgba(120,140,220,0.2)', color: pending ? 'var(--text-muted)' : undefined }}>
            <span>{pending ? 'Em andamento' : isWin ? 'Vitória' : isLoss ? 'Derrota' : 'Empate'}</span>
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          {info?.logo ? (
            <img src={info.logo} alt={info.name} className="clip-notch h-7 w-7 shrink-0 object-cover" />
          ) : (
            <span className="clip-notch flex h-7 w-7 shrink-0 items-center justify-center text-[9px] font-black text-white"
              style={{ background: teamGradient(info) }}>
              {(info?.abbr ?? block.opponent).slice(0, 4).toUpperCase()}
            </span>
          )}
          <h3 className="display text-2xl truncate" style={{ color: 'var(--text)' }}>vs {block.opponent}</h3>
        </div>

        <div className="mt-1 flex items-end justify-between gap-2">
          <span className="font-display text-[38px] leading-none tabular-nums" style={{ color: 'var(--text)' }}>
            {wins}<span className="mx-1 text-2xl opacity-25">-</span>{losses}
          </span>
          <ResultDots games={block.games} />
        </div>

        <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: 'var(--divider)' }}>
          <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-faint)' }}>
            <span className={cx('h-2 w-2 rounded-full', block.vodUrl ? 'bg-loss' : 'bg-white/20')} />
            VOD · {block.gamesCount} jogos
          </span>
          <span className="flex items-center gap-1 text-[12px] font-semibold text-sky/70 transition-all group-hover:gap-2 group-hover:text-sky">
            Ver detalhes <ArrowRight size={14} />
          </span>
        </div>
      </div>
    </button>
  )
})

// ── Modo LISTA ─────────────────────────────────────────────────────
export const BlockRow = memo(function BlockRow({ block, teams, onOpen }) {
  const { wins, losses } = blockScore(block)
  const { day, month } = formatDateShort(block.date)
  const outcome  = blockOutcome(block)
  const pending  = outcome === 'pending'
  const isWin    = outcome === 'win'
  const isLoss   = outcome === 'loss'
  const isDraw   = outcome === 'draw'
  const info = getTeamInfo(teams, block.opponent)

  const edge = isWin ? '#29CEF9' : isLoss ? '#FF2E4D' : isDraw ? DRAW : NEUTRAL
  return (
    <button
      onClick={() => onOpen(block)}
      className="clip-notch group flex w-full items-center gap-3 px-4 py-3 text-left transition-all duration-150 hover:translate-x-0.5"
      style={{
        background: 'var(--card-bg)',
        boxShadow: `inset 0 0 0 1px ${isWin ? 'rgba(41,206,249,0.16)' : isLoss ? 'rgba(255,46,77,0.16)' : isDraw ? DRAW_SOFT : 'var(--card-border)'}`,
      }}
    >
      <span className="h-8 w-1.5 shrink-0" style={{ background: edge, transform: 'skewX(-10deg)' }} />

      <div className="clip-notch flex h-9 w-9 shrink-0 flex-col items-center justify-center" style={{ background: 'rgba(41,206,249,0.09)' }}>
        <span className="display text-sm leading-none" style={{ color: 'var(--text)' }}>{day}</span>
        <span className="condensed text-[8px]" style={{ color: 'var(--text-faint)' }}>{month}</span>
      </div>

      <span className="condensed w-10 shrink-0 text-center text-[10px]" style={{ color: 'var(--text-faint)' }}>
        {formatLabel(block.gamesCount)}
      </span>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        {info?.logo ? (
          <img src={info.logo} alt={info.name} className="clip-notch h-6 w-6 shrink-0 object-cover" />
        ) : (
          <span className="clip-notch flex h-6 w-6 shrink-0 items-center justify-center text-[8px] font-black text-white"
            style={{ background: teamGradient(info) }}>
            {(info?.abbr ?? block.opponent).slice(0, 4).toUpperCase()}
          </span>
        )}
        <span className="display truncate text-lg" style={{ color: 'var(--text)' }}>vs {block.opponent}</span>
      </div>

      <span className="shrink-0 display text-xl tabular-nums" style={{ color: 'var(--text)' }}>
        {wins}<span className="mx-0.5 text-sm opacity-25">-</span>{losses}
      </span>

      <ResultDots games={block.games} compact />

      <span className={cx('w-20 shrink-0 text-right condensed text-[11px]',
        isWin ? 'text-sky' : isLoss ? 'text-loss' : '')}
        style={isDraw ? { color: DRAW } : (!isWin && !isLoss) ? { color: 'var(--text-faint)' } : {}}>
        {pending ? 'Em andamento' : isWin ? 'Vitória' : isLoss ? 'Derrota' : 'Empate'}
      </span>

      <ArrowRight size={14} className="shrink-0 transition-colors group-hover:text-sky" style={{ color: 'var(--text-faint)' }} />
    </button>
  )
})
