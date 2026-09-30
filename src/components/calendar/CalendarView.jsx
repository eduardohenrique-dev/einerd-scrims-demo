// CalendarView — tela do Calendário da equipe.
// Grade mensal (navegável) + rail lateral com "próximos eventos" e a legenda de
// categorias. Clicar num dia cria evento; clicar num evento existente o edita
// (ambos via EventModal). Os eventos vêm do AppContext.
import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { useApp } from '../../context/AppContext.jsx'
import { MESES_FULL, DIAS_SEMANA, toISODate, parseISODate, todayISO, cx } from '../../lib/utils.js'
import PageHeader from '../ui/PageHeader.jsx'
import EventModal from './EventModal.jsx'

// true abaixo de 640px (breakpoint `sm` do Tailwind). No celular a grade não
// tem espaço pros chips de texto — muda o MODO de interação (ver render).
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 639px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const onChange = (e) => setMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return mobile
}

// Categoria "fantasma" — fallback defensivo caso um evento aponte para um
// tipo que não existe mais (não deveria acontecer: deleteEventType recusa
// excluir categorias em uso). Evita tela quebrada em vez de crashar.
const FALLBACK_TYPE = { label: 'Evento', color: '#94A0C0' }

// Legenda editável: cor (input nativo) + nome por categoria, exclusão (bloqueada
// pra 'scrim' e para categorias com eventos usando-as) e criação de novas.
function CategoryEditor({ eventTypes, typesInUse, addEventType, updateEventType, deleteEventType }) {
  const [editingId, setEditingId] = useState(null)
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [color, setColor] = useState('#3FAEFF')

  function startEdit(t) { setAdding(false); setEditingId(t.id); setLabel(t.label); setColor(t.color) }
  function startAdd() { setEditingId(null); setAdding(true); setLabel(''); setColor('#3FAEFF') }
  function cancel() { setEditingId(null); setAdding(false) }
  function saveEdit() {
    if (!label.trim()) return
    updateEventType(editingId, { label: label.trim(), color })
    cancel()
  }
  function saveNew() {
    if (!label.trim()) return
    addEventType({ label: label.trim(), color })
    cancel()
  }

  return (
    <div className="space-y-2">
      {eventTypes.map((t) => (
        editingId === t.id ? (
          <div key={t.id} className="flex items-center gap-2">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
              className="h-7 w-7 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0" />
            <input autoFocus value={label} onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancel() }}
              className="field flex-1 py-1 text-sm" />
            <button type="button" onClick={saveEdit} className="shrink-0 text-sky"><Check size={16} /></button>
            <button type="button" onClick={cancel} className="shrink-0" style={{ color: 'var(--text-faint)' }}><X size={16} /></button>
          </div>
        ) : (
          <div key={t.id} className="group flex items-center gap-3">
            <span className="h-3.5 w-3.5 shrink-0 rounded" style={{ background: t.color }} />
            <span className="flex-1 truncate text-sm" style={{ color: 'var(--text-muted)' }}>{t.label}</span>
            <button type="button" onClick={() => startEdit(t)}
              className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100" style={{ color: 'var(--text-faint)' }}>
              <Pencil size={13} />
            </button>
            {t.id !== 'scrim' && (
              <button type="button" onClick={() => deleteEventType(t.id)}
                disabled={typesInUse.has(t.id)}
                title={typesInUse.has(t.id) ? 'Em uso por algum evento — não pode excluir' : 'Excluir categoria'}
                className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:group-hover:opacity-30"
                style={{ color: '#FF5C79' }}>
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )
      ))}

      {adding ? (
        <div className="flex items-center gap-2 pt-1">
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
            className="h-7 w-7 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0" />
          <input autoFocus value={label} onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveNew(); if (e.key === 'Escape') cancel() }}
            placeholder="Nome da categoria" className="field flex-1 py-1 text-sm" />
          <button type="button" onClick={saveNew} className="shrink-0 text-sky"><Check size={16} /></button>
          <button type="button" onClick={cancel} className="shrink-0" style={{ color: 'var(--text-faint)' }}><X size={16} /></button>
        </div>
      ) : (
        <button type="button" onClick={startAdd}
          className="flex items-center gap-2 pt-1 text-sm font-semibold text-sky/80 transition-colors hover:text-sky">
          <Plus size={14} /> Nova categoria
        </button>
      )}
    </div>
  )
}

