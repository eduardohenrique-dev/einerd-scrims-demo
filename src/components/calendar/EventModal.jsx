import { useEffect, useState } from 'react'
import { Trash2, Swords, Shield } from 'lucide-react'
import Modal from '../ui/Modal.jsx'
import { useApp } from '../../context/AppContext.jsx'
import { teamGradient } from '../../data/teams.js'
import { todayISO, cx } from '../../lib/utils.js'

// Modal de criar/editar evento do calendário.
// Quando o tipo é "scrim", o campo Título vira "Time" (seleciona/cria um time)
// e a criação dispara um bloco automático no Histórico de Treinos.
export default function EventModal({ open, onClose, onSave, onDelete, initial, defaultDate }) {
  const { teams, eventTypes } = useApp()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(defaultDate || todayISO())
  const [time, setTime] = useState('14:00')
  const [type, setType] = useState('scrim')
  const [notes, setNotes] = useState('')
  const [showSug, setShowSug] = useState(false)

  const editing = Boolean(initial?.id)
  const isScrim = type === 'scrim'

  useEffect(() => {
    if (!open) return
    setTitle(initial?.title || '')
    setDate(initial?.date || defaultDate || todayISO())
    setTime(initial?.time || '14:00')
    setType(initial?.type || 'scrim')
    setNotes(initial?.notes || '')
    setShowSug(false)
  }, [open, initial, defaultDate])

  const suggestions = teams
    .filter((t) => t.id !== 'einerd' && t.name.toLowerCase().includes(title.toLowerCase()))
    .slice(0, 6)

  function submit(e) {
    e.preventDefault()
    if (!title.trim()) return
    onSave({ title: title.trim(), date, time, type, notes })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar evento' : 'Novo evento'}
      subtitle="Treinos, reviews, reuniões e campeonatos da equipe."
      footer={
        <>
          {editing && (
            <button type="button" onClick={() => { onDelete(initial.id); onClose() }} className="btn-danger mr-auto">
              <Trash2 size={16} /> Excluir
            </button>
          )}
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button type="submit" form="event-form" className="btn-primary">{editing ? 'Salvar' : 'Adicionar'}</button>
        </>
      }
    >
      <form id="event-form" onSubmit={submit} className="space-y-4">
        {/* Tipo primeiro — define o comportamento do campo abaixo */}
        <div>
          <label className="label">Tipo</label>
          <div className="flex flex-wrap gap-2">
            {eventTypes.map(({ id: key, label, color }) => (
              <button
                key={key}
                type="button"
                onClick={() => setType(key)}
                className={cx(
                  'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition',
                  type === key ? 'border-transparent text-white' : 'hover:brightness-110',
                )}
                style={type === key
                  ? { background: color }
                  : { borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: type === key ? '#fff' : color }} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Campo dinâmico: "Time" para scrim, "Título" para os demais */}
        <div>
          <label className="label flex items-center gap-1.5">
            {isScrim ? <><Swords size={12} /> Time</> : 'Título do evento'}
          </label>
          <div className="relative">
            <input
              autoFocus
              value={title}
              onChange={(e) => { setTitle(e.target.value); if (isScrim) setShowSug(true) }}
              onFocus={() => isScrim && setShowSug(true)}
              onBlur={() => setTimeout(() => setShowSug(false), 150)}
              placeholder={isScrim ? 'Selecione ou digite o time adversário...' : 'Ex.: Review de VODs'}
              className="field"
            />

            {isScrim && showSug && suggestions.length > 0 && (
              <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border py-1 shadow-glow animate-pop-in"
                style={{ background: 'var(--surface)', borderColor: 'rgba(63,174,255,0.25)' }}>
                {suggestions.map((t) => (
                  <button
                    key={t.id} type="button"
                    onMouseDown={() => { setTitle(t.name); setShowSug(false) }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition hover:bg-sky/10"
                  >
                    {t.logo
                      ? <img src={t.logo} alt={t.name} className="h-6 w-6 shrink-0 rounded object-cover ring-1 ring-white/10" />
                      : <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[9px] font-black text-white" style={{ background: teamGradient(t) }}>{t.abbr.slice(0, 4)}</span>}
                    <span className="font-medium" style={{ color: 'var(--text)' }}>{t.name}</span>
                    {t.tag && <span className="ml-auto rounded px-1.5 py-0.5 text-[9px] font-bold uppercase text-sky/80" style={{ background: 'rgba(63,174,255,0.15)' }}>{t.tag}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isScrim && !editing && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-faint)' }}>
              <Shield size={11} className="text-sky" />
              Um bloco será criado automaticamente no Histórico (Blue Side, editável depois).
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Data</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field" />
          </div>
          <div>
            <label className="label">Horário</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="field" />
          </div>
        </div>

        <div>
          <label className="label">Notas (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Detalhes, link da call, pauta..."
            className="field resize-y"
          />
        </div>
      </form>
    </Modal>
  )
}
