// Gestão de Times (dentro de Configurações):
//  • formulário de adição
//  • grid de cards com winrate, tag e contato
//  • modal de detalhe: edição completa + histórico de blocos (abre o bloco)
import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Upload, X, Trash2, Phone, Tag, Check, Pencil, Shield, ChevronDown, Link2, Unlink } from 'lucide-react'
import { useApp } from '../../context/AppContext.jsx'
import { teamGradient } from '../../data/teams.js'
import { teamStats, cx } from '../../lib/utils.js'
import { readImageFile } from '../../lib/image.js'
import { wrColorWith, DRAW } from '../../lib/resultColors.js'
import { fetchTeamsList } from '../../lib/grid/gridData.js'
import { matchGridTeamId } from '../../lib/draftStats.js'
import { REGION_LABELS } from '../../lib/grid/regions.js'
import Modal from '../ui/Modal.jsx'
import { SearchableSelect } from '../data/vizBits.jsx'
import { BlockRow } from '../dashboard/BlockCard.jsx'
import BlockDetail from '../block/BlockDetail.jsx'
import TeamPlayersEditor from './TeamPlayersEditor.jsx'

// Valores iniciais do formulário de "novo time".
const BLANK_TEAM = { name: '', abbr: '', primary: '#4A5BFF', accent: '#57C4FF', logo: null, contact: '', tag: '' }

function TeamBadge({ team, size = 44 }) {
  return team.logo ? (
    <img src={team.logo} alt={team.name} className="shrink-0 rounded-xl object-cover ring-1 ring-white/10" style={{ width: size, height: size }} />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-xl font-black text-white"
      style={{ width: size, height: size, background: teamGradient(team), fontSize: size * 0.28 }}>
      {(team.abbr || team.name).slice(0, 4).toUpperCase()}
    </span>
  )
}

function WinrateRing({ value, size = 56 }) {
  const pct = value ?? 0
  const color = wrColorWith(value, { win: '#3FAEFF', loss: '#FF5C79' }, 100)
  return (
    <div className="relative flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, background: value == null ? 'var(--card-bg-soft)' : `conic-gradient(${color} ${pct * 3.6}deg, rgba(150,170,255,0.14) 0deg)` }}>
      <div className="flex items-center justify-center rounded-full" style={{ width: size - 10, height: size - 10, background: 'var(--surface)' }}>
        <span className="font-display text-[13px] tabular-nums" style={{ color: 'var(--text)' }}>
          {value == null ? '—' : `${value}%`}
        </span>
      </div>
    </div>
  )
}

