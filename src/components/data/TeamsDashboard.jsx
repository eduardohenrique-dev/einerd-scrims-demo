// ═══════════════════════════════════════════════════════════════════
// Times — dashboard VISUAL (estética Persona) dos KPIs coletivos + Macro
// Intel (objetivos com arte). Lê grid_game_teams filtrado (scrim e/ou pro),
// agrega por time. Cada card: resultado (anel WR + WR por lado), Macro Intel
// (7 objetivos), economia/combate, objetivos por jogo, visão e início @15.
// Busca por time no topo. Tabela numérica completa no toggle "Tabela".
// ═══════════════════════════════════════════════════════════════════
import { useMemo, useState } from 'react'
import { ChevronDown, Search, Coins, Eye, Timer, Crown, Target } from 'lucide-react'
import { aggregateTeams, aggregateObjectives } from '../../lib/grid/kpis.js'
import { ObjectiveTile, OBJECTIVE_META } from './objectiveIcons.jsx'
import { Panel, HudTag, Donut, StatBar, DiffBar, CompareBar, GREEN, RED, BLUE, GOLD, CYAN, wrColor, pct, n1, n0 } from './vizBits.jsx'

const CAP = { gold: 2600, goldDiff: 400, dmg: 4500, kills: 28, deaths: 24, vision: 14, wards: 8, ctrl: 3, clear: 4,
  drakes: 4, heralds: 1.5, barons: 2, grubs: 6 }
const OBJS = [
  { kind: 'baron', get: (o) => o.baron, avg: (o) => o.baron.avg, avgLbl: '/j' },
  { kind: 'firstDragon', get: (o) => o.firstDragon },
  { kind: 'soul', get: (o) => o.soul },
  { kind: 'grubs', get: (o) => o.grubs, avg: (o) => o.grubs.avg, avgLbl: '/j' },
  { kind: 'herald', get: (o) => o.herald, avg: (o) => o.herald.avg, avgLbl: '/j' },
  { kind: 'firstTower', get: (o) => o.firstTower },
  { kind: 'firstBlood', get: (o) => o.firstBlood },
]

// Card de objetivo (Macro Intel): arte + taxa de conquista + WR condicional.
function MacroCard({ kind, stat, avg, avgLbl }) {
  const meta = OBJECTIVE_META[kind]
  return (
    <div className="clip-notch flex items-center gap-2.5 p-2.5" style={{ background: 'var(--card-bg-soft)', boxShadow: 'inset 0 0 0 1px var(--card-border)' }}>
      <ObjectiveTile kind={kind} size={40} />
      <div className="min-w-0 flex-1">
        <div className="condensed truncate text-[10px]" style={{ color: 'var(--text-muted)' }}>{meta.label}</div>
        <div className="flex items-baseline gap-1.5">
          <span className="display text-[26px] leading-none" style={{ color: 'var(--text)' }}>{pct(stat.rate)}</span>
          {avg && <span className="condensed text-[9px]" style={{ color: 'var(--text-faint)' }}>{n1(avg)}{avgLbl}</span>}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="display text-lg leading-none" style={{ color: wrColor(stat.wr) }}>{pct(stat.wr)}</div>
        <div className="condensed text-[8px]" style={{ color: 'var(--text-faint)' }}>WR c/ obj</div>
      </div>
    </div>
  )
}

