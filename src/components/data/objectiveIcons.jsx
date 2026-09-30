// ═══════════════════════════════════════════════════════════════════
// Ícones dos objetivos do LoL (Macro Intel): SVGs próprios em public/objectives
// para Barão/Dragão/Arauto/Voidgrubs/Torre e First Blood, com fallback SVG de
// espada caso o arquivo não exista. Tiles chanfrados
// (clip-notch) com anel na cor do objetivo — estética Persona.
// ═══════════════════════════════════════════════════════════════════
import { useState } from 'react'

export const OBJECTIVE_META = {
  baron:      { label: 'Barão Nashor', color: '#A970FF', img: '/objectives/baron.svg' },
  soul:       { label: 'Alma do Dragão', color: '#FF8A3D', img: '/objectives/dragon.svg' },
  firstDragon:{ label: '1º Dragão', color: '#FF8A3D', img: '/objectives/dragon.svg' },
  dragon:     { label: 'Dragões', color: '#FF8A3D', img: '/objectives/dragon.svg' },
  grubs:      { label: 'Voidgrubs', color: '#8B5CF6', img: '/objectives/voidgrub.svg' },
  herald:     { label: 'Arauto do Vale', color: '#7C8CFF', img: '/objectives/herald.svg' },
  firstTower: { label: 'Primeira Torre', color: '#FFC02E', img: '/objectives/tower.svg' },
  tower:      { label: 'Torres', color: '#FFC02E', img: '/objectives/tower.svg' },
  firstBlood: { label: 'First Blood', color: '#FF3B4E', img: '/objectives/firstblood.svg' },
}

// Glifo SVG de espada — fallback do First Blood se a imagem não existir.
function SwordGlyph({ color, size }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} role="img" aria-label="First Blood">
      <path d="M14.5 2.5 16.8 4.8 8.4 13.2 6.9 13.6 7.3 12.1 Z" fill={color} />
      <path d="M6.2 13.4 L10.6 17.8 L9.2 19.2 L4.8 14.8 Z" fill={color} opacity="0.85" />
      <path d="M17.5 15c1.4 1.8 2 2.9 2 3.9a2 2 0 1 1-4 0c0-1 .6-2.1 2-3.9Z" fill="#FF3B4E" />
    </svg>
  )
}

// Tile chanfrado no estilo "ícone de jogo": arte (ou glifo) sobre fundo tingido.
export function ObjectiveTile({ kind, size = 40 }) {
  const meta = OBJECTIVE_META[kind] || {}
  const c = meta.color || 'var(--text)'
  const [broken, setBroken] = useState(false)
  const showImg = meta.img && !broken
  return (
    <div className="clip-notch grid shrink-0 place-items-center overflow-hidden"
      style={{ width: size, height: size, background: `${c}22`, boxShadow: `inset 0 0 0 1px ${c}66` }}>
      {showImg
        ? <img src={meta.img} alt={meta.label} width={size} height={size} className="h-full w-full object-cover" draggable={false} onError={() => setBroken(true)} />
        : <SwordGlyph color={c} size={Math.round(size * 0.62)} />}
    </div>
  )
}
