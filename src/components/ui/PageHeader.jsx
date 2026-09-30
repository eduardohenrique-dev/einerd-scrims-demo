import { Search } from 'lucide-react'

// Cabeçalho de página: título + subtítulo à esquerda, busca + ação à direita.
export default function PageHeader({ title, subtitle, search, onSearch, searchPlaceholder = 'Buscar...', action }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="relative pl-4">
        <span className="absolute left-0 top-1 h-full w-1.5 bg-sky" style={{ transform: 'skewX(-14deg)' }} />
        <h1 className="display text-4xl sm:text-[40px]" style={{ color: 'var(--text)' }}>{title}</h1>
        {subtitle && <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>
      {/* No mobile o grupo ocupa a linha toda e a busca flexiona — sem isso a
          ação estoura a borda direita em ~375px (busca tinha 256px fixos). */}
      <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
        {onSearch && (
          <div className="relative min-w-0 flex-1 sm:flex-none">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-50" style={{ color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="field w-full pl-9 sm:w-64"
            />
          </div>
        )}
        {action}
      </div>
    </div>
  )
}
