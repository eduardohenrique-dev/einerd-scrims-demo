// Settings — tela de Configurações. Reúne, em blocos independentes:
//   • TeamsManager      → cadastro de times adversários (componente próprio)
//   • ChampionsSection  → gerenciar a lista de campeões (adicionar/foto/remover)
//   • BackupCard        → baixar/restaurar TODOS os dados em JSON
//   • DangerZone        → apagar tudo (protegido por uma "frase-cofre")
import { useMemo, useRef, useState } from 'react'
import { Plus, Trash2, RotateCcw, Database, AlertTriangle, Camera, Image as ImageIcon, ChevronDown, Search, Download, Upload as UploadIcon, ShieldCheck } from 'lucide-react'
import { useApp } from '../../context/AppContext.jsx'
import { wipeAll } from '../../lib/storage.js'
import { wipeCore } from '../../lib/db.js'
import { exportBackup, importBackup } from '../../lib/backup.js'
import { cx } from '../../lib/utils.js'
import { readImageFile } from '../../lib/image.js'
import PageHeader from '../ui/PageHeader.jsx'
import { ChampImg } from '../block/ChampionPicker.jsx'
import TeamsManager from './TeamsManager.jsx'

// Frase-cofre exigida para apagar TODOS os dados.
const WIPE_PHRASE = 'Ei nerds, tranks, Peter aqui'

// ── Backup / Restauração ────────────────────────────────────────────
function BackupCard() {
  const restoreRef = useRef(null)
  return (
    <div className="card p-5">
      <h2 className="mb-1 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
        <ShieldCheck size={14} className="text-sky" /> Backup
      </h2>
      <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        Baixe um arquivo com TODOS os dados (blocos, drafts, eventos, times e campeões). Guarde por segurança e restaure quando precisar.
      </p>
      <div className="flex flex-col gap-2">
        <button onClick={() => exportBackup().catch((e) => alert(`Falha no backup: ${e.message}`))} className="btn-primary w-full">
          <Download size={16} /> Baixar backup
        </button>
        <button onClick={() => restoreRef.current?.click()} className="btn-ghost w-full">
          <UploadIcon size={16} /> Restaurar backup
        </button>
        <input
          ref={restoreRef} type="file" accept="application/json,.json" className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            if (!confirm('Restaurar este backup? Os dados atuais serão substituídos.')) return
            importBackup(file, { onError: (err) => alert(`Falha ao restaurar: ${err.message}`) })
          }}
        />
      </div>
    </div>
  )
}

