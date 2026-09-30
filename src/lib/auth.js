// Autenticação local multi-usuário (gate de tela). A sessão (nick logado)
// fica na máquina via localStorage. Não é segurança forte — é identificação
// de quem está usando, para notas pessoais e feedbacks.
const AUTH_KEY = 'einerd:v1:user'

// Usuários da demonstração: contas fictícias, todas com a senha "demo".
// Este repositório não traz nenhuma conta real.
const IS_DEMO = import.meta.env.VITE_DEMO === '1'

const DEMO_USERS = [
  { username: 'visitante', password: 'demo', name: 'Visitante', role: 'admin' },
  { username: 'Rocha',     password: 'demo', name: 'Rocha',     role: 'player' },
  { username: 'Cipó',      password: 'demo', name: 'Cipó',      role: 'player' },
  { username: 'Lume',      password: 'demo', name: 'Lume',      role: 'player' },
  { username: 'Faísca',    password: 'demo', name: 'Faísca',    role: 'player' },
  { username: 'Âncora',    password: 'demo', name: 'Âncora',    role: 'player' },
]

export const USERS = DEMO_USERS

function publicUser(u) {
  return { username: u.username, name: u.name, role: u.role }
}

// Valida nick (case-insensitive) + senha (case-sensitive). Retorna o usuário público ou null.
export function authenticate(username, password) {
  const u = USERS.find((x) => x.username.toLowerCase() === (username || '').trim().toLowerCase())
  if (!u || u.password !== password) return null
  return publicUser(u)
}

export function getStoredUser() {
  const uname = localStorage.getItem(AUTH_KEY)
  // Demo: entra direto como visitante (sem tela de login na 1ª visita).
  if (IS_DEMO && uname == null) return publicUser(DEMO_USERS[0])
  if (!uname) return null
  const u = USERS.find((x) => x.username === uname)
  return u ? publicUser(u) : null
}

export function storeUser(user) { localStorage.setItem(AUTH_KEY, user.username) }
export function clearUser() {
  // Na demo, sair grava '' (em vez de remover) para a tela de login aparecer.
  if (IS_DEMO) localStorage.setItem(AUTH_KEY, '')
  else localStorage.removeItem(AUTH_KEY)
}
