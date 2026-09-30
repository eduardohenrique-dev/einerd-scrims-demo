// NotasPessoais — área privada de cada usuário (vinculada ao login).
// Tem cinco partes:
//   1. Caderno de Matchups   → anotações "meu campeão vs campeão do oponente".
//   2. Anotações livres      → texto rico, cor por trecho selecionado.
//   3. Minha Tier List       → tier list S/A/B de campeões (componente TierList).
//   4. Kanban da Staff       → só admin: quadro interativo estilo FigJam.
//   5. Tier Lists da Equipe  → só admin: ver (somente-leitura) a tier list de cada jogador.
// As notas (1-3) são salvas em personal_notes no Supabase, com debounce (auto-save).
// (A comunicação jogador↔staff agora é o Chat da equipe — botão flutuante.)
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, X, Swords, Trash2, Check, ListChecks, ChevronRight, Search, Palette, Users, ImagePlus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useApp } from '../../context/AppContext.jsx'
import { uid, cx } from '../../lib/utils.js'
import { USERS } from '../../lib/auth.js'
import { fetchNotes, saveNotes, EMPTY_NOTES } from '../../lib/personalNotes.js'
import { readImageCompressed } from '../../lib/image.js'
import PageHeader from '../ui/PageHeader.jsx'
import Modal from '../ui/Modal.jsx'
import ChampSelect from './ChampSelect.jsx'
import TierList from './TierList.jsx'
import KanbanBoard from '../kanban/KanbanBoard.jsx'
import { ChampImg } from '../block/ChampionPicker.jsx'

function norm(s = '') { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') }

const NOTE_COLORS = [
  { key: '#29CEF9', label: 'Ciano' },
  { key: '#5A6DFF', label: 'Azul' },
  { key: '#1FE39A', label: 'Verde' },
  { key: '#FFBE00', label: 'Dourado' },
  { key: '#FF6379', label: 'Vermelho' },
  { key: '#EAF1FF', label: 'Branco' },
]

// ── Paleta de cor: aplica a cor só no trecho de texto SELECIONADO ──────
// (não muda a nota inteira — permite várias cores na mesma anotação).
// `onPick` devolve `false` quando não havia seleção; nesse caso mostramos
// uma dica em vez de falhar silenciosamente.
function ColorPicker({ onPick }) {
  const [hint, setHint] = useState(false)

  function pick(color) {
    const applied = onPick(color)
    if (!applied) {
      setHint(true)
      setTimeout(() => setHint(false), 2000)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        <Palette size={13} style={{ color: 'var(--text-faint)' }} />
        <button
          type="button"
          // onMouseDown (não onClick) + preventDefault: mantém a seleção de
          // texto viva. Sem isso, o clique no botão tiraria o foco do editor
          // e a seleção seria perdida antes de conseguirmos lê-la.
          onMouseDown={(e) => { e.preventDefault(); pick(null) }}
          title="Cor padrão do tema — aplica ao trecho selecionado"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold transition-transform hover:scale-110"
          style={{ color: 'var(--text)', background: 'var(--card-bg-soft)', boxShadow: 'inset 0 0 0 1px var(--card-border)' }}
        >
          Aa
        </button>
        {NOTE_COLORS.map((c) => (
          <button
            key={c.key}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); pick(c.key) }}
            title={`${c.label} — aplica ao trecho selecionado`}
            className="h-5 w-5 shrink-0 rounded-full transition-transform hover:scale-110"
            style={{ background: c.key, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.25)' }}
          />
        ))}
      </div>
      {hint && (
        <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
          Selecione um trecho de texto primeiro
        </span>
      )}
    </div>
  )
}

