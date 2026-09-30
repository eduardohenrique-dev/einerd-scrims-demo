// DraftStats — tela de estatísticas de draft.
// A partir de TODOS os blocos, calcula winrate por campeão (e por jogador) de um
// time escolhido. Só entram jogos com resultado definido. O trabalho pesado de
// agregação está em lib/draftStats.js; aqui é só seleção de time/modo e exibição.
import { useEffect, useMemo, useState } from 'react'
import { Users, Swords, TrendingUp, ChevronDown } from 'lucide-react'
import { useApp } from '../../context/AppContext.jsx'
import { cx } from '../../lib/utils.js'
import { teamGradient } from '../../data/teams.js'
import {
  collectPickRecords, champStatsForTeam, playerStatsForTeam, matchupsForChamp, winrate,
  champKey, resolveGridTeamId, aggregateKdaByChampion, kdaRatio,
} from '../../lib/draftStats.js'
import { fetchPlayerRows, fetchTeamsList, ORIGIN_TYPES } from '../../lib/grid/gridData.js'
import { wrColorWith } from '../../lib/resultColors.js'
import PageHeader from '../ui/PageHeader.jsx'
import { ChampImg } from '../block/ChampionPicker.jsx'
import { SearchableSelect } from '../data/vizBits.jsx'

// Formata o KDA ratio agregado ((K+A)/D). D=0 = sem morte = "perfeito".
const fmtKda = (r) => (r === Infinity ? 'PERF' : r.toFixed(1))

// Badge de time: usa o logo do perfil se houver, senão a sigla colorida.
function TeamBadge({ team, size = 20, radius = 'rounded' }) {
  if (team?.logo) {
    return <img src={team.logo} alt={team.name} className={cx('shrink-0 object-cover ring-1 ring-white/10', radius)} style={{ width: size, height: size }} />
  }
  return (
    <span className={cx('flex shrink-0 items-center justify-center font-black text-white', radius)}
      style={{ width: size, height: size, background: teamGradient(team), fontSize: Math.round(size * 0.36) }}>
      {(team?.abbr || team?.name || '?').slice(0, 3).toUpperCase()}
    </span>
  )
}

