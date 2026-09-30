// ═══════════════════════════════════════════════════════════════════
// Builds & Runas — agregações PURAS (sem rede, sem Supabase).
// Recebe linhas de grid_game_players (já filtradas por campeão/lane/patch)
// e devolve, para cada SLOT de decisão, as opções com jogos/vitórias/WR.
//
// Por que fatiar em slots (keystone, item inicial, 1º item, 2º item…) em vez
// de mostrar só a build final: é assim que o jogador decide de verdade. Saber
// que "Black Cleaver aparece em 60% das builds" é bem menos útil que saber
// "quando é PRIMEIRO item, ganha 7 de 9".
//
// ⚠️ NÃO calculamos WPA (Win Probability Added). WPA exige um modelo de
// probabilidade de vitória calibrado sobre dezenas de milhões de partidas;
// com algumas centenas de jogos de campeonato o número seria ruído com cara
// de precisão. Aqui mostramos WR bruto + o TAMANHO DA AMOSTRA sempre junto,
// pra que a leitura seja honesta ("4 de 6 jogos", não "67%").
// ═══════════════════════════════════════════════════════════════════

// ── Classificação de item (usa o item.json do Data Dragon) ──────────
// `info` = { [id]: { name, gold:{total}, tags:[], into:[] } }.
// Sem metadados o item vira 'unknown' e é ignorado nos slots — degradar é
// melhor que classificar errado e poluir a tabela.
export function classifyItem(id, info) {
  const it = info?.[id]
  if (!it) return 'unknown'
  const tags = it.tags || []
  const total = it.gold?.total || 0
  const terminal = !Array.isArray(it.into) || it.into.length === 0

  if (tags.includes('Consumable')) return 'consumable'
  if (tags.includes('Trinket')) return 'trinket'
  // Botas: só as de tier 2+ contam como slot (as de 300g são componente).
  if (tags.includes('Boots')) return total >= 900 ? 'boots' : 'component'
  // Iniciais: baratos e que não constroem em nada (Doran, pets de jungle).
  if (terminal && total <= 500) return 'starter'
  // Lendários: terminais e caros.
  if (terminal && total >= 2000) return 'legendary'
  return 'component'
}

// Extrai os slots de UMA build (ordem de compra de um jogador num jogo).
// `order` = [{ id, t }] em ordem cronológica.
export function slotsOfBuild(order, info) {
  const out = { starter: null, boots: null, legendaries: [] }
  for (const { id } of (order || [])) {
    const tipo = classifyItem(id, info)
    if (tipo === 'starter' && out.starter == null) out.starter = id
    else if (tipo === 'boots' && out.boots == null) out.boots = id
    else if (tipo === 'legendary' && !out.legendaries.includes(id)) out.legendaries.push(id)
  }
  return out
}

// ── Contador: recebe pares [valor, venceu] e devolve a tabela do slot ──
// `universo` = quantos jogos poderiam ter aquele slot (base do pick rate).
// Ex.: se só 40 de 60 jogos têm botas registradas, o pick rate das botas é
// sobre 40 — senão toda opção pareceria menos usada do que é.
function tabela(pares, universo) {
  const m = new Map()
  for (const [valor, venceu] of pares) {
    if (valor == null) continue
    const c = m.get(valor) || { id: valor, games: 0, wins: 0 }
    c.games++; if (venceu) c.wins++
    m.set(valor, c)
  }
  return [...m.values()]
    .map((c) => ({ ...c, wr: c.games ? c.wins / c.games : 0, pick: universo ? c.games / universo : 0 }))
    // Ordena por jogos (representatividade) e desempata por WR: com amostra
    // pequena, o mais jogado é o dado mais confiável que existe.
    .sort((a, b) => b.games - a.games || b.wr - a.wr)
}

// Achata linhas em pares [valor, venceu]; `pega` pode devolver 1 valor ou lista.
// Deduplica DENTRO de cada jogo: um mesmo fragmento pode ser escolhido duas
// vezes na mesma página de runas (ex.: Força Adaptativa no slot ofensivo E no
// flexível), e sem deduplicar o pick rate passava de 100% — "105% dos jogos"
// não quer dizer nada. Contamos "usou neste jogo", que é a leitura útil.
const pares = (rows, pega) => rows.flatMap((r) => {
  const vals = [...new Set([].concat(pega(r) ?? []).filter((v) => v != null))]
  return vals.map((v) => [v, r.won])
})

// ═══════════════════════════════════════════════════════════════════
// aggregateBuilds — todas as tabelas de slot de uma vez.
// `rows` = linhas de UM campeão (uma linha por jogo daquele campeão).
// ═══════════════════════════════════════════════════════════════════
export function aggregateBuilds(rows, info) {
  // Pré-calcula os slots uma única vez por jogo (evita refazer a cada tabela).
  const builds = rows
    .filter((r) => Array.isArray(r.build_order) && r.build_order.length)
    .map((r) => ({ won: r.won, ...slotsOfBuild(r.build_order, info) }))

  const nComOrdem = builds.length
  const nthPares = (i) => builds.map((b) => [b.legendaries[i], b.won])
  const comSlot = (f) => builds.filter(f).length

  return {
    games: rows.length,
    gamesComOrdem: nComOrdem,
    wins: rows.filter((r) => r.won).length,

    // ── Runas ──
    keystone: tabela(pares(rows, (r) => r.keystone), rows.length),
    primary: tabela(pares(rows, (r) => r.perk_primary), rows.length),
    sub: tabela(pares(rows, (r) => r.perk_sub), rows.length),
    runas: tabela(pares(rows, (r) => r.perks), rows.length),
    shards: tabela(pares(rows, (r) => (r.stat_perks ? Object.values(r.stat_perks) : null)), rows.length),

    // ── Itens por slot de decisão ──
    starter: tabela(builds.map((b) => [b.starter, b.won]), comSlot((b) => b.starter != null)),
    boots: tabela(builds.map((b) => [b.boots, b.won]), comSlot((b) => b.boots != null)),
    item1: tabela(nthPares(0), comSlot((b) => b.legendaries[0] != null)),
    item2: tabela(nthPares(1), comSlot((b) => b.legendaries[1] != null)),
    item3: tabela(nthPares(2), comSlot((b) => b.legendaries[2] != null)),
    // 4º+ agrupa o resto: a partir daí a ordem varia demais pra separar.
    item4mais: tabela(
      builds.flatMap((b) => b.legendaries.slice(3).map((id) => [id, b.won])),
      comSlot((b) => b.legendaries.length > 3),
    ),

    // ── Build final (o que estava no inventário no fim do jogo) ──
    itensFinais: tabela(pares(rows, (r) => (Array.isArray(r.items)
      ? r.items.filter((id) => ['legendary', 'boots'].includes(classifyItem(id, info)))
      : null)), rows.length),
  }
}

// ═══════════════════════════════════════════════════════════════════
// aggregateMatchups — WR do campeão contra cada oponente de LANE.
// `pares` = [{ row, oponente }] montado na camada de dados (o oponente é o
// jogador do outro time na MESMA role, no mesmo jogo).
// ═══════════════════════════════════════════════════════════════════
export function aggregateMatchups(pares) {
  const m = new Map()
  for (const { row, oponente } of pares) {
    if (!oponente) continue
    const c = m.get(oponente) || { champion: oponente, games: 0, wins: 0 }
    c.games++; if (row.won) c.wins++
    m.set(oponente, c)
  }
  return [...m.values()]
    .map((c) => ({ ...c, wr: c.games ? c.wins / c.games : 0 }))
    .sort((a, b) => b.games - a.games || b.wr - a.wr)
}
