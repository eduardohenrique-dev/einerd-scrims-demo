// Helpers de acesso ao Supabase para tabelas "documento" (id + data jsonb).
import { supabase } from './supabase.js'

export async function fetchAll(table) {
  const { data, error } = await supabase.from(table).select('*')
  if (error) { console.error(`[db] fetch ${table}:`, error.message); return [] }
  return data || []
}

export async function upsertDoc(table, id, data) {
  const { error } = await supabase
    .from(table)
    .upsert({ id, data, updated_at: new Date().toISOString() })
  if (error) console.error(`[db] upsert ${table}/${id}:`, error.message)
}

export async function removeDoc(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) console.error(`[db] delete ${table}/${id}:`, error.message)
}

export async function clearTable(table) {
  const { error } = await supabase.from(table).delete().neq('id', '__never_matches__')
  if (error) console.error(`[db] clear ${table}:`, error.message)
}

// Tabelas "documento" do núcleo de dados (id + data jsonb).
export const CORE_TABLES = ['teams', 'blocks', 'events', 'champions', 'event_types', 'kanban']

// Apaga TODO o núcleo de dados na nuvem (usado na Zona de perigo).
export async function wipeCore() {
  await Promise.all(CORE_TABLES.map(clearTable))
}

// Assina mudanças em tempo real de uma tabela. onChange recebe o payload
// do postgres_changes ({ eventType, new, old }). Retorna função de cleanup.
export function subscribeTable(table, onChange) {
  const channel = supabase
    .channel(`rt-${table}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, onChange)
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}