// ── Card de time ────────────────────────────────────────────────────
function TeamCard({ team, stats, onOpen }) {
  const recordColor = wrColorWith(stats.winrate, { win: '#3FAEFF', loss: '#FF5C79' }, 100)
  const isEinerd = team.id === 'einerd'
  return (
    <button onClick={onOpen}
      className="group relative w-full overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
      <span className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-25 blur-2xl transition-opacity group-hover:opacity-45"
        style={{ background: teamGradient(team) }} />
      <div className="relative flex items-center gap-3">
        <TeamBadge team={team} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="display truncate text-lg" style={{ color: 'var(--text)' }}>{team.name}</h3>
            {isEinerd && <span className="shrink-0 rounded-md bg-sky/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky">Nós</span>}
            {team.tag && (
              <span className="shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                style={{ color: team.accent || '#3FAEFF', background: `${team.accent || '#3FAEFF'}22` }}>{team.tag}</span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[11px]" style={{ color: 'var(--text-faint)' }}>
            {stats.count > 0 ? `${stats.count} bloco${stats.count !== 1 ? 's' : ''}` : 'Sem blocos'}
            {team.contact ? ` · ${team.contact}` : ''}
          </p>
        </div>
        {!isEinerd && <WinrateRing value={stats.winrate} />}
      </div>
      {!isEinerd && (
        <div className="relative mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: 'var(--divider)' }}>
          <span className="text-[11px] font-semibold" style={{ color: recordColor }}>
            {stats.blockWins}V · {stats.blockLosses}D
            {stats.blockDraws ? <span style={{ color: DRAW }}> · {stats.blockDraws}E</span> : ''}
          </span>
          <span className="text-[11px] font-semibold text-sky/70 transition-all group-hover:text-sky">Ver histórico →</span>
        </div>
      )}
    </button>
  )
}

// ── Vínculo com a GRID ──────────────────────────────────────────────
// Os KPIs (KDA, Dados) vêm da GRID casando este time com o time de lá. Sem um
// id fixado esse casamento é um PALPITE pelo nome, então renomear o time aqui
// pode mudar ou perder o vínculo em silêncio. Fixar grava o `gridTeamId` no
// time e torna o elo imune a renomeações dos dois lados.
function GridLink({ team }) {
  const { updateTeam } = useApp()
  const [gridTeams, setGridTeams] = useState(null)

  useEffect(() => { fetchTeamsList().then(setGridTeams).catch(() => setGridTeams([])) }, [])

  const pinned = team.gridTeamId || null
  const guessId = useMemo(
    () => (gridTeams ? matchGridTeamId(gridTeams, team.name) : null),
    [gridTeams, team.name],
  )
  // Um id fixado que não existe mais nos dados é sinalizado — o app cai no
  // palpite por nome nesse caso (ver resolveGridTeamId), e o usuário precisa saber.
  const pinnedTeam = pinned && gridTeams ? gridTeams.find((t) => t.id === pinned) : null
  const guessTeam = guessId && gridTeams ? gridTeams.find((t) => t.id === guessId) : null
  const effective = pinnedTeam || guessTeam

  if (gridTeams === null) {
    return <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>Carregando times da GRID…</p>
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <span className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
          <Link2 size={12} style={{ color: 'var(--text-faint)' }} />
          {effective ? (
            <>
              {effective.name}
              {effective.region && (
                <span className="rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                  style={{ color: 'var(--text-faint)', background: 'var(--card-bg-soft)' }}>
                  {REGION_LABELS[effective.region] || effective.region}
                </span>
              )}
            </>
          ) : (
            <span style={{ color: 'var(--text-faint)' }}>sem correspondência na GRID</span>
          )}
        </span>
        {pinned && pinnedTeam && (
          <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky" style={{ background: 'rgba(63,174,255,0.15)' }}>fixado</span>
        )}
        {pinned && !pinnedTeam && (
          <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-loss" style={{ background: 'rgba(255,92,121,0.15)' }}>
            id fixado ({pinned}) não existe mais — usando o palpite
          </span>
        )}
        {!pinned && effective && (
          <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)', background: 'var(--card-bg-soft)' }}>automático (por nome)</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchableSelect
          value={pinned || ''}
          options={gridTeams.map((t) => ({
            value: t.id,
            label: t.region ? `${t.name} · ${REGION_LABELS[t.region] || t.region}` : t.name,
          }))}
          onChange={(id) => updateTeam(team.id, { gridTeamId: id || null })}
          allLabel="Automático (pelo nome)"
          placeholder="Buscar time na GRID…"
          width={260}
        />
        {!pinned && guessId && (
          <button onClick={() => updateTeam(team.id, { gridTeamId: guessId })} className="btn-ghost py-1 text-xs">
            <Check size={13} /> Fixar este vínculo
          </button>
        )}
        {pinned && (
          <button onClick={() => updateTeam(team.id, { gridTeamId: null })} className="btn-ghost py-1 text-xs">
            <Unlink size={13} /> Desvincular
          </button>
        )}
      </div>
      <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
        Fixar protege os KPIs deste time contra renomeações. Sem fixar, o vínculo é adivinhado pelo nome a cada carregamento.
      </p>
    </div>
  )
}

// ── Modal de detalhe (edição completa + histórico) ──────────────────
function TeamDetail({ team, stats, teams, onClose, onOpenBlock }) {
  const { updateTeam, deleteTeam } = useApp()
  const fileRef = useRef(null)
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState({ ...team })
  const isEinerd = team.id === 'einerd'

  function save() {
    updateTeam(team.id, {
      name: draft.name.trim() || team.name,
      abbr: (draft.abbr || '').toUpperCase().slice(0, 4),
      primary: draft.primary, accent: draft.accent,
      tag: (draft.tag || '').trim(), contact: (draft.contact || '').trim(),
    })
    setEdit(false)
  }

  function uploadLogo(e) {
    readImageFile(e.target.files?.[0], (b64) => updateTeam(team.id, { logo: b64 }))
  }

  return (
    <Modal open onClose={onClose} size="lg"
      title={team.name}
      subtitle={`Desempenho e histórico · ${stats.count} bloco${stats.count !== 1 ? 's' : ''}`}
      headerRight={<TeamBadge team={team} size={40} />}
      footer={
        <>
          {!isEinerd && (
            <button onClick={() => { if (confirm(`Remover "${team.name}"?`)) { deleteTeam(team.id); onClose() } }} className="btn-danger mr-auto">
              <Trash2 size={15} /> Remover
            </button>
          )}
          <button onClick={onClose} className="btn-ghost">Fechar</button>
        </>
      }
    >
      {/* Cabeçalho: logo + winrate + record */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-[auto_1fr]">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => fileRef.current?.click()}
            className="group relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl transition hover:opacity-80" title="Trocar foto/logo">
            <TeamBadge team={team} size={64} />
            <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
              <Upload size={16} className="text-white" />
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
          {!isEinerd && <WinrateRing value={stats.winrate} size={64} />}
        </div>

        <div className="flex flex-col justify-center gap-2 rounded-xl border p-3" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg-soft)' }}>
          {!isEinerd && (
            <div className="flex items-center gap-4 text-sm">
              <span style={{ color: 'var(--text)' }}>
                <b className="font-display text-base text-sky">{stats.blockWins}</b> <span style={{ color: 'var(--text-faint)' }}>V</span>
                {' · '}<b className="font-display text-base text-loss">{stats.blockLosses}</b> <span style={{ color: 'var(--text-faint)' }}>D</span>
                {stats.blockDraws ? <> · <b className="font-display text-base" style={{ color: DRAW }}>{stats.blockDraws}</b> <span style={{ color: 'var(--text-faint)' }}>E</span></> : null}
              </span>
              <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>jogos: {stats.gameWins}-{stats.gameLosses}</span>
            </div>
          )}
          {!edit ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
              <span className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <Tag size={12} style={{ color: 'var(--text-faint)' }} />
                {team.tag || <span style={{ color: 'var(--text-faint)' }}>sem tag</span>}
              </span>
              <span className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <Phone size={12} style={{ color: 'var(--text-faint)' }} />
                {team.contact || <span style={{ color: 'var(--text-faint)' }}>sem contato</span>}
              </span>
              <button onClick={() => { setDraft({ ...team }); setEdit(true) }} className="flex items-center gap-1 text-[11px] font-semibold text-sky/70 hover:text-sky">
                <Pencil size={11} /> editar dados
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Nome" className="field py-1.5 text-sm" />
                <input value={draft.abbr} onChange={(e) => setDraft((d) => ({ ...d, abbr: e.target.value.toUpperCase() }))} placeholder="Sigla" maxLength={4} className="field py-1.5 text-sm uppercase" />
                <input value={draft.tag || ''} onChange={(e) => setDraft((d) => ({ ...d, tag: e.target.value }))} placeholder="Tag" maxLength={16} className="field py-1.5 text-sm" />
                <input value={draft.contact || ''} onChange={(e) => setDraft((d) => ({ ...d, contact: e.target.value }))} placeholder="Contato" className="field py-1.5 text-sm" />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-faint)' }}>
                  Primária <input type="color" value={draft.primary} onChange={(e) => setDraft((d) => ({ ...d, primary: e.target.value }))} className="h-7 w-9 cursor-pointer rounded border-0 p-0.5" style={{ background: 'var(--input-bg)' }} />
                </label>
                <label className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-faint)' }}>
                  Destaque <input type="color" value={draft.accent || draft.primary} onChange={(e) => setDraft((d) => ({ ...d, accent: e.target.value }))} className="h-7 w-9 cursor-pointer rounded border-0 p-0.5" style={{ background: 'var(--input-bg)' }} />
                </label>
                <div className="ml-auto flex gap-2">
                  <button onClick={() => setEdit(false)} className="btn-ghost py-1 text-xs">Cancelar</button>
                  <button onClick={save} className="btn-primary py-1 text-xs"><Check size={13} /> Salvar</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Vínculo com a GRID (origem dos KPIs) */}
      <div className="card mb-5 p-4">
        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-faint)' }}>Vínculo GRID</h3>
        <GridLink team={team} />
      </div>

      {/* Jogadores */}
      <div className="card mb-5 p-4">
        <TeamPlayersEditor team={team} />
      </div>

      {/* Histórico */}
      {!isEinerd && (
        <>
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-faint)' }}>Últimos blocos</h3>
          {stats.blocks.length === 0 ? (
            <p className="rounded-xl border py-8 text-center text-sm" style={{ borderColor: 'var(--card-border)', color: 'var(--text-faint)' }}>
              Nenhum bloco registrado contra {team.name}.
            </p>
          ) : (
            <div className="space-y-2">
              {stats.blocks.map((b) => <BlockRow key={b.id} block={b} teams={teams} onOpen={() => onOpenBlock(b.id)} />)}
            </div>
          )}
        </>
      )}
    </Modal>
  )
}

