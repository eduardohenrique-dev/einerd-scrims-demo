// ═══════════════════════════════════════════════════════════════════
// Radar — pontos de posição sobre o minimapa do Summoner's Rift.
//   • Jungler: caminho do jungler (jungle_path), pontos dourados.
//   • Wards: wards colocadas (wards), amarelas (normais) e rosas (control).
// Filtros: lado (blue/red) e intervalo de tempo contínuo (slider 2 cursores).
// Coords da Riot: x,y em [0..15000], origem no canto inferior-esquerdo.
// ═══════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef, useState } from 'react'
import { Crosshair, RefreshCw, Eye } from 'lucide-react'
import { cx } from '../../lib/utils.js'
import { fetchTeamRows, ORIGIN_TYPES } from '../../lib/grid/gridData.js'

const MAP = 15000 // lado do mapa em unidades da Riot
const MAP_IMG = '/rift-map.svg' // minimapa estilizado local (public/), sem depender de CDN

const SIDES = [
  { key: 'blue', label: 'Blue Side' },
  { key: 'red', label: 'Red Side' },
]

// ── Slider de intervalo com 2 cursores (arrasta cada ponta) ─────────
function RangeSlider({ min, max, lo, hi, onChange }) {
  const ref = useRef(null)
  const startDrag = (which) => (e) => {
    e.preventDefault()
    const move = (ev) => {
      const r = ref.current.getBoundingClientRect()
      const pct = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width))
      const val = Math.round(min + pct * (max - min))
      if (which === 'lo') onChange([Math.min(val, hi), hi])
      else onChange([lo, Math.max(val, lo)])
    }
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }
  const pLo = ((lo - min) / (max - min)) * 100
  const pHi = ((hi - min) / (max - min)) * 100
  return (
    <div ref={ref} className="relative h-5 w-full select-none" style={{ touchAction: 'none' }}>
      <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full" style={{ background: 'var(--card-bg-soft)', boxShadow: 'inset 0 0 0 1px var(--card-border)' }} />
      <div className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-sky" style={{ left: `${pLo}%`, width: `${pHi - pLo}%` }} />
      {[['lo', pLo], ['hi', pHi]].map(([w, p]) => (
        <div key={w} onPointerDown={startDrag(w)} title={`${w === 'lo' ? lo : hi} min`}
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full active:cursor-grabbing"
          style={{ left: `${p}%`, background: 'var(--text)', boxShadow: '0 0 0 2px var(--accent), 0 2px 6px rgba(0,0,0,0.5)' }} />
      ))}
    </div>
  )
}

