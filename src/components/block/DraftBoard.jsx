// DraftBoard — o quadro de draft de UM jogo (estilo LoLpedia).
// Layout: lado Blue à esquerda, lado Red à direita, coluna central com
// resultado/timer/trocar lado. Cada lado tem 5 bans + 5 picks (DraftSlot).
// `readOnly` alterna entre modo edição e modo visualização.
// `usedIds` reúne todos os campeões já escolhidos/banidos no jogo, para o
// picker marcar quem já foi usado.
import { Clock, Trophy, Frown, RefreshCw } from 'lucide-react'
import { useApp } from '../../context/AppContext.jsx'
import { PICK_ORDER } from '../../data/constants.js'
import { getTeamInfo, teamGradient } from '../../data/teams.js'
import { cx } from '../../lib/utils.js'
import { PickCell, BanCell } from './DraftSlot.jsx'

function TeamBadge({ name, side, isUs, teams }) {
  const info = getTeamInfo(teams, name)
  const isBlue = side === 'blue'
  const fallbackColor = isBlue ? '#00AEFF' : '#FF1B48'

  return (
    <div className={cx('flex items-center gap-2.5', !isBlue && 'flex-row-reverse')}>
      {/* Logo do time ou badge colorido */}
      {info?.logo ? (
        <img
          src={info.logo} alt={name}
          className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-white/15"
        />
      ) : (
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-black text-white shadow-sm"
          style={{ background: teamGradient(info) || `linear-gradient(135deg,${fallbackColor},${fallbackColor}88)` }}
        >
          {(info?.abbr ?? name).slice(0, 4).toUpperCase()}
        </span>
      )}

      <h3 className="display text-xl leading-none drop-shadow-sm" style={{ color: 'var(--text)' }}>{name}</h3>

      {isUs && (
        <span className="rounded-md bg-sky/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky ring-1 ring-sky/25">
          NÓS
        </span>
      )}
      <span className={cx('text-[10px] font-bold uppercase tracking-[0.2em]', isBlue ? 'text-sky/60' : 'text-loss/60')}>
        {isBlue ? 'Blue' : 'Red'}
      </span>
    </div>
  )
}

