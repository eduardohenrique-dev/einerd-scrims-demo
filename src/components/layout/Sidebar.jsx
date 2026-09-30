// Sidebar — menu lateral fixo. Contém:
//   • a logo (volta para o Histórico ao clicar),
//   • os itens de navegação (NAV) que trocam a tela ativa,
//   • o alternador de tema (claro/escuro),
//   • o perfil do time EiNerd (abre um modal para editar nome, cores, logo e roster),
//   • o usuário logado + botão de sair.
import { useRef, useState } from 'react'
import { LayoutGrid, CalendarDays, BarChart3, Database, Settings, NotebookPen, Sun, Moon, Upload, Check, Phone, Tag, LogOut, Swords , Package} from 'lucide-react'
import { cx } from '../../lib/utils.js'
import { readImageFile } from '../../lib/image.js'
import { useTheme } from '../../context/ThemeContext.jsx'
import { useApp } from '../../context/AppContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { teamGradient } from '../../data/teams.js'
import Modal from '../ui/Modal.jsx'
import TeamPlayersEditor from '../settings/TeamPlayersEditor.jsx'

// Itens do menu. `id` casa com a `route` do App; `icon` é o desenho do lucide.
// `adminOnly` esconde do menu quando o usuário logado não é admin.
const NAV = [
  { id: 'dashboard',  label: 'Histórico de Treinos', icon: LayoutGrid },
  { id: 'calendar',   label: 'Calendário',           icon: CalendarDays },
  { id: 'draftstats', label: 'Draft Stats',          icon: BarChart3 },
  { id: 'drafttool',  label: 'Draft Tool',           icon: Swords },
  { id: 'dados',      label: 'Dados',                icon: Database },
  { id: 'builds',     label: 'Builds & Runas',       icon: Package },
  { id: 'settings',   label: 'Configurações',        icon: Settings, adminOnly: true },
  { id: 'notes',      label: 'Notas Pessoais',       icon: NotebookPen },
]

