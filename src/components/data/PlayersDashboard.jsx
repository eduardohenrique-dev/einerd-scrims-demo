// ═══════════════════════════════════════════════════════════════════
// Jogadores — dashboard VISUAL (estética Persona) dos KPIs individuais.
// Agrupado por time (há muitos jogadores). Cada card: pool de campeões
// (ícone + nº de jogos NAQUELE campeão — o avatar é o mais jogado), KDA em
// destaque e todas as métricas em barras (combate/economia/visão/@15).
// Busca por time/jogador no topo. Tabela completa no toggle "Tabela".
// ═══════════════════════════════════════════════════════════════════
import { Children, useMemo, useState } from 'react'
import { Search, Swords, Coins, Eye, Timer } from 'lucide-react'
import { useApp } from '../../context/AppContext.jsx'
import { champImgUrl, champKeyOf, champKeyIndex } from '../../data/champions.js'
import { aggregatePlayers } from '../../lib/grid/kpis.js'
import { Panel, HudTag, StatBar, DiffBar, CompareBar, GREEN, RED, GOLD, CYAN, pct, n1 } from './vizBits.jsx'

// KDA no LoL: <2 é ruim, ~3 é ok, >4 é ótimo. Sem tom neutro pra evitar dar
// impressão de "positivo" quando é fraco. Mesma dupla verde/vermelho de Times.
const kdaColor = (k) => (k >= 4 ? GREEN : k >= 2.5 ? GOLD : RED)
const P = { cs: 10, gold: 500, dmg: 900, ka: 1, vis: 1.8, wards: 1.4, ctrl: 0.6, clr: 1.2 }

function champImg(name, keyByNorm) {
  const key = champKeyOf(name, keyByNorm)
  return key ? champImgUrl(key) : null
}
function champList(champs) {
  return Object.entries(champs || {}).map(([name, c]) => ({ name, c })).sort((a, b) => b.c - a.c)
}

// Ícone de campeão com nº de jogos no canto inferior-direito. Sem clip-notch:
// o corte engolia o badge com a contagem. Mantém cantos retos (identidade do
// sistema) apenas com sombra interna de borda.
function ChampIcon({ name, count, size, keyByNorm }) {
  const url = champImg(name, keyByNorm)
  return (
    <div className="relative shrink-0 overflow-hidden" title={`${name} · ${count} jogo${count > 1 ? 's' : ''}`}
      style={{ width: size, height: size, background: 'var(--input-bg)', boxShadow: 'inset 0 0 0 1px var(--card-border)' }}>
      {url ? <img src={url} alt={name} className="h-full w-full object-cover" draggable={false} />
        : <span className="flex h-full w-full items-center justify-center text-[8px]" style={{ color: 'var(--text-faint)' }}>{name?.slice(0, 4) || '—'}</span>}
      {count != null && <span className="absolute bottom-0 right-0 bg-black/80 px-1 text-[9px] font-bold leading-tight" style={{ color: CYAN }}>{count}</span>}
    </div>
  )
}

function Group({ icon, color, title, children }) {
  return (
    <div>
      <HudTag icon={icon} color={color} className="mb-1.5 mt-2.5">{title}</HudTag>
      {/* Children.toArray dá keys às barras (evita warning ao repassar children) */}
      <div className="space-y-2">{Children.toArray(children)}</div>
    </div>
  )
}

