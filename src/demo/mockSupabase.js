// ═══════════════════════════════════════════════════════════════════
// Supabase de mentira para o MODO DEMO.
//
// Imita a parte do supabase-js que o app usa (from/select/filtros/insert/
// update/upsert/delete, realtime, auth, rpc, storage), mas sobre um banco
// em memória. Não tem URL nem chave: é impossível a demo encostar no
// Supabase de verdade.
//
// Peças:
//   • createQueryBuilder  — monta a consulta como um objeto simples.
//   • runQuery            — executa a consulta sobre { tabela: linhas[] }.
//   • createMockClient    — o "client" em si; recebe o executor (local ou
//                           remoto) e emite os eventos de realtime.
//   • createLocalDb       — banco em memória com cópia no localStorage.
// ═══════════════════════════════════════════════════════════════════

const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)))

export function uuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

// ── Comparações no estilo Postgres ─────────────────────────────────
function igual(a, b) {
  if (a === b) return true
  if (a == null || b == null) return false
  return String(a) === String(b)
}

function comparar(a, b) {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b)
  const na = Number(a), nb = Number(b)
  if (a !== '' && b !== '' && !Number.isNaN(na) && !Number.isNaN(nb) && typeof a !== 'string') return na - nb
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0
}

function likeParaRegex(padrao, flags) {
  const esc = String(padrao).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.')
  return new RegExp(`^${esc}$`, flags)
}

function valorLiteral(v) {
  if (v === 'null') return null
  if (v === 'true') return true
  if (v === 'false') return false
  return v
}

function testar(row, { col, op, val }) {
  const v = row[col]
  switch (op) {
    case 'eq': return igual(v, val)
    case 'neq': return !igual(v, val)
    case 'gt': return v != null && comparar(v, val) > 0
    case 'gte': return v != null && comparar(v, val) >= 0
    case 'lt': return v != null && comparar(v, val) < 0
    case 'lte': return v != null && comparar(v, val) <= 0
    case 'in': return (val || []).some((x) => igual(v, x))
    case 'is': return val === null ? v == null : v === val
    case 'like': return v != null && likeParaRegex(val).test(String(v))
    case 'ilike': return v != null && likeParaRegex(val, 'i').test(String(v))
    case 'contains':
      if (Array.isArray(v)) return [].concat(val).every((x) => v.some((y) => igual(x, y)))
      return false
    default: throw new Error(`[demo] filtro não suportado: ${op}`)
  }
}

// Divide por vírgula respeitando parênteses: "a.eq.1,b.in.(2,3)".
function dividirTopo(s) {
  const partes = []
  let prof = 0, atual = ''
  for (const ch of s) {
    if (ch === '(') prof++
    if (ch === ')') prof--
    if (ch === ',' && prof === 0) { partes.push(atual); atual = '' } else atual += ch
  }
  if (atual) partes.push(atual)
  return partes.map((p) => p.trim()).filter(Boolean)
}

function parseCondicao(txt) {
  const [col, op, ...resto] = txt.split('.')
  let raw = resto.join('.')
  if (op === 'not') {
    const [op2, ...r2] = raw.split('.')
    return { not: true, ...parseCondicao(`${col}.${op2}.${r2.join('.')}`) }
  }
  if (op === 'in') {
    raw = raw.replace(/^\(|\)$/g, '')
    return { col, op, val: dividirTopo(raw).map((x) => valorLiteral(x.replace(/^"|"$/g, ''))) }
  }
  return { col, op, val: valorLiteral(raw) }
}

function aplicaFiltro(row, f) {
  if (f.or) return f.or.some((c) => (c.not ? !testar(row, c) : testar(row, c)))
  const ok = testar(row, f)
  return f.not ? !ok : ok
}

function projetar(row, cols) {
  if (!cols || cols === '*') return clone(row)
  const out = {}
  for (const c of cols.split(',').map((x) => x.trim()).filter(Boolean)) {
    if (c === '*') Object.assign(out, clone(row))
    else out[c] = clone(row[c] ?? null)
  }
  return out
}

function chaveDe(row, pk) {
  return [].concat(pk).map((k) => String(row[k])).join('\u0000')
}