// Altura da célula responsiva à viewport: encolhe para caber as 6 semanas
// sem gerar scroll vertical, e cresce até um teto em telas grandes (27").
const CELL_H = 'clamp(76px, calc((100dvh - 280px) / 6), 136px)'

// Painel do dia selecionado (mobile): a grade compacta só mostra pontos —
// aqui os eventos do dia aparecem por extenso, tocáveis para editar.
function DayPanel({ iso, isToday, events, typeById, onEdit, onAdd }) {
  const d = parseISODate(iso)
  const titulo = `${DIAS_SEMANA[d.getDay()]} · ${String(d.getDate()).padStart(2, '0')} de ${MESES_FULL[d.getMonth()]}`
  return (
    <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--divider)' }}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="condensed text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {titulo}{isToday && <span className="ml-1.5 rounded bg-sky px-1.5 py-0.5 text-[9px] font-bold uppercase text-ink-900">Hoje</span>}
        </p>
        <button onClick={onAdd} className="flex items-center gap-1 text-[12px] font-semibold text-sky">
          <Plus size={13} /> Novo evento
        </button>
      </div>
      {events.length === 0 ? (
        <p className="py-2 text-center text-xs" style={{ color: 'var(--text-faint)' }}>Nada agendado neste dia.</p>
      ) : (
        <div className="space-y-1.5">
          {events.map((e) => {
            const et = typeById[e.type] || FALLBACK_TYPE
            return (
              <button
                key={e.id}
                onClick={() => onEdit(e)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:brightness-110"
                style={{ background: `${et.color}1f` }}
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: et.color }} />
                <span className="shrink-0 text-[12px] font-bold tabular-nums" style={{ color: et.color }}>{e.time}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium" style={{ color: 'var(--text)' }}>{e.title}</span>
                <span className="condensed shrink-0 text-[9px]" style={{ color: 'var(--text-faint)' }}>{et.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Monta a matriz de dias do mês para a grade (7 colunas = dias da semana).
// Preenche com `null` os "espaços vazios" antes do dia 1 e depois do último dia,
// para que a 1ª semana comece no dia da semana certo e a grade feche em múltiplos de 7.
function monthMatrix(year, month) {
  const first = new Date(year, month, 1)
  const startOffset = first.getDay()                       // quantos dias vazios antes do dia 1
  const daysInMonth = new Date(year, month + 1, 0).getDate() // truque: dia 0 do mês seguinte = último dia deste mês
  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)   // preenche até o dia da semana correto
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)          // completa a última semana
  return cells
}

export default function CalendarView() {
  const { events, createEvent, updateEvent, deleteEvent, eventTypes, addEventType, updateEventType, deleteEventType } = useApp()
  const today = todayISO()
  const isMobile = useIsMobile()

  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [query, setQuery]   = useState('')
  const [modal, setModal]   = useState({ open: false, initial: null, date: null })
  // Dia em foco no MOBILE: tocar numa célula seleciona o dia (em vez de já
  // abrir o modal) e um painel legível embaixo lista os eventos dele.
  const [selectedDay, setSelectedDay] = useState(today)

  const cells = useMemo(() => monthMatrix(cursor.year, cursor.month), [cursor])
  const typeById = useMemo(() => Object.fromEntries(eventTypes.map((t) => [t.id, t])), [eventTypes])
  const typesInUse = useMemo(() => new Set(events.map((e) => e.type)), [events])

  const byDate = useMemo(() => {
    const m = new Map()
    const q = query.trim().toLowerCase()
    for (const e of events) {
      if (q && !e.title.toLowerCase().includes(q)) continue
      if (!m.has(e.date)) m.set(e.date, [])
      m.get(e.date).push(e)
    }
    for (const list of m.values()) list.sort((a, b) => a.time.localeCompare(b.time))
    return m
  }, [events, query])

  const upcoming = useMemo(
    () =>
      [...events]
        .filter((e) => e.date >= today)
        .sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date < b.date ? -1 : 1))
        .slice(0, 5),
    [events, today],
  )

  function move(delta) {
    setCursor(({ year, month }) => {
      const m = month + delta
      return { year: year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 }
    })
  }
  function goToday() {
    const d = new Date()
    setCursor({ year: d.getFullYear(), month: d.getMonth() })
  }

  return (
    <div>
      <PageHeader
        title="Calendário da Equipe"
        subtitle="Agenda de treinos, reviews e reuniões"
        search={query}
        onSearch={setQuery}
        searchPlaceholder="Buscar evento..."
        action={
          <button onClick={() => setModal({ open: true, initial: null, date: today })} className="btn-primary">
            <Plus size={17} /> Novo Evento
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_300px]">
        {/* Grade do mês */}
        <div className="card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="display text-xl sm:text-2xl" style={{ color: 'var(--text)' }}>
              {MESES_FULL[cursor.month]}{' '}
              <span style={{ color: 'var(--text-faint)' }}>{cursor.year}</span>
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={() => move(-1)} className="btn-ghost px-2.5 py-2"><ChevronLeft size={16} /></button>
              <button onClick={goToday} className="btn-ghost">Hoje</button>
              <button onClick={() => move(1)} className="btn-ghost px-2.5 py-2"><ChevronRight size={16} /></button>
            </div>
          </div>

          {/* Dias da semana */}
          <div className="mb-2 grid grid-cols-7 gap-2">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="py-1 text-center text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Células. Dois modos:
              • DESKTOP: célula alta com chips de texto; clique abre "novo evento".
              • MOBILE (<sm): célula compacta (número + pontos coloridos — texto
                não cabe legível em ~45px); tocar SELECIONA o dia e um painel
                embaixo lista os eventos por extenso. */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2" style={{ gridAutoRows: isMobile ? '52px' : CELL_H }}>
            {cells.map((date, i) => {
              if (!date) return <div key={i} className="rounded-lg" style={{ background: 'var(--card-bg-soft)' }} />
              const iso = toISODate(date)
              const isToday   = iso === today
              const isSelected = isMobile && iso === selectedDay
              const dayEvents = byDate.get(iso) || []
              return (
                <button
                  key={i}
                  onClick={() => (isMobile ? setSelectedDay(iso) : setModal({ open: true, initial: null, date: iso }))}
                  className={cx(
                    'overflow-hidden rounded-lg border text-left align-top transition',
                    isMobile ? 'flex flex-col items-center justify-center gap-1 p-1' : 'p-2',
                    isToday ? 'border-sky/70 bg-sky/[0.08] ring-1 ring-sky/40' : 'hover:border-sky/40',
                    isSelected && !isToday && 'border-sky/50 ring-1 ring-sky/30',
                  )}
                  style={isToday ? {} : { borderColor: 'var(--card-border)', background: 'var(--card-bg-soft)' }}
                >
                  {isMobile ? (
                    <>
                      <span className={cx('text-[13px] font-bold leading-none', isToday ? 'text-sky' : '')}
                        style={!isToday ? { color: 'var(--text-muted)' } : {}}>
                        {date.getDate()}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="flex items-center gap-0.5">
                          {dayEvents.slice(0, 3).map((e) => {
                            const et = typeById[e.type] || FALLBACK_TYPE
                            return <span key={e.id} className="h-1.5 w-1.5 rounded-full" style={{ background: et.color }} />
                          })}
                          {dayEvents.length > 3 && (
                            <span className="text-[8px] leading-none" style={{ color: 'var(--text-faint)' }}>+</span>
                          )}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="mb-1 flex items-center justify-between">
                        <span className={cx('text-sm font-bold', isToday ? 'text-sky' : '')} style={!isToday ? { color: 'var(--text-muted)' } : {}}>
                          {date.getDate()}
                        </span>
                        {isToday && (
                          <span className="rounded bg-sky px-1.5 py-0.5 text-[9px] font-bold uppercase text-ink-900">Hoje</span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((e) => {
                          const et = typeById[e.type] || FALLBACK_TYPE
                          return (
                            <div
                              key={e.id}
                              onClick={(ev) => { ev.stopPropagation(); setModal({ open: true, initial: e, date: iso }) }}
                              className="flex items-center gap-1.5 truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium transition hover:brightness-110"
                              style={{ background: `${et.color}26`, color: 'var(--text)' }}
                            >
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: et.color }} />
                              <span className="shrink-0 tabular-nums font-bold" style={{ color: et.color, fontSize: '10px' }}>{e.time}</span>
                              <span className="truncate">{e.title}</span>
                            </div>
                          )
                        })}
                        {dayEvents.length > 3 && (
                          <span className="px-1 text-[10px]" style={{ color: 'var(--text-faint)' }}>+{dayEvents.length - 3} mais</span>
                        )}
                      </div>
                    </>
                  )}
                </button>
              )
            })}
          </div>

          {/* Painel do dia (só mobile): eventos por extenso + criar no dia */}
          {isMobile && (
            <DayPanel
              iso={selectedDay}
              isToday={selectedDay === today}
              events={byDate.get(selectedDay) || []}
              typeById={typeById}
              onEdit={(e) => setModal({ open: true, initial: e, date: selectedDay })}
              onAdd={() => setModal({ open: true, initial: null, date: selectedDay })}
            />
          )}
        </div>

        {/* Rail direito */}
        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="mb-4 text-[12px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-faint)' }}>
              Próximos eventos
            </h3>
            <div className="space-y-3">
              {upcoming.length === 0 && (
                <p className="text-sm" style={{ color: 'var(--text-faint)' }}>Nada agendado.</p>
              )}
              {upcoming.map((e) => {
                const d = parseISODate(e.date)
                const mes = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'][d.getMonth()]
                const et = typeById[e.type] || FALLBACK_TYPE
                return (
                  <button
                    key={e.id}
                    onClick={() => setModal({ open: true, initial: e, date: e.date })}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    <div
                      className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg ring-1 ring-sky/10"
                      style={{ background: 'var(--surface)' }}
                    >
                      <span className="display text-base leading-none" style={{ color: 'var(--text)' }}>
                        {String(d.getDate()).padStart(2, '0')}
                      </span>
                      <span className="text-[9px] font-bold uppercase" style={{ color: 'var(--text-faint)' }}>{mes}</span>
                    </div>
                    <div className="min-w-0 flex-1 border-l-2 pl-3" style={{ borderColor: et.color }}>
                      <p className="truncate text-sm font-semibold" style={{ color: 'var(--text)' }}>{e.title}</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
                        {et.label} · {e.time}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="mb-4 text-[12px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-faint)' }}>
              Categorias
            </h3>
            <CategoryEditor
              eventTypes={eventTypes}
              typesInUse={typesInUse}
              addEventType={addEventType}
              updateEventType={updateEventType}
              deleteEventType={deleteEventType}
            />
          </div>
        </div>
      </div>

      <EventModal
        open={modal.open}
        initial={modal.initial}
        defaultDate={modal.date}
        onClose={() => setModal({ open: false, initial: null, date: null })}
        onSave={(data) => {
          if (modal.initial?.id) updateEvent(modal.initial.id, data)
          else createEvent(data)
        }}
        onDelete={deleteEvent}
      />
    </div>
  )
}
