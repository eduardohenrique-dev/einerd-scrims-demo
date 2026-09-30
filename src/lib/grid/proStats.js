// ═══════════════════════════════════════════════════════════════════
// Meta War Room (Fase 3.5) — agregações PURAS sobre grid_pro_games.
//   • aggregateChampions: presença/pick/ban/WR por campeão (+ tier).
//   • aggregateMacro: WR condicional de objetivos (Barão, Alma, Voidgrubs,
//     Arauto, 1º Dragão/Torre/Sangue).
// Sem I/O — testável isoladamente (ver proStats.test.js).
// ═══════════════════════════════════════════════════════════════════

// Tier por presença (% de jogos em que o campeão foi pickado OU banido).
export function tierOf(presence) {
  if (presence >= 0.40) return 'S'
  if (presence >= 0.20) return 'A'
  if (presence >= 0.08) return 'B'
  return 'C'
}

export function aggregateChampions(games) {
  const total = games.length
  const map = new Map() // name → { picks, bans, wins }
  const get = (c) => { if (!map.has(c)) map.set(c, { picks: 0, bans: 0, wins: 0 }); return map.get(c) }
  for (const g of games) {
    // Num jogo, um campeão aparece no máx 1x (pick de um time OU ban de um time),
    // então picks+bans somados entre jogos = nº de jogos em que apareceu.
    for (const c of [...(g.blue_bans || []), ...(g.red_bans || [])]) get(c).bans++
    const mark = (picks, won) => { for (const c of (picks || [])) { const m = get(c); m.picks++; if (won) m.wins++ } }
    mark(g.blue_picks, g.winner === 'blue')
    mark(g.red_picks, g.winner === 'red')
  }
  return [...map.entries()].map(([name, m]) => {
    const presence = total ? (m.picks + m.bans) / total : 0
    return {
      name, picks: m.picks, bans: m.bans, wins: m.wins,
      presence, tier: tierOf(presence),
      winrate: m.picks ? m.wins / m.picks : null,
    }
  }).sort((a, b) => b.presence - a.presence || b.picks - a.picks)
}

// ── Tierlist por LANE (usa grid_game_players do pro, com role inferida pela
// timeline). `rows` = player rows já filtrados para os jogos desejados e para
// a lane escolhida. Presença = % de jogos em que a lane teve aquele campeão.
export function aggregateLaneChampions(rows) {
  const totalGames = new Set(rows.map((r) => `${r.series_id}:${r.game_seq}`)).size
  const map = new Map()
  for (const r of rows) {
    if (!r.champion) continue
    const m = map.get(r.champion) || { picks: 0, wins: 0 }
    m.picks++; if (r.won) m.wins++
    map.set(r.champion, m)
  }
  return [...map.entries()].map(([name, m]) => {
    const presence = totalGames ? m.picks / totalGames : 0
    return {
      name, picks: m.picks, bans: 0, wins: m.wins,
      presence, tier: tierOf(presence),
      winrate: m.picks ? m.wins / m.picks : null,
    }
  }).sort((a, b) => b.picks - a.picks || b.winrate - a.winrate)
}

// ── Matchups de um campeão: em cada jogo, o oponente é o pick da MESMA lane
// no time adversário. `lane` opcional restringe a uma lane; sem ela, usa a
// lane real do campeão em cada jogo. Retorna winrate do campeão vs cada rival.
export function championMatchups(rows, champName, lane = null) {
  const byGameRole = new Map()
  for (const r of rows) {
    if (!r.role || !r.champion) continue
    if (lane && r.role !== lane) continue
    const k = `${r.series_id}:${r.game_seq}:${r.role}`
    const g = byGameRole.get(k) || {}
    g[r.side] = r
    byGameRole.set(k, g)
  }
  const map = new Map()
  let games = 0, wins = 0
  for (const { blue, red } of byGameRole.values()) {
    if (!blue || !red) continue
    for (const [me, opp] of [[blue, red], [red, blue]]) {
      if (me.champion !== champName) continue
      games++; if (me.won) wins++
      const m = map.get(opp.champion) || { games: 0, wins: 0 }
      m.games++; if (me.won) m.wins++
      map.set(opp.champion, m)
    }
  }
  const matchups = [...map.entries()].map(([opponent, m]) => ({
    opponent, games: m.games, wins: m.wins, winrate: m.games ? m.wins / m.games : null,
  })).sort((a, b) => b.games - a.games || (b.winrate ?? 0) - (a.winrate ?? 0))
  return { games, wins, winrate: games ? wins / games : null, matchups }
}

export function aggregateMacro(games) {
  // 1 linha por perspectiva de time (blue e red) com seus objetivos + venceu?
  const rows = []
  for (const g of games) {
    if (g.blue_obj) rows.push({ ...g.blue_obj, won: g.winner === 'blue' })
    if (g.red_obj) rows.push({ ...g.red_obj, won: g.winner === 'red' })
  }
  const wr = (pred) => { const s = rows.filter(pred); return { games: s.length, wr: s.length ? s.filter((r) => r.won).length / s.length : null } }
  return {
    teamGames: rows.length,
    baron: wr((r) => (r.barons || 0) >= 1),
    baronByCount: [1, 2, 3].map((c) => ({ c, ...wr((r) => (r.barons || 0) === c) })),
    firstBaron: wr((r) => r.firstBaron),
    soul: wr((r) => (r.dragons || 0) >= 4),
    firstDragon: wr((r) => r.firstDragon),
    dragonsByCount: [1, 2, 3, 4].map((c) => ({ c, ...wr((r) => (r.dragons || 0) === c) })),
    grubsByCount: [1, 2, 3, 4, 5, 6].map((c) => ({ c, ...wr((r) => (r.grubs || 0) === c) })),
    herald: wr((r) => (r.heralds || 0) >= 1),
    firstTower: wr((r) => r.firstTower),
    firstBlood: wr((r) => r.firstBlood),
  }
}
