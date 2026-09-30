import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  KEYS, load, seedBlocks, seedEvents, makeBlock, makeGame,
} from '../lib/storage.js'
import { fetchAll, upsertDoc, removeDoc, clearTable, subscribeTable } from '../lib/db.js'
import { DEFAULT_CHAMPIONS } from '../data/champions.js'
import { DEFAULT_TEAMS, normName, playerForRole } from '../data/teams.js'
import { DEFAULT_ROSTER, DEFAULT_EVENT_TYPES, OUR_TEAM, ROLES } from '../data/constants.js'
import { uid } from '../lib/utils.js'

const AppContext = createContext(null)

// Paleta de fallback para times auto-registrados (sem cor definida).
const AUTO_COLORS = [
  ['#FF1B48', '#FF6B8A'], ['#22C55E', '#86EFAC'], ['#9B00FF', '#C77DFF'],
  ['#F59E0B', '#FCD34D'], ['#00AEFF', '#7DD3FC'], ['#EC4899', '#F9A8D4'],
]
function autoTeam(name) {
  const [primary, accent] = AUTO_COLORS[Math.floor(Math.random() * AUTO_COLORS.length)]
  return {
    id: uid('team'),
    name,
    abbr: name.trim().slice(0, 4).toUpperCase(),
    primary, accent,
    logo: null,
    contact: '',
    tag: '',
  }
}

// Normaliza os times na 1ª importação p/ a nuvem (migrações antigas + backfill).
function normalizeInitialTeams(teams, blocks) {
  let next = teams.map((t) => (t.id === 'einerd' && t.abbr === 'EIN') ? { ...t, abbr: 'NERD' } : t)
  next = next.map((t) => {
    if (t.id !== 'einerd' || t.players) return t
    const players = ROLES
      .map((r) => ({ id: uid('ply'), name: DEFAULT_ROSTER[r] || '', role: r }))
      .filter((p) => p.name)
    return { ...t, players }
  })
  const existing = new Set(next.map((t) => normName(t.name)))
  for (const b of blocks) {
    const key = normName(b.opponent)
    if (!key || key === normName(OUR_TEAM) || existing.has(key)) continue
    existing.add(key)
    next.push(autoTeam(b.opponent))
  }
  return next
}

function Loader() {
  return (
    <div className="flex h-screen items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="clip-notch-tl flex h-14 w-14 items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#2E4BFF,#29CEF9)' }}>
          <span className="font-display text-2xl text-white">E</span>
        </div>
        <p className="condensed text-[11px] animate-pulse" style={{ color: 'var(--text-muted)' }}>
          Sincronizando com a nuvem…
        </p>
      </div>
    </div>
  )
}

