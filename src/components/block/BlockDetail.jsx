// BlockDetail — tela cheia (overlay) de um bloco de treino.
// Aqui o coach: edita adversário/data/nº de jogos, cola o link do VOD, navega
// entre os jogos (GameTabs), preenche o draft de cada um (DraftBoard) e escreve
// as notas. Renderiza via portal para cobrir a tela inteira; fecha com Esc.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Pencil, Eye, ExternalLink, Link2, Trash2, Settings2, Check } from 'lucide-react'
import { useApp } from '../../context/AppContext.jsx'
import { blockScore, formatLabel, formatDateLong, cx } from '../../lib/utils.js'
import GameTabs from './GameTabs.jsx'
import DraftBoard from './DraftBoard.jsx'

export default function BlockDetail({ block, onClose }) {
  const { updateBlock, renameBlockOpponent, resizeBlockGames, setGameMeta, deleteBlock } = useApp()
  const [activeId, setActiveId] = useState(block.games[0]?.id)
  const [editing, setEditing] = useState(true)
  const [editingInfo, setEditingInfo] = useState(false)
  const [infoDraft, setInfoDraft] = useState({ opponent: block.opponent, date: block.date, gamesCount: block.gamesCount })

  function openInfoEdit() {
    setInfoDraft({ opponent: block.opponent, date: block.date, gamesCount: block.gamesCount })
    setEditingInfo(true)
  }

  function saveInfo() {
    const newOpponent = infoDraft.opponent.trim()
    const newCount = Math.max(1, Math.min(9, Number(infoDraft.gamesCount) || block.gamesCount))

    if (newOpponent && newOpponent !== block.opponent) renameBlockOpponent(block.id, newOpponent)
    if (infoDraft.date && infoDraft.date !== block.date) updateBlock(block.id, { date: infoDraft.date })

    if (newCount !== block.gamesCount) {
      if (newCount < block.gamesCount) {
        const removed = [...block.games].sort((a, c) => a.index - c.index).slice(newCount)
        const hasData = removed.some((g) => g.result || g.blue.picks.some((p) => p.championId) || g.red.picks.some((p) => p.championId))
        if (hasData && !confirm(`Reduzir para ${newCount} jogo${newCount !== 1 ? 's' : ''} vai apagar o draft/resultado dos jogos removidos. Continuar?`)) {
          setEditingInfo(false)
          return
        }
      }
      resizeBlockGames(block.id, newCount)
    }
    setEditingInfo(false)
  }

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const game = block.games.find((g) => g.id === activeId) || block.games[0]
  const { wins, losses } = blockScore(block)

  return createPortal(
    <div
      className="fixed inset-0 z-40 overflow-y-auto backdrop-blur-sm animate-fade-in"
      style={{ background: 'var(--bg)', opacity: 1 }}
    >
      <div className="mx-auto min-h-full max-w-6xl px-4 py-6 sm:px-8">
        {/* Cabeçalho */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="display text-3xl" style={{ color: 'var(--text)' }}>vs {block.opponent}</h1>
              <span
                className={cx(
                  'rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums',
                  wins > losses ? 'bg-sky/15 text-sky' : wins < losses ? 'bg-loss/15 text-loss' : 'bg-white/10',
                )}
                style={wins === losses ? { color: 'var(--text-muted)' } : {}}
              >
                {wins} - {losses}
              </span>
            </div>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              {formatLabel(block.gamesCount)} · {formatDateLong(block.date)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={openInfoEdit} className="btn-ghost" title="Editar adversário, data e quantidade de jogos">
              <Settings2 size={16} /> Editar Bloco
            </button>
            <button onClick={() => setEditing((e) => !e)} className="btn-ghost">
              {editing ? <Eye size={16} /> : <Pencil size={16} />}
              {editing ? 'Visualizar' : 'Inserir / Editar Draft'}
            </button>
            <button
              onClick={() => {
                if (confirm(`Excluir o bloco vs ${block.opponent}? Esta ação não pode ser desfeita.`)) {
                  deleteBlock(block.id)
                  onClose()
                }
              }}
              className="rounded-xl border border-loss/25 p-2.5 text-loss/70 transition hover:border-loss hover:text-loss"
              title="Excluir bloco"
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={onClose}
              className="rounded-xl border border-sky/20 p-2.5 transition hover:border-sky"
              style={{ color: 'var(--text-muted)' }}
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Edição de adversário / data / quantidade de jogos */}
        {editingInfo && (
          <div className="card mb-5 p-4 animate-slide-up">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_1fr]">
              <div>
                <label className="label">Adversário</label>
                <input
                  value={infoDraft.opponent}
                  onChange={(e) => setInfoDraft((d) => ({ ...d, opponent: e.target.value }))}
                  className="field"
                />
              </div>
              <div>
                <label className="label">Data</label>
                <input
                  type="date"
                  value={infoDraft.date}
                  onChange={(e) => setInfoDraft((d) => ({ ...d, date: e.target.value }))}
                  className="field"
                />
              </div>
              <div>
                <label className="label">Jogos (Bo)</label>
                <input
                  type="number" min={1} max={9}
                  value={infoDraft.gamesCount}
                  onChange={(e) => setInfoDraft((d) => ({ ...d, gamesCount: e.target.value }))}
                  className="field"
                />
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setEditingInfo(false)} className="btn-ghost">Cancelar</button>
              <button onClick={saveInfo} className="btn-primary"><Check size={15} /> Salvar</button>
            </div>
          </div>
        )}

        {/* VOD */}
        <div className="card mb-5 flex flex-wrap items-center gap-3 p-3">
          <span className="flex items-center gap-2 pl-1 text-[11px] font-bold uppercase tracking-wider text-loss">
            <span className="h-2 w-2 rounded-full bg-loss" /> VOD do bloco
          </span>
          <div className="relative min-w-[240px] flex-1">
            <Link2 size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-40" style={{ color: 'var(--text-muted)' }} />
            <input
              value={block.vodUrl}
              onChange={(e) => updateBlock(block.id, { vodUrl: e.target.value })}
              placeholder="https://youtube.com/..."
              className="field pl-9"
            />
          </div>
          <a
            href={block.vodUrl || undefined}
            target="_blank"
            rel="noreferrer"
            className={cx('btn-ghost', !block.vodUrl && 'pointer-events-none opacity-40')}
          >
            Abrir VOD <ExternalLink size={15} />
          </a>
        </div>

        {/* Abas */}
        <GameTabs games={block.games} activeId={game.id} onSelect={setActiveId} />

        {/* Draft */}
        <div className="mt-5">
          <DraftBoard block={block} game={game} readOnly={!editing} />
        </div>

        {/* Notas do coach */}
        <div className="card mt-5 p-5">
          <label className="label flex items-center gap-2" style={{ color: 'var(--text-faint)' }}>
            Notas do Coach · Jogo {game.index}
          </label>
          <textarea
            value={game.notes}
            onChange={(e) => setGameMeta(block.id, game.id, { notes: e.target.value })}
            rows={3}
            placeholder="Observações, ajustes de macro, prioridades de pick/ban..."
            className="field resize-y leading-relaxed"
          />
        </div>
      </div>
    </div>,
    document.body,
  )
}
