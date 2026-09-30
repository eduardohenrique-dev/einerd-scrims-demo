// StatsCards — os 4 cartões de resumo no topo do Dashboard.
// Recebe o objeto `stats` (calculado no Dashboard) e só o exibe.
import { BarChart2, TrendingUp, Shield, CalendarClock } from 'lucide-react'

// Definição de cada cartão: qual chave de `stats` mostrar, rótulo, ícone e cor.
// `isText: true` indica valor textual (ex.: "Hoje · 19h") em vez de número.
const CARDS = [
  { key: 'blocksThisMonth', label: 'Blocos no Mês',    icon: BarChart2,     suffix: '',  color: '#29CEF9' },
  { key: 'winrate',         label: 'Winrate (Jogos)',  icon: TrendingUp,    suffix: '%', color: '#1FE39A' },
  { key: 'blockWinrate',    label: 'Winrate de Blocos', icon: Shield,       suffix: '%', color: '#FF2E4D' },
  { key: 'nextLabel',       label: 'Próximo Treino',   icon: CalendarClock, suffix: '',  isText: true, color: '#FFBE00' },
]

export default function StatsCards({ stats }) {
  return (
    <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {CARDS.map(({ key, label, icon: Icon, suffix, isText, color }, i) => (
        <div
          key={key}
          className="clip-notch relative overflow-hidden p-4 transition-transform duration-200 hover:-translate-y-1"
          style={{
            background: 'var(--card-bg)',
            boxShadow: `inset 0 0 0 1px var(--card-border)`,
            animation: `slide-up 0.3s cubic-bezier(0.22,1,0.36,1) ${i * 0.05}s both`,
          }}
        >
          {/* Faixa lateral diagonal de acento */}
          <span className="pointer-events-none absolute -left-2 top-0 h-full w-2" style={{ background: color }} />
          {/* Slash decorativo no fundo */}
          <span
            className="pointer-events-none absolute -right-6 -top-6 h-16 w-16"
            style={{ background: color, opacity: 0.1, transform: 'skewX(-14deg)' }}
          />

          <div className="relative">
            <div className="mb-2 flex items-center justify-between">
              <p className="condensed text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {label}
              </p>
              <span className="clip-notch flex h-7 w-7 shrink-0 items-center justify-center" style={{ background: `${color}1F`, color }}>
                <Icon size={15} />
              </span>
            </div>
            <p
              className={isText ? 'condensed text-lg leading-tight' : 'display text-[2.9rem] leading-none tabular-nums'}
              style={{ color: isText ? color : 'var(--text)' }}
            >
              {stats[key]}
              {!isText && suffix && <span className="ml-0.5 text-2xl" style={{ color }}>{suffix}</span>}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