export function AppProvider({ children }) {
  const [blocks, setBlocks]                 = useState([])
  const [events, setEvents]                 = useState([])
  const [teams, setTeams]                   = useState([])
  const [champOverrides, setChampOverrides] = useState([]) // customizações; base é DEFAULT_CHAMPIONS
  const [eventTypeOverrides, setEventTypeOverrides] = useState([]) // customizações; base é DEFAULT_EVENT_TYPES
  const [ready, setReady]                   = useState(false)

  // Refs para leitura do estado atual dentro de callbacks estáveis.
  const teamsRef = useRef(teams);   useEffect(() => { teamsRef.current = teams }, [teams])
  const blocksRef = useRef(blocks); useEffect(() => { blocksRef.current = blocks }, [blocks])
  const eventsRef = useRef(events); useEffect(() => { eventsRef.current = events }, [events])

  // ── Escrita persistente (debounce por documento) ─────────────────
  const writeTimers = useRef({})
  const writeDoc = useCallback((table, obj) => {
    const key = `${table}:${obj.id}`
    clearTimeout(writeTimers.current[key])
    writeTimers.current[key] = setTimeout(() => { upsertDoc(table, obj.id, obj) }, 350)
  }, [])
  const deleteNow = useCallback((table, id) => {
    clearTimeout(writeTimers.current[`${table}:${id}`])
    removeDoc(table, id)
  }, [])

  // ── Mutadores locais + persistência ──────────────────────────────
  const upsertTeamLocal = useCallback((team) => {
    setTeams((prev) => prev.some((t) => t.id === team.id)
      ? prev.map((t) => t.id === team.id ? team : t)
      : [...prev, team])
    writeDoc('teams', team)
  }, [writeDoc])
  const removeTeamLocal = useCallback((id) => {
    setTeams((prev) => prev.filter((t) => t.id !== id)); deleteNow('teams', id)
  }, [deleteNow])

  const upsertBlockLocal = useCallback((block, { prepend = false } = {}) => {
    setBlocks((prev) => prev.some((b) => b.id === block.id)
      ? prev.map((b) => b.id === block.id ? block : b)
      : (prepend ? [block, ...prev] : [...prev, block]))
    writeDoc('blocks', block)
  }, [writeDoc])
  const removeBlockLocal = useCallback((id) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id)); deleteNow('blocks', id)
  }, [deleteNow])

  const upsertEventLocal = useCallback((evt) => {
    setEvents((prev) => prev.some((e) => e.id === evt.id)
      ? prev.map((e) => e.id === evt.id ? evt : e)
      : [...prev, evt])
    writeDoc('events', evt)
  }, [writeDoc])
  const removeEventLocal = useCallback((id) => {
    setEvents((prev) => prev.filter((e) => e.id !== id)); deleteNow('events', id)
  }, [deleteNow])

  // ── Carga inicial + importação/seed + realtime ───────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [teamRows, blockRows, eventRows, champRows, eventTypeRows] = await Promise.all([
        fetchAll('teams'), fetchAll('blocks'), fetchAll('events'), fetchAll('champions'), fetchAll('event_types'),
      ])
      if (cancelled) return

      let t = teamRows.map((r) => r.data)
      let b = blockRows.map((r) => r.data)
      let e = eventRows.map((r) => r.data)
      const overrides = champRows.map((r) => r.data)
      const etOverrides = eventTypeRows.map((r) => r.data)

      // Nuvem vazia → importa do LocalStorage (migração) ou semeia demo.
      if (t.length === 0 && b.length === 0 && e.length === 0) {
        const localTeams  = load(KEYS.teams, null)
        const localBlocks = load(KEYS.blocks, null)
        const localEvents = load(KEYS.events, null)
        if (localTeams || localBlocks || localEvents) {
          b = localBlocks || []
          e = localEvents || []
          t = normalizeInitialTeams(localTeams || DEFAULT_TEAMS, b)
        } else {
          t = DEFAULT_TEAMS
          b = seedBlocks()
          e = seedEvents()
        }
        await Promise.all([
          ...t.map((x) => upsertDoc('teams', x.id, x)),
          ...b.map((x) => upsertDoc('blocks', x.id, x)),
          ...e.map((x) => upsertDoc('events', x.id, x)),
        ])
      }

      if (cancelled) return
      setTeams(t); setBlocks(b); setEvents(e); setChampOverrides(overrides); setEventTypeOverrides(etOverrides)
      setReady(true)
    })()
    return () => { cancelled = true }
  }, [])

  // Realtime: reflete mudanças de outros clientes (e ecoa as próprias).
  useEffect(() => {
    // Fábrica de handler: dado um setState, devolve a função que aplica o
    // evento recebido do Supabase na lista correspondente.
    //   • DELETE → remove o item pelo id (que vem em payload.old).
    //   • INSERT/UPDATE → insere ou substitui o item (o objeto vem em payload.new.data).
    const applyDoc = (setter) => (payload) => {
      if (payload.eventType === 'DELETE') {
        const id = payload.old?.id
        setter((prev) => prev.filter((x) => x.id !== id))
      } else {
        const doc = payload.new?.data
        if (!doc) return
        setter((prev) => prev.some((x) => x.id === doc.id)
          ? prev.map((x) => x.id === doc.id ? doc : x)
          : [...prev, doc])
      }
    }
    // Assina cada tabela "documento". `champions` usa o mesmo handler, apontando
    // para a lista de overrides (customizações da nuvem).
    const unsubs = [
      subscribeTable('teams', applyDoc(setTeams)),
      subscribeTable('blocks', applyDoc(setBlocks)),
      subscribeTable('events', applyDoc(setEvents)),
      subscribeTable('champions', applyDoc(setChampOverrides)),
      subscribeTable('event_types', applyDoc(setEventTypeOverrides)),
    ]
    // Cleanup: cancela todas as assinaturas ao desmontar.
    return () => unsubs.forEach((u) => u())
  }, [])

  // ── Campeões: base (código) + overrides (nuvem) ──────────────────
  const champions = useMemo(() => {
    const map = new Map(DEFAULT_CHAMPIONS.map((c) => [c.id, c]))
    for (const ov of champOverrides) {
      if (ov?._deleted) map.delete(ov.id)
      else if (ov?.id) map.set(ov.id, ov)
    }
    return [...map.values()]
  }, [champOverrides])

  const championById = useMemo(() => {
    const m = new Map()
    champions.forEach((c) => m.set(c.id, c))
    return m
  }, [champions])
  const championByIdRef = useRef(championById)
  useEffect(() => { championByIdRef.current = championById }, [championById])

  // ── Categorias do calendário: base (código) + overrides (nuvem) ──
  const eventTypes = useMemo(() => {
    const map = new Map(DEFAULT_EVENT_TYPES.map((t) => [t.id, t]))
    for (const ov of eventTypeOverrides) {
      if (ov?._deleted) map.delete(ov.id)
      else if (ov?.id) map.set(ov.id, ov)
    }
    return [...map.values()]
  }, [eventTypeOverrides])

  // ── Times (helpers internos) ─────────────────────────────────────
  const ensureTeam = useCallback((name, patch = {}) => {
    if (!name || normName(name) === normName(OUR_TEAM)) return
    const found = teamsRef.current.find((t) => normName(t.name) === normName(name))
    if (found) {
      const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v != null && v !== ''))
      if (Object.keys(clean).length) upsertTeamLocal({ ...found, ...clean })
    } else {
      upsertTeamLocal({ ...autoTeam(name), ...patch })
    }
  }, [upsertTeamLocal])

  // ── Blocos ────────────────────────────────────────────────────────
  const createBlock = useCallback(({ opponent, date, gamesCount, ourSide, tag, contact }) => {
    const block = makeBlock({ opponent, date, gamesCount, ourSide })
    const einerd = teamsRef.current.find((t) => t.id === 'einerd')
    block.games.forEach((g) => {
      const us = g[g.ourSide]
      us.picks.forEach((p) => { p.player = playerForRole(einerd, p.role) })
    })
    upsertBlockLocal(block, { prepend: true })
    ensureTeam(opponent, { tag, contact })
    return block
  }, [ensureTeam, upsertBlockLocal])

  const updateBlock = useCallback((blockId, patch) => {
    const b = blocksRef.current.find((x) => x.id === blockId)
    if (!b) return
    upsertBlockLocal({ ...b, ...patch, updatedAt: Date.now() })
  }, [upsertBlockLocal])

  const renameBlockOpponent = useCallback((blockId, newName) => {
    const name = (newName || '').trim()
    if (!name) return
    const b = blocksRef.current.find((x) => x.id === blockId)
    if (!b) return
    const games = b.games.map((g) => {
      const theirSide = g.ourSide === 'blue' ? 'red' : 'blue'
      return { ...g, [theirSide]: { ...g[theirSide], team: name } }
    })
    upsertBlockLocal({ ...b, opponent: name, games, updatedAt: Date.now() })
    ensureTeam(name)
  }, [ensureTeam, upsertBlockLocal])

  const resizeBlockGames = useCallback((blockId, newCount) => {
    const b = blocksRef.current.find((x) => x.id === blockId)
    if (!b) return
    const n = Math.max(1, Math.min(9, Number(newCount) || b.gamesCount))
    if (n === b.games.length) { upsertBlockLocal({ ...b, gamesCount: n }); return }
    let games = [...b.games].sort((a, c) => a.index - c.index)
    if (n > games.length) {
      const ourSide = games[0]?.ourSide || 'blue'
      const einerd = teamsRef.current.find((t) => t.id === 'einerd')
      const extra = Array.from({ length: n - games.length }, (_, i) => {
        const g = makeGame(games.length + i + 1, ourSide, b.opponent)
        const us = g[g.ourSide]
        us.picks.forEach((p) => { p.player = playerForRole(einerd, p.role) })
        return g
      })
      games = [...games, ...extra]
    } else {
      games = games.slice(0, n)
    }
    upsertBlockLocal({ ...b, games, gamesCount: n, updatedAt: Date.now() })
  }, [upsertBlockLocal])

  const deleteBlock = useCallback((blockId) => {
    const blk = blocksRef.current.find((b) => b.id === blockId)
    removeBlockLocal(blockId)
    for (const e of eventsRef.current) {
      if (e.linkedBlockId === blockId) { removeEventLocal(e.id); continue }
      if (!e.linkedBlockId && e.type === 'scrim' && blk && e.title === blk.opponent && e.date === blk.date) removeEventLocal(e.id)
    }
  }, [removeBlockLocal, removeEventLocal])

  const updateGame = useCallback((blockId, gameId, updater) => {
    const b = blocksRef.current.find((x) => x.id === blockId)
    if (!b) return
    const games = b.games.map((g) => g.id === gameId ? updater({ ...g }) : g)
    upsertBlockLocal({ ...b, games, updatedAt: Date.now() })
  }, [upsertBlockLocal])

  const setPick = useCallback((blockId, gameId, side, slot, championId) => {
    updateGame(blockId, gameId, (g) => {
      const picks = g[side].picks.map((p, i) => i === slot ? { ...p, championId } : p)
      return { ...g, [side]: { ...g[side], picks } }
    })
  }, [updateGame])

  const setPickRole = useCallback((blockId, gameId, side, slot, role) => {
    updateGame(blockId, gameId, (g) => {
      const picks = g[side].picks.map((p, i) => i === slot ? { ...p, role } : p)
      return { ...g, [side]: { ...g[side], picks } }
    })
  }, [updateGame])

  const setBan = useCallback((blockId, gameId, side, slot, championId) => {
    updateGame(blockId, gameId, (g) => {
      const bans = g[side].bans.map((b, i) => i === slot ? championId : b)
      return { ...g, [side]: { ...g[side], bans } }
    })
  }, [updateGame])

  const setGameMeta = useCallback((blockId, gameId, patch) => {
    updateGame(blockId, gameId, (g) => ({ ...g, ...patch }))
  }, [updateGame])

  const swapSide = useCallback((blockId, gameId) => {
    updateGame(blockId, gameId, (g) => ({
      ...g,
      ourSide: g.ourSide === 'blue' ? 'red' : 'blue',
      blue: g.red,
      red: g.blue,
    }))
  }, [updateGame])

  // ── Eventos ───────────────────────────────────────────────────────
  const createEvent = useCallback((evt) => {
    const id = uid('evt')
    let linkedBlockId = null
    if (evt.type === 'scrim' && evt.title?.trim()) {
      const block = createBlock({ opponent: evt.title.trim(), date: evt.date, gamesCount: 5, ourSide: 'blue' })
      linkedBlockId = block.id
    }
    upsertEventLocal({ id, notes: '', ...evt, linkedBlockId })
  }, [createBlock, upsertEventLocal])

  const updateEvent = useCallback((id, patch) => {
    const e = eventsRef.current.find((x) => x.id === id)
    if (!e) return
    upsertEventLocal({ ...e, ...patch })
  }, [upsertEventLocal])

  const deleteEvent = useCallback((id) => {
    const ev = eventsRef.current.find((e) => e.id === id)
    removeEventLocal(id)
    if (!ev) return
    if (ev.linkedBlockId) removeBlockLocal(ev.linkedBlockId)
    else if (ev.type === 'scrim') {
      const blk = blocksRef.current.find((b) => b.opponent === ev.title && b.date === ev.date)
      if (blk) removeBlockLocal(blk.id)
    }
  }, [removeEventLocal, removeBlockLocal])

  // ── Campeões ─────────────────────────────────────────────────────
  const addChampion = useCallback(({ name, abbr, role, img }) => {
    const champ = {
      id: uid('champ'),
      name,
      abbr: abbr?.toUpperCase() || name.slice(0, 3).toUpperCase(),
      role: role || '',
      ddragonKey: null,
      img: img || null,
    }
    setChampOverrides((prev) => [...prev, champ])
    writeDoc('champions', champ)
  }, [writeDoc])

  const updateChampion = useCallback((id, patch) => {
    const current = championByIdRef.current.get(id)
    if (!current) return
    const merged = { ...current, ...patch }
    setChampOverrides((prev) => prev.some((o) => o.id === id)
      ? prev.map((o) => o.id === id ? merged : o)
      : [...prev, merged])
    writeDoc('champions', merged)
  }, [writeDoc])

  const deleteChampion = useCallback((id) => {
    const tomb = { id, _deleted: true }
    setChampOverrides((prev) => [...prev.filter((o) => o.id !== id), tomb])
    writeDoc('champions', tomb)
  }, [writeDoc])

  const resetChampions = useCallback(() => {
    setChampOverrides([])
    clearTable('champions')
  }, [])

  // ── Categorias do calendário (CRUD público) ───────────────────────
  const addEventType = useCallback(({ label, color }) => {
    const type = { id: uid('etype'), label: label?.trim() || 'Categoria', color: color || '#94A0C0' }
    setEventTypeOverrides((prev) => [...prev, type])
    writeDoc('event_types', type)
    return type
  }, [writeDoc])

  const updateEventType = useCallback((id, patch) => {
    const current = eventTypes.find((t) => t.id === id)
    if (!current) return
    const merged = { ...current, ...patch }
    setEventTypeOverrides((prev) => prev.some((o) => o.id === id)
      ? prev.map((o) => o.id === id ? merged : o)
      : [...prev, merged])
    writeDoc('event_types', merged)
  }, [eventTypes, writeDoc])

  // 'scrim' é especial: createEvent/deleteEvent criam/removem um bloco
  // automático no Histórico quando o tipo é esse — excluir a categoria
  // quebraria essa ligação, então só permitimos renomear/recolorir.
  // Também recusa excluir categorias com eventos ainda usando elas (evita
  // ficar evento "órfão" apontando pra um tipo inexistente).
  const deleteEventType = useCallback((id) => {
    if (id === 'scrim') return false
    if (eventsRef.current.some((e) => e.type === id)) return false
    const tomb = { id, _deleted: true }
    setEventTypeOverrides((prev) => [...prev.filter((o) => o.id !== id), tomb])
    writeDoc('event_types', tomb)
    return true
  }, [writeDoc])

  // ── Times (CRUD público) ─────────────────────────────────────────
  const createTeam = useCallback((team) => {
    upsertTeamLocal({ contact: '', tag: '', ...team, id: uid('team') })
  }, [upsertTeamLocal])

  const updateTeam = useCallback((id, patch) => {
    const t = teamsRef.current.find((x) => x.id === id)
    if (!t) return
    upsertTeamLocal({ ...t, ...patch })
  }, [upsertTeamLocal])

  const deleteTeam = useCallback((id) => { removeTeamLocal(id) }, [removeTeamLocal])

  const value = useMemo(() => ({
    blocks, events, champions, championById, teams, eventTypes,
    createBlock, updateBlock, deleteBlock, updateGame,
    renameBlockOpponent, resizeBlockGames,
    setPick, setPickRole, setBan, setGameMeta, swapSide,
    createEvent, updateEvent, deleteEvent,
    addChampion, updateChampion, deleteChampion, resetChampions,
    addEventType, updateEventType, deleteEventType,
    createTeam, updateTeam, deleteTeam, ensureTeam,
  }), [
    blocks, events, champions, championById, teams, eventTypes,
    createBlock, updateBlock, deleteBlock, updateGame,
    renameBlockOpponent, resizeBlockGames,
    setPick, setPickRole, setBan, setGameMeta, swapSide,
    createEvent, updateEvent, deleteEvent,
    addChampion, updateChampion, deleteChampion, resetChampions,
    addEventType, updateEventType, deleteEventType,
    createTeam, updateTeam, deleteTeam, ensureTeam,
  ])

  return (
    <AppContext.Provider value={value}>
      {ready ? children : <Loader />}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp deve ser usado dentro de <AppProvider>')
  return ctx
}
