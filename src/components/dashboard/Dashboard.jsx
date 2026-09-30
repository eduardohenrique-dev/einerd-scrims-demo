// Dashboard — tela inicial ("Histórico de Treinos").
// Mostra os cartões de estatística (StatsCards), a lista de blocos de treino
// (em grade ou lista), a busca por adversário e o botão de criar bloco novo.
// Ao clicar num bloco, abre o BlockDetail (draft completo).
import { useMemo, useState } from 'react'
import { Plus, Inbox, LayoutGrid, List } from 'lucide-react'
import { useApp } from '../../context/AppContext.jsx'
import { blockScore, isBlockFinished, parseISODate, todayISO } from '../../lib/utils.js'
import StatsCards from './StatsCards.jsx'
import { BlockCard, BlockRow } from './BlockCard.jsx'
import NewBlockModal from './NewBlockModal.jsx'
import BlockDetail from '../block/BlockDetail.jsx'

export default function Dashboard() {
  const { blocks, events, teams, createBlock } = useApp()
  const [query, setQuery]           = useState('')
  const [creating, setCreating]     = useState(false)
  const [openBlockId, setOpenBlockId] = useState(null)
  const [viewMode, setViewMode]     = useState('grid')

  const sorted = useMemo(
    () => [...blocks].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [blocks],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? sorted.filter((b) => b.opponent.toLowerCase().includes(q)) : sorted
  }, [sorted, query])

  // Calcula os 4 números dos cartões do topo. useMemo => só recalcula quando
  // `blocks`/`events` mudam (evita refazer a conta a cada render).
  //   • blocksThisMonth: blocos criados no mês atual
  //   • winrate:         % de vitórias contando JOGOS individuais
  //   • blockWinrate:    % de blocos vencidos (o bloco todo)
  //   • nextLabel:       o próximo evento agendado
  const stats = useMemo(() => {
    const now = new Date()
    const month = now.getMonth()
    const year  = now.getFullYear()
    let wins = 0, total = 0, blocksThisMonth = 0, blockWins = 0, decidedBlocks = 0

    for (const b of blocks) {
      const d = parseISODate(b.date)
      if (d.getMonth() === month && d.getFullYear() === year) blocksThisMonth++
      if (!isBlockFinished(b)) continue // só conta quando o bloco termina
      const { wins: bw, losses: bl } = blockScore(b)
      wins  += bw
      total += b.games.filter((g) => g.result).length
      // Empate (bw === bl) não entra no WR de blocos: nem soma vitória, nem
      // conta no total de blocos decididos (equivale a "empates valem 0").
      if ((bw > 0 || bl > 0) && bw !== bl) { decidedBlocks++; if (bw > bl) blockWins++ }
    }

    const winrate      = total ? Math.round((wins / total) * 100) : 0
    const blockWinrate = decidedBlocks ? Math.round((blockWins / decidedBlocks) * 100) : 0

    const today = todayISO()
    // "Próximo treino" só olha eventos marcados como scrim (ignora review,
    // reunião, campeonato, folga).
    const upcoming = [...events]
      .filter((e) => e.date >= today && e.type === 'scrim')
      .sort((a, b) => a.date === b.date ? a.time.localeCompare(b.time) : a.date < b.date ? -1 : 1)[0]

    let nextLabel = '—'
    if (upcoming) {
      const isToday = upcoming.date === today
      const d = parseISODate(upcoming.date)
      const hour = upcoming.time?.slice(0, 5).replace(':00', 'h').replace(':', 'h')
      nextLabel = isToday
        ? `Hoje · ${hour}`
        : `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} · ${hour}`
    }

    return { blocksThisMonth, winrate, blockWinrate, nextLabel }
  }, [blocks, events])

  const openBlock = blocks.find((b) => b.id === openBlockId)

  return (
    <div>
      {/* Hero angular Persona: banda escura + slash diagonal elétrico */}
      {/* Margens negativas espelham o padding do shell (App.jsx):
          px-4 py-5 → sm:px-6 sm:py-7 → lg:px-8 */}
      <div className="relative -mx-4 -mt-5 mb-7 overflow-hidden px-4 pt-8 pb-7 sm:-mx-6 sm:-mt-7 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-hero-dark" />
        {/* Slashes diagonais de acento */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 overflow-hidden opacity-[0.07]">
          <div className="absolute -right-10 top-0 h-full w-3 bg-sky" style={{ transform: 'skewX(-16deg)' }} />
          <div className="absolute right-6 top-0 h-full w-1.5 bg-sky" style={{ transform: 'skewX(-16deg)' }} />
          <div className="absolute right-14 top-0 h-full w-8 bg-royal" style={{ transform: 'skewX(-16deg)' }} />
        </div>

        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="relative">
            {/* Marca lateral vertical */}
            <span className="absolute -left-6 top-1 h-full w-1.5 bg-sky" style={{ transform: 'skewX(-14deg)' }} />
            <p className="condensed text-[11px] text-sky">EiNerd Esports · LoL</p>
            <h1 className="display mt-1 text-4xl sm:text-5xl" style={{ color: 'var(--text)' }}>
              Histórico de <span className="text-sky">Treinos</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {query && (
              <button onClick={() => setQuery('')} className="btn-ghost py-2">
                Limpar
              </button>
            )}
            <div className="relative">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar adversário..."
                className="field w-52 py-2"
              />
            </div>
            <button onClick={() => setCreating(true)} className="btn-primary">
              <Plus size={17} /> Novo Bloco
            </button>
          </div>
        </div>
      </div>

      <StatsCards stats={stats} />

      {/* Cabeçalho dos treinos + toggle */}
      <div className="mt-7 mb-3 flex items-center justify-between">
        <div className="relative pl-3">
          <span className="absolute left-0 top-0.5 h-full w-1 bg-sky" style={{ transform: 'skewX(-14deg)' }} />
          <h2 className="condensed text-sm" style={{ color: 'var(--text)' }}>
            Treinos recentes
          </h2>
          <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-faint)' }}>
            {filtered.length} bloco{filtered.length !== 1 ? 's' : ''} · clique para abrir detalhes
          </p>
        </div>
        <div className="flex items-center gap-1 p-1" style={{ boxShadow: 'inset 0 0 0 1px var(--card-border)', background: 'var(--card-bg)' }}>
          {[['grid', LayoutGrid], ['list', List]].map(([mode, Icon]) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className="clip-notch p-2 transition-all"
              title={mode === 'grid' ? 'Visualização em grade' : 'Visualização em lista'}
              style={viewMode === mode ? { background: 'var(--accent)', color: '#05060E' } : { color: 'var(--text-faint)' }}
            >
              <Icon size={16} />
            </button>
          ))}
        </div>
      </div>

      {/* Lista scrollável */}
      <div
        className={`overflow-y-auto rounded-2xl ${filtered.length > 0 ? 'max-h-[520px] pr-1' : ''}`}
        style={{ scrollbarGutter: 'stable' }}
      >
        {filtered.length === 0 ? (
          <div className="card relative flex flex-col items-center justify-center gap-4 overflow-hidden py-16 text-center">
            <span className="pointer-events-none absolute inset-0 opacity-[0.04]"
              style={{ backgroundImage: 'repeating-linear-gradient(118deg, transparent 0 14px, #29CEF9 14px 15px)' }} />
            <span className="relative flex h-16 w-16 items-center justify-center clip-notch" style={{ background: 'rgba(41,206,249,0.10)' }}>
              <Inbox size={28} className="text-sky" />
            </span>
            <div className="relative">
              <p className="display text-2xl" style={{ color: 'var(--text)' }}>
                {query ? 'Nada encontrado' : 'Sem registros'}
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                {query ? 'Nenhum bloco bate com a busca.' : 'Crie o primeiro bloco de scrim para começar.'}
              </p>
            </div>
            {!query && (
              <button onClick={() => setCreating(true)} className="btn-primary relative mt-1">
                <Plus size={15} /> Criar bloco
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((b) => (
              <BlockCard key={b.id} block={b} teams={teams} onOpen={() => setOpenBlockId(b.id)} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((b) => (
              <BlockRow key={b.id} block={b} teams={teams} onOpen={() => setOpenBlockId(b.id)} />
            ))}
          </div>
        )}
      </div>

      <NewBlockModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreate={(data) => {
          const b = createBlock(data)
          setOpenBlockId(b.id)
        }}
      />

      {openBlock && <BlockDetail block={openBlock} onClose={() => setOpenBlockId(null)} />}
    </div>
  )
}