// ── Zona de perigo (exige frase-cofre) ──────────────────────────────
function DangerZone() {
  const [arming, setArming] = useState(false)
  const [phrase, setPhrase] = useState('')
  const [busy, setBusy] = useState(false)
  const ok = phrase.trim() === WIPE_PHRASE

  return (
    <div className="card p-5" style={{ borderColor: 'rgba(255,46,77,0.3)' }}>
      <h2 className="mb-1 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.2em] text-loss">
        <AlertTriangle size={14} /> Zona de perigo
      </h2>
      <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        Apaga TODOS os dados locais (blocos, drafts, eventos, times e campeões) e recarrega. Faça um backup antes.
      </p>

      {!arming ? (
        <button onClick={() => { setArming(true); setPhrase('') }} className="btn-danger w-full">
          <Database size={16} /> Limpar todos os dados
        </button>
      ) : (
        <div className="animate-slide-up space-y-2">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Para confirmar, digite exatamente: <b style={{ color: 'var(--loss, #FF2E4D)' }}>{WIPE_PHRASE}</b>
          </p>
          <input
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder={WIPE_PHRASE}
            className="field"
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={() => { setArming(false); setPhrase('') }} className="btn-ghost flex-1">Cancelar</button>
            <button
              disabled={!ok || busy}
              onClick={async () => { setBusy(true); await wipeCore(); wipeAll(); location.reload() }}
              className="btn-danger flex-1"
            >
              <Trash2 size={15} /> {busy ? 'Apagando…' : 'Apagar tudo'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Card de campeão (com upload de foto) ────────────────────────────
function ChampionCard({ champ, onSetImg, onDelete }) {
  const fileRef = useRef(null)
  return (
    <div className="group flex items-center gap-2.5 rounded-lg border p-2 transition hover:border-sky/30"
      style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg-soft)' }}>
      <button type="button" onClick={() => fileRef.current?.click()}
        className="relative shrink-0 overflow-hidden rounded-md" title="Trocar foto do campeão">
        <ChampImg champ={champ} size={36} className="rounded-md" />
        <span className="absolute inset-0 flex items-center justify-center rounded-md bg-black/55 opacity-0 transition group-hover:opacity-100">
          <Camera size={14} className="text-white" />
        </span>
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => readImageFile(e.target.files?.[0], (b64) => onSetImg(b64))} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" style={{ color: 'var(--text)' }}>{champ.name}</p>
      </div>
      {champ.img && (
        <button onClick={() => onSetImg(null)} title="Remover foto custom"
          className="opacity-0 transition hover:text-sky group-hover:opacity-100" style={{ color: 'var(--text-faint)' }}>
          <RotateCcw size={13} />
        </button>
      )}
      <button onClick={onDelete} title="Remover campeão"
        className="opacity-0 transition hover:text-loss group-hover:opacity-100" style={{ color: 'var(--text-faint)' }}>
        <Trash2 size={15} />
      </button>
    </div>
  )
}

// ── Seção de campeões (colapsável + busca interna) ──────────────────
function ChampionsSection() {
  const { champions, addChampion, updateChampion, deleteChampion, resetChampions } = useApp()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [form, setForm] = useState({ name: '', img: null })
  const newImgRef = useRef(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? champions.filter((c) => c.name.toLowerCase().includes(q)) : champions
  }, [champions, query])

  function add(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    addChampion(form)   // sigla é auto-gerada a partir do nome
    setForm({ name: '', img: null })
  }

  return (
    <div className="card p-5">
      {/* Cabeçalho colapsável */}
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between">
        <h2 className="text-[12px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
          Campeões ({champions.length})
        </h2>
        <span className="flex items-center gap-2 text-[11px] font-semibold" style={{ color: 'var(--text-faint)' }}>
          {open ? 'Recolher' : 'Expandir'}
          <ChevronDown size={16} className={cx('transition-transform duration-200', open && 'rotate-180')} />
        </span>
      </button>

      {open && (
        <div className="mt-4 animate-slide-up">
          {/* Busca interna */}
          <div className="relative mb-3">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-50" style={{ color: 'var(--text-muted)' }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar campeão..." className="field pl-9" />
          </div>

          {/* Dica de proporção + restaurar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-start gap-2 rounded-lg border p-2.5 text-[11px]" style={{ borderColor: 'rgba(63,174,255,0.25)', background: 'rgba(63,174,255,0.07)', color: 'var(--text-muted)' }}>
              <ImageIcon size={14} className="mt-0.5 shrink-0 text-sky" />
              <span>Foto ideal: <b style={{ color: 'var(--text)' }}>quadrada 1:1, 120×120px</b>. Passe o mouse no ícone e clique para enviar.</span>
            </div>
            <button onClick={() => { if (confirm('Restaurar a lista oficial? Fotos customizadas serão perdidas.')) resetChampions() }} className="btn-ghost py-1.5 text-xs">
              <RotateCcw size={13} /> Restaurar padrão
            </button>
          </div>

          {/* Form de novo campeão */}
          <form onSubmit={add} className="mb-4 flex flex-wrap items-end gap-2">
            <button type="button" onClick={() => newImgRef.current?.click()}
              className="flex h-[42px] w-[42px] shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition hover:border-sky/50"
              style={{ borderColor: form.img ? 'transparent' : 'var(--card-border)', color: 'var(--text-faint)' }} title="Foto do campeão (opcional)">
              {form.img ? <img src={form.img} className="h-full w-full object-cover" alt="foto" /> : <Camera size={16} />}
            </button>
            <input ref={newImgRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => readImageFile(e.target.files?.[0], (b64) => setForm((f) => ({ ...f, img: b64 })))} />
            <div className="min-w-[140px] flex-1">
              <label className="label">Nome</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Ahri" className="field" />
            </div>
            <button type="submit" className="btn-primary"><Plus size={16} /> Adicionar</button>
          </form>

          {/* Grid (scrollável) */}
          <div className="max-h-[420px] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {filtered.map((c) => (
                <ChampionCard key={c.id} champ={c}
                  onSetImg={(b64) => updateChampion(c.id, { img: b64 })}
                  onDelete={() => deleteChampion(c.id)} />
              ))}
            </div>
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm" style={{ color: 'var(--text-faint)' }}>Nenhum campeão encontrado.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tela principal ──────────────────────────────────────────────────
export default function Settings() {
  return (
    <div>
      <PageHeader title="Configurações" subtitle="Times, campeões e dados locais" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <TeamsManager />
          <ChampionsSection />
        </div>

        {/* Lateral */}
        <div className="space-y-5">
          <BackupCard />
          <DangerZone />
        </div>
      </div>
    </div>
  )
}
