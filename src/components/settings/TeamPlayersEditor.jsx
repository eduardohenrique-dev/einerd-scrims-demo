// Editor de jogadores (nick + role) de um time — usado em Times (adversários)
// e no perfil do EiNerd (sidebar). Edições aplicam direto (sem passo de "salvar").
import { useState } from 'react'
import { Plus, Trash2, Users } from 'lucide-react'
import { useApp } from '../../context/AppContext.jsx'
import { ROLES } from '../../data/constants.js'
import { uid } from '../../lib/utils.js'

export default function TeamPlayersEditor({ team }) {
  const { updateTeam } = useApp()
  const [name, setName] = useState('')
  const [role, setRole] = useState('Top')
  const players = team.players || []

  function add(e) {
    e.preventDefault()
    if (!name.trim()) return
    updateTeam(team.id, { players: [...players, { id: uid('ply'), name: name.trim(), role }] })
    setName('')
  }

  function setPlayerName(id, newName) {
    updateTeam(team.id, { players: players.map((p) => p.id === id ? { ...p, name: newName } : p) })
  }

  function setPlayerRole(id, newRole) {
    updateTeam(team.id, { players: players.map((p) => p.id === id ? { ...p, role: newRole } : p) })
  }

  function remove(id) {
    updateTeam(team.id, { players: players.filter((p) => p.id !== id) })
  }

  return (
    <div>
      <label className="label flex items-center gap-1.5"><Users size={11} /> Jogadores</label>

      {players.length > 0 && (
        <div className="mb-2 space-y-1.5">
          {players.map((p) => (
            <div key={p.id} className="flex items-center gap-2 p-1.5" style={{ background: 'var(--card-bg-soft)', boxShadow: 'inset 0 0 0 1px var(--card-border)' }}>
              <select
                value={p.role}
                onChange={(e) => setPlayerRole(p.id, e.target.value)}
                className="field w-[74px] shrink-0 py-1.5 text-xs"
              >
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <input
                value={p.name}
                onChange={(e) => setPlayerName(p.id, e.target.value)}
                placeholder="Nick do jogador"
                className="field flex-1 py-1.5 text-xs"
              />
              <button onClick={() => remove(p.id)} title="Remover jogador"
                className="shrink-0 transition hover:text-loss" style={{ color: 'var(--text-faint)' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      {players.length === 0 && (
        <p className="mb-2 text-xs" style={{ color: 'var(--text-faint)' }}>Nenhum jogador cadastrado.</p>
      )}

      <form onSubmit={add} className="flex items-center gap-2">
        <select value={role} onChange={(e) => setRole(e.target.value)} className="field w-[74px] shrink-0 py-1.5 text-xs">
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Adicionar jogador..."
          className="field flex-1 py-1.5 text-xs"
        />
        <button type="submit" className="btn-ghost shrink-0 px-2.5 py-1.5"><Plus size={13} /></button>
      </form>
    </div>
  )
}
