// ═══════════════════════════════════════════════════════════════════
// Draft Tool — simulador de pick/ban no estilo drafting.gg/draft.
// Mecânica (mesma da referência):
//   • Clicar num campeão do grid → preenche o slot ATIVO e avança para o
//     próximo slot vazio na ORDEM OFICIAL do draft competitivo.
//   • Clicar num campeão JÁ USADO no grid → remove do slot onde está
//     (mesmo gesto para colocar e tirar).
//   • Clicar num slot → torna-o ativo (p/ preencher/substituir fora de ordem).
//   • Botão direito num slot → limpa a célula.
//   • Busca por nome + filtro por lane (Top/Jng/Mid/Bot/Sup) + Reset.
// O draft em si é estado local (simulação).
// ═══════════════════════════════════════════════════════════════════
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { RotateCcw, Search, X } from 'lucide-react'
import { useApp } from '../../context/AppContext.jsx'
import { champInLane, LANE_KEYS } from '../../data/championLanes.js'
import { cx } from '../../lib/utils.js'
import PageHeader from '../ui/PageHeader.jsx'
import { ChampImg } from '../block/ChampionPicker.jsx'

const BLUE = '#2E4BFF'
const RED = '#FF2E4D'

// Ordem oficial do draft competitivo (20 ações):
// Bans 1: B R B R B R → Picks 1: B1 R1 R2 B2 B3 R3 → Bans 2: R B R B → Picks 2: R4 B4 B5 R5
const ORDER = [
  { type: 'ban', side: 'blue', idx: 0 }, { type: 'ban', side: 'red', idx: 0 },
  { type: 'ban', side: 'blue', idx: 1 }, { type: 'ban', side: 'red', idx: 1 },
  { type: 'ban', side: 'blue', idx: 2 }, { type: 'ban', side: 'red', idx: 2 },
  { type: 'pick', side: 'blue', idx: 0 },
  { type: 'pick', side: 'red', idx: 0 }, { type: 'pick', side: 'red', idx: 1 },
  { type: 'pick', side: 'blue', idx: 1 }, { type: 'pick', side: 'blue', idx: 2 },
  { type: 'pick', side: 'red', idx: 2 },
  { type: 'ban', side: 'red', idx: 3 }, { type: 'ban', side: 'blue', idx: 3 },
  { type: 'ban', side: 'red', idx: 4 }, { type: 'ban', side: 'blue', idx: 4 },
  { type: 'pick', side: 'red', idx: 3 },
  { type: 'pick', side: 'blue', idx: 3 }, { type: 'pick', side: 'blue', idx: 4 },
  { type: 'pick', side: 'red', idx: 4 },
]
const slotKey = (s) => `${s.side}:${s.type}:${s.idx}`
const EMPTY = () => Object.fromEntries(ORDER.map((s) => [slotKey(s), null]))

// Persistência local do draft: fica salvo entre navegações/reloads até o
// usuário clicar em Reset (é uma simulação — não precisa de nuvem).
const STORAGE_KEY = 'einerd:v1:drafttool'
function loadDraft() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (!raw || typeof raw.board !== 'object') return null
    // Normaliza: garante todas as chaves de slot (compat. com versões futuras).
    const board = EMPTY()
    for (const k of Object.keys(board)) if (raw.board[k]) board[k] = raw.board[k]
    const active = Number.isInteger(raw.active) && raw.active >= -1 && raw.active < ORDER.length ? raw.active : 0
    return { board, active }
  } catch { return null }
}
function saveDraft(board, active) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ board, active })) } catch { /* quota/priv mode */ }
}

const LANE_LABEL = { Top: 'Top', Jng: 'Selva', Mid: 'Mid', Bot: 'ADC', Sup: 'Suporte' }
const norm = (s = '') => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ'']/g, '')

