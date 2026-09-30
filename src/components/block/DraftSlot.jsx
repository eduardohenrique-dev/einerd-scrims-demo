// Células de Pick e Ban do draft.
import { memo, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { useApp } from '../../context/AppContext.jsx'
import { ROLES } from '../../data/constants.js'
import { cx } from '../../lib/utils.js'
import ChampionPicker, { ChampImg } from './ChampionPicker.jsx'

// ── Célula de PICK ──────────────────────────────────────────────────
export const PickCell = memo(function PickCell({ side, slot, pick, order, usedIds, onSelect, onClear, onRole, readOnly }) {
  const { championById } = useApp()
  const [open, setOpen] = useState(false)
  const cellRef = useRef(null)
  const champ = pick.championId ? championById.get(pick.championId) : null
  const mirror  = side === 'red'
  const isBlue  = side === 'blue'
  const glowColor = isBlue ? 'rgba(41,206,249,0.35)' : 'rgba(255,46,77,0.35)'

  return (
    <div className="group/pick relative">
      <div
        ref={cellRef}
        className={cx(
          'flex cursor-pointer select-none items-center gap-2.5 rounded-xl border p-2 transition-all duration-150',
          champ
            ? isBlue
              ? 'border-sky/30 bg-gradient-to-r from-sky/[0.07] to-transparent hover:border-sky/60'
              : 'border-loss/30 bg-gradient-to-l from-loss/[0.07] to-transparent hover:border-loss/60'
            : 'border-white/8 bg-white/[0.02] hover:border-sky/30 hover:bg-white/[0.04]',
          readOnly && 'cursor-default',
          mirror && 'flex-row-reverse',
        )}
        style={{
          borderColor: champ ? undefined : 'var(--card-border)',
          ...(champ && !readOnly ? { boxShadow: `0 2px 16px -6px ${glowColor}` } : {}),
        }}
        onClick={() => !readOnly && setOpen((o) => !o)}
        onContextMenu={(e) => { if (!readOnly && champ) { e.preventDefault(); onClear() } }}
        role="button"
        tabIndex={readOnly ? -1 : 0}
        onKeyDown={(e) => !readOnly && e.key === 'Enter' && setOpen((o) => !o)}
      >
        <span className={cx(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold tabular-nums',
          champ ? 'bg-white/8 text-cloud/50' : 'bg-white/5 text-cloud/25',
        )}>
          {order}
        </span>

        {champ ? (
          <ChampImg champ={champ} size={44} />
        ) : (
          <span className={cx(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 border-dashed transition-colors',
            isBlue ? 'border-sky/20 group-hover/pick:border-sky/40' : 'border-loss/20 group-hover/pick:border-loss/40',
          )}>
            <Plus size={16} className="text-cloud/25" />
          </span>
        )}

        <div className={cx('min-w-0 flex-1', mirror && 'text-right')}>
          {champ ? (
            <p className="truncate text-[14px] font-bold leading-tight" style={{ color: 'var(--text)' }}>{champ.name}</p>
          ) : (
            <p className="truncate text-[13px] font-medium" style={{ color: 'var(--text-faint)' }}>Selecionar pick</p>
          )}
          {readOnly ? (
            <p className={cx('truncate text-[11px] font-semibold uppercase tracking-wide text-sky/60', mirror && 'text-right')}>
              {pick.role}
            </p>
          ) : (
            <div className={cx('mt-0.5 flex', mirror && 'justify-end')}>
              <select
                value={pick.role}
                onChange={(e) => onRole?.(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onContextMenu={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
                title="Role deste pick na ordem do draft"
                className="cursor-pointer rounded-md border-0 bg-white/5 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide outline-none text-sky/80 hover:bg-white/10 focus:ring-1 focus:ring-sky/40"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r} style={{ background: '#0E1124', color: '#EAF1FF' }}>{r}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {open && (
        <ChampionPicker
          anchorRef={cellRef}
          align={mirror ? 'right' : 'left'}
          usedIds={usedIds}
          onSelect={(c) => { onSelect(c.id); setOpen(false) }}
          onClear={() => { onClear(); setOpen(false) }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
})

// ── Célula de BAN ──────────────────────────────────────────────────
// `order` = numero exibido abaixo do slot (rotulo de leitura da ordem).
export const BanCell = memo(function BanCell({ side, slot, order, championId, usedIds, onSelect, onClear, readOnly }) {
  const { championById } = useApp()
  const [open, setOpen] = useState(false)
  const btnRef = useRef(null)
  const champ  = championId ? championById.get(championId) : null
  const mirror = side === 'red'

  return (
    <div className="relative flex flex-col items-center gap-1">
      <button
        ref={btnRef}
        type="button"
        disabled={readOnly}
        onClick={() => !readOnly && setOpen((o) => !o)}
        onContextMenu={(e) => { if (!readOnly && champ) { e.preventDefault(); onClear() } }}
        title={champ ? `Ban: ${champ.name}` : 'Adicionar ban'}
        className={cx(
          'group relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border transition-all duration-150',
          champ
            ? 'border-loss/50 bg-loss/10 hover:border-loss'
            : 'border-white/10 bg-white/[0.02] hover:border-sky/40 hover:bg-sky/[0.05]',
          readOnly && 'cursor-default',
        )}
        style={{ borderColor: champ ? undefined : 'var(--card-border)' }}
      >
        {champ ? (
          <>
            <ChampImg champ={champ} size={40} grayscale className="rounded-none" />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="h-[2.5px] w-[150%] rotate-45 rounded-full bg-loss/90 shadow-[0_0_6px_rgba(255,46,77,0.8)]" />
            </span>
            <span className="pointer-events-none absolute inset-0 rounded-lg bg-black/30" />
          </>
        ) : (
          <Plus size={14} className="text-cloud/25 transition-colors group-hover:text-sky/70" />
        )}
      </button>

      {/* Numero da ordem do ban, pra ler a sequencia de relance */}
      {order != null && (
        <span
          className={cx(
            'select-none text-[9px] font-bold leading-none tabular-nums',
            champ && 'text-loss/70',
          )}
          style={champ ? undefined : { color: 'var(--text-faint)' }}
        >
          {order}
        </span>
      )}

      {open && (
        <ChampionPicker
          anchorRef={btnRef}
          align={mirror ? 'right' : 'left'}
          usedIds={usedIds}
          onSelect={(c) => { onSelect(c.id); setOpen(false) }}
          onClear={() => { onClear(); setOpen(false) }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
})
