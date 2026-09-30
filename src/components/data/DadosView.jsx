// ═══════════════════════════════════════════════════════════════════
// Área de DADOS — estatísticas do time via GRID (Fase 1: series-state).
// Filtros globais: Time · Origem (Scrim/Campeonato/Ambos) · data ≥ 02/07/2026.
// Lê do Supabase (gridData.js) e agrega com a camada pura (kpis.js).
//
// KPIs que dependem da timeline da Riot (@15min, dano, vision score,
// wards colocadas) chegam na Fase 2 — aqui aparecem como "Fase 2".
// ═══════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Users, Shield, Database, RefreshCw, Crosshair, Trophy, Swords, Globe, CalendarRange, X } from 'lucide-react'
import { cx } from '../../lib/utils.js'
import { aggregatePlayers, aggregateTeams } from '../../lib/grid/kpis.js'
import { fetchTeamRows, fetchPlayerRows, fetchTeamsList, ORIGIN_TYPES } from '../../lib/grid/gridData.js'
import { REGION_LABELS, REGION_ORDER } from '../../lib/grid/regions.js'
import { useAuth } from '../../context/AuthContext.jsx'
import PageHeader from '../ui/PageHeader.jsx'
import JungleRadar from './JungleRadar.jsx'
import MatchHistory from './MatchHistory.jsx'
import TierlistMeta from './TierlistMeta.jsx'
import TeamsDashboard from './TeamsDashboard.jsx'
import PlayersDashboard from './PlayersDashboard.jsx'
import { SearchableSelect, pct, n1, n0, n2, sign0, sign1 } from './vizBits.jsx'

const EINERD_ID = '900001'
// Atalhos de período. `dias: null` = sem limite (todo o histórico).
const PERIODOS = [
  { label: '7d', dias: 7 },
  { label: '14d', dias: 14 },
  { label: '30d', dias: 30 },
  { label: 'Tudo', dias: null },
]

// Data local em 'YYYY-MM-DD'. NÃO usar toISOString(): no fuso do Brasil ele
// converte pra UTC e devolve o dia seguinte a partir das 21h, fazendo o
// atalho "7d" pegar uma janela deslocada.
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const ORIGINS = [
  { key: 'scrim', label: 'Scrim' },
  { key: 'championship', label: 'Campeonato' },
  { key: 'both', label: 'Ambos' },
]
// Sub-abas da área de Dados (navegação).
const SECTIONS = [
  { key: 'players', label: 'Jogadores', icon: BarChart3 },
  { key: 'teams', label: 'Times', icon: Shield },
  { key: 'radar', label: 'Radar', icon: Crosshair },
  { key: 'history', label: 'Match History', icon: Trophy },
  { key: 'meta', label: 'Tierlist Meta', icon: Swords },
]


function Pill({ children, active, onClick }) {
  return (
    <button onClick={onClick}
      className={cx('clip-notch px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all')}
      style={active
        ? { background: 'var(--accent)', color: '#05060E' }
        : { background: 'var(--card-bg-soft)', color: 'var(--text-muted)', boxShadow: 'inset 0 0 0 1px var(--card-border)' }}>
      {children}
    </button>
  )
}

