import { cx } from '../../lib/utils.js'

// Abas de jogos (Jogo 1, Jogo 2...) com bolinha de resultado.
export default function GameTabs({ games, activeId, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-sky/10 pb-px">
      {games.map((g) => {
        const active = g.id === activeId
        const dot =
          g.result === 'win' ? 'bg-sky' : g.result === 'loss' ? 'bg-loss' : 'bg-cloud/25'
        return (
          <button
            key={g.id}
            onClick={() => onSelect(g.id)}
            className={cx(
              'flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-semibold transition',
              active
                ? 'border-sky bg-sky/10 text-white'
                : 'border-transparent text-cloud/55 hover:bg-white/5 hover:text-cloud',
            )}
          >
            Jogo {g.index}
            <span className={cx('h-2 w-2 rounded-full', dot)} />
          </button>
        )
      })}
    </div>
  )
}