// Barra de winrate (ciano ≥50%, vermelho <50%).
function WrBar({ wins, losses }) {
  const total = wins + losses
  const wr = winrate(wins, losses)
  const color = wrColorWith(wr, { win: '#29CEF9', loss: '#FF2E4D' }, 100)
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-10 shrink-0 overflow-hidden rounded-full sm:w-16" style={{ background: 'rgba(120,140,220,0.15)' }}>
        <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${wr}%`, background: color }} />
      </div>
      <span className="display w-9 shrink-0 text-right text-sm tabular-nums" style={{ color }}>{total ? `${wr}%` : '—'}</span>
    </div>
  )
}

function ChampRow({ championId, wins, losses, championById, expanded, onToggle, kdaEntry }) {
  const champ = championById.get(championId)
  const total = wins + losses
  return (
    <button type="button" onClick={onToggle}
      className="flex w-full items-center gap-2 px-2 py-1.5 text-left transition-colors hover:bg-white/5 sm:gap-3"
      style={{ borderBottom: expanded ? 'none' : '1px solid var(--divider)' }}>
      <ChampImg champ={champ} size={30} className="rounded-md" />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold" style={{ color: 'var(--text)' }}>
        {champ?.name || 'Campeão'}
      </span>
      {/* KDA via GRID — só aparece quando o campeão tem jogo capturado */}
      {kdaEntry && (
        <span className="condensed shrink-0 text-[10px] tabular-nums" style={{ color: 'var(--text-muted)' }}
          title={`GRID · ${kdaEntry.games} jogo${kdaEntry.games > 1 ? 's' : ''}`}>
          KDA <b className="text-sky">{fmtKda(kdaRatio(kdaEntry))}</b>
        </span>
      )}
      {/* V·D e nº de jogos só em ≥sm — no celular o nome do campeão tem
          prioridade (esses números seguem visíveis no WR% e no drilldown). */}
      <span className="condensed hidden shrink-0 text-[11px] tabular-nums sm:block" style={{ color: 'var(--text-faint)' }}>
        {wins}V · {losses}D
      </span>
      <span className="hidden w-8 shrink-0 text-center text-[11px] sm:block" style={{ color: 'var(--text-faint)' }}>{total}j</span>
      <WrBar wins={wins} losses={losses} />
      <ChevronDown size={14} className="shrink-0 transition-transform"
        style={{ color: 'var(--text-faint)', transform: expanded ? 'rotate(180deg)' : 'none' }} />
    </button>
  )
}

// dd/mm a partir de "YYYY-MM-DD" (datas dos blocos).
const fmtDay = (d) => (d && d.length >= 10 ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : '—')

// Painel expandido de um campeão: contra quem jogou (mesma lane), WR do
// matchup e a lista dos jogos individuais (data · adversário · resultado).
function MatchupPanel({ records, teamName, championId, role, championById, kdaEntry }) {
  const { matchups, unknown } = useMemo(
    () => matchupsForChamp(records, teamName, championId, role),
    [records, teamName, championId, role],
  )
  const unknownTotal = unknown.wins + unknown.losses
  return (
    <div className="px-2 pb-2" style={{ borderBottom: '1px solid var(--divider)' }}>
      <div className="clip-notch p-2" style={{ background: 'var(--card-bg-soft)' }}>
        {/* Detalhe do KDA (GRID): médias por jogo. Sem jogo capturado → sem linha. */}
        {kdaEntry && (
          <p className="condensed mb-1.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            GRID · {kdaEntry.games} jogo{kdaEntry.games > 1 ? 's' : ''} ·{' '}
            <b style={{ color: 'var(--text)' }}>
              {(kdaEntry.kills / kdaEntry.games).toFixed(1)} / {(kdaEntry.deaths / kdaEntry.games).toFixed(1)} / {(kdaEntry.assists / kdaEntry.games).toFixed(1)}
            </b>{' '}
            por jogo · KDA <b className="text-sky">{fmtKda(kdaRatio(kdaEntry))}</b>
          </p>
        )}
        <p className="condensed mb-1.5 text-[10px]" style={{ color: 'var(--text-faint)' }}>
          Matchups{role ? ` · ${role}` : ''} (pick da mesma lane do outro lado)
        </p>
        {matchups.length === 0 ? (
          <p className="py-2 text-center text-xs" style={{ color: 'var(--text-faint)' }}>
            Nenhum matchup registrado — o draft adversário não tem a lane preenchida nesses jogos.
          </p>
        ) : matchups.map((m) => {
          const opp = championById.get(m.championId)
          return (
            <div key={m.championId} className="py-1" style={{ borderTop: '1px solid var(--divider)' }}>
              <div className="flex items-center gap-2">
                <span className="condensed w-4 shrink-0 text-center text-[10px]" style={{ color: 'var(--text-faint)' }}>vs</span>
                <ChampImg champ={opp} size={24} className="rounded" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
                  {opp?.name || 'Campeão'}
                </span>
                <span className="condensed shrink-0 text-[10px] tabular-nums" style={{ color: 'var(--text-faint)' }}>
                  {m.wins}V · {m.losses}D
                </span>
                <WrBar wins={m.wins} losses={m.losses} />
              </div>
              <div className="mt-1 flex flex-wrap gap-1 pl-6">
                {m.games.map((g, i) => (
                  <span key={i} className="condensed rounded px-1.5 py-0.5 text-[9px]"
                    style={{
                      background: g.win ? 'rgba(41,206,249,0.12)' : 'rgba(255,46,77,0.12)',
                      color: g.win ? '#29CEF9' : '#FF2E4D',
                    }}>
                    {fmtDay(g.date)} · {g.oppTeamName || '?'} · {g.win ? 'V' : 'D'}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
        {unknownTotal > 0 && (
          <p className="condensed mt-1.5 text-[9px]" style={{ color: 'var(--text-faint)' }}>
            +{unknownTotal} jogo{unknownTotal > 1 ? 's' : ''} sem matchup registrado ({unknown.wins}V · {unknown.losses}D)
          </p>
        )}
      </div>
    </div>
  )
}

export default function DraftStats() {
  const { blocks, teams, championById } = useApp()
  const [mode, setMode] = useState('champion') // 'champion' | 'player'
  const einerd = teams.find((t) => t.id === 'einerd')
  const [teamId, setTeamId] = useState(einerd?.id || teams[0]?.id)
  // Campeão expandido (drilldown de matchups) — chave por lista pra não abrir
  // a mesma linha em dois cards do modo "Por Jogador".
  const [openKey, setOpenKey] = useState(null)
  const toggleKey = (k) => setOpenKey((cur) => (cur === k ? null : k))

  // ── KDA via GRID ──────────────────────────────────────────────────
  // Lista de times da GRID (uma vez) + linhas por jogador do time em foco.
  // Falha/ausência de dado é silenciosa: a UI simplesmente não mostra KDA.
  const [gridTeams, setGridTeams] = useState([])
  const [kdaByChamp, setKdaByChamp] = useState(new Map())
  useEffect(() => { fetchTeamsList().then(setGridTeams).catch(() => {}) }, [])

  const records = useMemo(() => collectPickRecords(blocks), [blocks])
  const team = teams.find((t) => t.id === teamId) || einerd

  const champRows = useMemo(
    () => (team ? champStatsForTeam(records, team.name) : []),
    [records, team],
  )
  const playerRows = useMemo(
    () => (team ? playerStatsForTeam(records, team) : []),
    [records, team],
  )

  const totalGames = useMemo(() => {
    let n = 0
    for (const b of blocks) for (const g of b.games || []) if (g.result === 'win' || g.result === 'loss') n++
    return n
  }, [blocks])

  // Recarrega o KDA (GRID) quando muda o time em foco. O elo app→GRID usa o
  // gridTeamId gravado no time (estável a renomeações) e só cai no palpite por
  // nome se o time ainda não estiver vinculado; sem elo, fica sem KDA nenhum.
  const gridTeamId = useMemo(() => resolveGridTeamId(team, gridTeams), [gridTeams, team])
  useEffect(() => {
    let cancelled = false
    if (!gridTeamId) { setKdaByChamp(new Map()); return }
    fetchPlayerRows({ types: ORIGIN_TYPES.both, teamId: gridTeamId })
      .then((rows) => { if (!cancelled) setKdaByChamp(aggregateKdaByChampion(rows)) })
      .catch(() => { if (!cancelled) setKdaByChamp(new Map()) })
    return () => { cancelled = true }
  }, [gridTeamId])

  // KDA de um campeão do draft: casa pelo nome (champKey) com o agregado GRID.
  const kdaFor = (championId) => {
    const champ = championById.get(championId)
    return (champ && kdaByChamp.get(champKey(champ.name))) || null
  }

  const teamWins   = champRows.reduce((n, c) => n + c.wins, 0)
  const teamLosses = champRows.reduce((n, c) => n + c.losses, 0)

  return (
    <div>
      <PageHeader title="Draft Stats" subtitle="Winrate de campeões por time e por jogador — atualiza junto com os resultados dos blocos" />

      {/* Seletor de time: atalho fixo pro nosso time + busca para o resto —
          escala pra qualquer quantidade de adversários cadastrados. */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {einerd && (
          <button
            onClick={() => { setTeamId(einerd.id); setOpenKey(null) }}
            className={cx('clip-notch flex items-center gap-2 px-3 py-2 text-sm font-semibold transition-all')}
            style={teamId === einerd.id
              ? { background: 'var(--accent)', color: '#05060E' }
              : { background: 'var(--card-bg)', color: 'var(--text-muted)', boxShadow: 'inset 0 0 0 1px var(--card-border)' }}
          >
            <TeamBadge team={einerd} size={20} />
            {einerd.name}
            <span className="condensed text-[9px]">nós</span>
          </button>
        )}
        <SearchableSelect
          value={teamId === einerd?.id ? '' : teamId}
          options={teams.filter((t) => t.id !== einerd?.id).map((t) => ({ value: t.id, label: t.name }))}
          onChange={(v) => { setTeamId(v || einerd?.id || teams[0]?.id); setOpenKey(null) }}
          allLabel={einerd ? `${einerd.name} (nós)` : 'Escolher time…'}
          placeholder="Buscar adversário…"
          width={240}
        />
        <span className="condensed text-[10px]" style={{ color: 'var(--text-faint)' }}>
          {teams.length} time{teams.length > 1 ? 's' : ''} na base
        </span>
      </div>

      {/* Toggle de modo */}
      <div className="mb-4 flex items-center gap-1 p-1" style={{ background: 'var(--card-bg)', boxShadow: 'inset 0 0 0 1px var(--card-border)', width: 'fit-content' }}>
        {[['champion', 'Por Campeão', Swords], ['player', 'Por Jogador', Users]].map(([m, label, Icon]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="clip-notch flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-all"
            style={mode === m ? { background: 'var(--accent)', color: '#05060E' } : { color: 'var(--text-faint)' }}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* Resumo do time */}
      <div className="card mb-5 flex flex-wrap items-center gap-x-6 gap-y-2 p-4">
        <div className="flex items-center gap-3">
          <TeamBadge team={team} size={40} radius="clip-notch-tl" />
          <div>
            <p className="display text-xl leading-none" style={{ color: 'var(--text)' }}>{team?.name}</p>
            <p className="condensed mt-1 text-[10px]" style={{ color: 'var(--text-faint)' }}>Picks registrados</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div>
            <p className="condensed text-[10px]" style={{ color: 'var(--text-faint)' }}>Picks V-D</p>
            <p className="display text-lg tabular-nums" style={{ color: 'var(--text)' }}>
              <span className="text-sky">{teamWins}</span><span className="opacity-30"> - </span><span className="text-loss">{teamLosses}</span>
            </p>
          </div>
          <div>
            <p className="condensed text-[10px]" style={{ color: 'var(--text-faint)' }}>WR de picks</p>
            <p className="display text-lg tabular-nums" style={{ color: wrColorWith(winrate(teamWins, teamLosses), { win: '#29CEF9', loss: '#FF2E4D' }, 100) }}>
              {teamWins + teamLosses ? `${winrate(teamWins, teamLosses)}%` : '—'}
            </p>
          </div>
          <div>
            <p className="condensed text-[10px]" style={{ color: 'var(--text-faint)' }}>Jogos na base</p>
            <p className="display text-lg tabular-nums" style={{ color: 'var(--text-muted)' }}>{totalGames}</p>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      {mode === 'champion' ? (
        <div className="card p-4">
          <h3 className="condensed mb-3 flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            <TrendingUp size={14} className="text-sky" /> Campeões — {team?.name}
          </h3>
          {champRows.length === 0 ? (
            <p className="py-10 text-center text-sm" style={{ color: 'var(--text-faint)' }}>
              Nenhum pick registrado com resultado definido para este time ainda.
            </p>
          ) : (
            <div>
              {champRows.map((c) => {
                const k = `t:${c.championId}`
                return (
                  <div key={c.championId}>
                    <ChampRow {...c} championById={championById} expanded={openKey === k} onToggle={() => toggleKey(k)} kdaEntry={kdaFor(c.championId)} />
                    {openKey === k && (
                      <MatchupPanel records={records} teamName={team?.name} championId={c.championId} role={null} championById={championById} kdaEntry={kdaFor(c.championId)} />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {(!team?.players || team.players.length === 0) ? (
            <div className="card p-4">
              <p className="py-10 text-center text-sm" style={{ color: 'var(--text-faint)' }}>
                Nenhum jogador cadastrado para <b style={{ color: 'var(--text-muted)' }}>{team?.name}</b>.<br />
                Cadastre os jogadores (e suas lanes) no perfil do time em Configurações.
              </p>
            </div>
          ) : (
            playerRows.map((p) => (
              <div key={p.id} className="card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2">
                    <span className="tag-skew bg-sky/20 text-sky"><span>{p.role}</span></span>
                    <span className="display text-lg" style={{ color: 'var(--text)' }}>{p.player}</span>
                  </h3>
                  <span className="condensed text-[11px] tabular-nums" style={{ color: 'var(--text-faint)' }}>
                    {p.wins}V · {p.losses}D · {p.wins + p.losses ? `${winrate(p.wins, p.losses)}%` : '—'}
                  </span>
                </div>
                {p.champs.length === 0 ? (
                  <p className="py-4 text-center text-xs" style={{ color: 'var(--text-faint)' }}>Sem picks registrados nesta lane.</p>
                ) : (
                  <div>
                    {p.champs.map((c) => {
                      const k = `p:${p.id}:${c.championId}`
                      return (
                        <div key={c.championId}>
                          <ChampRow {...c} championById={championById} expanded={openKey === k} onToggle={() => toggleKey(k)} kdaEntry={kdaFor(c.championId)} />
                          {openKey === k && (
                            <MatchupPanel records={records} teamName={team?.name} championId={c.championId} role={p.role} championById={championById} kdaEntry={kdaFor(c.championId)} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
