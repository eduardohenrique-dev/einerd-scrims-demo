// Notas pessoais por usuário (tabela personal_notes, PK = username).
// Isoladas: cada nick só lê/grava a própria linha.
import { supabase } from './supabase.js'

// ⚠️ Campos novos aqui devem ser ADITIVOS: documentos antigos (sem eles)
// continuam válidos — a UI sempre usa fallback (`notes.campo || padrão`).
export const EMPTY_NOTES = () => ({
  notebook: '',                 // HTML do editor rico (permite cores por trecho, ver NotasPessoais.jsx)
  matchups: [],                 // { id, mine, opp, note }
  tiers: { S: [], A: [], B: [] }, // championIds por tier
  images: [],                   // { id, img (data URL comprimida), caption, createdAt }
  draftNotes: '',               // anotações da aba "Anotações" do Draft Tool
})

export async function fetchNotes(username) {
  const { data, error } = await supabase
    .from('personal_notes').select('data').eq('username', username).maybeSingle()
  if (error) { console.error('[notes] fetch:', error.message); return null }
  return data?.data || null
}

export async function saveNotes(username, data) {
  const { error } = await supabase
    .from('personal_notes')
    .upsert({ username, data, updated_at: new Date().toISOString() })
  if (error) console.error('[notes] save:', error.message)
}