// ── Editor de texto rico das Anotações livres ──────────────────────────
// É um <div contentEditable> "não controlado" pelo React: o HTML só é
// escrito no DOM uma vez, na primeira carga (`loaded.current`). Assim o
// cursor não pula para o início a cada tecla (o problema clássico de
// controlar contentEditable via state a cada render).
// A cor escolhida na paleta é aplicada só ao trecho selecionado, envolvendo-o
// num <span style="color:...">.
function NotebookEditor({ value, onChange }) {
  const ref = useRef(null)
  const loaded = useRef(false)

  useEffect(() => {
    if (!loaded.current && ref.current) {
      ref.current.innerHTML = value || ''
      loaded.current = true
    }
  }, [value])

  function handleInput() {
    onChange(ref.current.innerHTML)
  }

  // Envolve o trecho selecionado num <span> colorido. Devolve false se não
  // havia nada selecionado (ou a seleção não pertence a este editor).
  function applyColor(color) {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false
    const range = sel.getRangeAt(0)
    if (!ref.current.contains(range.commonAncestorContainer)) return false

    const span = document.createElement('span')
    span.style.color = color || 'var(--text)' // "Aa" (null) = volta pra cor do tema
    span.appendChild(range.extractContents())
    range.insertNode(span)

    // Reseleciona o trecho recém-colorido: fica visualmente destacado e dá
    // pra clicar em outra cor em seguida sem precisar selecionar de novo.
    sel.removeAllRanges()
    const newRange = document.createRange()
    newRange.selectNodeContents(span)
    sel.addRange(newRange)

    handleInput()
    return true
  }

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="condensed text-[12px]" style={{ color: 'var(--text-muted)' }}>Anotações</h2>
        <ColorPicker onPick={applyColor} />
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder="Escreva à vontade: builds, runas, ideias de draft, lembretes…"
        className="notebook-area"
        style={{ minHeight: 320, color: 'var(--text)' }}
      />
    </>
  )
}

// ── Linha "solta": matchup que ainda não tem o campeão principal definido ──
function DraftMatchupRow({ row, onChange, onRemove }) {
  return (
    <div className="group flex items-center gap-2 border-b py-2" style={{ borderColor: 'var(--divider)' }}>
      <ChampSelect championId={row.mine} tone="sky" align="left" title="Seu campeão"
        onSelect={(id) => onChange({ ...row, mine: id })} onClear={() => onChange({ ...row, mine: null })} />
      <span className="condensed shrink-0 text-[10px]" style={{ color: 'var(--text-faint)' }}>vs</span>
      <ChampSelect championId={row.opp} tone="loss" align="left" title="Campeão do oponente"
        onSelect={(id) => onChange({ ...row, opp: id })} onClear={() => onChange({ ...row, opp: null })} />
      <input
        value={row.note}
        onChange={(e) => onChange({ ...row, note: e.target.value })}
        placeholder="Como jogar esse matchup..."
        className="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-sm outline-none"
        style={{ color: 'var(--text)' }}
      />
      <button onClick={onRemove} title="Remover linha"
        className="shrink-0 opacity-0 transition group-hover:opacity-100 hover:text-loss" style={{ color: 'var(--text-faint)' }}>
        <X size={15} />
      </button>
    </div>
  )
}

// ── Linha dentro de um grupo: já sabe o "meu campeão", só falta o oponente ──
function MatchupOppRow({ row, first, onChange, onRemove }) {
  return (
    <div className="group/row flex items-center gap-2 py-1.5 pl-1"
      style={{ borderTop: first ? 'none' : '1px solid var(--divider)' }}>
      <ChampSelect championId={row.opp} tone="loss" align="left" size={30} title="Campeão do oponente"
        onSelect={(id) => onChange({ ...row, opp: id })} onClear={() => onChange({ ...row, opp: null })} />
      <input
        value={row.note}
        onChange={(e) => onChange({ ...row, note: e.target.value })}
        placeholder="Como jogar esse matchup..."
        className="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-sm outline-none"
        style={{ color: 'var(--text)' }}
      />
      <button onClick={onRemove} title="Remover matchup"
        className="shrink-0 opacity-0 transition group-hover/row:opacity-100 hover:text-loss" style={{ color: 'var(--text-faint)' }}>
        <X size={14} />
      </button>
    </div>
  )
}

