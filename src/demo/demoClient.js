// ═══════════════════════════════════════════════════════════════════
// MODO DEMO (build com VITE_DEMO=1 → `npm run build:demo`).
//
// Troca o Supabase por um banco em memória (ver mockSupabase.js) com dados
// fictícios. O build de demo não recebe URL nem chave do Supabase, então é
// impossível ele ler ou alterar o banco de verdade. As mudanças do visitante
// ficam só no navegador dele (localStorage) e "Restaurar demo" volta ao início.
// ═══════════════════════════════════════════════════════════════════
import { createLocalDb, createMockClient } from './mockSupabase.js'
import { seedGrid } from './seedGrid.js'
import { seedBlocks, seedEvents } from '../lib/storage.js'
import { DEFAULT_TEAMS } from '../data/teams.js'

export const IS_DEMO = import.meta.env.VITE_DEMO === '1'

const PERSIST_KEY = 'einerd-scrims:demo:db'

const doc = (x) => ({ id: x.id, data: x, updated_at: new Date().toISOString() })

function minutosAtras(m) {
  return new Date(Date.now() - m * 60000).toISOString()
}

// Os seeds de blocos/eventos têm datas fixas (jun/2026). Na demo elas são
// deslocadas para que o bloco mais recente fique 2 dias atrás e os eventos
// caiam ao redor de hoje — senão o painel abre com "0 blocos no mês".
function aproximarDeHoje(blocks, events) {
  const ultimo = blocks.map((b) => b.date).sort().at(-1)
  const alvo = new Date(); alvo.setDate(alvo.getDate() - 2)
  const dias = Math.round((alvo - new Date(`${ultimo}T12:00:00`)) / 86400000)
  const mover = (d) => {
    const x = new Date(`${d}T12:00:00`); x.setDate(x.getDate() + dias)
    return x.toISOString().slice(0, 10)
  }
  return {
    blocks: blocks.map((b) => ({ ...b, date: mover(b.date) })),
    events: events.map((e) => ({ ...e, date: mover(e.date) })),
  }
}

function seed() {
  const { blocks, events } = aproximarDeHoje(seedBlocks(), seedEvents())
  const msg = (id, from, to, message, min, read = true) =>
    ({ id: `demo-msg-${id}`, from_username: from, to_username: to, message, read, created_at: minutosAtras(min) })

  return {
    teams: DEFAULT_TEAMS.map(doc),
    blocks: blocks.map(doc),
    events: events.map(doc),
    champions: [],
    event_types: [],
    kanban: [],
    personal_notes: [],
    feedbacks: [],
    chat_messages: [
      msg(1, 'Lume', 'visitante', 'Fala! Revisei o bloco de ontem, o early do mid tá bem melhor.', 180),
      msg(2, 'visitante', 'Lume', 'Boa! Anota os matchups nas Notas Pessoais que eu olho depois.', 170),
      msg(3, 'Rocha', 'visitante', 'Scrim de quinta confirmada às 19h?', 45, false),
    ],
    ...seedGrid(),
  }
}

const db = createLocalDb({
  seed,
  persistKey: PERSIST_KEY,
  cfg: {
    primaryKeys: { personal_notes: 'username', grid_teams: 'team_id', grid_series: 'series_id', grid_pro_cursor: 'league' },
    defaults(table, row) {
      if (['teams', 'blocks', 'events', 'champions', 'event_types', 'kanban', 'personal_notes'].includes(table)) {
        return { updated_at: new Date().toISOString(), ...row }
      }
      if (table === 'chat_messages') return { read: false, created_at: new Date().toISOString(), ...row }
      return row
    },
  },
})

export function createDemoSupabase() {
  return createMockClient({ execute: db.execute })
}

// Apaga as mudanças do visitante e recarrega com os dados iniciais.
export function resetDemo() {
  db.reset()
  location.reload()
}
