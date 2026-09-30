// ═══════════════════════════════════════════════════════════════════
// Match History — séries/jogos de campeonato (pro play) com os drafts
// completos (picks + bans por lado), filtros de liga/patch e WR por lado.
// Lê grid_pro_games (Supabase). Imagens dos campeões via ddragonKey do app.
// ═══════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, RefreshCw, Trophy, Crown, Download, AlertCircle } from 'lucide-react'
import { useApp } from '../../context/AppContext.jsx'
import { cx } from '../../lib/utils.js'
import { champImgUrl, champKeyOf, champKeyIndex } from '../../data/champions.js'
import { fetchProGames, fetchProFacets } from '../../lib/grid/gridData.js'


const BLUE = '#2E4BFF'
const RED = '#FF2E4D'

function ChampSquare({ name, keyByNorm, size = 46, ban = false }) {
  const key = champKeyOf(name, keyByNorm)
  const url = key ? champImgUrl(key) : null
  return (
    <div className="relative shrink-0 overflow-hidden rounded" title={name}
      style={{ width: size, height: size, background: 'var(--card-bg-soft)', boxShadow: 'inset 0 0 0 1px var(--card-border)' }}>
      {url
        ? <img src={url} alt={name} className="h-full w-full object-cover" style={{ filter: ban ? 'grayscale(1)' : 'none', opacity: ban ? 0.55 : 1 }} draggable={false} />
        : <span className="flex h-full w-full items-center justify-center px-0.5 text-center text-[8px] leading-tight" style={{ color: 'var(--text-faint)' }}>{name}</span>}
      {ban && <span className="absolute left-1/2 top-1/2 h-[2px] w-[130%] -translate-x-1/2 -translate-y-1/2 rotate-45" style={{ background: RED, opacity: 0.85 }} />}
    </div>
  )
}