// ── Executor: roda uma consulta sobre as tabelas em memória ─────────
// `cfg` = { primaryKeys: { tabela: 'id' | ['a','b'] }, defaults(tabela, row),
//          touch(tabela, row), views: { view: 'tabela_base' } }
// Devolve { data, error, count, changes } — `changes` alimenta o realtime.
export function runQuery(tables, q0, cfg = {}) {
  // View = leitura de outra tabela (ex.: perfis_visiveis → profiles).
  const q = cfg.views?.[q0.table] ? { ...q0, table: cfg.views[q0.table] } : q0
  const pk = cfg.primaryKeys?.[q.table] || 'id'
  if (!tables[q.table]) tables[q.table] = []
  const linhas = tables[q.table]
  const filtradas = () => linhas.filter((r) => q.filters.every((f) => aplicaFiltro(r, f)))
  const changes = []
  let result

  if (q.op === 'select') {
    result = filtradas()
  } else if (q.op === 'insert' || q.op === 'upsert') {
    const novas = [].concat(q.values || [])
    const conflito = q.onConflict ? q.onConflict.split(',').map((s) => s.trim()) : pk
    result = []
    for (const v of novas) {
      const base = { ...clone(v) }
      const existente = q.op === 'upsert' ? linhas.find((r) => chaveDe(r, conflito) === chaveDe(base, conflito)) : null
      if (existente) {
        if (q.ignoreDuplicates) continue
        const antes = clone(existente)
        Object.assign(existente, base)
        changes.push({ eventType: 'UPDATE', new: clone(existente), old: antes })
        result.push(existente)
      } else {
        const row = cfg.defaults ? cfg.defaults(q.table, base) : base
        if ([].concat(pk).includes('id') && row.id == null) row.id = uuid()
        if (q.op === 'insert' && linhas.some((r) => chaveDe(r, pk) === chaveDe(row, pk))) {
          return { data: null, error: { code: '23505', message: `duplicate key value violates unique constraint "${q.table}_pkey"` }, count: null, changes: [] }
        }
        linhas.push(row)
        changes.push({ eventType: 'INSERT', new: clone(row), old: {} })
        result.push(row)
      }
    }
  } else if (q.op === 'update') {
    result = filtradas()
    for (const r of result) {
      const antes = clone(r)
      Object.assign(r, clone(q.values))
      if (cfg.touch) cfg.touch(q.table, r)
      changes.push({ eventType: 'UPDATE', new: clone(r), old: antes })
    }
  } else if (q.op === 'delete') {
    result = filtradas()
    const fora = new Set(result)
    tables[q.table] = linhas.filter((r) => !fora.has(r))
    for (const r of result) changes.push({ eventType: 'DELETE', new: {}, old: clone(r) })
  } else {
    throw new Error(`[demo] operação não suportada: ${q.op}`)
  }

  // select "puro" e mutações com .select() devolvem linhas; as demais, null.
  const devolve = q.op === 'select' || q.returning
  let rows = result
  for (const o of [...(q.orders || [])].reverse()) {
    rows = [...rows].sort((a, b) => {
      const c = comparar(a[o.col], b[o.col])
      const nulos = (a[o.col] == null) !== (b[o.col] == null)
      if (nulos) {
        const nullsFirst = o.nullsFirst ?? !o.ascending
        return (a[o.col] == null ? -1 : 1) * (nullsFirst ? 1 : -1)
      }
      return o.ascending ? c : -c
    })
  }
  const count = rows.length
  if (q.range) rows = rows.slice(q.range[0], q.range[1] + 1)
  if (q.limit != null) rows = rows.slice(0, q.limit)
  rows = rows.map((r) => projetar(r, q.cols))

  let data = devolve ? rows : null
  if (q.head) data = null
  if (devolve && (q.single || q.maybeSingle)) {
    if (rows.length > 1 || (q.single && rows.length === 0)) {
      return {
        data: null, count,
        error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' },
        changes: q.op === 'select' ? [] : changes.map((c) => ({ ...c, table: q.table })),
      }
    }
    data = rows[0] ?? null
  }
  return { data, error: null, count: q.count ? count : null, changes: changes.map((c) => ({ ...c, table: q.table })) }
}