// `teamIds` é o recorte de REGIÃO resolvido pelo DadosView (undefined = todas).
// Só vale quando nenhum time específico está escolhido — com um time em foco,
// ele já é mais restritivo que a região.
export default function JungleRadar({ teamId, origin, teamIds, since, until }) {
  const [rows, setRows] = useState(null)
  const [loading, setLoading] = useState(true)
  const [side, setSide] = useState('blue')
  const [mode, setMode] = useState('jungle') // 'jungle' | 'wards'
  const [range, setRange] = useState([0, 15]) // [de, até] em minutos

  // `teamIds` é array: entra na chave do efeito serializado, senão uma nova
  // referência a cada render do pai dispararia busca infinita.
  const teamIdsKey = teamIds ? teamIds.join(',') : ''
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchTeamRows({
      types: ORIGIN_TYPES[origin],
      teamId: teamId || null,
      teamIds: teamId ? undefined : teamIds,
      since, until,
    })
      .then((d) => { if (!cancelled) { setRows(d); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, teamId, teamIdsKey, since, until])

  const [lo, hi] = range
  const { points, games, gamesTotal } = useMemo(() => {
    if (!rows) return { points: [], games: 0, gamesTotal: 0 }
    const raw = []
    let g = 0
    let total = 0
    for (const r of rows) {
      if (r.side !== side) continue
      total++
      const src = mode === 'wards' ? r.wards : r.jungle_path
      if (!Array.isArray(src) || !src.length) continue
      g++
      for (const p of src) if (p.t >= lo && p.t <= hi) raw.push(p)
    }
    return { points: raw, games: g, gamesTotal: total }
  }, [rows, side, mode, lo, hi])

  // Wards e jungle_path vêm de fontes diferentes e podem faltar: o jungle_path
  // sai da timeline (ingestão normal), mas as wards dependem do LiveStats
  // pesado, processado à parte. Todo jogo ingerido depois do último
  // processamento fica sem wards. Antes o Radar só
  // mostrava um total menor, sem dizer por quê — parecia que o time não tinha
  // colocado ward. Explicitar a cobertura evita ler ausência de DADO como
  // ausência de COMPORTAMENTO.
  const semDados = gamesTotal - games

  return (
    <div className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button onClick={() => setMode('jungle')}
              className="clip-notch px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all"
              style={mode === 'jungle' ? { background: 'var(--accent)', color: '#05060E' } : { background: 'var(--card-bg-soft)', color: 'var(--text-muted)', boxShadow: 'inset 0 0 0 1px var(--card-border)' }}>
              <span className="flex items-center gap-1.5"><Crosshair size={13} /> Jungler</span>
            </button>
            <button onClick={() => setMode('wards')}
              className="clip-notch px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all"
              style={mode === 'wards' ? { background: 'var(--accent)', color: '#05060E' } : { background: 'var(--card-bg-soft)', color: 'var(--text-muted)', boxShadow: 'inset 0 0 0 1px var(--card-border)' }}>
              <span className="flex items-center gap-1.5"><Eye size={13} /> Wards</span>
            </button>
          </div>
          <span className="normal-case text-[10px]" style={{ color: 'var(--text-faint)' }}>
            · {games} {games === 1 ? 'jogo' : 'jogos'} · {points.length} {mode === 'wards' ? 'wards' : 'pontos'}
          </span>
          {semDados > 0 && (
            <span className="normal-case text-[10px]" title={mode === 'wards'
              ? 'As wards vêm do LiveStats da Riot, processado à parte. Jogos ingeridos depois do último processamento ficam sem esse dado.'
              : 'O caminho do jungler vem da timeline da Riot, que nem sempre está disponível para o jogo.'}
              style={{ color: '#FFBE00' }}>
              · {semDados} de {gamesTotal} sem {mode === 'wards' ? 'wards capturadas' : 'timeline'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {SIDES.map((s) => (
            <button key={s.key} onClick={() => setSide(s.key)}
              className="clip-notch px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all"
              style={side === s.key
                ? { background: s.key === 'blue' ? '#2E4BFF' : '#FF2E4D', color: '#fff' }
                : { background: 'var(--card-bg-soft)', color: 'var(--text-muted)', boxShadow: 'inset 0 0 0 1px var(--card-border)' }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="flex items-center justify-center gap-2 py-16 text-sm" style={{ color: 'var(--text-faint)' }}>
          <RefreshCw size={15} className="animate-spin" /> Carregando…
        </p>
      ) : (
        <div className="mx-auto flex max-w-[560px] flex-col items-center gap-4">
          <div className="relative aspect-square w-full overflow-hidden rounded-lg"
            style={{ background: '#010a13', boxShadow: 'inset 0 0 0 1px var(--card-border), 0 10px 30px -12px rgba(0,0,0,0.8)' }}>
            {/* minimapa do Rift */}
            <img src={MAP_IMG} alt="Summoner's Rift" className="absolute inset-0 h-full w-full object-cover"
              style={{ opacity: 0.8 }} onError={(e) => { e.currentTarget.style.display = 'none' }} draggable={false} />
            {/* escurecimento leve p/ os pontos saltarem */}
            <div className="pointer-events-none absolute inset-0" style={{ background: 'rgba(1,10,19,0.28)' }} />
            {/* grade quadriculada (8×8) */}
            <div className="pointer-events-none absolute inset-0" style={{
              backgroundImage: 'linear-gradient(rgba(210,225,255,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(210,225,255,0.14) 1px, transparent 1px)',
              backgroundSize: '12.5% 12.5%',
            }} />
            {/* pontos fixos das posições do jungler */}
            {points.map((p, i) => {
              const left = Math.max(0, Math.min(100, (p.x / MAP) * 100))
              const top = Math.max(0, Math.min(100, (1 - p.y / MAP) * 100))
              const pink = mode === 'wards' && p.kind === 'pink'
              const color = pink ? '#FF4FA3' : '#FFC02E'
              const glow = pink ? 'rgba(255,79,163,0.8)' : 'rgba(255,192,46,0.75)'
              const sz = mode === 'wards' ? 11 : 13
              return (
                <span key={i} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    left: `${left}%`, top: `${top}%`, width: sz, height: sz,
                    background: color,
                    boxShadow: `0 0 0 1.5px rgba(0,0,0,0.55), 0 0 7px ${glow}`,
                  }} />
              )
            })}
            {points.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-center text-xs" style={{ color: 'var(--text-faint)' }}>
                Sem posições nesse filtro.
              </div>
            )}
          </div>

          {/* Slider de intervalo de tempo */}
          <div className="w-full px-1">
            <div className="mb-2 flex items-center justify-between">
              <span className="condensed text-[10px]" style={{ color: 'var(--text-faint)' }}>Intervalo de tempo</span>
              <span className="font-display text-sm tabular-nums text-sky">{lo}–{hi} min</span>
            </div>
            <RangeSlider min={0} max={20} lo={lo} hi={hi} onChange={setRange} />
          </div>

          {/* Legenda das wards */}
          {mode === 'wards' && (
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <span className="h-3 w-3 rounded-full" style={{ background: '#FFC02E', boxShadow: '0 0 5px rgba(255,192,46,0.7)' }} /> Ward normal
              </span>
              <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <span className="h-3 w-3 rounded-full" style={{ background: '#FF4FA3', boxShadow: '0 0 5px rgba(255,79,163,0.7)' }} /> Control (pink)
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