// Painel de um time no jogo (lado + first pick + bans + picks + vencedor)
function TeamPanel({ side, team, picks, bans, won, lost, firstPick, keyByNorm }) {
  const c = side === 'blue' ? BLUE : RED
  const tint = side === 'blue' ? 'rgba(46,75,255,0.10)' : 'rgba(255,46,77,0.10)'
  return (
    <div className="min-w-0 flex-1 rounded-md p-2.5 transition-opacity"
      style={{ background: won ? tint : 'var(--card-bg-soft)', boxShadow: `inset 0 0 0 ${won ? '2px' : '1px'} ${won ? c : 'var(--card-border)'}`, opacity: lost ? 0.6 : 1 }}>
      <div className="mb-2 flex items-center gap-2">
        <span className="condensed rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: c }}>{side === 'blue' ? 'BLUE' : 'RED'}</span>
        <span className="truncate text-sm font-bold" style={{ color: 'var(--text)' }}>{team}</span>
        {firstPick
          ? <span className="condensed shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold text-ink-900" style={{ background: '#FFBE00' }}>1º PICK</span>
          : <span className="condensed shrink-0 text-[9px]" style={{ color: 'var(--text-faint)' }}>CONTRA</span>}
        {won && <span className="ml-auto flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-black uppercase text-ink-900" style={{ background: '#1FE39A' }}><Crown size={10} /> Venceu</span>}
      </div>
      {/* bans */}
      <div className="mb-1.5 flex items-center gap-1">
        <span className="condensed w-7 shrink-0 text-[8px]" style={{ color: 'var(--text-faint)' }}>BANS</span>
        {(bans || []).map((b, i) => <ChampSquare key={i} name={b} keyByNorm={keyByNorm} size={26} ban />)}
      </div>
      {/* picks */}
      <div className="flex flex-wrap items-center gap-1.5">
        {(picks || []).map((p, i) => (
          <div key={i} className="relative">
            <ChampSquare name={p} keyByNorm={keyByNorm} size={46} />
            <span className="absolute -left-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold text-white" style={{ background: c }}>{i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Botão de download do replay (.rofl).
// Por que não é um <a download> simples: quando a GRID recusa (cota/permissão),
// o navegador já tinha se comprometido com o download e salvava o CORPO DE ERRO
// como se fosse o arquivo — o usuário via "falhou/corrompido" sem saber o motivo
// e achava que era problema da conta dele. Aqui buscamos primeiro, checamos a
// resposta e só então salvamos; se falhar, mostramos a explicação da API.
// Uma requisição só: o corpo já vem no mesmo fetch (nada de checagem extra, que
// consumiria o dobro da cota de download da GRID).
function ReplayButton({ seriesId, gameSeq }) {
  const [state, setState] = useState('idle') // idle | loading | error
  const [pct, setPct] = useState(null)
  const [err, setErr] = useState(null)

  const download = async (e) => {
    e.stopPropagation(); e.preventDefault()
    if (state === 'loading') return
    // Demo: as partidas são inventadas, não existe replay para baixar.
    if (import.meta.env.VITE_DEMO === '1') {
      setErr('Download de replay indisponível na demonstração (partidas fictícias).'); setState('error')
      return
    }
    setState('loading'); setPct(null); setErr(null)
    try {
      const res = await fetch(`/api/grid-replay?series=${encodeURIComponent(seriesId)}&game=${encodeURIComponent(gameSeq)}`)
      if (!res.ok) {
        // A API sempre responde JSON no erro; se vier outra coisa, não quebra.
        const info = await res.json().catch(() => null)
        throw new Error(info?.message || `Falha ao baixar (HTTP ${res.status}).`)
      }
      // Progresso: o .rofl tem 20–90 MB e sem retorno visual parece travado.
      const total = Number(res.headers.get('content-length')) || 0
      const reader = res.body.getReader()
      const chunks = []
      let got = 0
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value); got += value.length
        if (total) setPct(Math.round((got / total) * 100))
      }
      const url = URL.createObjectURL(new Blob(chunks, { type: 'application/octet-stream' }))
      const a = document.createElement('a')
      a.href = url; a.download = `replay_${seriesId}_${gameSeq}.rofl`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
      setState('idle'); setPct(null)
    } catch (e2) {
      setErr(e2.message); setState('error')
    }
  }

  return (
    <div className="ml-auto flex min-w-0 items-center gap-2">
      {state === 'error' && (
        <span className="flex min-w-0 items-center gap-1 text-[10px]" style={{ color: RED }} title={err}>
          <AlertCircle size={12} className="shrink-0" />
          <span className="truncate" style={{ maxWidth: 420 }}>{err}</span>
        </span>
      )}
      <button
        onClick={download}
        disabled={state === 'loading'}
        title={state === 'error' ? 'Tentar de novo' : 'Baixar o replay (.rofl) deste jogo'}
        className="condensed flex shrink-0 items-center gap-1.5 rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-all hover:brightness-110 disabled:opacity-70"
        style={{ background: 'var(--card-bg-soft)', color: 'var(--text-muted)', boxShadow: 'inset 0 0 0 1px var(--card-border)' }}
      >
        {state === 'loading'
          ? <><RefreshCw size={12} className="animate-spin" /> {pct != null ? `${pct}%` : 'baixando…'}</>
          : <><Download size={12} /> {state === 'error' ? 'tentar de novo' : '.rofl'}</>}
      </button>
    </div>
  )
}

function GameRow({ g, keyByNorm }) {
  const blueWon = g.winner === 'blue', redWon = g.winner === 'red'
  return (
    <div className="px-3 py-3" style={{ borderTop: '1px solid var(--divider)' }}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="condensed rounded bg-black/20 px-2 py-0.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>GAME {g.game_seq}</span>
        <ReplayButton seriesId={g.series_id} gameSeq={g.game_seq} />
      </div>
      <div className="flex flex-col items-stretch gap-2 lg:flex-row">
        <TeamPanel side="blue" team={g.blue_team} picks={g.blue_picks} bans={g.blue_bans} won={blueWon} lost={redWon} firstPick={g.first_pick === 'blue'} keyByNorm={keyByNorm} />
        <div className="flex items-center justify-center"><span className="font-display text-sm" style={{ color: 'var(--text-faint)' }}>VS</span></div>
        <TeamPanel side="red" team={g.red_team} picks={g.red_picks} bans={g.red_bans} won={redWon} lost={blueWon} firstPick={g.first_pick === 'red'} keyByNorm={keyByNorm} />
      </div>
    </div>
  )
}

function SeriesCard({ s, keyByNorm }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-md" style={{ boxShadow: 'inset 0 0 0 1px var(--card-border)' }}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-4 py-3 text-left" style={{ background: 'var(--card-bg-soft)' }}>
        <span className="tag-skew bg-royal/25 text-sky"><span>{s.league}</span></span>
        <span className="condensed text-[10px]" style={{ color: 'var(--text-faint)' }}>{s.patch}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold" style={{ color: 'var(--text)' }}>
          {s.teamA} <span style={{ color: 'var(--text-faint)' }}>vs</span> {s.teamB}
        </span>
        <span className="font-display text-xl tabular-nums" style={{ color: 'var(--text)' }}>{s.scoreA}<span style={{ color: 'var(--text-faint)' }}>–</span>{s.scoreB}</span>
        <span className="condensed hidden text-[10px] sm:inline" style={{ color: 'var(--text-faint)' }}>{s.date}</span>
        <ChevronDown size={16} className={cx('shrink-0 transition-transform', open && 'rotate-180')} style={{ color: 'var(--text-faint)' }} />
      </button>
      {open && <div>{s.games.map((g) => <GameRow key={g.id} g={g} keyByNorm={keyByNorm} />)}</div>}
    </div>
  )
}

export default function MatchHistory() {
  const { champions } = useApp()
  const keyByNorm = useMemo(() => champKeyIndex(champions), [champions])

  const [rows, setRows] = useState(null)
  const [loading, setLoading] = useState(true)
  const [facets, setFacets] = useState({ leagues: [], patches: [] })
  const [league, setLeague] = useState('')
  const [patch, setPatch] = useState('')

  useEffect(() => { fetchProFacets().then(setFacets) }, [])
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchProGames({ league: league || undefined, patch: patch || undefined })
      .then((d) => { if (!cancelled) { setRows(d); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [league, patch])

  const { series, blueWr, totalGames } = useMemo(() => {
    if (!rows) return { series: [], blueWr: null, totalGames: 0 }
    const byS = new Map()
    let blueWins = 0, decided = 0
    for (const g of rows) {
      if (g.winner === 'blue') blueWins++
      if (g.winner) decided++
      if (!byS.has(g.series_id)) byS.set(g.series_id, [])
      byS.get(g.series_id).push(g)
    }
    const series = [...byS.values()].map((games) => {
      games.sort((a, b) => a.game_seq - b.game_seq)
      const cnt = {}
      for (const g of games) { cnt[g.blue_team] = (cnt[g.blue_team] || 0) + 1; cnt[g.red_team] = (cnt[g.red_team] || 0) + 1 }
      const [teamA, teamB] = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])
      let scoreA = 0, scoreB = 0
      for (const g of games) {
        const winTeam = g.winner === 'blue' ? g.blue_team : (g.winner === 'red' ? g.red_team : null)
        if (winTeam === teamA) scoreA++; else if (winTeam === teamB) scoreB++
      }
      return {
        seriesId: games[0].series_id, league: games[0].league, patch: games[0].patch,
        date: games[0].start_time ? new Date(games[0].start_time).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '',
        teamA: teamA || '?', teamB: teamB || '?', scoreA, scoreB, games,
        _t: games[0].start_time || '',
      }
    }).sort((a, b) => (a._t < b._t ? 1 : -1))
    return { series, blueWr: decided ? blueWins / decided : null, totalGames: rows.length }
  }, [rows])

  return (
    <div className="p-5">
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <select value={league} onChange={(e) => setLeague(e.target.value)} className="field py-1.5 text-sm" style={{ width: 'auto' }}>
            <option value="">Todas as ligas</option>
            {facets.leagues.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <select value={patch} onChange={(e) => setPatch(e.target.value)} className="field py-1.5 text-sm" style={{ width: 'auto' }}>
            <option value="">Todos os patches</option>
            {facets.patches.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="ml-auto flex items-center gap-4 text-sm">
          <span><b className="font-display text-lg">{series.length}</b> <span className="condensed text-[10px]" style={{ color: 'var(--text-faint)' }}>séries</span></span>
          <span><b className="font-display text-lg">{totalGames}</b> <span className="condensed text-[10px]" style={{ color: 'var(--text-faint)' }}>jogos</span></span>
          {blueWr != null && (
            <span className="condensed flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-faint)' }}>
              WR LADO
              <span className="rounded px-1.5 py-0.5 font-bold text-white" style={{ background: BLUE }}>Azul {Math.round(blueWr * 100)}%</span>
              <span className="rounded px-1.5 py-0.5 font-bold text-white" style={{ background: RED }}>Verm {Math.round((1 - blueWr) * 100)}%</span>
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <p className="flex items-center justify-center gap-2 py-16 text-sm" style={{ color: 'var(--text-faint)' }}><RefreshCw size={15} className="animate-spin" /> Carregando…</p>
      ) : series.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Trophy size={26} style={{ color: 'var(--text-faint)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Sem jogos de campeonato ainda</p>
          <p className="max-w-md text-xs" style={{ color: 'var(--text-faint)' }}>O Match History aparece aqui quando houver jogos de campeonato nos dados.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {series.map((s) => <SeriesCard key={s.seriesId} s={s} keyByNorm={keyByNorm} />)}
        </div>
      )}
    </div>
  )
}