// ── Tabela genérica ─────────────────────────────────────────────────
function StatTable({ columns, rows, getKey }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="condensed sticky top-0 whitespace-nowrap px-3 py-2 text-[10px]"
                style={{ color: 'var(--text-faint)', textAlign: c.align || 'right', background: 'var(--card-bg)' }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={getKey(r)} style={{ borderTop: '1px solid var(--divider)' }}>
              {columns.map((c) => (
                <td key={c.key} className="whitespace-nowrap px-3 py-2 tabular-nums"
                  style={{ textAlign: c.align || 'right', color: c.strong ? 'var(--text)' : 'var(--text-muted)' }}>
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Colunas Jogadores ───────────────────────────────────────────────
const PLAYER_COLS = [
  { key: 'name', label: 'Jogador', align: 'left', strong: true, render: (r) => r.name },
  { key: 'games', label: 'Jogos', render: (r) => r.games },
  { key: 'kda', label: 'KDA', strong: true, render: (r) => n2(r.kda) },
  { key: 'k', label: 'K', render: (r) => n1(r.kills) },
  { key: 'd', label: 'D', render: (r) => n1(r.deaths) },
  { key: 'a', label: 'A', render: (r) => n1(r.assists) },
  { key: 'csm', label: 'CS/min', render: (r) => n1(r.csPerMin) },
  { key: 'gpm', label: 'Gold/min', render: (r) => n0(r.goldPerMin) },
  { key: 'gpct', label: 'Gold%', render: (r) => pct(r.goldShare) },
  { key: 'kp', label: 'KP', render: (r) => pct(r.killParticipation) },
  { key: 'kam', label: 'K+A/min', render: (r) => n2(r.kaPerMin) },
  { key: 'fb', label: 'FB Part.', render: (r) => pct(r.firstBloodPct) },
  { key: 'dmg', label: 'Dano/min', render: (r) => n0(r.damagePerMin) },
  { key: 'dmgp', label: 'Dano%', render: (r) => pct(r.damageShare) },
  { key: 'vis', label: 'Vision/min', render: (r) => n2(r.visionPerMin) },
  { key: 'wpm', label: 'Wards/min', render: (r) => n2(r.wardsPerMin) },
  { key: 'ctrl', label: 'Ctrl W/min', render: (r) => n2(r.controlWardsPerMin) },
  { key: 'wclr', label: 'W limpas/min', render: (r) => n2(r.wardsClearedPerMin) },
  { key: 'cs15', label: 'CS dif @15', render: (r) => sign1(r.csDiff15) },
  { key: 'gd15', label: 'Gold dif @15', render: (r) => sign0(r.goldDiff15) },
  { key: 'xp15', label: 'XP dif @15', render: (r) => sign0(r.xpDiff15) },
  { key: 'ahcs', label: 'À frente CS@15', render: (r) => pct(r.aheadCs15Pct) },
  { key: 'fbv', label: 'FB sofrido', render: (r) => pct(r.firstBloodVictimPct) },
]

// ── Colunas Times ───────────────────────────────────────────────────
const TEAM_COLS = [
  { key: 'name', label: 'Time', align: 'left', strong: true, render: (r) => r.name },
  { key: 'games', label: 'Jogos', render: (r) => r.games },
  { key: 'wr', label: 'WR', strong: true, render: (r) => pct(r.winrate) },
  { key: 'wrb', label: 'WR Azul', render: (r) => `${pct(r.winrateBlue)} (${r.gamesBlue})` },
  { key: 'wrr', label: 'WR Verm.', render: (r) => `${pct(r.winrateRed)} (${r.gamesRed})` },
  { key: 'gpm', label: 'Gold/min', render: (r) => n0(r.goldPerMin) },
  { key: 'gdm', label: 'GoldDif/min', render: (r) => n0(r.goldDiffPerMin) },
  { key: 'twr', label: 'Dif. torres', render: (r) => n1(r.avgTowerDiff) },
  { key: 'ft', label: '1ª Torre%', render: (r) => pct(r.firstTowerPct) },
  { key: 'dp', label: 'Prio Dragão', render: (r) => pct(r.dragonPriority) },
  { key: 'drg', label: 'Dragões/j', render: (r) => n1(r.dragonsPerGame) },
  { key: 'her', label: 'Arauto/j', render: (r) => n1(r.heraldsPerGame) },
  { key: 'bar', label: 'Baron/j', render: (r) => n1(r.baronsPerGame) },
  { key: 'grb', label: 'Grubs/j', render: (r) => n1(r.grubsPerGame) },
  { key: 'plt', label: 'Plates T/M/B', render: (r) => `${n1(r.platesTop)}/${n1(r.platesMid)}/${n1(r.platesBot)}` },
  { key: 'fb', label: 'FB%', render: (r) => pct(r.firstBloodPct) },
  { key: 'ak', label: 'Kills/j', render: (r) => n1(r.avgKills) },
  { key: 'ad', label: 'Deaths/j', render: (r) => n1(r.avgDeaths) },
  { key: 'dmg', label: 'Dano/min', render: (r) => n0(r.damagePerMin) },
  { key: 'vis', label: 'Vision/min', render: (r) => n2(r.visionPerMin) },
  { key: 'wpm', label: 'Wards/min', render: (r) => n2(r.wardsPerMin) },
  { key: 'vw', label: 'Vision W/min', render: (r) => n2(r.visionWardsPerMin) },
  { key: 'wc', label: 'W limpas/min', render: (r) => n2(r.wardsClearedPerMin) },
  { key: 'pwc', label: '% W limpas', render: (r) => pct(r.pctWardsCleared) },
  { key: 'gd15', label: 'Gold dif @15', render: (r) => sign0(r.goldDiff15) },
  { key: 'cd15', label: 'CS dif @15', render: (r) => sign1(r.csDiff15) },
  { key: 'td15', label: 'Torre dif @15', render: (r) => sign1(r.towerDiff15) },
  { key: 'dr15', label: 'Dragões @15', render: (r) => n1(r.dragons15) },
  { key: 'wra', label: 'WR à frente @15', render: (r) => pct(r.wrWhenAhead15) },
]

export default function DadosView() {
  // Convidado externo: só a aba Match History (baixar .rofl).
  const { user } = useAuth()
  const matchOnly = user?.role === 'matchviewer'
  const visibleSections = matchOnly ? SECTIONS.filter((s) => s.key === 'history') : SECTIONS
  const [section, setSection] = useState(matchOnly ? 'history' : 'players') // players | teams | radar | history | meta
  const [origin, setOrigin] = useState('both')
  const [teamId, setTeamId] = useState(EINERD_ID)
  const [region, setRegion] = useState('') // '' = todas
  const [teamsList, setTeamsList] = useState([])
  const [rows, setRows] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showTable, setShowTable] = useState(false) // Times/Jogadores: visual (padrão) ↔ tabela
  // Intervalo de datas ('' = sem limite). Aplica a Jogadores, Times e Radar.
  const [since, setSince] = useState('')
  const [until, setUntil] = useState('')

  // Aplica um atalho de período: mexe nos dois campos de uma vez.
  const aplicarPreset = (p) => {
    if (!p.dias) { setSince(''); setUntil(''); return }
    const hoje = new Date()
    const de = new Date(hoje); de.setDate(de.getDate() - p.dias + 1)
    setSince(ymd(de)); setUntil(ymd(hoje))
  }
  // Qual atalho corresponde ao intervalo atual (destaca a pill certa; fica
  // sem destaque quando o usuário digitou datas soltas).
  const presetAtivo = useMemo(() => {
    if (!since && !until) return 'Tudo'
    const hoje = ymd(new Date())
    if (until !== hoje) return null
    return PERIODOS.find((p) => {
      if (!p.dias) return false
      const de = new Date(); de.setDate(de.getDate() - p.dias + 1)
      return ymd(de) === since
    })?.label || null
  }, [since, until])

  // carrega lista de times uma vez
  useEffect(() => { fetchTeamsList().then(setTeamsList).catch(() => {}) }, [])

  // recarrega linhas quando muda seção/origem/time
  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(null)
    const opts = { types: ORIGIN_TYPES[origin], teamId: teamId || null, since: since || null, until: until || null }
    const fetcher = section === 'players' ? fetchPlayerRows : fetchTeamRows
    fetcher(opts)
      .then((data) => { if (!cancelled) { setRows(data); setLoading(false) } })
      .catch((e) => { if (!cancelled) { setError(e.message); setLoading(false) } })
    return () => { cancelled = true }
  }, [section, origin, teamId, since, until])

  // Região por team_id (vem de grid_teams via fetchTeamsList).
  const regionByTeam = useMemo(
    () => new Map(teamsList.map((t) => [t.id, t.region])),
    [teamsList],
  )
  // Só oferece as regiões que realmente existem nos dados, na ordem canônica,
  // com o nº de times de cada uma (o `hint` do menu).
  const regionOptions = useMemo(() => {
    const count = new Map()
    for (const t of teamsList) if (t.region) count.set(t.region, (count.get(t.region) || 0) + 1)
    return REGION_ORDER.filter((r) => count.has(r))
      .map((r) => ({ value: r, label: REGION_LABELS[r] || r, hint: count.get(r) }))
  }, [teamsList])

  // O combo de time respeita a região escolhida.
  const teamOptions = useMemo(
    () => teamsList.filter((t) => !region || t.region === region).map((t) => ({ value: t.id, label: t.name })),
    [teamsList, region],
  )

  // Trocar de região com um time de outra região selecionado deixaria a tela
  // vazia sem explicação — volta pra "todos os times" da nova região.
  useEffect(() => {
    if (region && teamId && regionByTeam.get(teamId) !== region) setTeamId('')
  }, [region, teamId, regionByTeam])

  // A região vira uma lista de team_ids pro Radar, que busca as próprias
  // linhas (é a única aba que não usa `visibleRows`). Resolver aqui mantém
  // "o que é a região X" definido num lugar só, em vez de o Radar recalcular.
  // undefined = sem restrição; lista vazia = nenhum time se encaixa.
  const regionTeamIds = useMemo(
    () => (region ? teamsList.filter((t) => t.region === region).map((t) => t.id) : undefined),
    [teamsList, region],
  )

  // Com "todos os times", a região filtra as próprias linhas.
  const visibleRows = useMemo(() => {
    if (!rows) return null
    if (!region) return rows
    return rows.filter((r) => regionByTeam.get(r.team_id) === region)
  }, [rows, region, regionByTeam])

  const aggregated = useMemo(() => {
    if (!visibleRows) return []
    return section === 'players' ? aggregatePlayers(visibleRows) : aggregateTeams(visibleRows)
  }, [visibleRows, section])

  const hasData = aggregated.length > 0

  return (
    <div>
      <PageHeader
        title="Dados"
        subtitle="Estatísticas via GRID · partidas a partir de 03/07/2026 no servidor de torneio"
      />

      {/* Barra de filtros — linha 1: navegação; linha 2: filtros contextuais */}
      <div className="card mb-5 p-3">
        {/* Navegação entre sub-abas */}
        <div className="flex flex-wrap items-center gap-2">
          {visibleSections.map((s) => (
            <Pill key={s.key} active={section === s.key} onClick={() => setSection(s.key)}>
              <span className="flex items-center gap-1.5"><s.icon size={13} /> {s.label}</span>
            </Pill>
          ))}
        </div>
        {/* Filtros de time/origem (só nas abas que usam grid_game_*; pro play não) */}
        {section !== 'history' && section !== 'meta' && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3" style={{ borderColor: 'var(--divider)' }}>
            {/* Região → Time: um funil, na ordem em que o filtro age (a região
                estreita a lista de times). Região é um MENU e não pills como
                Origem: com 8 opções, pills viram uma parede de chips do mesmo
                peso visual da Origem, e aí nada parece principal. Menu = 1 alvo
                no lugar de 8, e sobra hierarquia pra Origem, que tem 3 opções
                e ganha de verdade em ficar sempre visível. */}
            {regionOptions.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="condensed text-[10px]" style={{ color: 'var(--text-faint)' }}>Região</span>
                <SearchableSelect
                  value={region}
                  options={regionOptions}
                  onChange={setRegion}
                  allLabel="Todas as regiões"
                  icon={Globe}
                  width={190}
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="condensed text-[10px]" style={{ color: 'var(--text-faint)' }}>Time</span>
              <SearchableSelect
                value={teamId}
                options={teamOptions}
                onChange={setTeamId}
                allLabel={region ? `Todos · ${REGION_LABELS[region] || region}` : 'Todos os times'}
                placeholder="Buscar time…"
                icon={Users}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="condensed text-[10px]" style={{ color: 'var(--text-faint)' }}>Origem</span>
              {ORIGINS.map((o) => (
                <Pill key={o.key} active={origin === o.key} onClick={() => setOrigin(o.key)}>{o.label}</Pill>
              ))}
            </div>

            {/* Intervalo de datas. Os atalhos cobrem o uso real (a pergunta
                quase sempre é "últimas N semanas"); os campos ficam para o
                recorte exato — um bloco de scrims, um split, um confronto. */}
            <div className="flex flex-wrap items-center gap-1.5">
              <CalendarRange size={14} style={{ color: 'var(--text-faint)' }} />
              <span className="condensed text-[10px]" style={{ color: 'var(--text-faint)' }}>Período</span>
              {PERIODOS.map((p) => (
                <Pill key={p.label} active={presetAtivo === p.label} onClick={() => aplicarPreset(p)}>{p.label}</Pill>
              ))}
              <input type="date" value={since} max={until || undefined} onChange={(e) => setSince(e.target.value)}
                className="field py-1 text-xs" style={{ width: 'auto' }} title="Data inicial" />
              <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>até</span>
              <input type="date" value={until} min={since || undefined} onChange={(e) => setUntil(e.target.value)}
                className="field py-1 text-xs" style={{ width: 'auto' }} title="Data final" />
              {(since || until) && (
                <button onClick={() => { setSince(''); setUntil('') }} title="Limpar período"
                  className="flex items-center gap-1 rounded px-1.5 py-1 text-[10px]"
                  style={{ background: 'var(--card-bg-soft)', color: 'var(--text-muted)' }}>
                  <X size={11} /> limpar
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Conteúdo */}
      {section === 'meta' ? (
        <div className="card p-0"><TierlistMeta /></div>
      ) : section === 'history' ? (
        <div className="card p-0"><MatchHistory /></div>
      ) : section === 'radar' ? (
        <div className="card p-0">
          <JungleRadar teamId={teamId} origin={origin} teamIds={regionTeamIds} since={since} until={until} />
        </div>
      ) : (
      <div className="card p-0">
        {loading ? (
          <p className="flex items-center justify-center gap-2 py-16 text-sm" style={{ color: 'var(--text-faint)' }}>
            <RefreshCw size={15} className="animate-spin" /> Carregando dados…
          </p>
        ) : error ? (
          <p className="py-16 text-center text-sm text-loss">Erro ao carregar: {error}</p>
        ) : !hasData ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Database size={28} style={{ color: 'var(--text-faint)' }} />
            {/* Filtro que zerou o resultado ≠ banco vazio — não mandar rodar a
                ingestão quando o problema é só a região escolhida. */}
            {rows?.length ? (
              <>
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Nada nesta região</p>
                <p className="max-w-md text-xs" style={{ color: 'var(--text-faint)' }}>
                  Não há partidas de {REGION_LABELS[region] || region} nos filtros atuais. Escolha outra região ou volte para "Todas".
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Sem dados ingeridos ainda</p>
                <p className="max-w-md text-xs" style={{ color: 'var(--text-faint)' }}>
                  Os KPIs aparecem aqui quando houver partidas nas tabelas <code>grid_game_*</code>.
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid var(--divider)' }}>
              <span className="condensed text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {section === 'players' ? 'Jogadores' : 'Times'} · {aggregated.length} linha{aggregated.length > 1 ? 's' : ''}
              </span>
              {/* Alterna entre a visão visual (padrão) e a tabela numérica completa */}
              <div className="flex items-center gap-1.5">
                <Pill active={!showTable} onClick={() => setShowTable(false)}>Visual</Pill>
                <Pill active={showTable} onClick={() => setShowTable(true)}>Tabela</Pill>
              </div>
            </div>
            {showTable ? (
              <StatTable
                columns={section === 'players' ? PLAYER_COLS : TEAM_COLS}
                rows={aggregated}
                getKey={(r) => (section === 'players' ? r.playerId : r.teamId)}
              />
            ) : section === 'players' ? (
              <PlayersDashboard rows={visibleRows} />
            ) : (
              <TeamsDashboard rows={visibleRows} />
            )}
          </>
        )}
      </div>
      )}
    </div>
  )
}
