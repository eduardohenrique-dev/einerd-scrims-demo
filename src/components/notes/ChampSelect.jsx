// Seletor de campeão reutilizável: mostra o ícone e, ao clicar, abre o
// ChampionPicker (popover em portal, sempre visível). Usado nas Notas Pessoais
// (caderno de matchups). Diferente do DraftSlot, que é o slot do draft do bloco.
import { useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { useApp } from '../../context/AppContext.jsx'
import { cx } from '../../lib/utils.js'
import ChampionPicker, { ChampImg } from '../block/ChampionPicker.jsx'

export default function ChampSelect({
  championId, onSelect, onClear, size = 36, align = 'left',
  usedIds = [], tone = 'sky', title = 'Selecionar campeão',
}) {
  const { championById } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const champ = championId ? championById.get(championId) : null
  const ring = tone === 'loss' ? 'border-loss/30 hover:border-loss/60' : 'border-sky/25 hover:border-sky/60'

  return (
    <div className="relative inline-flex shrink-0">
      <button
        ref={ref}
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={champ?.name || title}
        className={cx('flex items-center justify-center overflow-hidden rounded-lg border transition-colors', ring)}
        style={{ width: size, height: size, background: champ ? 'transparent' : 'var(--card-bg-soft)', borderStyle: champ ? 'solid' : 'dashed' }}
      >
        {champ
          ? <ChampImg champ={champ} size={size} className="rounded-md" />
          : <Plus size={Math.round(size * 0.4)} style={{ color: 'var(--text-faint)' }} />}
      </button>
      {open && (
        <ChampionPicker
          anchorRef={ref}
          align={align}
          usedIds={usedIds}
          canClear={!!onClear}
          onSelect={(c) => { onSelect?.(c.id); setOpen(false) }}
          onClear={() => { onClear?.(); setOpen(false) }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}
