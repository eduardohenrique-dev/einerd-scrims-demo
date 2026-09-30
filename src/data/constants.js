// Identidade do nosso time + constantes de domínio do draft.
export const OUR_TEAM = 'EiNerd'

// Roster padrão (jogador por rota). Usado para auto-preencher os picks.
// Os nicks são fictícios.
export const DEFAULT_ROSTER = { Top: 'Rocha', Jng: 'Cipó', Mid: 'Lume', Bot: 'Faísca', Sup: 'Âncora' }

export const ROLES = ['Top', 'Jng', 'Mid', 'Bot', 'Sup']

// Tipos de evento do calendário (base) + paleta pastel (brandbook suavizado).
// Editáveis em runtime (cor/nome, + novas categorias) via AppContext →
// `eventTypes`, que sobrepõe estes defaults com o que estiver salvo na nuvem
// (mesmo padrão de DEFAULT_CHAMPIONS). O id 'scrim' é especial: `createEvent`
// cria um bloco automático no Histórico quando o tipo é esse — por isso não
// pode ser excluído (só renomeado/recolorido).
export const DEFAULT_EVENT_TYPES = [
  { id: 'scrim', label: 'Scrim', color: '#3FAEFF' }, // cyan pastel
  { id: 'review', label: 'Review', color: '#4A5BFF' }, // royal pastel
  { id: 'reuniao', label: 'Reunião', color: '#FF5C79' }, // vermelho pastel
  { id: 'campeonato', label: 'Campeonato', color: '#34D9A0' }, // verde menta
  { id: 'folga', label: 'Folga', color: '#94A0C0' }, // cinza azulado
]

// ───────────────────────────────────────────────────────────────
// Ordem cronológica competitiva (draft de torneio).
// Números = ordem global de pick/ban; usados para rotular os slots.
//   Bans:  B1 R1 B2 R2 B3 R3  →  R4 B4 R5 B5
//   Picks: B1 | R1 R2 | B2 B3 | R3 | R4 R5 | B4 B5(*) | R5
// Slot index 0..4 por lado → número global exibido.
// ───────────────────────────────────────────────────────────────
export const PICK_ORDER = {
  blue: [1, 4, 5, 8, 9], // 1ª, 4ª, 5ª, 8ª, 9ª escolhas
  red: [2, 3, 6, 7, 10], // 2ª, 3ª, 6ª, 7ª, 10ª escolhas
}

export const BAN_ORDER = {
  blue: [1, 3, 5, 8, 10],
  red: [2, 4, 6, 7, 9],
}
