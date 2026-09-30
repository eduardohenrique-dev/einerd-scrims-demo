// NewBlockModal — formulário (dentro de um Modal) para criar um bloco de treino.
// O usuário escolhe adversário (com autocompletar dos times já cadastrados),
// data, nosso lado inicial (blue/red), quantidade de jogos (Bo3/Bo5/custom) e
// uma tag opcional. Ao confirmar, chama `onCreate` com esses dados.
import { useState } from 'react'
import { Tag } from 'lucide-react'
import Modal from '../ui/Modal.jsx'
import { useApp } from '../../context/AppContext.jsx'
import { todayISO, cx } from '../../lib/utils.js'
import { getTeamInfo, teamGradient } from '../../data/teams.js'

export default function NewBlockModal({ open, onClose, onCreate }) {
  const { teams } = useApp()
  const [opponent, setOpponent]         = useState('')
  const [date, setDate]                 = useState(todayISO())
  const [gamesCount, setGamesCount]     = useState(5)
  const [ourSide, setOurSide]           = useState('blue')
  const [tag, setTag]                   = useState('')
  const [showSuggestions, setShow]      = useState(false)

  const suggestions = teams
    .filter((t) => t.name.toLowerCase().includes(opponent.toLowerCase()) && t.name !== 'EiNerd')
    .slice(0, 8)

  function reset() {
    setOpponent(''); setDate(todayISO()); setGamesCount(5); setOurSide('blue'); setTag(''); setShow(false)
  }

  function pickTeam(t) {
    setOpponent(t.name)
    setTag(t.tag || '')
    setShow(false)
  }

  function submit(e) {
    e.preventDefault()
    if (!opponent.trim()) return
    onCreate({ opponent: opponent.trim(), date, gamesCount: Number(gamesCount), ourSide, tag: tag.trim() })
    reset(); onClose()
  }

  const info = getTeamInfo(teams, opponent)

  return (
    <Modal
      open={open} onClose={onClose}
      title="Novo Bloco de Treino"
      subtitle="Defina o adversário e a estrutura do bloco."
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button type="submit" form="new-block-form" disabled={!opponent.trim()} className="btn-primary">
            Criar bloco
          </button>
        </>
      }
    >
      <form id="new-block-form" onSubmit={submit} className="space-y-4">
        {/* Adversário */}
        <div>
          <label className="label">Adversário</label>
          <div className="relative">
            <div className="relative flex items-center">
              {info && (
                <span className="absolute left-3 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-black text-white"
                  style={{ background: teamGradient(info) }}>
                  {info.abbr.slice(0, 4)}
                </span>
              )}
              <input
                autoFocus
                value={opponent}
                onChange={(e) => { setOpponent(e.target.value); setShow(true) }}
                onFocus={() => setShow(true)}
                onBlur={() => setTimeout(() => setShow(false), 150)}
                placeholder="Ex.: Tigres Academy, Aurora Five..."
                className={cx('field', info && 'pl-10')}
              />
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-xl border py-1 shadow-glow animate-pop-in"
                style={{ background: 'var(--surface)', borderColor: 'rgba(0,174,255,0.2)' }}>
                {suggestions.map((t) => (
                  <button
                    key={t.id} type="button"
                    onMouseDown={() => pickTeam(t)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition hover:bg-sky/5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {t.logo
                      ? <img src={t.logo} alt={t.name} className="h-6 w-6 shrink-0 rounded object-cover ring-1 ring-white/10" />
                      : <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[9px] font-black text-white"
                          style={{ background: teamGradient(t) }}>
                          {t.abbr.slice(0, 4)}
                        </span>
                    }
                    <span className="font-medium" style={{ color: 'var(--text)' }}>{t.name}</span>
                    {t.tag && (
                      <span className="ml-auto rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-sky/70" style={{ background: 'rgba(0,174,255,0.12)' }}>
                        {t.tag}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Data</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field" />
          </div>
          <div>
            <label className="label">Nosso lado</label>
            <div className="flex gap-2">
              {[['blue', 'Blue'], ['red', 'Red']].map(([val, label]) => (
                <button
                  key={val} type="button" onClick={() => setOurSide(val)}
                  className={cx(
                    'flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-all duration-150',
                    ourSide === val
                      ? val === 'blue'
                        ? 'border-sky bg-sky/15 text-sky shadow-[0_0_12px_rgba(0,174,255,0.2)]'
                        : 'border-loss bg-loss/15 text-loss shadow-[0_0_12px_rgba(255,27,72,0.2)]'
                      : 'border-sky/15 text-cloud/50 hover:border-sky/40',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="label">Quantidade de jogos</label>
          <div className="flex items-center gap-2">
            {[3, 5].map((n) => (
              <button
                key={n} type="button" onClick={() => setGamesCount(n)}
                className={cx(
                  'rounded-xl border px-5 py-2.5 text-sm font-bold transition-all duration-150',
                  Number(gamesCount) === n
                    ? 'border-royal bg-royal/20 text-white shadow-[0_0_12px_rgba(0,0,255,0.3)]'
                    : 'border-sky/15 text-cloud/55 hover:border-sky/40',
                )}
              >
                Bo{n}
              </button>
            ))}
            <div className="ml-1 flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--text-faint)' }}>personalizado</span>
              <input type="number" min={1} max={9} value={gamesCount}
                onChange={(e) => setGamesCount(e.target.value)} className="field w-20 text-center" />
            </div>
          </div>
        </div>

        {/* Tag do time (opcional) */}
        <div>
          <label className="label flex items-center gap-1.5">
            <Tag size={12} /> Tag do time <span className="font-normal normal-case" style={{ color: 'var(--text-faint)' }}>(opcional)</span>
          </label>
          <input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="Ex.: Rival, Tier 1, Coaching..."
            maxLength={16}
            className="field"
          />
          <p className="mt-1 text-[11px]" style={{ color: 'var(--text-faint)' }}>
            Fica salva no time e aparece na aba <b style={{ color: 'var(--text-muted)' }}>Times</b>.
          </p>
        </div>
      </form>
    </Modal>
  )
}
