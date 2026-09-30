// Tier list S/A/B/C/D (estilo drafting.gg). Duas formas de usar:
//   • Clique: selecione um tier e clique nos campeões do pool para colocá-los;
//     clique num campeão já colocado para remover (comportamento original).
//   • Arrastar: arraste um campeão do pool para um tier, ou de um tier para
//     outro, para mover sem precisar remover + readicionar.
// C e D são tiers NOVOS — tier lists antigas (só S/A/B) continuam válidas:
// tudo lê `tiers[key] || []` e o spread ao salvar preserva as chaves antigas.
// `readOnly` (admin vendo a tier list de um jogador): vira vitrine e esconde
// os tiers vazios pra não poluir.
import { useMemo, useState } from 'react'
import { Search, Check } from 'lucide-react'
import { useApp } from '../../context/AppContext.jsx'
import { cx } from '../../lib/utils.js'
import { ChampImg } from '../block/ChampionPicker.jsx'

const TIERS = [
  { key: 'S', color: '#FFBE00' },
  { key: 'A', color: '#29CEF9' },
  { key: 'B', color: '#9B7BFF' },
]

function norm(s = '') { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') }

export default function TierList({ tiers, onChange, readOnly = false }) {
  const { champions, championById } = useApp()
  const [active, setActive] = useState('S')
  const [query, setQuery] = useState('')
  const [dropTier, setDropTier] = useState(null) // tier sob o cursor durante o arrasto

  const placed = useMemo(
    () => new Set(TIERS.flatMap(({ key }) => tiers[key] || [])),
    [tiers],
  )

  const pool = useMemo(() => {
    if (readOnly) return []
    const q = norm(query.trim())
    return champions
      .filter((c) => !placed.has(c.id))
      .filter((c) => !q || norm(c.name).includes(q) || norm(c.abbr || '').includes(q))
  }, [champions, placed, query, readOnly])

  function assign(id) {
    onChange({ ...tiers, [active]: [...(tiers[active] || []), id] })
  }
  function removeFrom(tierKey, id) {
    onChange({ ...tiers, [tierKey]: (tiers[tierKey] || []).filter((x) => x !== id) })
  }
  // Move via drag & drop: tira de onde estava (se estava) e põe no destino.
  function moveTo(targetKey, id, fromKey) {
    if (fromKey === targetKey) return
    const next = { ...tiers }
    if (fromKey && fromKey !== 'pool') next[fromKey] = (next[fromKey] || []).filter((x) => x !== id)
    next[targetKey] = [...(next[targetKey] || []), id]
    onChange(next)
  }

  function onDropInTier(e, targetKey) {
    e.preventDefault()
    setDropTier(null)
    try {
      const { id, from } = JSON.parse(e.dataTransfer.getData('text/plain'))
      if (id) moveTo(targetKey, id, from)
    } catch { /* arrasto de fora (arquivo etc.) — ignora */ }
  }
  const dragProps = (id, from) => readOnly ? {} : {
    draggable: true,
    onDragStart: (e) => e.dataTransfer.setData('text/plain', JSON.stringify({ id, from })),
  }

  // Vitrine (readOnly): mostra só os tiers com conteúdo.
  const visibleTiers = readOnly ? TIERS.filter(({ key }) => (tiers[key] || []).length > 0) : TIERS
  if (readOnly && visibleTiers.length === 0) {
    return <p className="py-6 text-center text-xs" style={{ color: 'var(--text-faint)' }}>Tier list vazia.</p>
  }

  return (
    <div>
      {/* Tiers */}
      <div className="space-y-1.5">
        {visibleTiers.map(({ key, color }) => (
          <div key={key} className="flex items-stretch gap-2">
            {readOnly ? (
              <div
                className="clip-notch flex w-10 shrink-0 items-center justify-center font-display text-xl"
                style={{ background: color, color: '#05060E' }}
              >
                {key}
              </div>
            ) : (
              <button
                onClick={() => setActive(key)}
                title={`Selecionar tier ${key} para adicionar`}
                className={cx(
                  'clip-notch relative flex w-10 shrink-0 items-center justify-center font-display text-xl transition-all duration-150',
                  active === key ? 'z-10 animate-tier-pulse' : 'opacity-80 hover:opacity-100 hover:scale-105',
                )}
                style={{
                  background: color,
                  color: '#05060E',
                  boxShadow: active === key
                    ? `0 0 0 3px var(--card-bg), 0 0 0 6px ${color}, 0 6px 22px -4px ${color}`
                    : 'none',
                }}
              >
                {key}
                {active === key && (
                  <span
                    className="clip-notch absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center"
                    style={{ background: 'var(--text)', color: 'var(--card-bg)' }}
                  >
                    <Check size={11} strokeWidth={3.5} />
                  </span>
                )}
              </button>
            )}
            <div
              className="flex min-h-[46px] flex-1 flex-wrap content-start gap-1 rounded-md p-1 transition-shadow"
              style={{
                background: 'var(--card-bg-soft)',
                boxShadow: dropTier === key
                  ? `inset 0 0 0 2px ${color}`
                  : 'inset 0 0 0 1px var(--card-border)',
              }}
              onDragOver={readOnly ? undefined : (e) => { e.preventDefault(); setDropTier(key) }}
              onDragLeave={readOnly ? undefined : () => setDropTier((t) => (t === key ? null : t))}
              onDrop={readOnly ? undefined : (e) => onDropInTier(e, key)}
            >
              {(tiers[key] || []).map((id) => {
                const champ = championById.get(id)
                if (!champ) return null
                return readOnly ? (
                  <span key={id} title={champ.name}>
                    <ChampImg champ={champ} size={36} className="rounded" />
                  </span>
                ) : (
                  <button
                    key={id}
                    onClick={() => removeFrom(key, id)}
                    title={`${champ.name} — clique para remover · arraste para mover de tier`}
                    className="cursor-grab active:cursor-grabbing"
                    {...dragProps(id, key)}
                  >
                    <ChampImg champ={champ} size={36} className="rounded" />
                  </button>
                )
              })}
              {(tiers[key] || []).length === 0 && (
                <span className="px-1.5 py-1.5 text-[10px]" style={{ color: 'var(--text-faint)' }}>
                  Tier {key} vazio{readOnly ? '' : ' — clique ou arraste campeões'}
                </span>
              )}
              {!readOnly && (tiers[key] || []).length > 0 && (
                <span className="condensed ml-auto self-center pr-1 text-[9px] tabular-nums" style={{ color: 'var(--text-faint)' }}>
                  {(tiers[key] || []).length}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pool: só existe em modo edição (readOnly não deixa adicionar campeões). */}
      {!readOnly && (
        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="condensed text-[10px]" style={{ color: 'var(--text-faint)' }}>
              Adicionando ao tier <b style={{ color: 'var(--text)' }}>{active}</b> · clique ou arraste
            </p>
          </div>
          <div className="relative mb-2">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40" style={{ color: 'var(--text-muted)' }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar campeão..." className="field py-1.5 pl-8 text-sm" />
          </div>
          <div className="grid max-h-56 grid-cols-6 gap-1 overflow-y-auto pr-1 sm:grid-cols-8">
            {pool.map((c) => (
              <button
                key={c.id}
                onClick={() => assign(c.id)}
                title={c.name}
                className="cursor-grab transition hover:brightness-125 active:cursor-grabbing"
                {...dragProps(c.id, 'pool')}
              >
                <ChampImg champ={c} size={36} className="rounded" />
              </button>
            ))}
            {pool.length === 0 && (
              <p className="col-span-full py-4 text-center text-xs" style={{ color: 'var(--text-faint)' }}>
                {query ? 'Nenhum campeão encontrado.' : 'Todos os campeões já estão em algum tier.'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
