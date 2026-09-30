// Chat interno em tempo real (substitui o antigo mecanismo de feedbacks).
// Mensagens 1:1 entre quaisquer contas do sistema, na tabela chat_messages.
// O widget (components/chat/ChatWidget.jsx) consome estas funções.
import { supabase } from './supabase.js'

// Todas as mensagens em que o usuário participa (enviadas ou recebidas),
// em ordem cronológica. Limite alto o suficiente pra histórico de equipe.
export async function fetchMessages(username) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .or(`from_username.eq.${username},to_username.eq.${username}`)
    .order('created_at', { ascending: true })
    .limit(2000)
  if (error) { console.error('[chat] fetch:', error.message); return [] }
  return data || []
}

// Envia uma mensagem. A linha já vem montada do widget (com id/created_at
// do cliente) pra permitir atualização otimista sem esperar o servidor.
export async function sendMessage(row) {
  const { error } = await supabase.from('chat_messages').insert(row)
  if (error) { console.error('[chat] send:', error.message); throw error }
}

// Marca como lidas todas as mensagens que `other` enviou para `me`.
export async function markConversationRead(me, other) {
  const { error } = await supabase
    .from('chat_messages')
    .update({ read: true })
    .eq('to_username', me)
    .eq('from_username', other)
    .eq('read', false)
  if (error) console.error('[chat] read:', error.message)
}

// Assina INSERT/UPDATE em tempo real. Retorna função de cleanup.
export function subscribeChat(onChange) {
  const ch = supabase
    .channel('rt-chat')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, onChange)
    .subscribe()
  return () => { supabase.removeChannel(ch) }
}
