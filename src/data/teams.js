// Times são gerenciados pelo usuário (Configurações > Times) e auto-registrados
// ao criar um bloco. Este arquivo exporta o time padrão (EiNerd) e utilitários.

export const DEFAULT_TEAMS = [
  {
    id: 'einerd',
    name: 'EiNerd',
    abbr: 'NERD',      // nossa tag
    primary: '#0000FF',
    accent: '#00AEFF',
    logo: null,
    contact: '',
    tag: '',
    // Roster padrão (nick + lane) — editável em Configurações / perfil do time.
    // Os nicks são fictícios.
    players: [
      { id: 'ply-top', name: 'Rocha',  role: 'Top' },
      { id: 'ply-jng', name: 'Cipó',   role: 'Jng' },
      { id: 'ply-mid', name: 'Lume',   role: 'Mid' },
      { id: 'ply-bot', name: 'Faísca', role: 'Bot' },
      { id: 'ply-sup', name: 'Âncora', role: 'Sup' },
    ],
  },
]

// Normaliza nome para comparação (sem caixa, sem espaços extras).
export function normName(s = '') {
  return s.trim().toLowerCase()
}

// Busca por nome exato ou parcial (case-insensitive) no array de times do contexto.
export function getTeamInfo(teams = [], name = '') {
  if (!name || !teams?.length) return null
  const q = normName(name)
  return (
    teams.find((t) => normName(t.name) === q) ??
    teams.find((t) => normName(t.name).includes(q)) ??
    teams.find((t) => q.includes(normName(t.name))) ??
    null
  )
}

// Retorna o gradient CSS inline de um time (ou fallback royal→sky).
export function teamGradient(teamInfo) {
  if (!teamInfo) return 'linear-gradient(135deg,#0000FF,#00AEFF)'
  return `linear-gradient(135deg,${teamInfo.primary},${teamInfo.accent ?? teamInfo.primary})`
}

// Nick do jogador do time cadastrado numa role (ex.: auto-preencher picks).
export function playerForRole(team, role) {
  return team?.players?.find((p) => p.role === role)?.name || ''
}