function TeamCard({ team, rows, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  const obj = useMemo(() => aggregateObjectives(rows), [rows])
  const t = team
  const edge = wrColor(t.winrate)
  return (
    <Panel accent={edge}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-4 py-3 pl-5 pr-4 text-left">
        <Donut value={t.winrate} size={64} stroke={7} center={pct(t.winrate)} sub={`${t.games}j`} />
        <div className="min-w-0 flex-1">
          <div className="display truncate text-xl" style={{ color: 'var(--text)' }}>{t.name}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="tag-skew text-white" style={{ background: BLUE }}><span>Azul {pct(t.winrateBlue)} · {t.gamesBlue}j</span></span>
            <span className="tag-skew text-white" style={{ background: RED }}><span>Verm {pct(t.winrateRed)} · {t.gamesRed}j</span></span>
          </div>
        </div>
        <ChevronDown size={18} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} style={{ color: CYAN }} />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1">
          <HudTag icon={Crown} color="#A970FF" className="mb-2 mt-2">Macro Intel · objetivos</HudTag>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {OBJS.map((o) => <MacroCard key={o.kind} kind={o.kind} stat={o.get(obj)} avg={o.avg?.(obj)} avgLbl={o.avgLbl} />)}
          </div>

          <div className="mt-1 grid grid-cols-1 gap-x-6 lg:grid-cols-2">
            <div>
              <HudTag icon={Coins} color={GOLD} className="mb-2 mt-3">Economia & combate</HudTag>
              <div className="space-y-2">
                <StatBar label="Ouro/min" fill={t.goldPerMin / CAP.gold} display={n0(t.goldPerMin)} color={GOLD} />
                <DiffBar label="Dif. ouro/min" value={t.goldDiffPerMin} mag={CAP.goldDiff} display={n0(t.goldDiffPerMin)} />
                <StatBar label="Dano/min" fill={t.damagePerMin / CAP.dmg} display={n0(t.damagePerMin)} color="#FF8A3D" />
                <StatBar label="Abates/jogo" fill={t.avgKills / CAP.kills} display={n1(t.avgKills)} color={GREEN} />
                <StatBar label="Mortes/jogo" fill={t.avgDeaths / CAP.deaths} display={n1(t.avgDeaths)} color={RED} />
                <StatBar label="Dif. torres" fill={(t.avgTowerDiff + 8) / 16} display={t.avgTowerDiff > 0 ? `+${n1(t.avgTowerDiff)}` : n1(t.avgTowerDiff)} color={GOLD} />
              </div>
            </div>
            <div>
              <HudTag icon={Target} color="#FF8A3D" className="mb-2 mt-3">Objetivos por jogo</HudTag>
              <div className="space-y-2">
                <StatBar label="First Drake %" fill={t.dragonPriority} display={pct(t.dragonPriority)} color="#FF8A3D" />
                <StatBar label="1ª Torre %" fill={t.firstTowerPct} display={pct(t.firstTowerPct)} color={GOLD} />
                <StatBar label="Dragões/jogo" fill={t.dragonsPerGame / CAP.drakes} display={n1(t.dragonsPerGame)} color="#FF8A3D" />
                <StatBar label="Arautos/jogo" fill={t.heraldsPerGame / CAP.heralds} display={n1(t.heraldsPerGame)} color="#7C8CFF" />
                <StatBar label="Barões/jogo" fill={t.baronsPerGame / CAP.barons} display={n1(t.baronsPerGame)} color="#A970FF" />
                <StatBar label="Grubs/jogo" fill={t.grubsPerGame / CAP.grubs} display={n1(t.grubsPerGame)} color="#8B5CF6" />
              </div>
            </div>
          </div>

          <div className="mt-1 grid grid-cols-1 gap-x-6 lg:grid-cols-2">
            <div>
              <HudTag icon={Eye} color="#7C8CFF" className="mb-2 mt-3">Visão & controle de mapa</HudTag>
              <div className="space-y-2">
                <StatBar label="Vision/min" fill={t.visionPerMin / CAP.vision} display={n1(t.visionPerMin)} color="#7C8CFF" />
                <StatBar label="Wards/min" fill={t.wardsPerMin / CAP.wards} display={n1(t.wardsPerMin)} color={GOLD} />
                <StatBar label="Ctrl W/min" fill={t.visionWardsPerMin / CAP.ctrl} display={n1(t.visionWardsPerMin)} color="#FF4FA3" />
                <StatBar label="W limpas/min" fill={t.wardsClearedPerMin / CAP.clear} display={n1(t.wardsClearedPerMin)} color={GREEN} />
                <StatBar label="% W limpas" fill={t.pctWardsCleared} display={pct(t.pctWardsCleared)} color={GREEN} />
              </div>
            </div>
            <div>
              <HudTag icon={Timer} color={CYAN} className="mb-2 mt-3">Início de jogo @15min</HudTag>
              <div className="space-y-2">
                <DiffBar label="Dif. ouro @15" value={t.goldDiff15} mag={3000} display={t.goldDiff15 == null ? '—' : (t.goldDiff15 > 0 ? `+${n0(t.goldDiff15)}` : n0(t.goldDiff15))} />
                <DiffBar label="Dif. CS @15" value={t.csDiff15} mag={30} display={t.csDiff15 == null ? '—' : (t.csDiff15 > 0 ? `+${n1(t.csDiff15)}` : n1(t.csDiff15))} />
                <DiffBar label="Dif. torre @15" value={t.towerDiff15} mag={3} display={t.towerDiff15 == null ? '—' : (t.towerDiff15 > 0 ? `+${n1(t.towerDiff15)}` : n1(t.towerDiff15))} />
                <StatBar label="Dragões @15" fill={(t.dragons15 || 0) / 2} display={n1(t.dragons15)} color="#FF8A3D" />
                <StatBar label="WR liderando @15" fill={t.wrWhenAhead15 ?? 0} display={pct(t.wrWhenAhead15)} color={GREEN} />
              </div>
            </div>
          </div>
        </div>
      )}
    </Panel>
  )
}