function PlayerCard({ p, keyByNorm }) {
  const pool = champList(p.champions)
  const top = pool[0]
  return (
    <Panel accent={kdaColor(p.kda)}>
      <div className="p-3 pl-4">
        <div className="flex items-center gap-2.5">
          <ChampIcon name={top?.name} count={top?.c} size={46} keyByNorm={keyByNorm} />
          <div className="min-w-0 flex-1">
            <div className="display truncate text-lg leading-tight" style={{ color: 'var(--text)' }}>{p.name}</div>
            <div className="condensed text-[9px]" style={{ color: 'var(--text-faint)' }}>{p.games} jogos no total</div>
          </div>
          <div className="shrink-0 text-right">
            <div className="display text-[26px] leading-none" style={{ color: kdaColor(p.kda) }}>{n1(p.kda)}</div>
            <div className="condensed text-[8px]" style={{ color: 'var(--text-faint)' }}>{n1(p.kills)}/{n1(p.deaths)}/{n1(p.assists)} KDA</div>
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-1">
          <span className="condensed mr-1 text-[8px]" style={{ color: 'var(--text-faint)' }}>POOL</span>
          {pool.slice(0, 6).map((c) => <ChampIcon key={c.name} name={c.name} count={c.c} size={24} keyByNorm={keyByNorm} />)}
        </div>

        <Group icon={Swords} color={GREEN} title="Combate">
          <StatBar label="Participação" fill={p.killParticipation} display={pct(p.killParticipation)} color={GREEN} />
          <StatBar label="K+A/min" fill={p.kaPerMin / P.ka} display={n1(p.kaPerMin)} color={GREEN} />
          <StatBar label="Dano/min" fill={p.damagePerMin / P.dmg} display={Math.round(p.damagePerMin)} color="#FF8A3D" />
          <StatBar label="Dano %" fill={p.damageShare} display={pct(p.damageShare)} color="#FF8A3D" />
          <StatBar label="FB particip." fill={p.firstBloodPct} display={pct(p.firstBloodPct)} color={GOLD} />
        </Group>
        <Group icon={Coins} color={GOLD} title="Economia & farm">
          <StatBar label="CS/min" fill={p.csPerMin / P.cs} display={n1(p.csPerMin)} color="#7C8CFF" />
          <StatBar label="Ouro/min" fill={p.goldPerMin / P.gold} display={Math.round(p.goldPerMin)} color={GOLD} />
          <StatBar label="Ouro %" fill={p.goldShare} display={pct(p.goldShare)} color={GOLD} />
        </Group>
        <Group icon={Eye} color="#7C8CFF" title="Visão">
          <StatBar label="Visão/min" fill={p.visionPerMin / P.vis} display={n1(p.visionPerMin)} color="#7C8CFF" />
          <StatBar label="Wards/min" fill={p.wardsPerMin / P.wards} display={n1(p.wardsPerMin)} color={GOLD} />
          <StatBar label="Ctrl W/min" fill={p.controlWardsPerMin / P.ctrl} display={n1(p.controlWardsPerMin)} color="#FF4FA3" />
          <StatBar label="W limpas/min" fill={p.wardsClearedPerMin / P.clr} display={n1(p.wardsClearedPerMin)} color={GREEN} />
        </Group>
        <Group icon={Timer} color={CYAN} title="Início @15">
          <DiffBar label="Dif. CS" value={p.csDiff15} mag={20} display={p.csDiff15 == null ? '—' : (p.csDiff15 > 0 ? `+${n1(p.csDiff15)}` : n1(p.csDiff15))} />
          <DiffBar label="Dif. ouro" value={p.goldDiff15} mag={1500} display={p.goldDiff15 == null ? '—' : (p.goldDiff15 > 0 ? `+${Math.round(p.goldDiff15)}` : Math.round(p.goldDiff15))} />
          <DiffBar label="Dif. XP" value={p.xpDiff15} mag={1500} display={p.xpDiff15 == null ? '—' : (p.xpDiff15 > 0 ? `+${Math.round(p.xpDiff15)}` : Math.round(p.xpDiff15))} />
          <StatBar label="À frente CS" fill={p.aheadCs15Pct ?? 0} display={pct(p.aheadCs15Pct)} color={GREEN} />
        </Group>
      </div>
    </Panel>
  )
}

export default function PlayersDashboard({ rows }) {
  const { champions } = useApp()
  const keyByNorm = useMemo(() => champKeyIndex(champions), [champions])

  const players = useMemo(() => aggregatePlayers(rows || []), [rows])
  const [q, setQ] = useState('')
  const [compareOn, setCompareOn] = useState(false)
  const [slots, setSlots] = useState(['', ''])
  // Options do combo de comparação: "Jogador (Time)" pra desambiguar homônimos.
  const playerOptions = useMemo(
    () => players.map((p) => ({ value: p.playerId, label: `${p.name} (${p.teamName || '—'})` })),
    [players],
  )

  const byTeam = useMemo(() => {
    const m = new Map()
    for (const p of players) { if (!m.has(p.teamName)) m.set(p.teamName, []); m.get(p.teamName).push(p) }
    const term = q.trim().toLowerCase()
    return [...m.entries()].filter(([team, ps]) =>
      !term || (team || '').toLowerCase().includes(term) || ps.some((p) => p.name.toLowerCase().includes(term)))
  }, [players, q])

  const compared = useMemo(() => {
    if (!compareOn) return []
    const map = new Map(players.map((p) => [p.playerId, p]))
    return slots.map((id) => map.get(id)).filter(Boolean)
  }, [players, slots, compareOn])

  if (!players.length) return null
  return (
    <div className="p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {!compareOn && (
          <>
            <div className="relative">
              <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: CYAN }} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar time ou jogador…"
                className="field clip-notch py-1.5 pl-8 text-sm" style={{ width: 260 }} />
            </div>
            <span className="condensed text-[10px]" style={{ color: 'var(--text-faint)' }}>{byTeam.length} time{byTeam.length !== 1 ? 's' : ''}</span>
          </>
        )}
        <div className="ml-auto">
          <CompareBar enabled={compareOn} onToggle={setCompareOn} slots={slots} onSlots={setSlots} options={playerOptions} allLabel="Escolha um jogador" />
        </div>
      </div>
      {compareOn ? (
        // No MÁXIMO 2 cards lado a lado — com 3+ jogadores, o extra desce
        // (cards são grandes, 3+ colunas ficaria ilegível).
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
          {compared.map((p) => <PlayerCard key={p.playerId} p={p} keyByNorm={keyByNorm} />)}
          {compared.length < 2 && <p className="py-8 text-center text-sm" style={{ color: 'var(--text-faint)', gridColumn: '1 / -1' }}>Selecione pelo menos 2 jogadores nos slots pra comparar.</p>}
        </div>
      ) : (
        <div className="space-y-5">
          {byTeam.map(([team, ps]) => (
            <div key={team || 'sem-time'}>
              <HudTag className="mb-2">{team || 'Sem time'} · {ps.length} jogador{ps.length > 1 ? 'es' : ''}</HudTag>
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                {ps.map((p) => <PlayerCard key={p.playerId} p={p} keyByNorm={keyByNorm} />)}
              </div>
            </div>
          ))}
          {byTeam.length === 0 && <p className="py-8 text-center text-sm" style={{ color: 'var(--text-faint)' }}>Nenhum time/jogador encontrado.</p>}
        </div>
      )}
    </div>
  )
}
