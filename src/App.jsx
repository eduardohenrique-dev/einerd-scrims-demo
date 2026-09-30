// ───────────────────────────────────────────────────────────────
// App.jsx — Casca (shell) da aplicação.
// Responsabilidades:
//   1. Decidir entre a tela de LOGIN e o app já logado.
//   2. Montar os provedores de estado global (tema, auth, dados).
//   3. Fazer a "navegação" entre telas. Não há biblioteca de rotas:
//      guardamos a tela atual numa string de estado (`route`).
// Fluxo detalhado do arranque: ver ARQUITETURA.md, seção 4.
// ───────────────────────────────────────────────────────────────
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { AppProvider } from './context/AppContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { getStoredUser, clearUser } from './lib/auth.js'
import LoginGate from './components/auth/LoginGate.jsx'
import Sidebar from './components/layout/Sidebar.jsx'
import ChatWidget from './components/chat/ChatWidget.jsx'
import Dashboard from './components/dashboard/Dashboard.jsx'
import CalendarView from './components/calendar/CalendarView.jsx'
import DraftStats from './components/stats/DraftStats.jsx'
import DraftTool from './components/drafttool/DraftTool.jsx'
import DadosView from './components/data/DadosView.jsx'
import BuildsRunes from './components/data/BuildsRunes.jsx'
import Settings from './components/settings/Settings.jsx'
import NotasPessoais from './components/notes/NotasPessoais.jsx'
import DemoBanner from './demo/DemoBanner.jsx'

// AppShell = layout do app logado: menu lateral fixo + a tela ativa.
// `route` é qual tela mostrar; a Sidebar chama `onNavigate` para trocá-la.
function AppShell() {
  const { user } = useAuth()
  // Convidado externo: só a área de Dados (baixar .rofl). Entra
  // direto nela e fica presa lá, mesmo se tentar navegar por outros meios.
  const isMatchViewer = user?.role === 'matchviewer'
  const [route, setRoute] = useState(isMatchViewer ? 'dados' : 'dashboard')
  // Menu lateral no MOBILE (< lg): vira um drawer sobreposto, aberto pelo
  // hambúrguer da topbar. No desktop (≥ lg) a sidebar é fixa como sempre.
  const [menuOpen, setMenuOpen] = useState(false)
  // Configurações é área de admin — bloqueia mesmo se o não-admin tentar
  // entrar por outros meios (não só esconder do menu). Cai no dashboard.
  const canSettings = user?.role === 'admin'
  const effective = isMatchViewer
    ? 'dados'
    : route === 'settings' && !canSettings ? 'dashboard' : route

  const navigate = (r) => { setRoute(r); setMenuOpen(false) }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar fixa (desktop) */}
      <div className="hidden shrink-0 lg:flex">
        <Sidebar route={effective} onNavigate={navigate} />
      </div>

      {/* Drawer (mobile): backdrop + a MESMA sidebar deslizando por cima */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMenuOpen(false)} />
          <div className="route-in absolute inset-y-0 left-0 flex max-w-[85vw]">
            <Sidebar route={effective} onNavigate={navigate} />
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center clip-notch"
            style={{ background: 'var(--card-bg)', color: 'var(--text)' }}
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        {/* Topbar (mobile): hambúrguer + marca. Some no desktop. */}
        <header
          className="sticky top-0 z-40 flex shrink-0 items-center gap-3 px-4 py-2.5 backdrop-blur lg:hidden"
          style={{ background: 'color-mix(in srgb, var(--bg) 85%, transparent)', borderBottom: '1px solid var(--divider)' }}
        >
          <button
            onClick={() => setMenuOpen(true)}
            className="flex h-10 w-10 items-center justify-center clip-notch"
            style={{ boxShadow: 'inset 0 0 0 1px var(--card-border)', color: 'var(--text)' }}
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
          <p className="display text-lg leading-none" style={{ color: 'var(--text)' }}>EiNerd</p>
          <p className="condensed text-[9px] text-sky">Esports · LoL</p>
        </header>

        <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          {/* Só a tela correspondente à rota atual é renderizada. O `key` força
              remontar o wrapper a cada troca de rota → dispara a animação de
              entrada (route-in), estilo transição de tela nativa. */}
          <div key={effective} className="route-in">
            {effective === 'dashboard' && <Dashboard />}
            {effective === 'calendar' && <CalendarView />}
            {effective === 'draftstats' && <DraftStats />}
            {effective === 'drafttool' && <DraftTool />}
            {effective === 'dados' && <DadosView />}
            {effective === 'builds' && <BuildsRunes />}
            {effective === 'settings' && <Settings />}
            {effective === 'notes' && <NotasPessoais />}
          </div>
        </div>
      </main>
      {/* Chat da equipe — flutuante, presente em todas as telas.
          Escondido para o convidado externo (não faz parte do time). */}
      {!isMatchViewer && <ChatWidget />}
    </div>
  )
}

export default function App() {
  // `user` vem do LocalStorage (se já logou antes). Enquanto for null,
  // mostramos o login; ao logar/deslogar, atualizamos este estado.
  const [user, setUser] = useState(getStoredUser())

  return (
    // Provedores aninhados: tema → auth → dados. Cada tela lê esses
    // contextos via useTheme() / useAuth() / useApp().
    <ThemeProvider>
      <DemoBanner />
      {user ? (
        <AuthProvider user={user} onLogout={() => { clearUser(); setUser(null) }}>
          <AppProvider>
            <AppShell />
          </AppProvider>
        </AuthProvider>
      ) : (
        <LoginGate onSuccess={setUser} />
      )}
    </ThemeProvider>
  )
}