// ── Slot de PICK (coluna lateral) — célula grande, estilo drafting.gg ──
function PickSlot({ side, idx, champ, active, onActivate, onClear }) {
  const c = side === 'blue' ? BLUE : RED
  const label = `${side === 'blue' ? 'B' : 'R'}${idx + 1}`
  return (
    <div
      onClick={onActivate}
      onContextMenu={(e) => { e.preventDefault(); if (champ) onClear() }}
      role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onActivate()}
      title={champ ? `${champ.name} · botão direito limpa` : `Slot ${label}`}
      className={cx('flex cursor-pointer select-none items-center gap-3 rounded-xl border p-2.5 transition-all', side === 'red' && 'flex-row-reverse')}
      style={{
        borderColor: active ? c : 'var(--card-border)',
        boxShadow: active ? `0 0 0 1px ${c}, 0 2px 20px -6px ${c}88` : 'none',
        background: champ ? (side === 'blue' ? 'rgba(46,75,255,0.08)' : 'rgba(255,46,77,0.08)') : 'var(--card-bg-soft)',
      }}
    >
      <span className="condensed w-8 shrink-0 text-center text-[13px] font-bold" style={{ color: active ? c : 'var(--text-faint)' }}>{label}</span>
      {champ
        ? <ChampImg champ={champ} size={84} className="rounded-lg" />
        : <span className="flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-lg border-2 border-dashed" style={{ borderColor: active ? c : 'var(--card-border)' }} />}
      <span className={cx('font-display min-w-0 flex-1 truncate text-lg leading-tight', side === 'red' && 'text-right')} style={{ color: champ ? 'var(--text)' : 'var(--text-faint)' }}>
        {champ ? champ.name : '—'}
      </span>
    </div>
  )
}

// ── Slot de BAN (linha do topo) ─────────────────────────────────────
function BanSlot({ side, idx, champ, active, onActivate, onClear }) {
  const c = side === 'blue' ? BLUE : RED
  return (
    <button
      type="button"
      onClick={onActivate}
      onContextMenu={(e) => { e.preventDefault(); if (champ) onClear() }}
      title={champ ? `Ban: ${champ.name} · botão direito limpa` : `Ban ${idx + 1} (${side === 'blue' ? 'azul' : 'vermelho'})`}
      className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border transition-all"
      style={{
        borderColor: active ? c : 'var(--card-border)',
        boxShadow: active ? `0 0 0 1px ${c}` : 'none',
        background: 'var(--card-bg-soft)',
      }}
    >
      {champ ? (
        <>
          <ChampImg champ={champ} size={54} grayscale className="rounded-none" />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="h-[2px] w-[140%] rotate-45 rounded-full" style={{ background: RED, opacity: 0.9 }} />
          </span>
        </>
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[10px]" style={{ color: 'var(--text-faint)' }}>{idx + 1}</span>
      )}
    </button>
  )
}