// ── Construtor de consultas (API igual à do supabase-js) ───────────
/** @returns {any} */
function createQueryBuilder(table, executar) {
  const q = { table, op: 'select', cols: '*', filters: [], orders: [], limit: null, range: null }
  const b = {
    select(cols = '*', opts = {}) {
      if (q.op === 'select') q.cols = cols
      else { q.returning = true; q.cols = cols }
      if (opts.count) q.count = opts.count
      if (opts.head) q.head = true
      return b
    },
    insert(values, opts = {}) { q.op = 'insert'; q.values = values; if (opts.count) q.count = opts.count; return b },
    upsert(values, opts = {}) {
      q.op = 'upsert'; q.values = values
      q.onConflict = opts.onConflict; q.ignoreDuplicates = opts.ignoreDuplicates
      return b
    },
    update(values) { q.op = 'update'; q.values = values; return b },
    delete() { q.op = 'delete'; return b },
    eq(col, val) { q.filters.push({ col, op: 'eq', val }); return b },
    neq(col, val) { q.filters.push({ col, op: 'neq', val }); return b },
    gt(col, val) { q.filters.push({ col, op: 'gt', val }); return b },
    gte(col, val) { q.filters.push({ col, op: 'gte', val }); return b },
    lt(col, val) { q.filters.push({ col, op: 'lt', val }); return b },
    lte(col, val) { q.filters.push({ col, op: 'lte', val }); return b },
    like(col, val) { q.filters.push({ col, op: 'like', val }); return b },
    ilike(col, val) { q.filters.push({ col, op: 'ilike', val }); return b },
    in(col, vals) { q.filters.push({ col, op: 'in', val: [...vals] }); return b },
    is(col, val) { q.filters.push({ col, op: 'is', val }); return b },
    contains(col, val) { q.filters.push({ col, op: 'contains', val }); return b },
    match(obj) { for (const [c, v] of Object.entries(obj)) b.eq(c, v); return b },
    not(col, op, val) {
      const f = op === 'in' ? parseCondicao(`${col}.in.${val}`) : { col, op, val }
      q.filters.push({ ...f, not: true }); return b
    },
    filter(col, op, val) { q.filters.push(parseCondicao(`${col}.${op}.${val}`)); return b },
    or(txt) { q.filters.push({ or: dividirTopo(txt).map(parseCondicao) }); return b },
    order(col, opts = {}) { q.orders.push({ col, ascending: opts.ascending !== false, nullsFirst: opts.nullsFirst }); return b },
    limit(n) { q.limit = n; return b },
    range(from, to) { q.range = [from, to]; return b },
    single() { q.single = true; return b },
    maybeSingle() { q.maybeSingle = true; return b },
    abortSignal() { return b },
    throwOnError() { q.throwOnError = true; return b },
    returns() { return b },
    then(ok, fail) {
      return Promise.resolve()
        .then(() => executar(clone(q)))
        .then((r) => {
          if (q.throwOnError && r.error) throw r.error
          return { data: r.data, error: r.error, count: r.count ?? null, status: r.error ? 400 : 200, statusText: r.error ? 'Bad Request' : 'OK' }
        })
        .then(ok, fail)
    },
    catch(fail) { return b.then(undefined, fail) },
    finally(fn) { return b.then((v) => { fn(); return v }, (e) => { fn(); throw e }) },
  }
  return b
}

// ── O client ───────────────────────────────────────────────────────
// `execute(q)` → Promise<{ data, error, count, changes }>
// `user`       → usuário demo (objeto do auth) ou null
// `rpc`        → { nome: async (args) => ({ data, error }) }
/**
 * @param {{ execute: (q: any) => Promise<any>, user?: any, rpc?: Record<string, (args: any, ctx: any) => Promise<any>>, storageMessage?: string }} opts
 */
