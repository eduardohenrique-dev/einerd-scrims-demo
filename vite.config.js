import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuração do Vite (bundler + servidor de desenvolvimento).
// O React é habilitado pelo plugin. A porta do dev server é 5181
// (ou a variável de ambiente PORT, se definida).
//
// Este repositório é a DEMONSTRAÇÃO: o modo demo fica sempre ligado. O `define`
// fixa a flag no código e zera as chaves do Supabase, então o app roda sobre
// dados fictícios em memória (ver src/demo/) e nunca tenta falar com um banco
// de verdade, mesmo que exista um .env com chaves.
export default defineConfig({
  plugins: [react()],
  server: { port: Number(process.env.PORT) || 5181 },
  define: {
    'import.meta.env.VITE_DEMO': JSON.stringify('1'),
    'import.meta.env.VITE_SUPABASE_URL': 'undefined',
    'import.meta.env.VITE_SUPABASE_ANON_KEY': 'undefined',
  },
})
