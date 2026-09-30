// ChatWidget — chat da equipe em tempo real, estilo "chat de suporte":
// botão flutuante no canto inferior direito; clicar sobe o painel.
// Todas as contas se enxergam (USERS) e conversam em DM 1:1.
//   • Lista de contatos com prévia da última mensagem + badge de não lidas.
//   • Conversa com bolhas, separador por dia e auto-scroll.
//   • Realtime via Supabase (INSERT/UPDATE em chat_messages).
// Montado no AppShell — presente em todas as telas.
import { useEffect, useMemo, useRef, useState } from 'react'
import { MessageCircle, X, ChevronLeft, Send } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { USERS } from '../../lib/auth.js'
import { fetchMessages, sendMessage, markConversationRead, subscribeChat } from '../../lib/chat.js'
import { uid, cx } from '../../lib/utils.js'

const fmtTime = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
const fmtDay = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

function Avatar({ name, role, size = 34 }) {
  return (
    <span
      className="clip-notch flex shrink-0 items-center justify-center font-black text-ink-900"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34), background: role === 'admin' ? '#FFBE00' : 'var(--accent)' }}
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  )
}

export default function ChatWidget() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [peer, setPeer] = useState(null) // username da conversa aberta (null = lista)
  const [msgs, setMsgs] = useState([])
  const [text, setText] = useState('')
  const listRef = useRef(null)
  const inputRef = useRef(null)
  // Refs espelham o estado pra o handler do realtime (callback estável).
  const peerRef = useRef(null); useEffect(() => { peerRef.current = peer }, [peer])
  const openRef = useRef(false); useEffect(() => { openRef.current = open }, [open])

  const contacts = useMemo(() => USERS.filter((u) => u.username !== user.username), [user.username])
  const byUsername = useMemo(() => Object.fromEntries(USERS.map((u) => [u.username, u])), [])

  // ── Carga inicial + realtime ──────────────────────────────────────
  useEffect(() => {
    let alive = true
    fetchMessages(user.username).then((m) => { if (alive) setMsgs(m) })
    const unsub = subscribeChat((payload) => {
      const row = payload.new
      if (!row) return
      const mine = row.to_username === user.username || row.from_username === user.username
      if (!mine) return
      if (payload.eventType === 'INSERT') {
        setMsgs((prev) => (prev.some((x) => x.id === row.id) ? prev : [...prev, row]))
        // Recebi com a conversa aberta → marca lida na hora.
        if (row.to_username === user.username && openRef.current && peerRef.current === row.from_username) {
          markConversationRead(user.username, row.from_username)
        }
      } else if (payload.eventType === 'UPDATE') {
        setMsgs((prev) => prev.map((x) => (x.id === row.id ? row : x)))
      }
    })
    return () => { alive = false; unsub() }
  }, [user.username])

  // ── Agregados por contato: última mensagem + não lidas ────────────
  const byPeer = useMemo(() => {
    const m = new Map()
    for (const msg of msgs) {
      const other = msg.from_username === user.username ? msg.to_username : msg.from_username
      if (!m.has(other)) m.set(other, { last: null, unread: 0 })
      const e = m.get(other)
      e.last = msg // msgs já vêm em ordem cronológica
      if (msg.to_username === user.username && !msg.read) e.unread++
    }
    return m
  }, [msgs, user.username])
  const totalUnread = [...byPeer.values()].reduce((a, e) => a + e.unread, 0)

  // Contatos ordenados: conversa mais recente primeiro, depois por nome.
  const sortedContacts = useMemo(() => [...contacts].sort((a, b) => {
    const ta = byPeer.get(a.username)?.last?.created_at || ''
    const tb = byPeer.get(b.username)?.last?.created_at || ''
    return tb.localeCompare(ta) || a.name.localeCompare(b.name)
  }), [contacts, byPeer])

  const conversation = useMemo(
    () => (peer ? msgs.filter((m) => m.from_username === peer || m.to_username === peer) : []),
    [msgs, peer],
  )

  // Auto-scroll pro fim quando a conversa muda ou chega mensagem.
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [peer, conversation.length, open])

  function openConversation(username) {
    setPeer(username)
    // Otimista: zera as não-lidas localmente e persiste em background.
    setMsgs((prev) => prev.map((m) => (m.from_username === username && m.to_username === user.username && !m.read ? { ...m, read: true } : m)))
    markConversationRead(user.username, username)
    setTimeout(() => inputRef.current?.focus(), 60)
  }

  function send() {
    const message = text.trim()
    if (!message || !peer) return
    const row = {
      id: uid('msg'),
      from_username: user.username, to_username: peer,
      message, read: false,
      created_at: new Date().toISOString(),
    }
    setMsgs((prev) => [...prev, row]) // otimista; realtime deduplica por id
    setText('')
    sendMessage(row).catch(() => {
      setMsgs((prev) => prev.filter((m) => m.id !== row.id))
      alert('Falha ao enviar a mensagem. Verifique a conexão.')
    })
  }

  const peerInfo = peer ? byUsername[peer] : null

  return (
    <>
      {/* ── Painel ──────────────────────────────────────────────────── */}
      {open && (
        <div
          className="chat-pop clip-notch-tl glass-strong fixed bottom-24 right-5 z-40 flex w-[min(92vw,372px)] flex-col overflow-hidden"
          style={{ height: 'min(70vh, 540px)', boxShadow: '0 24px 60px -18px rgba(0,0,0,0.65), inset 0 0 0 1px rgba(41,206,249,0.28)' }}
        >
          <span className="absolute left-0 top-0 h-1 w-full bg-sky" />
          {/* Cabeçalho */}
          <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--divider)' }}>
            {peerInfo ? (
              <>
                <button onClick={() => setPeer(null)} className="shrink-0 p-1 transition-colors hover:text-sky" style={{ color: 'var(--text-muted)' }} aria-label="Voltar">
                  <ChevronLeft size={18} />
                </button>
                <Avatar name={peerInfo.name} role={peerInfo.role} size={30} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold" style={{ color: 'var(--text)' }}>{peerInfo.name}</p>
                  <p className="condensed text-[9px]" style={{ color: 'var(--text-faint)' }}>{peerInfo.role === 'admin' ? 'Staff' : 'Jogador'}</p>
                </div>
              </>
            ) : (
              <div className="min-w-0 flex-1">
                <p className="display text-lg leading-none" style={{ color: 'var(--text)' }}>Chat da equipe</p>
                <p className="condensed mt-0.5 text-[9px]" style={{ color: 'var(--text-faint)' }}>Mensagens em tempo real</p>
              </div>
            )}
            <button onClick={() => setOpen(false)} className="shrink-0 p-1 transition-colors hover:text-loss" style={{ color: 'var(--text-muted)' }} aria-label="Fechar chat">
              <X size={17} />
            </button>
          </div>

          {/* Corpo */}
          {!peerInfo ? (
            /* Lista de contatos */
            <div className="flex-1 overflow-y-auto py-1">
              {sortedContacts.map((c, i) => {
                const e = byPeer.get(c.username)
                return (
                  <button
                    key={c.username}
                    onClick={() => openConversation(c.username)}
                    className="msg-in flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <Avatar name={c.name} role={c.role} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-semibold" style={{ color: 'var(--text)' }}>{c.name}</span>
                        {e?.last && <span className="shrink-0 text-[9px] tabular-nums" style={{ color: 'var(--text-faint)' }}>{fmtDay(e.last.created_at)}</span>}
                      </div>
                      <p className="truncate text-[11px]" style={{ color: e?.unread ? 'var(--text)' : 'var(--text-faint)', fontWeight: e?.unread ? 600 : 400 }}>
                        {e?.last ? `${e.last.from_username === user.username ? 'Você: ' : ''}${e.last.message}` : 'Iniciar conversa…'}
                      </p>
                    </div>
                    {e?.unread > 0 && (
                      <span className="tag-skew shrink-0 bg-loss text-white"><span>{e.unread}</span></span>
                    )}
                  </button>
                )
              })}
            </div>
          ) : (
            /* Conversa */
            <>
              <div ref={listRef} className="flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
                {conversation.length === 0 && (
                  <p className="py-10 text-center text-xs" style={{ color: 'var(--text-faint)' }}>
                    Sem mensagens ainda. Diga oi pra {peerInfo.name}! 👋
                  </p>
                )}
                {conversation.map((m, i) => {
                  const mine = m.from_username === user.username
                  const prev = conversation[i - 1]
                  const newDay = !prev || fmtDay(prev.created_at) !== fmtDay(m.created_at)
                  return (
                    <div key={m.id}>
                      {newDay && (
                        <div className="my-2 flex items-center gap-2">
                          <span className="h-px flex-1" style={{ background: 'var(--divider)' }} />
                          <span className="condensed text-[9px]" style={{ color: 'var(--text-faint)' }}>{fmtDay(m.created_at)}</span>
                          <span className="h-px flex-1" style={{ background: 'var(--divider)' }} />
                        </div>
                      )}
                      <div className={cx('msg-in flex', mine ? 'justify-end' : 'justify-start')}>
                        <div
                          className={cx('clip-notch max-w-[78%] px-3 py-2', mine ? 'text-ink-900' : '')}
                          style={mine
                            ? { background: 'var(--accent)' }
                            : { background: 'var(--card-bg-soft)', boxShadow: 'inset 0 0 0 1px var(--card-border)', color: 'var(--text)' }}
                        >
                          <p className="whitespace-pre-wrap break-words text-[13px] leading-snug">{m.message}</p>
                          <p className={cx('mt-0.5 text-right text-[9px] tabular-nums', mine ? 'text-ink-900/60' : '')} style={mine ? {} : { color: 'var(--text-faint)' }}>
                            {fmtTime(m.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* Input */}
              <div className="flex items-center gap-2 border-t px-3 py-2.5" style={{ borderColor: 'var(--divider)' }}>
                <input
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') send() }}
                  placeholder={`Mensagem para ${peerInfo.name}…`}
                  className="field flex-1 py-2 text-sm"
                />
                <button
                  onClick={send}
                  disabled={!text.trim()}
                  className="btn-primary shrink-0 !px-3 !py-2.5"
                  aria-label="Enviar"
                >
                  <Send size={15} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Botão flutuante ─────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="clip-notch fixed bottom-6 right-5 z-40 flex h-13 w-13 items-center justify-center p-3.5 text-ink-900 transition-all duration-200 hover:scale-105 active:scale-95"
        style={{ background: 'var(--accent)', filter: 'drop-shadow(0 10px 24px rgba(41,206,249,0.45))' }}
        aria-label={open ? 'Fechar chat' : 'Abrir chat'}
        title="Chat da equipe"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {!open && totalUnread > 0 && (
          <span className="tag-skew absolute -right-1.5 -top-1.5 bg-loss text-white shadow-glow-loss">
            <span>{totalUnread > 9 ? '9+' : totalUnread}</span>
          </span>
        )}
      </button>
    </>
  )
}
