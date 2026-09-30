// ═══════════════════════════════════════════════════════════════════
// Lanes META por campeão — usado pelo filtro de lane do Draft Tool
// (mesma ideia dos ícones top/jg/mid/bot/sup do drafting.gg).
// Chave = `id` de champions.js. Um campeão pode ter várias lanes (flex).
// ⚠️ Campeões FORA deste mapa aparecem em TODOS os filtros (melhor errar
// mostrando do que escondendo) — ex.: campeões novos ainda sem meta clara.
// ═══════════════════════════════════════════════════════════════════

export const LANE_KEYS = ['Top', 'Jng', 'Mid', 'Bot', 'Sup']

export const CHAMPION_LANES = {
  aatrox: ['Top'], ahri: ['Mid'], akali: ['Mid', 'Top'], akshan: ['Mid', 'Top'],
  alistar: ['Sup'], ambessa: ['Top'], amumu: ['Jng', 'Sup'], anivia: ['Mid'],
  annie: ['Mid', 'Sup'], aphelios: ['Bot'], ashe: ['Bot', 'Sup'], aurelionsol: ['Mid'],
  aurora: ['Mid', 'Top'], azir: ['Mid'], bard: ['Sup'], belveth: ['Jng'],
  blitzcrank: ['Sup'], brand: ['Sup', 'Mid', 'Jng'], braum: ['Sup'], briar: ['Jng'],
  caitlyn: ['Bot'], camille: ['Top', 'Sup'], cassiopeia: ['Mid'], chogath: ['Top'],
  corki: ['Mid', 'Bot'], darius: ['Top'], diana: ['Jng', 'Mid'], drmundo: ['Top', 'Jng'],
  draven: ['Bot'], ekko: ['Jng', 'Mid'], elise: ['Jng'], evelynn: ['Jng'],
  ezreal: ['Bot'], fiddlesticks: ['Jng', 'Sup'], fiora: ['Top'], fizz: ['Mid'],
  galio: ['Mid', 'Sup'], gangplank: ['Top'], garen: ['Top'], gnar: ['Top'],
  gragas: ['Jng', 'Top', 'Mid'], graves: ['Jng'], gwen: ['Top', 'Jng'], hecarim: ['Jng'],
  heimerdinger: ['Top', 'Mid', 'Sup'], hwei: ['Mid', 'Bot'], illaoi: ['Top'],
  irelia: ['Top', 'Mid'], ivern: ['Jng'], janna: ['Sup'], jarvaniv: ['Jng'],
  jax: ['Top', 'Jng'], jayce: ['Top', 'Mid'], jhin: ['Bot'], jinx: ['Bot'],
  ksante: ['Top'], kaisa: ['Bot'], kalista: ['Bot'], karma: ['Sup', 'Mid'],
  karthus: ['Jng'], kassadin: ['Mid'], katarina: ['Mid'], kayle: ['Top'],
  kayn: ['Jng'], kennen: ['Top'], khazix: ['Jng'], kindred: ['Jng'],
  kled: ['Top'], kogmaw: ['Bot'], leblanc: ['Mid'], leesin: ['Jng'],
  leona: ['Sup'], lillia: ['Jng'], lissandra: ['Mid'], lucian: ['Bot', 'Mid'],
  lulu: ['Sup'], lux: ['Sup', 'Mid'], malphite: ['Top', 'Sup'], malzahar: ['Mid'],
  maokai: ['Sup', 'Jng', 'Top'], masteryi: ['Jng'], mel: ['Mid', 'Bot'], milio: ['Sup'],
  missfortune: ['Bot'], mordekaiser: ['Top'], morgana: ['Sup'], naafiri: ['Mid', 'Jng'],
  nami: ['Sup'], nasus: ['Top'], nautilus: ['Sup'], neeko: ['Mid', 'Sup'],
  nidalee: ['Jng'], nilah: ['Bot'], nocturne: ['Jng'], nunu: ['Jng'],
  olaf: ['Top', 'Jng'], orianna: ['Mid'], ornn: ['Top'], pantheon: ['Sup', 'Top', 'Mid', 'Jng'],
  poppy: ['Jng', 'Top'], pyke: ['Sup'], qiyana: ['Mid', 'Jng'], quinn: ['Top'],
  rakan: ['Sup'], rammus: ['Jng'], reksai: ['Jng'], rell: ['Sup'],
  renata: ['Sup'], renekton: ['Top'], rengar: ['Jng', 'Top'], riven: ['Top'],
  rumble: ['Top', 'Mid', 'Jng'], ryze: ['Mid', 'Top'], samira: ['Bot'], sejuani: ['Jng'],
  senna: ['Sup', 'Bot'], seraphine: ['Sup', 'Bot', 'Mid'], sett: ['Top', 'Sup'],
  shaco: ['Jng', 'Sup'], shen: ['Top', 'Sup'], shyvana: ['Jng'], singed: ['Top'],
  sion: ['Top'], sivir: ['Bot'], skarner: ['Jng', 'Top'], smolder: ['Bot', 'Mid'],
  sona: ['Sup'], soraka: ['Sup'], swain: ['Sup', 'Mid', 'Bot'], sylas: ['Mid', 'Top', 'Jng'],
  syndra: ['Mid'], tahmkench: ['Sup', 'Top'], taliyah: ['Jng', 'Mid'], talon: ['Mid', 'Jng'],
  taric: ['Sup'], teemo: ['Top', 'Sup'], thresh: ['Sup'], tristana: ['Bot', 'Mid'],
  trundle: ['Jng', 'Top'], tryndamere: ['Top'], twistedfate: ['Mid', 'Bot'], twitch: ['Bot', 'Jng'],
  udyr: ['Jng', 'Top'], urgot: ['Top'], varus: ['Bot'], vayne: ['Bot', 'Top'],
  veigar: ['Mid', 'Bot'], velkoz: ['Sup', 'Mid'], vex: ['Mid'], vi: ['Jng'],
  viego: ['Jng'], viktor: ['Mid', 'Bot'], vladimir: ['Mid', 'Top'], volibear: ['Top', 'Jng'],
  warwick: ['Jng', 'Top'], monkeyking: ['Jng', 'Top'], xayah: ['Bot'], xerath: ['Sup', 'Mid'],
  xinzhao: ['Jng'], yasuo: ['Mid', 'Top', 'Bot'], yone: ['Mid', 'Top'], yorick: ['Top', 'Jng'],
  yuumi: ['Sup'], zac: ['Jng', 'Top', 'Sup'], zed: ['Mid', 'Jng'], zeri: ['Bot'],
  ziggs: ['Mid', 'Bot'], zilean: ['Sup', 'Mid'], zoe: ['Mid', 'Sup'], zyra: ['Sup', 'Jng'],
  // Sem mapa (aparecem em todos os filtros): locke, yunara, zaahen
}

// O campeão joga nessa lane? (sem mapa → true em qualquer lane)
export function champInLane(champId, lane) {
  const lanes = CHAMPION_LANES[champId]
  return !lanes || lanes.includes(lane)
}