export default function DraftTool() {
  const { champions } = useApp()
  const saved = useMemo(() => loadDraft(), [])  // draft salvo (1x, na montagem)
  const [board, setBoard] = useState(() => saved?.board ?? EMPTY())  // slotKey → championId|null
  const [active, setActive] = useState(saved?.active ?? 0)           // índice em ORDER
  const [query, setQuery] = useState('')
  const [lane, setLane] = useState('')

  // Persiste o draft a cada mudança (fica salvo até o Reset manual).
  useEffect(() => { saveDraft(board, active) }, [board, active])

  // ── Alinhamento do grid central com a coluna de picks (B1-B5) ──────
  // O grid de campeões precisa terminar exatamente na fileira B5/R5. Como o
  // grid tem conteúdo "infinito" (rola por dentro), o CSS puro (flex stretch)
  // não resolve isso de forma confiável — então MEDIMOS a altura real da
  // coluna de picks (que é fixa: 5 slots + gaps) e aplicamos essa altura no
  // card central via ResizeObserver, o que garante o alinhamento em
  // qualquer resolução/zoom/fonte, sem pixel fixo "chutado". NUNCA aplicamos
  // uma medida 0/negativa (mantém a última altura boa).
  const picksColRef = useRef(null)
  const [colHeight, setColHeight] = useState(null)
  useLayoutEffect(() => {
    if (typeof ResizeObserver === 'undefined') return
    const el = picksColRef.current
    if (!el) return
    const mq = window.matchMedia('(min-width: 1280px)') // breakpoint `xl` do Tailwind (lado-a-lado)
    const measure = () => {
      const node = picksColRef.current
      if (!node) return
      const h = node.getBoundingClientRect().height
      setColHeight(mq.matches && h > 0 ? h : null) // <1280px empilha → sem altura fixa
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    mq.addEventListener('change', measure)
    window.addEventListener('resize', measure) // redundância p/ zooms que não disparam o 'change'
    measure()
    return () => { ro.disconnect(); mq.removeEventListener('change', measure); window.removeEventListener('resize', measure) }
  }, [])

  const byId = useMemo(() => new Map(champions.map((c) => [c.id, c])), [champions])
  // championId → slotKey em que está usado
  const usedIn = useMemo(() => {
    const m = new Map()
    for (const [k, id] of Object.entries(board)) if (id) m.set(id, k)
    return m
  }, [board])

  const list = useMemo(() => {
    const q = norm(query.trim())
    return champions
      .filter((c) => (!q || norm(c.name).includes(q) || norm(c.abbr || '').includes(q)) && (!lane || champInLane(c.id, lane)))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [champions, query, lane])

  // Próximo slot VAZIO na ordem do draft a partir de `from` (com volta).
  const nextEmpty = (b, from) => {
    for (let d = 0; d < ORDER.length; d++) {
      const i = (from + d) % ORDER.length
      if (!b[slotKey(ORDER[i])]) return i
    }
    return -1 // draft completo
  }

  // Clique num campeão do grid: coloca no slot ativo — ou, se já usado, REMOVE.
  function pickChamp(champ) {
    const where = usedIn.get(champ.id)
    if (where) { // tirar: limpa o slot e o torna ativo (mesmo gesto do drafting.gg)
      const next = { ...board, [where]: null }
      setBoard(next)
      setActive(ORDER.findIndex((s) => slotKey(s) === where))
      return
    }
    if (active < 0) return // draft completo
    const key = slotKey(ORDER[active])
    const next = { ...board, [key]: champ.id }
    setBoard(next)
    setActive(nextEmpty(next, active + 1))
  }

  function clearSlot(i) {
    const key = slotKey(ORDER[i])
    if (!board[key]) return
    setBoard((b) => ({ ...b, [key]: null }))
    setActive(i)
  }

  function reset() { setBoard(EMPTY()); setActive(0); setQuery(''); setLane('') }

  const cur = active >= 0 ? ORDER[active] : null
  const slotFor = (side, type, idx) => ORDER.findIndex((s) => s.side === side && s.type === type && s.idx === idx)
  const champAt = (side, type, idx) => { const id = board[`${side}:${type}:${idx}`]; return id ? byId.get(id) : null }
  const isActive = (side, type, idx) => cur && cur.side === side && cur.type === type && cur.idx === idx

  // helpers de render por lado (`ref` só é passado na coluna azul — é dela
  // que medimos a altura pra alinhar o grid central, ver useLayoutEffect acima)
  const renderPicks = (side, ref) => (
    // Empilhado (<xl): largura limitada e centralizado, pra não esticar feio.
    // Lado-a-lado (xl+): coluna fixa que escala com a tela.
    <div ref={ref} className="mx-auto flex w-full max-w-xl shrink-0 flex-col gap-2.5 xl:mx-0 xl:w-56 xl:max-w-none 2xl:w-64">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className={cx(i === 3 && 'mt-5')}> {/* respiro entre as fases 1 e 2 */}
          <PickSlot side={side} idx={i} champ={champAt(side, 'pick', i)} active={isActive(side, 'pick', i)}
            onActivate={() => setActive(slotFor(side, 'pick', i))} onClear={() => clearSlot(slotFor(side, 'pick', i))} />
        </div>
      ))}
    </div>
  )
  const renderBans = (side) => (
    <div className={cx('flex items-center gap-2', side === 'red' && 'flex-row-reverse')}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className={cx(i === 3 && (side === 'red' ? 'mr-4' : 'ml-4'))}>
          <BanSlot side={side} idx={i} champ={champAt(side, 'ban', i)} active={isActive(side, 'ban', i)}
            onActivate={() => setActive(slotFor(side, 'ban', i))} onClear={() => clearSlot(slotFor(side, 'ban', i))} />
        </div>
      ))}
    </div>
  )

  return (
    <div>
      <PageHeader
        title="Draft Tool"
        subtitle="Simulador de pick & ban — ordem oficial de draft competitivo"
        action={(
          <button onClick={reset} className="btn-ghost flex items-center gap-2" title="Limpar o draft inteiro">
            <RotateCcw size={15} /> Reset
          </button>
        )}
      />

      {/* Fase atual + bans */}
      <div className="card mb-4 p-4">
            <div className="mb-3">
              <span className="condensed rounded px-2.5 py-1 text-[12px] font-bold text-white" style={{ background: cur ? (cur.side === 'blue' ? BLUE : RED) : '#1FE39A' }}>
                {cur ? `${cur.type === 'ban' ? 'BAN' : 'PICK'} · ${cur.side === 'blue' ? 'BLUE' : 'RED'} ${cur.type === 'pick' ? cur.idx + 1 : ''}` : 'DRAFT COMPLETO'}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              {renderBans('blue')}
              {renderBans('red')}
            </div>
          </div>

          {/* Picks + grid central. A altura do card central é a altura REAL
              medida da coluna de picks azul (JS, ver useLayoutEffect acima)
              — mais confiável que flex stretch puro quando um dos lados tem
              conteúdo rolável "infinito" (o grid de campeões). Resultado: o
              grid sempre termina exatamente na fileira B5/R5, em qualquer
              resolução/zoom, sem pixel fixo chutado. */}
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
            {renderPicks('blue', picksColRef)}

            <div className="card flex min-w-0 flex-1 flex-col p-4" style={colHeight ? { height: colHeight } : undefined}>
              {/* Busca + filtro de lane */}
              <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2">
                <div className="relative min-w-[180px] flex-1">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-40" style={{ color: 'var(--text-muted)' }} />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar campeão..." className="field py-2 pl-9 pr-8 text-sm" />
                  {query && (
                    <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-80" style={{ color: 'var(--text)' }}>
                      <X size={13} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {LANE_KEYS.map((l) => (
                    <button key={l} onClick={() => setLane(lane === l ? '' : l)}
                      className="clip-notch px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all"
                      style={lane === l
                        ? { background: 'var(--accent)', color: '#05060E' }
                        : { background: 'var(--card-bg-soft)', color: 'var(--text-muted)', boxShadow: 'inset 0 0 0 1px var(--card-border)' }}>
                      {LANE_LABEL[l]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid de campeões — lado-a-lado (xl+) o card já tem altura
                  EXPLÍCITA (medida via JS acima), então flex-1/min-h-0 faz o
                  grid preencher exatamente o espaço restante depois da busca,
                  terminando na fileira B5/R5. Empilhado (<xl), usa um teto em
                  vh como fallback. */}
              <div className="grid max-h-[60vh] content-start auto-rows-min grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-1.5 overflow-y-auto pr-1 xl:min-h-0 xl:max-h-none xl:flex-1">
                {list.map((c) => {
                  const used = usedIn.has(c.id)
                  return (
                    <button key={c.id} type="button" onClick={() => pickChamp(c)}
                      title={used ? `${c.name} — clique para tirar do draft` : c.name}
                      className={cx('group flex flex-col items-center gap-1 rounded-lg p-1.5 transition-all', !used && 'hover:-translate-y-0.5 hover:bg-sky/5')}
                      style={used ? { opacity: 0.35 } : undefined}>
                      <ChampImg champ={c} size={56} grayscale={used} />
                      <span className="w-full truncate text-center text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>{c.name}</span>
                    </button>
                  )
                })}
                {list.length === 0 && (
                  <p className="col-span-full py-10 text-center text-xs" style={{ color: 'var(--text-faint)' }}>Nenhum campeão encontrado.</p>
                )}
              </div>
            </div>

            {renderPicks('red')}
          </div>
    </div>
  )
}