// ── Componente principal ────────────────────────────────────────────
export default function TeamsManager() {
  const { teams, blocks, createTeam } = useApp()
  const [form, setForm] = useState(BLANK_TEAM)
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [openTeamId, setOpenTeamId] = useState(null)
  const [openBlockId, setOpenBlockId] = useState(null)
  const fileRef = useRef(null)

  function autoAbbr(name) { return name.trim().slice(0, 4).toUpperCase() }

  function submitAdd(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    createTeam({ ...form, abbr: form.abbr || autoAbbr(form.name) })
    setForm(BLANK_TEAM); setAdding(false)
  }

  const enriched = useMemo(() => {
    const q = query.trim().toLowerCase()
    return teams
      .filter((t) => t.id !== 'einerd')
      .filter((t) => !q || t.name.toLowerCase().includes(q) || (t.tag || '').toLowerCase().includes(q))
      .map((t) => ({ team: t, stats: teamStats(blocks, t.name) }))
      .sort((a, b) => b.stats.count - a.stats.count || a.team.name.localeCompare(b.team.name))
  }, [teams, blocks, query])

  const openTeam = teams.find((t) => t.id === openTeamId)
  const openStats = openTeam ? teamStats(blocks, openTeam.name) : null
  const openBlock = blocks.find((b) => b.id === openBlockId)

  return (
    <div className="card p-5">
      {/* Cabeçalho colapsável */}
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between">
        <h2 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
          <Shield size={14} /> Times ({teams.length})
        </h2>
        <span className="flex items-center gap-2 text-[11px] font-semibold" style={{ color: 'var(--text-faint)' }}>
          {open ? 'Recolher' : 'Expandir'}
          <ChevronDown size={16} className={cx('transition-transform duration-200', open && 'rotate-180')} />
        </span>
      </button>

      {open && (<>
      {/* Busca + adicionar */}
      <div className="mb-4 mt-4 flex flex-wrap items-center justify-end gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar time ou tag..." className="field w-44 py-1.5 text-sm" />
        {!adding && <button onClick={() => setAdding(true)} className="btn-ghost py-1.5 text-xs"><Plus size={13} /> Adicionar</button>}
      </div>

      {/* Formulário de adição */}
      {adding && (
        <form onSubmit={submitAdd} className="mb-4 rounded-xl border p-4 animate-slide-up" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg-soft)' }}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>Novo time</p>
            <button type="button" onClick={() => { setAdding(false); setForm(BLANK_TEAM) }} style={{ color: 'var(--text-faint)' }} className="hover:text-loss"><X size={15} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex items-center gap-3">
              <button type="button" onClick={() => fileRef.current?.click()}
                className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition hover:border-sky/50 hover:text-sky"
                style={{ borderColor: form.logo ? 'transparent' : 'var(--card-border)', color: 'var(--text-faint)' }}>
                {form.logo ? <img src={form.logo} className="h-full w-full object-cover" alt="logo" /> : <Upload size={18} />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => readImageFile(e.target.files?.[0], (b64) => setForm((f) => ({ ...f, logo: b64 })))} />
              <div className="flex flex-1 flex-col gap-2">
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, abbr: f.abbr || autoAbbr(e.target.value) }))} placeholder="Nome do time" className="field py-2" required />
                <input value={form.abbr} onChange={(e) => setForm((f) => ({ ...f, abbr: e.target.value.toUpperCase() }))} placeholder="Sigla (ex: TGR)" maxLength={4} className="field py-2 uppercase" />
              </div>
            </div>
            <div>
              <label className="label">Contato do responsável</label>
              <input value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} placeholder="@discord / telefone" className="field py-2" />
            </div>
            <div>
              <label className="label">Tag</label>
              <input value={form.tag} onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))} placeholder="Rival, Tier 1..." maxLength={16} className="field py-2" />
            </div>
            <div>
              <label className="label">Cor primária</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.primary} onChange={(e) => setForm((f) => ({ ...f, primary: e.target.value }))} className="h-9 w-12 cursor-pointer rounded-lg border-0 p-0.5" style={{ background: 'var(--input-bg)' }} />
                <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{form.primary}</span>
              </div>
            </div>
            <div>
              <label className="label">Cor de destaque</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.accent} onChange={(e) => setForm((f) => ({ ...f, accent: e.target.value }))} className="h-9 w-12 cursor-pointer rounded-lg border-0 p-0.5" style={{ background: 'var(--input-bg)' }} />
                <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{form.accent}</span>
              </div>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => { setAdding(false); setForm(BLANK_TEAM) }} className="btn-ghost py-2 text-xs">Cancelar</button>
            <button type="submit" className="btn-primary py-2 text-xs"><Plus size={13} /> Salvar</button>
          </div>
        </form>
      )}

      {/* Grid de times */}
      {enriched.length === 0 ? (
        <p className="py-10 text-center text-sm" style={{ color: 'var(--text-faint)' }}>
          {query ? 'Nenhum time encontrado.' : 'Nenhum time ainda.'}
        </p>
      ) : (
        <div className="max-h-[520px] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {enriched.map(({ team, stats }) => (
              <TeamCard key={team.id} team={team} stats={stats} onOpen={() => setOpenTeamId(team.id)} />
            ))}
          </div>
        </div>
      )}
      </>)}

      {openTeam && openStats && (
        <TeamDetail team={openTeam} stats={openStats} teams={teams}
          onClose={() => setOpenTeamId(null)}
          onOpenBlock={(id) => { setOpenTeamId(null); setOpenBlockId(id) }} />
      )}
      {openBlock && <BlockDetail block={openBlock} onClose={() => setOpenBlockId(null)} />}
    </div>
  )
}