export function createMockClient({ execute, user = null, rpc = {}, storageMessage }) {
  const canais = new Set()

  function emitir(changes = []) {
    for (const ch of changes) {
      for (const canal of canais) {
        for (const h of canal.handlers) {
          const f = h.filter || {}
          if (f.table && f.table !== ch.table) continue
          if (f.event && f.event !== '*' && f.event !== ch.eventType) continue
          const payload = {
            schema: f.schema || 'public', table: ch.table, eventType: ch.eventType,
            new: ch.new, old: ch.old, commit_timestamp: new Date().toISOString(), errors: null,
          }
          // Assíncrono, como o realtime de verdade (chega depois da resposta).
          setTimeout(() => { try { h.cb(payload) } catch (e) { console.error('[demo] realtime', e) } }, 30)
        }
      }
    }
  }

  const executar = async (q) => {
    const r = await execute(q)
    if (!r.error && r.changes?.length) emitir(r.changes)
    return r
  }

  const sessao = user ? { access_token: 'demo', token_type: 'bearer', user } : null
  const erroStorage = { message: storageMessage || 'Envio de arquivos desativado na demonstração.' }

  return {
    __demo: true,
    from: (table) => createQueryBuilder(table, executar),
    schema: () => ({ from: (table) => createQueryBuilder(table, executar) }),
    async rpc(nome, args) {
      const fn = rpc[nome]
      if (!fn) return { data: null, error: { message: `[demo] rpc ${nome} indisponível` } }
      const r = await fn(args, { from: (t) => createQueryBuilder(t, executar) })
      return { data: r?.data ?? null, error: r?.error ?? null }
    },
    channel(name) {
      const canal = {
        name, handlers: [],
        on(tipo, filter, cb) { if (tipo === 'postgres_changes') canal.handlers.push({ filter, cb }); return canal },
        subscribe(cb) { canais.add(canal); if (cb) setTimeout(() => cb('SUBSCRIBED'), 0); return canal },
        unsubscribe() { canais.delete(canal); return Promise.resolve('ok') },
        send() { return Promise.resolve('ok') },
        track() { return Promise.resolve('ok') },
        untrack() { return Promise.resolve('ok') },
        presenceState() { return {} },
      }
      return canal
    },
    removeChannel(canal) { canais.delete(canal); return Promise.resolve('ok') },
    removeAllChannels() { canais.clear(); return Promise.resolve([]) },
    getChannels() { return [...canais] },
    auth: {
      async getUser() { return { data: { user }, error: user ? null : { message: 'sem sessão' } } },
      async getSession() { return { data: { session: sessao }, error: null } },
      async getClaims() { return { data: user ? { claims: { sub: user.id, email: user.email, role: 'authenticated' } } : null, error: null } },
      async signOut() { return { error: null } },
      async signInWithOAuth() { return { data: null, error: { message: 'Login desativado na demonstração.' } } },
      async signInWithPassword() { return { data: null, error: { message: 'Login desativado na demonstração.' } } },
      async exchangeCodeForSession() { return { data: { session: sessao }, error: null } },
      onAuthStateChange(cb) {
        setTimeout(() => cb('INITIAL_SESSION', sessao), 0)
        return { data: { subscription: { unsubscribe() {} } } }
      },
    },
    storage: {
      from() {
        return {
          async upload() { return { data: null, error: erroStorage } },
          async remove() { return { data: [], error: null } },
          async createSignedUrl() { return { data: null, error: erroStorage } },
          getPublicUrl() { return { data: { publicUrl: '' } } },
          async download() { return { data: null, error: erroStorage } },
          async list() { return { data: [], error: null } },
        }
      },
    },
  }
}

// ── Banco local (navegador): memória + cópia no localStorage ───────
// `seed()` monta o estado inicial. `persistKey` guarda as mudanças do
// visitante; `reset()` volta ao seed.
export function createLocalDb({ seed, persistKey, cfg = {} }) {
  let tables = null
  const carregar = () => {
    if (tables) return tables
    try {
      const salvo = persistKey && globalThis.localStorage?.getItem(persistKey)
      if (salvo) tables = JSON.parse(salvo)
    } catch { /* ignora — cai no seed */ }
    if (!tables) tables = seed()
    return tables
  }
  let timer = null
  const persistir = () => {
    if (!persistKey) return
    clearTimeout(timer)
    timer = setTimeout(() => {
      try { globalThis.localStorage?.setItem(persistKey, JSON.stringify(tables)) } catch { /* cheio: segue só em memória */ }
    }, 300)
  }
  return {
    execute: async (q) => {
      const r = runQuery(carregar(), q, cfg)
      if (q.op !== 'select' && !r.error) persistir()
      return r
    },
    reset() {
      try { if (persistKey) globalThis.localStorage?.removeItem(persistKey) } catch { /* nada */ }
      tables = null
    },
  }
}
