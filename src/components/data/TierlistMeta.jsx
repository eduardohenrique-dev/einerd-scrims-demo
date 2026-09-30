// ═══════════════════════════════════════════════════════════════════
// Tierlist Meta — tier list de campeões do pro play (grid_pro_games) por
// presença (pick+ban), com contagem de pick/ban e winrate quando pickado.
// Filtros de liga, patch e LANE. Com lane selecionada, o tier passa a ser por
// pick/winrate NAQUELA lane (dados de grid_game_players, role inferida pela
// timeline). Clicar num campeão abre os MATCHUPS dele (winrate vs cada rival
// da mesma lane).
// ═══════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Swords } from 'lucide-react'
import { useApp } from '../../context/AppContext.jsx'
import { champImgUrl, champKeyOf, champKeyIndex } from '../../data/champions.js'
import { fetchProGames, fetchProFacets, fetchPlayerRows, ORIGIN_TYPES } from '../../lib/grid/gridData.js'
import { aggregateChampions, aggregateLaneChampions, championMatchups } from '../../lib/grid/proStats.js'
import { wrColorWith } from '../../lib/resultColors.js'
import Modal from '../ui/Modal.jsx'

const TIERS = [
  { key: 'S', color: '#FF2E4D' }, { key: 'A', color: '#FF8A00' },
  { key: 'B', color: '#FFBE00' }, { key: 'C', color: '#1FE39A' },
]
// Lanes: '' = todas (tier por presença pick+ban). Demais = tier/matchup por lane.
const LANES = [
  { key: '', label: 'Todas' }, { key: 'Top', label: 'Top' }, { key: 'Jng', label: 'Selva' },
  { key: 'Mid', label: 'Mid' }, { key: 'Bot', label: 'ADC' }, { key: 'Sup', label: 'Suporte' },
]
// Winrate de campeão e de matchup: 50% é amarelo (ver lib/resultColors.js).
const wrColor = (wr) => wrColorWith(wr, { win: '#1FE39A', loss: '#FF6379' })
const pctTxt = (wr) => (wr == null ? '—' : `${Math.round(wr * 100)}%`)

function useChampUrl() {
  const { champions } = useApp()
  const keyByNorm = useMemo(() => champKeyIndex(champions), [champions])
  return (name) => {
    if (!name) return null
    const key = champKeyOf(name, keyByNorm)
    return key ? champImgUrl(key) : null
  }
}

function ChampCell({ c, champUrl, onClick, selected }) {
  const url = champUrl(c.name)
  return (
    <button type="button" onClick={onClick}
      className="flex w-[52px] shrink-0 flex-col items-center gap-0.5 rounded transition-transform hover:-translate-y-0.5"
      title={`${c.name} · ${c.picks} picks${c.bans ? ` / ${c.bans} bans` : ''} · clique p/ matchups`}>
      <div className="relative h-[46px] w-[46px] overflow-hidden rounded"
        style={{ background: 'var(--card-bg-soft)', boxShadow: selected ? '0 0 0 2px var(--accent)' : 'inset 0 0 0 1px var(--card-border)' }}>
        {url ? <img src={url} alt={c.name} className="h-full w-full object-cover" draggable={false} />
          : <span className="flex h-full w-full items-center justify-center text-[8px]" style={{ color: 'var(--text-faint)' }}>{c.name.slice(0, 4)}</span>}
        <span className="absolute bottom-0 right-0 rounded-tl bg-black/70 px-0.5 text-[8px] font-bold" style={{ color: 'var(--text)' }}>{c.picks + c.bans}</span>
      </div>
      <span className="font-display text-[11px] tabular-nums leading-none" style={{ color: wrColor(c.winrate) }}>{pctTxt(c.winrate)}</span>
    </button>
  )
}