export default function DraftBoard({ block, game, readOnly = false }) {
  const { teams, setPick, setBan, setPickRole, setGameMeta, swapSide } = useApp()

  const usedIds = [
    ...game.blue.picks.map((p) => p.championId),
    ...game.red.picks.map((p) => p.championId),
    ...game.blue.bans,
    ...game.red.bans,
  ].filter(Boolean)

  const ourSide = game.ourSide

  const Bans = ({ side }) => {
    const isBlue = side === 'blue'
    return (
      <div className={cx('flex items-center gap-2', !isBlue && 'flex-row-reverse')}>
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>Bans</span>
        {/* Os slots ficam na ordem do array nos dois lados; so a NUMERACAO do
            azul conta ao contrario, pra que os numeros dos dois lados cresçam
            do centro pra fora na leitura (5 4 3 2 1 | 1 2 3 4 5). */}
        <div className="flex gap-1.5">
          {game[side].bans.map((championId, i) => (
            <BanCell
              key={i} side={side} slot={i} championId={championId}
              order={isBlue ? game[side].bans.length - i : i + 1}
              usedIds={usedIds} readOnly={readOnly}
              onSelect={(cid) => setBan(block.id, game.id, side, i, cid)}
              onClear={() => setBan(block.id, game.id, side, i, null)}
            />
          ))}
        </div>
      </div>
    )
  }

  const Picks = ({ side }) => (
    <div className="space-y-2">
      {game[side].picks.map((pick, i) => (
        <PickCell
          key={i} side={side} slot={i} pick={pick}
          order={PICK_ORDER[side][i]} usedIds={usedIds} readOnly={readOnly}
          onSelect={(cid) => setPick(block.id, game.id, side, i, cid)}
          onClear={() => setPick(block.id, game.id, side, i, null)}
          onRole={(role) => setPickRole(block.id, game.id, side, i, role)}
        />
      ))}
    </div>
  )

  const won  = game.result === 'win'
  const lost = game.result === 'loss'

  return (
    <div className="overflow-hidden rounded-2xl border backdrop-blur-sm" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
      {/* Cabeçalho com gradiente dos lados */}
      <div className="grid grid-cols-2">
        <div className="flex items-center gap-3 bg-gradient-to-r from-sky/10 to-transparent px-5 py-4 border-r" style={{ borderColor: 'var(--divider)' }}>
          <TeamBadge name={game.blue.team} side="blue" isUs={ourSide === 'blue'} teams={teams} />
        </div>
        <div className="flex items-center justify-end gap-3 bg-gradient-to-l from-loss/10 to-transparent px-5 py-4">
          <TeamBadge name={game.red.team} side="red" isUs={ourSide === 'red'} teams={teams} />
        </div>
      </div>

      <div className="px-5 pb-5">
        {/* Bans */}
        <div className="mb-4 flex items-center justify-between border-b py-3" style={{ borderColor: 'var(--divider)' }}>
          <Bans side="blue" />
          <Bans side="red" />
        </div>

        {/* Picks + Coluna central */}
        <div className="grid grid-cols-[1fr_120px_1fr] gap-3">
          <Picks side="blue" />

          {/* Centro */}
          <div className="flex flex-col items-center justify-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>
              Jogo {game.index}
            </span>

            {!readOnly ? (
              <div className="flex w-full flex-col gap-1.5">
                {[['win', 'Vitória', won], ['loss', 'Derrota', lost]].map(([val, label, on]) => (
                  <button
                    key={val}
                    onClick={() => setGameMeta(block.id, game.id, { result: on ? null : val })}
                    className={cx(
                      'w-full rounded-xl py-1.5 text-[11px] font-bold uppercase tracking-wide transition-all duration-150',
                      val === 'win'
                        ? on
                          ? 'bg-gradient-to-r from-sky to-sky/80 text-ink-900 shadow-[0_2px_12px_rgba(0,174,255,0.4)]'
                          : 'border border-sky/20 text-sky/50 hover:border-sky/60 hover:text-sky'
                        : on
                          ? 'bg-gradient-to-r from-loss to-loss/80 text-white shadow-[0_2px_12px_rgba(255,27,72,0.4)]'
                          : 'border border-loss/20 text-loss/50 hover:border-loss/60 hover:text-loss',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : (
              <span className={cx(
                'display flex items-center gap-1.5 text-base',
                won && 'text-sky', lost && 'text-loss', !won && !lost && 'text-cloud/30',
              )}>
                {won && <Trophy size={15} />}
                {lost && <Frown size={15} />}
                {won ? 'Vitória' : lost ? 'Derrota' : '—'}
              </span>
            )}

            {/* Timer */}
            <div className="flex items-center gap-1.5" style={{ color: 'var(--text-faint)' }}>
              <Clock size={12} />
              {readOnly ? (
                <span className="text-sm tabular-nums">{game.duration || '--:--'}</span>
              ) : (
                <input
                  value={game.duration}
                  onChange={(e) => setGameMeta(block.id, game.id, { duration: e.target.value })}
                  placeholder="00:00"
                  className="w-14 bg-transparent text-center text-sm tabular-nums outline-none placeholder:opacity-30 focus:text-sky transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                />
              )}
            </div>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-sky/20 to-transparent" />
            <span className="display text-sm" style={{ color: 'var(--text-faint)' }}>VS</span>

            {!readOnly && (
              <button
                onClick={() => swapSide(block.id, game.id)}
                title="Trocar Blue ↔ Red"
                className="mt-1 flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[10px] font-semibold transition-all hover:border-sky/50 hover:bg-sky/5 hover:text-sky"
                style={{ borderColor: 'var(--divider)', color: 'var(--text-faint)' }}
              >
                <RefreshCw size={11} /> Trocar lado
              </button>
            )}
          </div>

          <Picks side="red" />
        </div>
      </div>
    </div>
  )
}