// ── Grupo: todas as anotações de matchup para um mesmo campeão seu ─────────
function MatchupGroup({ champ, rows, onChangeRow, onRemoveRow, onAddRow, onRemoveGroup }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="mb-2 overflow-hidden rounded-md" style={{ boxShadow: 'inset 0 0 0 1px var(--card-border)' }}>
      <div className="flex items-center gap-2 px-2 py-1.5" style={{ background: 'var(--card-bg-soft)' }}>
        <button onClick={() => setOpen((o) => !o)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <ChevronRight size={14} className={cx('shrink-0 transition-transform', open && 'rotate-90')} style={{ color: 'var(--text-faint)' }} />
          <ChampImg champ={champ} size={26} className="rounded" />
          <span className="truncate text-sm font-semibold" style={{ color: 'var(--text)' }}>{champ.name}</span>
          <span className="condensed shrink-0 text-[10px]" style={{ color: 'var(--text-faint)' }}>
            {rows.length} matchup{rows.length > 1 ? 's' : ''}
          </span>
        </button>
        <button onClick={onAddRow} title="Adicionar matchup para este campeão"
          className="shrink-0 p-1 text-sky/80 transition hover:text-sky"><Plus size={15} /></button>
        <button onClick={onRemoveGroup} title="Remover todos os matchups deste campeão"
          className="shrink-0 p-1 transition hover:text-loss" style={{ color: 'var(--text-faint)' }}><Trash2 size={13} /></button>
      </div>
      {open && (
        <div className="px-2">
          {rows.map((row, i) => (
            <MatchupOppRow key={row.id} row={row} first={i === 0}
              onChange={(r) => onChangeRow(row.id, r)} onRemove={() => onRemoveRow(row.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Imagens & Cadernos: fotos de anotações físicas, prints etc. ──────
// As imagens são comprimidas no navegador (canvas → JPEG ~150-400 KB)
// antes de irem para o doc jsonb do usuário. Clique numa miniatura abre
// em tamanho grande; a legenda salva com o mesmo debounce das notas.
function ImageNotes({ images, onAdd, onCaption, onRemove }) {
  const fileRef = useRef(null)
  const [viewer, setViewer] = useState(null) // imagem aberta no modal
  const list = images || []

  return (
    <div className="card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="condensed flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>
          <ImagePlus size={14} className="text-sky" /> Imagens & Cadernos
          {list.length > 0 && (
            <span className="normal-case text-[10px]" style={{ color: 'var(--text-faint)' }}>
              · {list.length} image{list.length === 1 ? 'm' : 'ns'}
            </span>
          )}
        </h2>
        <button onClick={() => fileRef.current?.click()} className="btn-ghost py-1.5 text-xs">
          <ImagePlus size={13} /> Enviar imagens
        </button>
        <input
          ref={fileRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => { [...(e.target.files || [])].forEach(onAdd); e.target.value = '' }}
        />
      </div>

      {list.length === 0 ? (
        <p className="py-6 text-center text-sm" style={{ color: 'var(--text-faint)' }}>
          Envie fotos das anotações do caderno, prints de builds, runas…
        </p>
      ) : (
        // Miniaturas pequenas (grid auto-fill): quanto mais imagens, mais por
        // fileira — clicar abre em tamanho grande no modal. Rola por dentro
        // quando há muitas, pra não empurrar a página.
        <div className="grid max-h-[440px] grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2.5 overflow-y-auto pr-1">
          {list.map((im) => (
            <div key={im.id} className="group relative">
              <button
                onClick={() => setViewer(im)}
                title="Clique para abrir em tamanho grande"
                className="block w-full overflow-hidden rounded-md transition hover:brightness-110"
                style={{ boxShadow: 'inset 0 0 0 1px var(--card-border)' }}
              >
                <img src={im.img} alt={im.caption || 'Anotação'} className="aspect-square w-full object-cover" draggable={false} />
              </button>
              <button
                onClick={() => onRemove(im.id)}
                title="Remover imagem"
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100 hover:bg-loss"
              >
                <X size={11} />
              </button>
              <input
                value={im.caption || ''}
                onChange={(e) => onCaption(im.id, e.target.value)}
                placeholder="Legenda..."
                className="mt-0.5 w-full truncate bg-transparent px-0.5 py-0.5 text-[10px] outline-none"
                style={{ color: 'var(--text-muted)' }}
              />
            </div>
          ))}
        </div>
      )}

      {viewer && (
        <Modal open onClose={() => setViewer(null)} size="xl" title={viewer.caption || 'Anotação'}
          subtitle={viewer.createdAt ? new Date(viewer.createdAt).toLocaleDateString('pt-BR') : undefined}>
          <img src={viewer.img} alt={viewer.caption || 'Anotação'} className="mx-auto max-h-[72vh] w-auto max-w-full rounded-md object-contain" />
        </Modal>
      )}
    </div>
  )
}

// ── Tier Lists da Equipe (só admin) ─────────────────────────────────
// Em vez de mostrar todas as tier lists de uma vez (poluído), mostramos só
// uma fileira de "chips" com os jogadores; clicar num chip abre a tier list
// dele num modal, somente-leitura. As notas de cada jogador só são buscadas
// na nuvem quando o admin realmente abre aquele jogador (lazy) e ficam em
// cache local (`loaded`) pra não refazer a busca ao reabrir o mesmo modal.
function TeamTierLists() {
  const players = useMemo(() => USERS.filter((u) => u.role === 'player'), [])
  const [openUsername, setOpenUsername] = useState(null)
  const [loaded, setLoaded] = useState({}) // username -> notes | 'loading'

  function openPlayer(username) {
    setOpenUsername(username)
    if (!loaded[username]) {
      setLoaded((prev) => ({ ...prev, [username]: 'loading' }))
      fetchNotes(username).then((n) => {
        setLoaded((prev) => ({ ...prev, [username]: n || EMPTY_NOTES() }))
      })
    }
  }

  const openPlayerInfo = players.find((u) => u.username === openUsername)
  const openNotes = openUsername ? loaded[openUsername] : null

  return (
    <div className="card p-4">
      <h3 className="condensed mb-3 flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>
        <Users size={14} className="text-sky" /> Tier Lists da Equipe
      </h3>
      {players.length === 0 ? (
        <p className="py-4 text-center text-xs" style={{ color: 'var(--text-faint)' }}>Nenhum jogador cadastrado.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {players.map((u) => (
            <button
              key={u.username}
              onClick={() => openPlayer(u.username)}
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-xs font-semibold transition hover:brightness-110"
              style={{ background: 'var(--card-bg-soft)', boxShadow: 'inset 0 0 0 1px var(--card-border)', color: 'var(--text-muted)' }}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-ink-900" style={{ background: 'var(--accent)' }}>
                {u.name.slice(0, 2).toUpperCase()}
              </span>
              {u.name}
            </button>
          ))}
        </div>
      )}

      {openPlayerInfo && (
        <Modal
          open
          onClose={() => setOpenUsername(null)}
          size="sm"
          title={`Tier List · ${openPlayerInfo.name}`}
          subtitle="Somente visualização"
        >
          {!openNotes || openNotes === 'loading' ? (
            <p className="py-10 text-center text-sm" style={{ color: 'var(--text-faint)' }}>Carregando…</p>
          ) : (
            <TierList tiers={openNotes.tiers || { S: [], A: [], B: [] }} readOnly />
          )}
        </Modal>
      )}
    </div>
  )
}

// ── Página ──────────────────────────────────────────────────────────
export default function NotasPessoais() {
  const { user } = useAuth()
  const { championById } = useApp()
  const isAdmin = user.role === 'admin'
  const [notes, setNotes] = useState(null)
  const [saveState, setSaveState] = useState('idle') // 'idle' | 'saving' | 'saved'
  const [query, setQuery] = useState('')
  const saveTimer = useRef(null)
  const flashTimer = useRef(null)

  useEffect(() => {
    let cancelled = false
    fetchNotes(user.username).then((n) => { if (!cancelled) setNotes(n || EMPTY_NOTES()) })
    return () => { cancelled = true }
  }, [user.username])

  // Atualiza as notas na tela na hora e salva na nuvem com debounce (500 ms):
  // enquanto o usuário digita, adiamos o save; ao parar, gravamos e mostramos
  // "Salvando…" → "Tudo salvo". `patch` pode ser um objeto ou uma função(prev).
  const update = useCallback((patch) => {
    setNotes((prev) => {
      const next = { ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }
      clearTimeout(saveTimer.current)
      clearTimeout(flashTimer.current)
      setSaveState('saving')
      saveTimer.current = setTimeout(async () => {
        await saveNotes(user.username, next)
        setSaveState('saved')
        flashTimer.current = setTimeout(() => setSaveState('idle'), 2000)
      }, 500)
      return next
    })
  }, [user.username])

  if (!notes) {
    return (
      <div>
        <PageHeader title="Notas Pessoais" subtitle={`Carregando as notas de ${user.name}…`} />
      </div>
    )
  }

  const matchups = notes.matchups || []
  const tiers = notes.tiers || { S: [], A: [], B: [] }
  const images = notes.images || []

  // Imagens & Cadernos: compressão no navegador → append no doc (funcional,
  // pois o onload do canvas é assíncrono e pode chegar fora de ordem).
  function addImage(file) {
    readImageCompressed(file, (b64) => update((prev) => ({
      images: [...(prev.images || []), { id: uid('img'), img: b64, caption: '', createdAt: new Date().toISOString() }],
    })))
  }
  function setImageCaption(id, caption) {
    update((prev) => ({ images: (prev.images || []).map((i) => (i.id === id ? { ...i, caption } : i)) }))
  }
  function removeImage(id) {
    if (!confirm('Remover esta imagem?')) return
    update((prev) => ({ images: (prev.images || []).filter((i) => i.id !== id) }))
  }

  function setMatchup(id, row) { update({ matchups: matchups.map((m) => m.id === id ? row : m) }) }
  function addMatchup(presetMine = null) { update({ matchups: [...matchups, { id: uid('mu'), mine: presetMine, opp: null, note: '' }] }) }
  function removeMatchup(id) { update({ matchups: matchups.filter((m) => m.id !== id) }) }
  function removeGroup(champId) {
    if (!confirm('Remover todos os matchups deste campeão?')) return
    update({ matchups: matchups.filter((m) => m.mine !== champId) })
  }

  // Organiza os matchups para exibição:
  //   • soloRows = matchups sem "meu campeão" definido (ficam soltos no fim).
  //   • groups   = matchups agrupados pelo "meu campeão" (mine), ordenados por nome.
  //     Ex.: todos os matchups da minha "Ahri" ficam juntos num grupo colapsável.
  const soloRows = matchups.filter((m) => !m.mine)
  const groups = [...matchups.filter((m) => m.mine).reduce((map, m) => {
    if (!map.has(m.mine)) map.set(m.mine, [])
    map.get(m.mine).push(m)
    return map
  }, new Map()).entries()]
    .map(([champId, rows]) => ({ champ: championById.get(champId), rows }))
    .filter((g) => g.champ)
    .sort((a, b) => a.champ.name.localeCompare(b.champ.name))

  const q = norm(query.trim())
  const visibleGroups = q
    ? groups
        .map((g) => {
          const champMatches = norm(g.champ.name).includes(q)
          const rows = champMatches ? g.rows : g.rows.filter((r) => {
            const oppC = r.opp ? championById.get(r.opp) : null
            return (oppC && norm(oppC.name).includes(q)) || norm(r.note).includes(q)
          })
          return { ...g, rows }
        })
        .filter((g) => g.rows.length > 0)
    : groups
  const visibleSolo = q
    ? soloRows.filter((m) => {
        const mineC = m.mine ? championById.get(m.mine) : null
        const oppC = m.opp ? championById.get(m.opp) : null
        return (mineC && norm(mineC.name).includes(q)) || (oppC && norm(oppC.name).includes(q)) || norm(m.note).includes(q)
      })
    : soloRows
  const noResults = q && visibleGroups.length === 0 && visibleSolo.length === 0

  return (
    <div>
      <PageHeader
        title="Notas Pessoais"
        subtitle={`${user.name} · suas anotações são privadas e vinculadas ao seu login`}
        action={saveState !== 'idle' && (
          <span className="tag-skew flex items-center gap-1.5 text-[10px]" style={{
            background: saveState === 'saving' ? 'var(--card-bg-soft)' : 'rgba(31,227,154,0.15)',
            color: saveState === 'saving' ? 'var(--text-muted)' : '#1FE39A',
            boxShadow: `inset 0 0 0 1px ${saveState === 'saving' ? 'var(--card-border)' : 'rgba(31,227,154,0.4)'}`,
          }}>
            {saveState === 'saving'
              ? <><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky" /><span>Salvando…</span></>
              : <><Check size={11} /><span>Tudo salvo</span></>}
          </span>
        )}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
        {/* Coluna principal */}
        <div className="space-y-5">
          {/* Caderno de matchups */}
          <div className="card p-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="condensed flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                <Swords size={14} className="text-sky" /> Caderno de Matchups
                {matchups.length > 0 && (
                  <span className="normal-case text-[10px]" style={{ color: 'var(--text-faint)' }}>
                    · {groups.length} campe{groups.length === 1 ? 'ão' : 'ões'} · {matchups.length} matchup{matchups.length > 1 ? 's' : ''}
                  </span>
                )}
              </h2>
              <button onClick={() => addMatchup()} className="btn-ghost py-1.5 text-xs"><Plus size={13} /> Campeão</button>
            </div>

            {matchups.length > 3 && (
              <div className="relative mb-3">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40" style={{ color: 'var(--text-muted)' }} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por campeão ou anotação..." className="field py-1.5 pl-8 text-sm" />
              </div>
            )}

            {matchups.length === 0 ? (
              <p className="py-6 text-center text-sm" style={{ color: 'var(--text-faint)' }}>
                Adicione um campeão seu e anote como jogar contra cada matchup.
              </p>
            ) : noResults ? (
              <p className="py-6 text-center text-sm" style={{ color: 'var(--text-faint)' }}>
                Nenhum matchup encontrado para "{query}".
              </p>
            ) : (
              <div className={cx(groups.length >= 5 && 'max-h-[480px] overflow-y-auto pr-2')}>
                {visibleGroups.map((g) => (
                  <MatchupGroup key={g.champ.id} champ={g.champ} rows={g.rows}
                    onChangeRow={setMatchup} onRemoveRow={removeMatchup}
                    onAddRow={() => addMatchup(g.champ.id)} onRemoveGroup={() => removeGroup(g.champ.id)} />
                ))}
                {visibleSolo.length > 0 && (
                  <div className="mt-1">
                    {visibleGroups.length > 0 && (
                      <p className="condensed mb-1 mt-3 text-[10px]" style={{ color: 'var(--text-faint)' }}>Sem campeão definido</p>
                    )}
                    {visibleSolo.map((m) => (
                      <DraftMatchupRow key={m.id} row={m} onChange={(r) => setMatchup(m.id, r)} onRemove={() => removeMatchup(m.id)} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Folha de anotações */}
          <div className="card p-5">
            <NotebookEditor value={notes.notebook} onChange={(html) => update({ notebook: html })} />
          </div>

          {/* Imagens & Cadernos (fotos de anotações físicas, prints...) */}
          <ImageNotes images={images} onAdd={addImage} onCaption={setImageCaption} onRemove={removeImage} />

          {/* Kanban interativo (só admin) */}
          {isAdmin && <KanbanBoard />}
        </div>

        {/* Coluna lateral: tier list (+ tier lists da equipe pro admin) */}
        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="condensed mb-3 flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>
              <ListChecks size={14} className="text-sky" /> Minha Tier List
            </h2>
            <TierList tiers={tiers} onChange={(t) => update({ tiers: t })} />
          </div>

          {isAdmin && <TeamTierLists />}
        </div>
      </div>
    </div>
  )
}
