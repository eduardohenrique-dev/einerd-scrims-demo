// LoginGate — tela de login (o "portão" antes de entrar no app).
// Valida usuário/senha contra a lista fixa em lib/auth.js. Ao acertar,
// salva a sessão e avisa o App (onSuccess) para trocar para o app logado.
// Lembre: é identificação simples, não segurança forte (ver ARQUITETURA.md §7).
import { useState } from 'react'
import { User, Lock, LogIn } from 'lucide-react'
import { authenticate, storeUser } from '../../lib/auth.js'

export default function LoginGate({ onSuccess }) {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState(false)

  function submit(e) {
    e.preventDefault()
    const authed = authenticate(user, pass) // retorna o usuário público ou null
    if (authed) {
      storeUser(authed)   // guarda a sessão no LocalStorage
      onSuccess(authed)   // App troca para a tela logada
    } else {
      setError(true)      // mostra "usuário ou senha incorretos"
    }
  }

  return (
    <div className="flex h-screen items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <form
        onSubmit={submit}
        className="clip-notch relative w-full max-w-sm p-8"
        style={{ background: 'var(--card-bg)', boxShadow: 'inset 0 0 0 1px var(--card-border), 0 30px 60px -20px rgba(0,0,0,0.8)' }}
      >
        <span className="absolute left-0 top-0 h-1 w-full bg-sky" />

        <div className="mb-6 text-center">
          <div
            className="clip-notch-tl mx-auto mb-3 flex h-14 w-14 items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#2E4BFF,#29CEF9)', filter: 'drop-shadow(0 6px 16px rgba(46,75,255,0.55))' }}
          >
            <span className="font-display text-2xl text-white">E</span>
          </div>
          <h1 className="display text-2xl" style={{ color: 'var(--text)' }}>EiNerd</h1>
          <p className="condensed mt-1 text-[10px] text-sky">Acesso restrito</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label flex items-center gap-1.5"><User size={11} /> Usuário</label>
            <input
              value={user}
              onChange={(e) => { setUser(e.target.value); setError(false) }}
              autoComplete="username"
              autoFocus
              className="field"
            />
          </div>
          <div>
            <label className="label flex items-center gap-1.5"><Lock size={11} /> Senha</label>
            <input
              type="password"
              value={pass}
              onChange={(e) => { setPass(e.target.value); setError(false) }}
              autoComplete="current-password"
              className="field"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-xs font-semibold text-loss">Usuário ou senha incorretos.</p>}
        {import.meta.env.VITE_DEMO === '1' && (
          <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            Demonstração: entre como <b>visitante</b> (admin) ou <b>Lume</b> (jogador), senha <b>demo</b>.
          </p>
        )}

        <button type="submit" className="btn-primary mt-5 w-full">
          <LogIn size={15} /> Entrar
        </button>
      </form>
    </div>
  )
}