function TierRow({ tier, color, champs, champUrl, onPick, selected }) {
  return (
    <div className="flex items-stretch gap-2">
      <div className="clip-notch flex w-9 shrink-0 items-center justify-center font-display text-xl" style={{ background: color, color: '#05060E' }}>{tier}</div>
      <div className="flex min-h-[64px] flex-1 flex-wrap content-start gap-1.5 rounded-md p-1.5" style={{ background: 'var(--card-bg-soft)', boxShadow: 'inset 0 0 0 1px var(--card-border)' }}>
        {champs.length ? champs.map((c) => <ChampCell key={c.name} c={c} champUrl={champUrl} onClick={() => onPick(c.name)} selected={selected === c.name} />)
          : <span className="px-1.5 py-2 text-[10px]" style={{ color: 'var(--text-faint)' }}>—</span>}
      </div>
    </div>
  )
}

// ── Modal de matchups de um campeão ─────────────────────────────────
function MatchupModal({ champ, lane, data, champUrl, onClose }) {
  const laneLabel = LANES.find((l) => l.key === lane)?.label
  return (
    <Modal open={!!champ} onClose={onClose} title={champ || ''}
      subtitle={data.games
        ? `${data.games} ${data.games === 1 ? 'jogo' : 'jogos'} · ${pctTxt(data.winrate)} WR${lane ? ` · ${laneLabel}` : ' · matchups de lane'}`
        : 'Sem partidas registradas para matchups.'}
      size="md"
      headerRight={<img src={champUrl(champ)} alt="" className="h-11 w-11 rounded object-cover" style={{ boxShadow: 'inset 0 0 0 1px var(--card-border)' }} />}>
      {data.matchups.length ? (
        <div className="space-y-1.5">
          <p className="condensed mb-1 text-[10px]" style={{ color: 'var(--text-faint)' }}>Adversário na mesma lane · nº de jogos · winrate</p>
          {data.matchups.map((m) => (
            <div key={m.opponent} className="flex items-center gap-2.5 rounded-md p-1.5" style={{ background: 'var(--card-bg-soft)', boxShadow: 'inset 0 0 0 1px var(--card-border)' }}>
              <img src={champUrl(m.opponent)} alt="" className="h-8 w-8 shrink-0 rounded object-cover" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
              <span className="min-w-0 flex-1 truncate text-[13px]" style={{ color: 'var(--text)' }}>{m.opponent}</span>
              <span className="condensed text-[10px] tabular-nums" style={{ color: 'var(--text-faint)' }}>{m.wins}/{m.games}</span>
              <div className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full" style={{ background: 'var(--card-border)' }}>
                <div className="h-full rounded-full" style={{ width: `${Math.round((m.winrate ?? 0) * 100)}%`, background: wrColor(m.winrate) }} />
              </div>
              <span className="w-9 shrink-0 text-right font-display text-[13px] tabular-nums" style={{ color: wrColor(m.winrate) }}>{pctTxt(m.winrate)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm" style={{ color: 'var(--text-faint)' }}>
          Sem matchups de lane para {champ} neste filtro. (Precisa de jogos com timeline pra inferir a lane.)
        </p>
      )}
    </Modal>
  )
}

export default function TierlistMeta() {
  const champUrl = useChampUrl()

  const [rows, setRows] = useState(null)          // grid_pro_games (com liga/patch)
  const [playerRows, setPlayerRows] = useState([]) // grid_game_players do pro (com role)
  const [loading, setLoading] = useState(true)
  const [facets, setFacets] = useState({ leagues: [], patches: [] })
  const [league, setLeague] = useState('')
  const [patch, setPatch] = useState('')
  const [lane, setLane] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => { fetchProFacets().then(setFacets) }, [])
  useEffect(() => { fetchPlayerRows({ types: ORIGIN_TYPES.championship }).then(setPlayerRows).catch(() => setPlayerRows([])) }, [])
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchProGames({ league: league || undefined, patch: patch || undefined })
      .then((d) => { if (!cancelled) { setRows(d); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [league, patch])

  // Conjunto de jogos (series:game) que passam no filtro de liga/patch.
  const gameKeys = useMemo(() => new Set((rows || []).map((r) => r.id)), [rows])
  // Player rows do pro restritos a esses jogos (respeita liga/patch).
  const proRows = useMemo(
    () => playerRows.filter((r) => gameKeys.has(`${r.series_id}:${r.game_seq}`)),
    [playerRows, gameKeys],
  )

  // Tier: por lane (picks/WR na lane) OU geral (presença pick+ban).
  const champs = useMemo(() => {
    if (!rows) return []
    if (lane) return aggregateLaneChampions(proRows.filter((r) => r.role === lane))
    return aggregateChampions(rows)
  }, [rows, proRows, lane])
  const byTier = useMemo(() => {
    const g = { S: [], A: [], B: [], C: [] }
    for (const c of champs) g[c.tier]?.push(c)
    return g
  }, [champs])

  const matchupData = useMemo(
    () => (selected ? championMatchups(proRows, selected, lane || null) : { games: 0, wins: 0, winrate: null, matchups: [] }),
    [selected, proRows, lane],
  )
  const laneGames = useMemo(() => (lane ? new Set(proRows.filter((r) => r.role === lane).map((r) => `${r.series_id}:${r.game_seq}`)).size : 0), [proRows, lane])

  return (
    <div className="p-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="condensed flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
          <Swords size={14} className="text-sky" /> Tierlist Meta
        </span>
        <select value={league} onChange={(e) => setLeague(e.target.value)} className="field py-1.5 text-sm" style={{ width: 'auto' }}>
          <option value="">Todas as ligas</option>
          {facets.leagues.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <select value={patch} onChange={(e) => setPatch(e.target.value)} className="field py-1.5 text-sm" style={{ width: 'auto' }}>
          <option value="">Todos os patches</option>
          {facets.patches.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {/* Seletor de lane */}
        <div className="flex items-center gap-1">
          {LANES.map((l) => (
            <button key={l.key} onClick={() => { setLane(l.key); setSelected(null) }}
              className="clip-notch px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all"
              style={lane === l.key
                ? { background: 'var(--accent)', color: '#05060E' }
                : { background: 'var(--card-bg-soft)', color: 'var(--text-muted)', boxShadow: 'inset 0 0 0 1px var(--card-border)' }}>
              {l.label}
            </button>
          ))}
        </div>
        <span className="condensed text-[10px]" style={{ color: 'var(--text-faint)' }}>
          {lane ? `${laneGames} jogos com lane` : `${rows?.length || 0} jogos`}
        </span>
      </div>

      {loading ? (
        <p className="flex items-center justify-center gap-2 py-16 text-sm" style={{ color: 'var(--text-faint)' }}><RefreshCw size={15} className="animate-spin" /> Carregando…</p>
      ) : !rows?.length ? (
        <p className="py-16 text-center text-sm" style={{ color: 'var(--text-faint)' }}>Sem jogos de campeonato ainda.</p>
      ) : lane && !champs.length ? (
        <p className="py-16 text-center text-sm" style={{ color: 'var(--text-faint)' }}>Sem dados de lane para esse filtro (precisa de jogos com timeline).</p>
      ) : (
        <div>
          <p className="condensed mb-2 text-[10px]" style={{ color: 'var(--text-faint)' }}>
            {lane
              ? `Tier por picks na lane · nº = picks · % = winrate na lane · clique num campeão p/ ver matchups`
              : 'Tier por presença (pick+ban) · nº = presença no jogo · % = winrate quando pickado · clique p/ matchups'}
          </p>
          <div className="space-y-1.5">
            {TIERS.map((t) => <TierRow key={t.key} tier={t.key} color={t.color} champs={byTier[t.key]} champUrl={champUrl} onPick={setSelected} selected={selected} />)}
          </div>
        </div>
      )}

      <MatchupModal champ={selected} lane={lane} data={matchupData} champUrl={champUrl} onClose={() => setSelected(null)} />
    </div>
  )
}
