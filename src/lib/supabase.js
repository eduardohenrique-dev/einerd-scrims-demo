// Cliente Supabase — porta de entrada para o banco na nuvem.
// Lê as chaves do .env.local (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
//
// ⚠️ Sem as chaves, `supabase` fica null e o data layer (lib/db.js) não
// consegue carregar/gravar dados — o app precisa do Supabase configurado.
// `isSupabaseConfigured` existe para checar esse estado, se necessário.
// Passo a passo de configuração: ver supabase/SETUP.md e ARQUITETURA.md §8.
//
// MODO DEMO (VITE_DEMO=1): usa um banco em memória com dados fictícios
// (src/demo/). Nesse build não existe URL nem chave do Supabase real.
import { createClient } from '@supabase/supabase-js'
import { IS_DEMO, createDemoSupabase } from '../demo/demoClient.js'

const url  = IS_DEMO ? undefined : import.meta.env.VITE_SUPABASE_URL
const anon = IS_DEMO ? undefined : import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = IS_DEMO || Boolean(url && anon)

export const supabase = IS_DEMO
  ? createDemoSupabase()
  : (isSupabaseConfigured ? createClient(url, anon) : null)
