// KanbanBoard — quadro interativo estilo FigJam (Notas Pessoais, só admin).
// Colunas com cartões "sticky note" coloridos, arrastáveis entre colunas
// (drag & drop nativo do navegador). Persistência: documento único na
// tabela `kanban` (id 'board') com debounce; realtime ecoa entre sessões.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, X, Trash2, KanbanSquare } from 'lucide-react'
import { fetchAll, upsertDoc, subscribeTable } from '../../lib/db.js'
import { uid, cx } from '../../lib/utils.js'

// Paleta sticky (FigJam): fundo claro + texto escuro pra dar contraste.
const STICKY = ['#FFD966', '#FF9EB1', '#8FF0C8', '#9BE4FF', '#C9A7FF', '#FFB86B']

const DEFAULT_BOARD = () => ({
  id: 'board',
  columns: [
    { id: uid('col'), title: 'A fazer', cards: [] },
    { id: uid('col'), title: 'Fazendo', cards: [] },
    { id: uid('col'), title: 'Feito', cards: [] },
  ],
})

export default function KanbanBoard() {
  const [board, setBoard] = useState(null)
  const [editingCard, setEditingCard] = useState(null) // card.id em edição
  const [editingCol, setEditingCol] = useState(null)   // coluna com título em edição
  const [dragOver, setDragOver] = useState(null)       // { colId, index } alvo do drop
  const dragInfo = useRef(null)                        // { colId, cardId } sendo arrastado
  const saveTimer = useRef(null)

  // ── Carga + realtime ──────────────────────────────────────────────
  useEffect(() => {
    let alive = true
    fetchAll('kanban').then((rows) => {
      if (!alive) return
      const doc = rows.find((r) => r.id === 'board')?.data
      setBoard(doc && Array.isArray(doc.columns) ? doc : DEFAULT_BOARD())
    })
    const unsub = subscribeTable('kanban', (payload) => {
      const doc = payload.new?.data
      if (doc?.id !== 'board') return
      // Ignora o eco das nossas próprias gravações (conteúdo idêntico).
      setBoard((prev) => (JSON.stringify(prev) === JSON.stringify(doc) ? prev : doc))
    })
    return () => { alive = false; unsub() }
  }, [])

  // Atualiza na tela na hora + salva na nuvem com debounce (400 ms).
  function update(mutate) {
    setBoard((prev) => {
      const next = mutate(structuredClone(prev))
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => upsertDoc('kanban', 'board', next), 400)
      return next
    })
  }

  // ── Operações ─────────────────────────────────────────────────────
  function addColumn() {
    const id = uid('col')
    update((b) => { b.columns.push({ id, title: 'Nova coluna', cards: [] }); return b })
    setEditingCol(id)
  }
  function renameColumn(colId, title) {
    update((b) => { const c = b.columns.find((x) => x.id === colId); if (c) c.title = title || c.title; return b })
  }
  function removeColumn(colId) {
    const col = board.columns.find((c) => c.id === colId)
    if (col?.cards.length && !confirm(`Excluir "${col.title}" e seus ${col.cards.length} cartão(ões)?`)) return
    update((b) => { b.columns = b.columns.filter((c) => c.id !== colId); return b })
  }
  function addCard(colId) {
    const id = uid('card')
    update((b) => {
      const c = b.columns.find((x) => x.id === colId)
      if (c) c.cards.push({ id, text: '', color: STICKY[c.cards.length % STICKY.length] })
      return b
    })
    setEditingCard(id)
  }
  function patchCard(colId, cardId, patch) {
    update((b) => {
      const card = b.columns.find((x) => x.id === colId)?.cards.find((k) => k.id === cardId)
      if (card) Object.assign(card, patch)
      return b
    })
  }
  function removeCard(colId, cardId) {
    update((b) => {
      const c = b.columns.find((x) => x.id === colId)
      if (c) c.cards = c.cards.filter((k) => k.id !== cardId)
      return b
    })
  }
  // Move o cartão pra coluna/posição alvo (índice null = fim da coluna).
  function moveCard(cardId, fromColId, toColId, index = null) {
    update((b) => {
      const from = b.columns.find((c) => c.id === fromColId)
      const to = b.columns.find((c) => c.id === toColId)
      if (!from || !to) return b
      const i = from.cards.findIndex((k) => k.id === cardId)
      if (i === -1) return b
      const [card] = from.cards.splice(i, 1)
      let at = index == null ? to.cards.length : index
      if (from === to && index != null && i < index) at-- // removeu antes do alvo → índice anda 1
      to.cards.splice(Math.max(0, Math.min(at, to.cards.length)), 0, card)
      return b
    })
  }

  // ── Drag & drop ───────────────────────────────────────────────────
  function onDragStart(e, colId, cardId) {
    dragInfo.current = { colId, cardId }
    e.dataTransfer.effectAllowed = 'move'
    // arrasta o próprio elemento como ghost (padrão do navegador)
  }
  function onDropTo(e, colId, index = null) {
    e.preventDefault(); e.stopPropagation()
    const d = dragInfo.current
    if (d) moveCard(d.cardId, d.colId, colId, index)
    dragInfo.current = null
    setDragOver(null)
  }

  if (!board) return null

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="condensed flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>
          <KanbanSquare size={14} className="text-sky" /> Kanban da Staff
        </h2>
        <button onClick={addColumn} className="btn-ghost py-1.5 text-xs"><Plus size={13} /> Coluna</button>
      </div>

      <div className="flex items-start gap-3 overflow-x-auto pb-2">
        {board.columns.map((col) => (
          <div
            key={col.id}
            onDragOver={(e) => { e.preventDefault(); if (dragOver?.colId !== col.id || dragOver?.index != null) setDragOver({ colId: col.id, index: null }) }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null) }}
            onDrop={(e) => onDropTo(e, col.id)}
            className={cx('kb-col w-[240px] shrink-0 rounded-md p-2 transition-shadow', dragOver?.colId === col.id && 'kb-col-over')}
            style={{ background: 'var(--input-bg)', boxShadow: 'inset 0 0 0 1px var(--card-border)' }}
          >
            {/* Cabeçalho da coluna */}
            <div className="group/col mb-2 flex items-center gap-1.5 px-1">
              <span className="h-3 w-[3px] shrink-0 bg-sky" style={{ transform: 'skewX(-14deg)' }} />
              {editingCol === col.id ? (
                <input
                  autoFocus defaultValue={col.title}
                  onBlur={(e) => { renameColumn(col.id, e.target.value.trim()); setEditingCol(null) }}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditingCol(null) }}
                  className="field min-w-0 flex-1 rounded-none px-1 py-0.5 text-xs font-bold uppercase"
                />
              ) : (
                <button onClick={() => setEditingCol(col.id)} title="Renomear coluna"
                  className="condensed min-w-0 flex-1 truncate text-left text-[11px]" style={{ color: 'var(--text)' }}>
                  {col.title}
                </button>
              )}
              <span className="condensed shrink-0 text-[9px] tabular-nums" style={{ color: 'var(--text-faint)' }}>{col.cards.length}</span>
              <button onClick={() => removeColumn(col.id)} title="Excluir coluna"
                className="shrink-0 opacity-0 transition-opacity group-hover/col:opacity-100 hover:text-loss" style={{ color: 'var(--text-faint)' }}>
                <Trash2 size={12} />
              </button>
            </div>

            {/* Cartões */}
            <div className="space-y-2">
              {col.cards.map((card, idx) => (
                <div key={card.id}>
                  {/* Linha-guia de inserção quando arrastando por cima deste cartão */}
                  {dragOver?.colId === col.id && dragOver?.index === idx && (
                    <div className="mb-2 h-0.5 rounded-full bg-sky shadow-glow-sm" />
                  )}
                  <div
                    draggable={editingCard !== card.id}
                    onDragStart={(e) => onDragStart(e, col.id, card.id)}
                    onDragEnd={() => { dragInfo.current = null; setDragOver(null) }}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver({ colId: col.id, index: idx }) }}
                    onDrop={(e) => onDropTo(e, col.id, idx)}
                    className={cx(
                      'kb-card clip-notch group/card relative cursor-grab p-2.5 transition-all active:cursor-grabbing',
                      dragInfo.current?.cardId === card.id && 'opacity-40',
                    )}
                    style={{ background: card.color, color: '#151824', boxShadow: '0 3px 10px -3px rgba(0,0,0,0.35)' }}
                  >
                    {editingCard === card.id ? (
                      <>
                        <textarea
                          autoFocus defaultValue={card.text} rows={3}
                          onBlur={(e) => { patchCard(col.id, card.id, { text: e.target.value.trim() }); setEditingCard(null) }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.target.blur() }
                            if (e.key === 'Escape') setEditingCard(null)
                          }}
                          placeholder="Escreva aqui…"
                          className="w-full resize-none bg-transparent text-[13px] font-medium leading-snug outline-none placeholder:text-black/35"
                        />
                        {/* Paleta de cores (modo edição) */}
                        <div className="mt-1.5 flex items-center gap-1.5">
                          {STICKY.map((c) => (
                            <button key={c} type="button"
                              onMouseDown={(e) => { e.preventDefault(); patchCard(col.id, card.id, { color: c }) }}
                              className={cx('h-4 w-4 rounded-full transition-transform hover:scale-125', card.color === c && 'ring-2 ring-black/40')}
                              style={{ background: c }} title="Cor do cartão" />
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <p onClick={() => setEditingCard(card.id)}
                          className="min-h-[18px] whitespace-pre-wrap break-words text-[13px] font-medium leading-snug">
                          {card.text || <span className="opacity-40">Clique para escrever…</span>}
                        </p>
                        <button
                          onClick={() => removeCard(col.id, card.id)}
                          className="absolute right-1 top-1 rounded p-0.5 opacity-0 transition-opacity hover:bg-black/10 group-hover/card:opacity-100"
                          title="Excluir cartão"
                        >
                          <X size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {/* Guia de inserção no fim da coluna */}
              {dragOver?.colId === col.id && dragOver?.index == null && dragInfo.current && (
                <div className="h-0.5 rounded-full bg-sky shadow-glow-sm" />
              )}
            </div>

            <button onClick={() => addCard(col.id)}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-[11px] font-semibold transition-colors hover:bg-white/5 hover:text-sky"
              style={{ color: 'var(--text-faint)' }}>
              <Plus size={13} /> Cartão
            </button>
          </div>
        ))}

        {board.columns.length === 0 && (
          <button onClick={addColumn}
            className="flex h-24 w-[240px] shrink-0 items-center justify-center gap-2 rounded-md border border-dashed text-sm transition-colors hover:text-sky"
            style={{ borderColor: 'var(--card-border)', color: 'var(--text-faint)' }}>
            <Plus size={15} /> Criar primeira coluna
          </button>
        )}
      </div>
    </div>
  )
}
