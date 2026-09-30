// Filtro de Busca de Campeões (popover em portal, sempre 100% visível).
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Search, X, Ban } from 'lucide-react'
import { useApp } from '../../context/AppContext.jsx'
import { champColor, champImgUrl } from '../../data/champions.js'
import { cx } from '../../lib/utils.js'

function norm(s = '') {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ'']/g, '')
}

// ── Ícone de campeão (imagem DDragon + fallback sigla) ────────────────
export function ChampImg({ champ, size = 44, className = '', grayscale = false }) {
  const [err, setErr] = useState(false)
  // Foto custom (upload) tem prioridade sobre a imagem do DDragon.
  const url = champ?.img || (champ?.ddragonKey ? champImgUrl(champ.ddragonKey) : null)

  if (url && !err) {
    return (
      <img
        src={url}
        alt={champ.name}
        onError={() => setErr(true)}
        draggable={false}
        className={cx(
          'shrink-0 rounded-lg object-cover ring-1 ring-white/10',
          grayscale && 'grayscale opacity-70',
          className,
        )}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <span
      className={cx(
        'flex shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white/90 ring-1 ring-white/10',
        grayscale && 'grayscale opacity-70',
        className,
      )}
      style={{ width: size, height: size, background: champColor(champ?.id ?? '') }}
    >
      {champ?.abbr ?? '?'}
    </span>
  )
}

const WIDTH = 288   // w-72
const DESIRED = 440 // altura ideal
const MARGIN = 10   // respiro da borda da tela
const GAP = 6       // distância da célula âncora

// ── Picker ───────────────────────────────────────────────────────────
export default function ChampionPicker({
  anchorRef, onSelect, onClose, onClear, usedIds = [], canClear = true, align = 'left',
}) {
  const { champions } = useApp()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [pos, setPos] = useState(null)
  const inputRef = useRef(null)
  const rootRef  = useRef(null)
  const listRef  = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  // Posicionamento fixo, ciente da viewport: escolhe abrir para baixo/cima
  // conforme o espaço disponível e limita a altura para nunca sair da tela.
  useLayoutEffect(() => {
    function place() {
      const anchor = anchorRef?.current
      if (!anchor) return
      const r = anchor.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight

      let left = align === 'right' ? r.right - WIDTH : r.left
      left = Math.max(MARGIN, Math.min(left, vw - WIDTH - MARGIN))

      const spaceBelow = vh - r.bottom - GAP - MARGIN
      const spaceAbove = r.top - GAP - MARGIN

      let top, maxH
      if (spaceBelow >= spaceAbove) {
        maxH = Math.min(DESIRED, spaceBelow)
        top = r.bottom + GAP
      } else {
        maxH = Math.min(DESIRED, spaceAbove)
        top = r.top - GAP - maxH
      }
      maxH = Math.max(200, maxH)
      // Garante que caiba inteira na tela mesmo em telas muito baixas.
      if (top + maxH > vh - MARGIN) top = vh - MARGIN - maxH
      if (top < MARGIN) top = MARGIN

      setPos({ left, top, maxH })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [anchorRef, align])

  useEffect(() => {
    const onDown = (e) => {
      if (rootRef.current?.contains(e.target)) return
      if (anchorRef?.current?.contains(e.target)) return
      onClose?.()
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [onClose, anchorRef])

  const results = useMemo(() => {
    const q = norm(query.trim())
    const list = !q
      ? champions
      : champions.filter((c) => norm(c.name).includes(q) || norm(c.abbr).includes(q))
    return [...list].sort((a, b) => {
      if (!q) return 0
      const sa = norm(a.name).startsWith(q) ? 0 : 1
      const sb = norm(b.name).startsWith(q) ? 0 : 1
      return sa - sb
    })
  }, [query, champions])

  useEffect(() => { setActive(0) }, [query])

  const usedSet = useMemo(() => new Set(usedIds.filter(Boolean)), [usedIds])

  function choose(champ) {
    if (!champ) return
    onSelect?.(champ)
    onClose?.()
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown')  { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter')   { e.preventDefault(); choose(results[active]) }
    else if (e.key === 'Escape')  { e.preventDefault(); onClose?.() }
  }

  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  return createPortal(
    <div
      ref={rootRef}
      className="fixed z-[60] flex w-72 flex-col rounded-2xl border p-2.5 shadow-glow animate-pop-in"
      style={{
        left: pos?.left ?? 0,
        top: pos?.top ?? 0,
        maxHeight: pos?.maxH ?? DESIRED,
        visibility: pos ? 'visible' : 'hidden',
        background: 'var(--surface)',
        borderColor: 'rgba(41,206,249,0.25)',
      }}
    >
      {/* Busca */}
      <div className="relative mb-2 shrink-0">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-40" style={{ color: 'var(--text-muted)' }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Buscar campeão..."
          className="field py-2.5 pl-9 pr-8 text-sm"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-40 transition hover:opacity-80" style={{ color: 'var(--text)' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Resultados */}
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
        {results.length === 0 && (
          <p className="px-2 py-8 text-center text-xs" style={{ color: 'var(--text-faint)' }}>Nenhum campeão encontrado.</p>
        )}
        {results.map((c, i) => {
          const isUsed   = usedSet.has(c.id)
          const isActive = i === active
          return (
            <button
              key={c.id}
              data-idx={i}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(c)}
              className={cx(
                'flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-all',
                isActive ? 'bg-sky/15 ring-1 ring-sky/40' : 'hover:bg-sky/5',
                isUsed && 'opacity-50',
              )}
            >
              <ChampImg champ={c} size={34} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{c.name}</span>
              </span>
              {isUsed && (
                <span className="shrink-0 rounded bg-sky/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-sky/70">
                  usado
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Limpar */}
      {canClear && (
        <button
          onClick={() => { onClear?.(); onClose?.() }}
          className="mt-2 flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-loss/30 py-2 text-xs font-semibold text-loss/70 transition hover:bg-loss/10 hover:text-loss"
        >
          <Ban size={13} /> Limpar célula
        </button>
      )}
    </div>,
    document.body,
  )
}
