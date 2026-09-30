// ═══════════════════════════════════════════════════════════════════
// Primitivas visuais das abas Times/Jogadores — estética "Persona/Velvet
// Room" do sistema: geometria angular (clip-notch, paralelogramos skew),
// acento ciano, tipografia de impacto (Anton/Oswald), brilho elétrico.
//   Panel          — painel chanfrado com barra lateral diagonal + slash.
//   HudTag         — rótulo de seção estilo HUD (slash + condensed).
//   Donut          — anel de progresso (winrate).
//   StatBar        — barra skewed com brilho (valor vs. referência).
//   DiffBar        — barra divergente centrada (diffs @15).
//   SearchableSelect — combobox com busca + lista rolável.
// ═══════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react'
import { cx } from '../../lib/utils.js'
import { wrColorWith, DRAW } from '../../lib/resultColors.js'

export const GREEN = '#1FE39A'
export const RED = '#FF2E4D'
export const BLUE = '#2E4BFF'
export const GOLD = '#FFBE00'
export const CYAN = '#29CEF9'
// 50% (equilíbrio) é amarelo, não verde — ver lib/resultColors.js.
export const wrColor = (wr) => wrColorWith(wr, { win: GREEN, loss: RED, draw: DRAW })
// Number.isFinite (e não !isNaN): Infinity vinha de uma divisão sem
// denominador e virava "Infinity%" na tela em vez de "—".
export const pct = (v) => (Number.isFinite(v) ? `${Math.round(v * 100)}%` : '—')
export const n1 = (v) => (Number.isFinite(v) ? v.toFixed(1) : '—')
export const n0 = (v) => (Number.isFinite(v) ? Math.round(v) : '—')
export const n2 = (v) => (Number.isFinite(v) ? v.toFixed(2) : '—')
// Diffs com sinal explícito: "+265" lê diferente de "265" numa coluna de
// diferença, onde o zero é a referência.
export const sign0 = (v) => (Number.isFinite(v) ? `${v > 0 ? '+' : ''}${Math.round(v)}` : '—')
export const sign1 = (v) => (Number.isFinite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(1)}` : '—')

// Painel base chanfrado (assinatura Persona): barra lateral diagonal de acento
// + slash decorativo no canto. Substitui os "rounded-lg" genéricos.
export function Panel({ accent = CYAN, edge = true, className, style, children }) {
  return (
    <div className={cx('clip-notch relative overflow-hidden', className)}
      style={{ background: 'var(--card-bg)', boxShadow: 'inset 0 0 0 1px var(--card-border)', ...style }}>
      {edge && <span className="pointer-events-none absolute inset-y-0 left-0 w-1.5" style={{ background: accent, transform: 'skewX(-10deg)', transformOrigin: 'top' }} />}
      <span className="pointer-events-none absolute -right-5 -top-5 h-14 w-14" style={{ background: accent, opacity: 0.09, transform: 'skewX(-14deg)' }} />
      {children}
    </div>
  )
}

// Rótulo de seção HUD: slash de acento + texto condensado.
export function HudTag({ icon: Icon, color = CYAN, children, className }) {
  return (
    <div className={cx('flex items-center gap-2', className)}>
      <span className="h-3.5 w-[3px] shrink-0" style={{ background: color, transform: 'skewX(-14deg)' }} />
      {Icon && <Icon size={13} style={{ color }} />}
      <span className="condensed text-[11px]" style={{ color: 'var(--text-muted)' }}>{children}</span>
    </div>
  )
}

// Anel de progresso. value ∈ [0,1]. Número central em Anton (display).
// Fonte dimensionada pro texto CABER dentro do anel sem tocar o traço —
// escala menor quando é "100%" (3 chars) do que quando é "45%" (2 chars).
export function Donut({ value, size = 84, stroke = 9, color, center, sub }) {
  const v = Math.max(0, Math.min(1, value || 0))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const col = color || wrColor(value)
  const inner = size - stroke * 2 - 6 // largura útil dentro do anel (com folga)
  const chars = String(center ?? '').length
  const factor = chars >= 4 ? 0.19 : chars === 3 ? 0.23 : 0.28
  const fontSize = Math.min(size * factor, inner / Math.max(1.2, chars * 0.55))
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" style={{ filter: `drop-shadow(0 0 5px ${col}66)` }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--input-bg)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={stroke}
          strokeLinecap="butt" strokeDasharray={c} strokeDashoffset={c * (1 - v)} style={{ transition: 'stroke-dashoffset .5s' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-1">
        <span className="display leading-none" style={{ fontSize, color: 'var(--text)' }}>{center}</span>
        {sub && <span className="condensed mt-0.5 text-[9px]" style={{ color: 'var(--text-faint)' }}>{sub}</span>}
      </div>
    </div>
  )
}

// Barra skewed (paralelogramo) com brilho elétrico. fill ∈ [0,1].
export function StatBar({ label, fill, display, color = CYAN, hint }) {
  const f = Math.max(0, Math.min(1, fill || 0))
  return (
    <div className="flex items-center gap-2.5">
      <span className="condensed w-[108px] shrink-0 text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <div className="relative h-2.5 flex-1" style={{ transform: 'skewX(-14deg)' }}>
        <div className="absolute inset-0" style={{ background: 'var(--input-bg)', boxShadow: 'inset 0 0 0 1px var(--card-border)' }} />
        <div className="absolute inset-y-0 left-0" style={{ width: `${f * 100}%`, background: color, boxShadow: `0 0 8px ${color}88` }} />
      </div>
      <span className="w-[66px] shrink-0 text-right font-display text-[13px] tabular-nums leading-none" style={{ color: 'var(--text)' }}>
        {display}{hint && <span className="ml-1 text-[9px]" style={{ color: 'var(--text-faint)' }}>{hint}</span>}
      </span>
    </div>
  )
}

// Barra divergente centrada para diffs (@15): 0 no meio, negativo à esquerda
// (vermelho), positivo à direita (verde). `mag` = |valor| máx pra escala.
export function DiffBar({ label, value, mag, display }) {
  const ok = Number.isFinite(value)
  const v = ok ? Math.max(-1, Math.min(1, value / (mag || 1))) : 0
  const col = !ok ? 'var(--text-faint)' : value >= 0 ? GREEN : RED
  return (
    <div className="flex items-center gap-2.5">
      <span className="condensed w-[108px] shrink-0 text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <div className="relative h-2.5 flex-1" style={{ transform: 'skewX(-14deg)' }}>
        <div className="absolute inset-0" style={{ background: 'var(--input-bg)', boxShadow: 'inset 0 0 0 1px var(--card-border)' }} />
        <span className="absolute inset-y-0" style={{ left: '50%', width: 2, background: 'var(--card-border)' }} />
        <span className="absolute inset-y-0" style={{
          background: col, boxShadow: `0 0 8px ${col}88`, transition: 'all .5s',
          ...(v >= 0 ? { left: '50%', width: `${v * 50}%` } : { right: '50%', width: `${-v * 50}%` }),
        }} />
      </div>
      <span className="w-[66px] shrink-0 text-right font-display text-[13px] tabular-nums leading-none" style={{ color: col }}>{display}</span>
    </div>
  )
}

// Modo comparação: um toggle + N slots com SearchableSelect. Devolve os
// items escolhidos pra o pai renderizar lado a lado. `maxSlots` limita.
// slots = array de valores (strings) selecionados; onChange(newSlots).
export function CompareBar({ enabled, onToggle, slots, onSlots, options, allLabel = 'Selecione…', maxSlots = 4 }) {
  const add = () => onSlots([...slots, ''])
  const remove = (i) => onSlots(slots.filter((_, j) => j !== i))
  const set = (i, v) => onSlots(slots.map((x, j) => (j === i ? v : x)))
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => onToggle(!enabled)}
        className="clip-notch px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all"
        style={enabled
          ? { background: CYAN, color: '#05060E', filter: 'drop-shadow(0 6px 14px rgba(41,206,249,0.3))' }
          : { background: 'var(--card-bg-soft)', color: 'var(--text-muted)', boxShadow: 'inset 0 0 0 1px var(--card-border)' }}>
        {enabled ? 'Comparar: ON' : 'Comparar'}
      </button>
      {enabled && (
        <>
          {slots.map((v, i) => (
            <div key={i} className="flex items-center gap-1">
              <SearchableSelect value={v} options={options} onChange={(nv) => set(i, nv)} allLabel={allLabel} placeholder="Buscar…" width={200} />
              {slots.length > 2 && (
                <button type="button" onClick={() => remove(i)} title="Remover"
                  className="clip-notch px-2 py-1.5 text-xs" style={{ background: 'var(--card-bg-soft)', color: RED, boxShadow: 'inset 0 0 0 1px var(--card-border)' }}>×</button>
              )}
            </div>
          ))}
          {slots.length < maxSlots && (
            <button type="button" onClick={add}
              className="clip-notch px-3 py-1.5 text-xs font-bold uppercase tracking-wider"
              style={{ background: 'var(--card-bg-soft)', color: CYAN, boxShadow: 'inset 0 0 0 1px var(--card-border)' }}>+ Slot</button>
          )}
        </>
      )}
    </div>
  )
}

// Combobox com busca: input filtra uma lista rolável de opções. Resolve o
// select nativo virar gigante quando há muitos times. `options` = [{value,label,hint}].
//
// `hint` é um texto secundário à direita de cada opção (ex.: nº de times na
// região) — dá "cheiro de informação" antes do clique, em vez de obrigar a
// escolher às cegas.
//
// A busca só aparece quando a lista é grande o bastante pra precisar
// (SEARCH_THRESHOLD): num menu de 8 itens o campo é ruído e rouba o primeiro
// foco do teclado à toa.
const SEARCH_THRESHOLD = 10

export function SearchableSelect({ value, options, onChange, placeholder = 'Buscar…', allLabel = 'Todos', width = 220, icon: Icon = null }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef(null)
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])
  // Esc fecha — expectativa básica de qualquer menu; sem isso só o clique fora resolve.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const withSearch = options.length >= SEARCH_THRESHOLD
  const selected = options.find((o) => o.value === value)
  const label = value === '' || value == null ? allLabel : (selected?.label || '—')
  const list = [{ value: '', label: allLabel }, ...options]
    .filter((o) => !withSearch || o.label.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <div className="relative" ref={ref} style={{ width }}>
      <button type="button" onClick={() => { setOpen((o) => !o); setQ('') }}
        aria-haspopup="listbox" aria-expanded={open}
        className="field clip-notch flex items-center justify-between py-1.5 text-sm" style={{ width }}>
        <span className="flex min-w-0 items-center gap-1.5">
          {Icon && <Icon size={13} className="shrink-0" style={{ color: 'var(--text-faint)' }} />}
          <span className="truncate" style={{ color: 'var(--text)' }}>{label}</span>
        </span>
        <span className="ml-2 shrink-0 text-[10px]" style={{ color: CYAN }}>▾</span>
      </button>
      {open && (
        <div role="listbox" className="clip-notch absolute z-30 mt-1 overflow-hidden"
          style={{ width, background: 'var(--card-bg)', boxShadow: '0 12px 30px rgba(0,0,0,.5), inset 0 0 0 1px var(--card-border)' }}>
          {withSearch && (
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder}
              className="field w-full rounded-none py-1.5 text-sm" style={{ border: 'none', borderBottom: '1px solid var(--card-border)' }} />
          )}
          <div className="max-h-56 overflow-y-auto py-1">
            {list.length === 0 && <div className="px-3 py-2 text-[11px]" style={{ color: 'var(--text-faint)' }}>Nada encontrado</div>}
            {list.map((o) => (
              <button key={o.value || '__all'} type="button" role="option" aria-selected={o.value === value}
                onClick={() => { onChange(o.value); setOpen(false) }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-white/5"
                style={{ background: o.value === value ? 'var(--card-bg-soft)' : 'transparent', color: o.value === value ? CYAN : 'var(--text-muted)' }}>
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {o.hint != null && (
                  <span className="condensed shrink-0 text-[10px] tabular-nums" style={{ color: 'var(--text-faint)' }}>{o.hint}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
