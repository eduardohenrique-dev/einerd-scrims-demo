// Backup/restauração de todos os dados na nuvem (Supabase) em arquivo JSON.
import { CORE_TABLES, fetchAll, upsertDoc } from './db.js'

export async function exportBackup() {
  const data = {}
  for (const t of CORE_TABLES) {
    const rows = await fetchAll(t)
    data[t] = rows.map((r) => ({ id: r.id, data: r.data }))
  }
  const payload = {
    app: 'einerd-scrims',
    version: 2,
    exportedAt: new Date().toISOString(),
    data,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `einerd-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// Lê um arquivo de backup e restaura (upsert) as tabelas conhecidas na nuvem.
export function importBackup(file, { onError, onDone } = {}) {
  if (!file) return
  const reader = new FileReader()
  reader.onload = async (ev) => {
    try {
      const parsed = JSON.parse(ev.target.result)
      const data = parsed?.data
      if (!data || typeof data !== 'object') throw new Error('Arquivo de backup inválido.')
      let restored = 0
      for (const t of CORE_TABLES) {
        for (const row of data[t] || []) {
          if (row?.id && row?.data) { await upsertDoc(t, row.id, row.data); restored++ }
        }
      }
      if (!restored) throw new Error('Nenhum dado reconhecido no arquivo.')
      onDone ? onDone() : location.reload()
    } catch (e) {
      onError?.(e)
    }
  }
  reader.readAsText(file)
}
