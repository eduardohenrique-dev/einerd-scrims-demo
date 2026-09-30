// ═══════════════════════════════════════════════════════════════════
// Metadados de ITENS e RUNAS do Data Dragon (CDN oficial da Riot).
// O banco guarda só os IDs numéricos (item 6631, runa 8010) — nome e ícone
// vêm daqui. Buscado UMA vez por sessão e cacheado em memória; o item.json
// tem ~1MB, então não vale re-buscar a cada troca de campeão.
//
// A versão é a mesma constante já usada pelos ícones de campeão
// (champions.js), pra não haver divergência de patch entre as telas.
// ═══════════════════════════════════════════════════════════════════
import { DDRAGON_VERSION } from './champions.js'

const BASE = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}`

export const itemImgUrl = (id) => `${BASE}/img/item/${id}.png`
// Ícones de runa não são versionados (o caminho já vem completo no JSON).
export const runeImgUrl = (icon) => (icon ? `https://ddragon.leagueoflegends.com/cdn/img/${icon}` : null)

// Fragmentos (shards) não existem no runesReforged.json — a Riot não os
// publica lá. São poucos e estáveis, então ficam mapeados à mão.
// IDs conferidos contra os dados reais do banco (os 7 que aparecem):
// 5008 · 5011 · 5005 · 5010 · 5001 · 5007 · 5013.
const SHARDS = {
  5008: 'Força Adaptativa',
  5005: 'Vel. de Ataque',
  5007: 'Aceleração de Habilidade',
  5011: 'Vida',
  5001: 'Vida (escala)',
  5010: 'Vel. de Movimento',
  5013: 'Tenacidade e Resist. a Lentidão',
}

let cacheItens = null
let cacheRunas = null

// { [id]: { name, gold:{total}, tags:[], into:[] } } — formato que o
// classifyItem (buildStats.js) espera.
export async function loadItems() {
  if (cacheItens) return cacheItens
  try {
    const r = await fetch(`${BASE}/data/pt_BR/item.json`)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const j = await r.json()
    cacheItens = j.data || {}
  } catch (e) {
    console.error('[ddragon] itens:', e.message)
    cacheItens = {}   // degrada: a UI mostra o id cru em vez de quebrar
  }
  return cacheItens
}

// { [perkId]: { name, icon, tree } } achatado a partir das árvores.
export async function loadRunes() {
  if (cacheRunas) return cacheRunas
  const out = {}
  try {
    const r = await fetch(`${BASE}/data/pt_BR/runesReforged.json`)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    for (const arvore of await r.json()) {
      // A própria árvore também tem id (8000 Precisão, 8300 Inspiração…) e é
      // exibida nas colunas de árvore primária/secundária.
      out[arvore.id] = { name: arvore.name, icon: arvore.icon, tree: arvore.name, isTree: true }
      for (const slot of (arvore.slots || [])) {
        for (const p of (slot.runes || [])) {
          out[p.id] = { name: p.name, icon: p.icon, tree: arvore.name }
        }
      }
    }
  } catch (e) {
    console.error('[ddragon] runas:', e.message)
  }
  for (const [id, name] of Object.entries(SHARDS)) out[id] = out[id] || { name, icon: null, isShard: true }
  cacheRunas = out
  return out
}

export const itemName = (info, id) => info?.[id]?.name?.replace(/<[^>]*>/g, '') || `Item ${id}`
export const runeName = (info, id) => info?.[id]?.name || `Runa ${id}`