export default function Sidebar({ route, onNavigate }) {
  const { theme, toggleTheme } = useTheme()
  const { teams, updateTeam } = useApp()
  const { user, logout } = useAuth()
  const isDark = theme === 'dark'
  const einerd = teams.find((t) => t.id === 'einerd')
  // Convidado externo: só enxerga a área de Dados (baixar .rofl).
  const isMatchViewer = user?.role === 'matchviewer'

  const [editing, setEditing]   = useState(false)
  const [draft, setDraft]       = useState(null)
  const fileRef                 = useRef(null)

  function openEdit() {
    setDraft({ ...einerd })
    setEditing(true)
  }

  function save() {
    updateTeam('einerd', {
      name:    draft.name?.trim()  || einerd.name,
      abbr:   (draft.abbr  || '').toUpperCase().slice(0, 4),
      tag:    (draft.tag   || '').trim(),
      contact:(draft.contact || '').trim(),
      primary: draft.primary,
      accent:  draft.accent,
    })
    setEditing(false)
  }

  function uploadLogo(e) {
    readImageFile(e.target.files?.[0], (b64) => {
      updateTeam('einerd', { logo: b64 })
    })
  }

  return (
    <>
      {/* Fundo explícito + scroll próprio: no mobile ela vira um drawer
          sobreposto (precisa de bg) e em telas baixas (celular deitado)
          o rodapé precisa continuar alcançável. */}
      <aside className="flex h-full w-64 shrink-0 flex-col overflow-y-auto border-r" style={{ background: 'var(--bg)' }}>
        {/* Logo */}
        <div className="px-4 py-5">
          <button
            onClick={() => onNavigate('dashboard')}
            className="group flex w-full items-center gap-3 px-2 py-2 text-left transition-colors"
          >
            <div
              className="clip-notch-tl relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden"
              style={{ background: teamGradient(einerd), filter: 'drop-shadow(0 6px 16px rgba(46,75,255,0.55))' }}
            >
              {einerd?.logo
                ? <img src={einerd.logo} alt="EiNerd" className="h-full w-full object-cover" />
                : <span className="font-display text-2xl text-white drop-shadow">E</span>}
            </div>
            <div>
              <p className="display text-2xl leading-none" style={{ color: 'var(--text)' }}>EiNerd</p>
              <p className="condensed mt-1 text-[10px] text-sky">Esports · LoL</p>
            </div>
          </button>
        </div>

        {/* Divisor */}
        <div className="mx-5 h-px" style={{ background: 'var(--divider)' }} />

        {/* Nav */}
        <div className="px-3 pt-4">
          <p className="condensed mb-2 px-3 text-[10px]" style={{ color: 'var(--text-faint)' }}>
            Gestão
          </p>
          <nav className="space-y-1">
            {NAV.filter((n) => (isMatchViewer ? n.id === 'dados' : !n.adminOnly || user?.role === 'admin')).map(({ id, label, icon: Icon }) => {
              const active = route === id
              return (
                <button
                  key={id}
                  onClick={() => onNavigate(id)}
                  className={cx(
                    'group relative flex w-full items-center gap-3 px-3 py-2.5 text-sm font-semibold transition-all duration-150',
                    !active && 'hover:translate-x-0.5',
                  )}
                  style={active ? {
                    background: 'var(--card-bg-soft)',
                    clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
                    color: 'var(--text)',
                  } : { color: 'var(--text-muted)' }}
                >
                  {/* Indicador diagonal do item ativo */}
                  <span
                    className={cx('absolute left-0 top-0 h-full w-1 transition-all', active ? 'bg-sky' : 'bg-transparent group-hover:bg-sky/30')}
                    style={{ transform: 'skewX(-14deg)' }}
                  />
                  <Icon size={17} style={{ color: active ? 'var(--accent)' : 'var(--text-faint)' }} />
                  <span className={active ? 'condensed text-[13px]' : ''}>{label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Rodapé: tema + perfil */}
        <div className="mt-auto space-y-3 p-4">
          {/* Toggle de tema */}
          <button
            onClick={toggleTheme}
            className="clip-notch flex w-full items-center gap-3 px-3 py-2.5 text-sm font-semibold transition-all duration-150"
            style={{ boxShadow: 'inset 0 0 0 1px var(--divider)', color: 'var(--text-muted)' }}
          >
            {isDark
              ? <><Sun size={16} className="text-sky" /> Modo Claro</>
              : <><Moon size={16} className="text-royal" /> Modo Escuro</>
            }
            <span className="condensed ml-auto text-[10px]" style={{ color: 'var(--text-faint)' }}>
              {isDark ? 'Dark' : 'Light'}
            </span>
          </button>

          {/* Perfil EiNerd — clicável para editar */}
          <button
            onClick={openEdit}
            className="clip-notch group flex w-full items-center gap-3 p-3 text-left transition-all"
            style={{ boxShadow: 'inset 0 0 0 1px var(--card-border)', background: 'var(--card-bg)' }}
          >
            <div
              className="clip-notch-tl relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden text-sm font-bold text-white"
              style={{ background: teamGradient(einerd), filter: 'drop-shadow(0 4px 10px rgba(46,75,255,0.5))' }}
            >
              {einerd?.logo
                ? <img src={einerd.logo} alt="EiNerd" className="h-full w-full object-cover" />
                : <span className="font-display text-base">E</span>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="display truncate text-base leading-none" style={{ color: 'var(--text)' }}>EINERD</p>
              <p className="condensed mt-1 truncate text-[10px]" style={{ color: 'var(--text-faint)' }}>Esports · LoL</p>
            </div>
            <span className="condensed text-[10px] text-sky/70 transition-colors group-hover:text-sky">editar</span>
          </button>

          {/* Usuário logado + logout */}
          <div className="clip-notch flex items-center gap-2.5 p-2.5" style={{ boxShadow: 'inset 0 0 0 1px var(--divider)', background: 'rgba(41,206,249,0.04)' }}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center clip-notch text-[11px] font-black text-ink-900"
              style={{ background: user.role === 'admin' ? '#FFBE00' : 'var(--accent)' }}>
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-bold" style={{ color: 'var(--text)' }}>{user.name}</p>
              <p className="condensed text-[9px]" style={{ color: 'var(--text-faint)' }}>{user.role === 'admin' ? 'Staff' : isMatchViewer ? 'Convidado' : 'Jogador'}</p>
            </div>
            <button onClick={logout} title="Sair" className="shrink-0 p-1 transition hover:text-loss" style={{ color: 'var(--text-faint)' }}>
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Modal de edição do perfil EiNerd */}
      {draft && (
        <Modal
          open={editing}
          onClose={() => setEditing(false)}
          size="sm"
          title="Perfil do Time"
          subtitle="EiNerd Esports · LoL"
          headerRight={
            <div
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl"
              style={{ background: teamGradient(draft) }}
            >
              {einerd?.logo
                ? <img src={einerd.logo} alt="EiNerd" className="h-full w-full object-cover" />
                : <span className="font-display text-base text-white">E</span>}
            </div>
          }
          footer={
            <>
              <button onClick={() => setEditing(false)} className="btn-ghost">Cancelar</button>
              <button onClick={save} className="btn-primary"><Check size={15} /> Salvar</button>
            </>
          }
        >
          <div className="space-y-4">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="group relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl transition hover:opacity-80"
                title="Trocar logo"
              >
                <div className="h-full w-full" style={{ background: teamGradient(draft) }}>
                  {einerd?.logo
                    ? <img src={einerd.logo} alt="EiNerd" className="h-full w-full object-cover" />
                    : <span className="flex h-full w-full items-center justify-center font-display text-3xl text-white">E</span>}
                </div>
                <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 opacity-0 transition group-hover:opacity-100">
                  <Upload size={18} className="text-white" />
                </span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
              <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                Clique no logo para trocar.<br />
                Ideal: quadrada 1:1, máx 300 KB.
              </p>
            </div>

            {/* Nome e sigla */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Nome</label>
                <input
                  value={draft.name || ''}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  className="field"
                  placeholder="EiNerd"
                />
              </div>
              <div>
                <label className="label">Sigla</label>
                <input
                  value={draft.abbr || ''}
                  onChange={(e) => setDraft((d) => ({ ...d, abbr: e.target.value.toUpperCase() }))}
                  className="field uppercase"
                  placeholder="NERD"
                  maxLength={4}
                />
              </div>
            </div>

            {/* Tag e contato */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label flex items-center gap-1"><Tag size={11} /> Tag</label>
                <input
                  value={draft.tag || ''}
                  onChange={(e) => setDraft((d) => ({ ...d, tag: e.target.value }))}
                  className="field"
                  placeholder="ex: Season 1"
                  maxLength={16}
                />
              </div>
              <div>
                <label className="label flex items-center gap-1"><Phone size={11} /> Contato</label>
                <input
                  value={draft.contact || ''}
                  onChange={(e) => setDraft((d) => ({ ...d, contact: e.target.value }))}
                  className="field"
                  placeholder="@discord"
                />
              </div>
            </div>

            {/* Cores */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-faint)' }}>
                Primária
                <input
                  type="color"
                  value={draft.primary}
                  onChange={(e) => setDraft((d) => ({ ...d, primary: e.target.value }))}
                  className="h-8 w-10 cursor-pointer rounded border-0 p-0.5"
                  style={{ background: 'var(--input-bg)' }}
                />
              </label>
              <label className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-faint)' }}>
                Destaque
                <input
                  type="color"
                  value={draft.accent || draft.primary}
                  onChange={(e) => setDraft((d) => ({ ...d, accent: e.target.value }))}
                  className="h-8 w-10 cursor-pointer rounded border-0 p-0.5"
                  style={{ background: 'var(--input-bg)' }}
                />
              </label>
              <div
                className="ml-auto h-8 w-16 rounded-lg"
                style={{ background: teamGradient(draft) }}
                title="Preview do gradiente"
              />
            </div>

            {/* Jogadores (edição imediata, independe de Salvar/Cancelar acima) */}
            {einerd && <TeamPlayersEditor team={einerd} />}
          </div>
        </Modal>
      )}
    </>
  )
}