export default function TeamsDashboard({ rows }) {
  const teams = useMemo(() => aggregateTeams(rows || []), [rows])
  const rowsByTeam = useMemo(() => {
    const m = new Map()
    for (const r of (rows || [])) { if (!m.has(r.team_id)) m.set(r.team_id, []); m.get(r.team_id).push(r) }
    return m
  }, [rows])
  const [q, setQ] = useState('')
  const [compareOn, setCompareOn] = useState(false)
  const [slots, setSlots] = useState(['', ''])
  const teamOptions = useMemo(() => teams.map((t) => ({ value: t.teamId, label: t.name })), [teams])
  const shown = useMemo(() => {
    if (compareOn) {
      // Só os times escolhidos, na ordem dos slots (ignora vazios).
      const map = new Map(teams.map((t) => [t.teamId, t]))
      return slots.map((id) => map.get(id)).filter(Boolean)
    }
    const term = q.trim().toLowerCase()
    return term ? teams.filter((t) => (t.name || '').toLowerCase().includes(term)) : teams
  }, [teams, q, compareOn, slots])

  if (!teams.length) return null
  return (
    <div className="p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {!compareOn && (
          <>
            <div className="relative">
              <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: CYAN }} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar time…" className="field clip-notch py-1.5 pl-8 text-sm" style={{ width: 260 }} />
            </div>
            <span className="condensed text-[10px]" style={{ color: 'var(--text-faint)' }}>{shown.length} time{shown.length !== 1 ? 's' : ''}</span>
          </>
        )}
        <div className="ml-auto">
          <CompareBar enabled={compareOn} onToggle={setCompareOn} slots={slots} onSlots={setSlots} options={teamOptions} allLabel="Escolha um time" />
        </div>
      </div>
      {compareOn ? (
        // Comparação: no MÁXIMO 2 cards lado a lado. Com 3+ times, o extra
        // quebra linha (fica embaixo) — os cards são grandes e amontoar 3+
        // colunas fica ilegível.
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
          {shown.map((t) => <TeamCard key={t.teamId} team={t} rows={rowsByTeam.get(t.teamId) || []} defaultOpen />)}
          {shown.length < 2 && <p className="py-8 text-center text-sm" style={{ color: 'var(--text-faint)', gridColumn: '1 / -1' }}>Selecione pelo menos 2 times nos slots pra comparar.</p>}
        </div>
      ) : (
        <div className="space-y-2.5">
          {shown.map((t, i) => <TeamCard key={t.teamId} team={t} rows={rowsByTeam.get(t.teamId) || []} defaultOpen={shown.length === 1 || (q ? false : i === 0)} />)}
          {shown.length === 0 && <p className="py-8 text-center text-sm" style={{ color: 'var(--text-faint)' }}>Nenhum time encontrado.</p>}
        </div>
      )}
    </div>
  )
}
