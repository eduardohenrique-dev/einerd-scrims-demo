// Lista oficial de campeões — Data Dragon 16.13.1 (atualizado 29/06/2026).
// 173 campeões, uma entrada por campeão. Chaves DDragon garantem as imagens.
// Imagem custom (campo `img` base64 no objeto do campeão) sobrescreve a do DDragon.

export const DDRAGON_VERSION = '16.13.1'

export function champImgUrl(ddragonKey) {
  if (!ddragonKey) return null
  return `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${ddragonKey}.png`
}

// ── Resolução de nome → chave do Data Dragon ────────────────────────
// A GRID entrega o nome do campeão em formatos variados ("Wukong", "Lee Sin",
// "Renata Glasc"), e a chave do DDragon nem sempre é o nome sem espaços.
// Normalizamos e mantemos os poucos casos em que os dois divergem.
//
// Isto vivia DUPLICADO em 4 telas (MatchHistory, PlayersDashboard,
// TierlistMeta, BuildsRunes), cada uma com sua própria cópia do mapa — se um
// campeão novo divergisse, era preciso lembrar de corrigir nos 4 lugares.
export const normChampName = (s = '') => s.toLowerCase().replace(/[^a-z0-9]/g, '')

const CHAMP_KEY_ALIAS = { wukong: 'MonkeyKing', renataglasc: 'Renata', nunuwillump: 'Nunu' }

// `keyByNorm` = Map(nomeNormalizado → ddragonKey), montado a partir da lista
// de campeões do app (ver champKeyIndex abaixo).
export function champKeyOf(name, keyByNorm) {
  if (!name) return null
  const n = normChampName(name)
  return CHAMP_KEY_ALIAS[n] || keyByNorm?.get(n) || null
}

// Índice reutilizável: as telas montam uma vez (useMemo) e passam adiante.
export function champKeyIndex(champions = []) {
  const m = new Map()
  for (const c of champions) if (c.ddragonKey) m.set(normChampName(c.ddragonKey), c.ddragonKey)
  return m
}

export function champColor(id = '') {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360
  return `hsl(${h} 60% 20%)`
}

export const DEFAULT_CHAMPIONS = [
  { id: "aatrox", name: "Aatrox", abbr: "AAT", role: "Lutador", ddragonKey: "Aatrox" },
  { id: "ahri", name: "Ahri", abbr: "AHR", role: "Mago", ddragonKey: "Ahri" },
  { id: "akali", name: "Akali", abbr: "AKA", role: "Assassino", ddragonKey: "Akali" },
  { id: "akshan", name: "Akshan", abbr: "AKS", role: "Atirador", ddragonKey: "Akshan" },
  { id: "alistar", name: "Alistar", abbr: "ALI", role: "Tanque", ddragonKey: "Alistar" },
  { id: "ambessa", name: "Ambessa", abbr: "AMB", role: "Lutador", ddragonKey: "Ambessa" },
  { id: "amumu", name: "Amumu", abbr: "AMU", role: "Tanque", ddragonKey: "Amumu" },
  { id: "anivia", name: "Anivia", abbr: "ANI", role: "Mago", ddragonKey: "Anivia" },
  { id: "annie", name: "Annie", abbr: "ANN", role: "Mago", ddragonKey: "Annie" },
  { id: "aphelios", name: "Aphelios", abbr: "APH", role: "Atirador", ddragonKey: "Aphelios" },
  { id: "ashe", name: "Ashe", abbr: "ASH", role: "Atirador", ddragonKey: "Ashe" },
  { id: "aurelionsol", name: "Aurelion Sol", abbr: "AUR", role: "Mago", ddragonKey: "AurelionSol" },
  { id: "aurora", name: "Aurora", abbr: "AU1", role: "Mago", ddragonKey: "Aurora" },
  { id: "azir", name: "Azir", abbr: "AZI", role: "Mago", ddragonKey: "Azir" },
  { id: "bard", name: "Bardo", abbr: "BAR", role: "Suporte", ddragonKey: "Bard" },
  { id: "belveth", name: "Bel'Veth", abbr: "BEL", role: "Lutador", ddragonKey: "Belveth" },
  { id: "blitzcrank", name: "Blitzcrank", abbr: "BLI", role: "Tanque", ddragonKey: "Blitzcrank" },
  { id: "brand", name: "Brand", abbr: "BRA", role: "Mago", ddragonKey: "Brand" },
  { id: "braum", name: "Braum", abbr: "BR1", role: "Tanque", ddragonKey: "Braum" },
  { id: "briar", name: "Briar", abbr: "BRI", role: "Lutador", ddragonKey: "Briar" },
  { id: "caitlyn", name: "Caitlyn", abbr: "CAI", role: "Atirador", ddragonKey: "Caitlyn" },
  { id: "camille", name: "Camille", abbr: "CAM", role: "Lutador", ddragonKey: "Camille" },
  { id: "cassiopeia", name: "Cassiopeia", abbr: "CAS", role: "Mago", ddragonKey: "Cassiopeia" },
  { id: "chogath", name: "Cho'Gath", abbr: "CHO", role: "Tanque", ddragonKey: "Chogath" },
  { id: "corki", name: "Corki", abbr: "COR", role: "Atirador", ddragonKey: "Corki" },
  { id: "darius", name: "Darius", abbr: "DAR", role: "Lutador", ddragonKey: "Darius" },
  { id: "diana", name: "Diana", abbr: "DIA", role: "Lutador", ddragonKey: "Diana" },
  { id: "drmundo", name: "Dr. Mundo", abbr: "DRM", role: "Tanque", ddragonKey: "DrMundo" },
  { id: "draven", name: "Draven", abbr: "DRA", role: "Atirador", ddragonKey: "Draven" },
  { id: "ekko", name: "Ekko", abbr: "EKK", role: "Assassino", ddragonKey: "Ekko" },
  { id: "elise", name: "Elise", abbr: "ELI", role: "Assassino", ddragonKey: "Elise" },
  { id: "evelynn", name: "Evelynn", abbr: "EVE", role: "Assassino", ddragonKey: "Evelynn" },
  { id: "ezreal", name: "Ezreal", abbr: "EZR", role: "Atirador", ddragonKey: "Ezreal" },
  { id: "fiddlesticks", name: "Fiddlesticks", abbr: "FID", role: "Mago", ddragonKey: "Fiddlesticks" },
  { id: "fiora", name: "Fiora", abbr: "FIO", role: "Lutador", ddragonKey: "Fiora" },
  { id: "fizz", name: "Fizz", abbr: "FIZ", role: "Assassino", ddragonKey: "Fizz" },
  { id: "galio", name: "Galio", abbr: "GAL", role: "Tanque", ddragonKey: "Galio" },
  { id: "gangplank", name: "Gangplank", abbr: "GAN", role: "Lutador", ddragonKey: "Gangplank" },
  { id: "garen", name: "Garen", abbr: "GAR", role: "Lutador", ddragonKey: "Garen" },
  { id: "gnar", name: "Gnar", abbr: "GNA", role: "Lutador", ddragonKey: "Gnar" },
  { id: "gragas", name: "Gragas", abbr: "GRA", role: "Lutador", ddragonKey: "Gragas" },
  { id: "graves", name: "Graves", abbr: "GR1", role: "Atirador", ddragonKey: "Graves" },
  { id: "gwen", name: "Gwen", abbr: "GWE", role: "Lutador", ddragonKey: "Gwen" },
  { id: "hecarim", name: "Hecarim", abbr: "HEC", role: "Lutador", ddragonKey: "Hecarim" },
  { id: "heimerdinger", name: "Heimerdinger", abbr: "HEI", role: "Mago", ddragonKey: "Heimerdinger" },
  { id: "hwei", name: "Hwei", abbr: "HWE", role: "Mago", ddragonKey: "Hwei" },
  { id: "illaoi", name: "Illaoi", abbr: "ILL", role: "Lutador", ddragonKey: "Illaoi" },
  { id: "irelia", name: "Irelia", abbr: "IRE", role: "Lutador", ddragonKey: "Irelia" },
  { id: "ivern", name: "Ivern", abbr: "IVE", role: "Suporte", ddragonKey: "Ivern" },
  { id: "janna", name: "Janna", abbr: "JAN", role: "Suporte", ddragonKey: "Janna" },
  { id: "jarvaniv", name: "Jarvan IV", abbr: "JAR", role: "Lutador", ddragonKey: "JarvanIV" },
  { id: "jax", name: "Jax", abbr: "JAX", role: "Lutador", ddragonKey: "Jax" },
  { id: "jayce", name: "Jayce", abbr: "JAY", role: "Lutador", ddragonKey: "Jayce" },
  { id: "jhin", name: "Jhin", abbr: "JHI", role: "Atirador", ddragonKey: "Jhin" },
  { id: "jinx", name: "Jinx", abbr: "JIN", role: "Atirador", ddragonKey: "Jinx" },
  { id: "ksante", name: "K'Sante", abbr: "KSA", role: "Tanque", ddragonKey: "KSante" },
  { id: "kaisa", name: "Kai'Sa", abbr: "KAI", role: "Atirador", ddragonKey: "Kaisa" },
  { id: "kalista", name: "Kalista", abbr: "KAL", role: "Atirador", ddragonKey: "Kalista" },
  { id: "karma", name: "Karma", abbr: "KAR", role: "Mago", ddragonKey: "Karma" },
  { id: "karthus", name: "Karthus", abbr: "KA1", role: "Mago", ddragonKey: "Karthus" },
  { id: "kassadin", name: "Kassadin", abbr: "KAS", role: "Assassino", ddragonKey: "Kassadin" },
  { id: "katarina", name: "Katarina", abbr: "KAT", role: "Assassino", ddragonKey: "Katarina" },
  { id: "kayle", name: "Kayle", abbr: "KAY", role: "Mago", ddragonKey: "Kayle" },
  { id: "kayn", name: "Kayn", abbr: "KA2", role: "Lutador", ddragonKey: "Kayn" },
  { id: "kennen", name: "Kennen", abbr: "KEN", role: "Mago", ddragonKey: "Kennen" },
  { id: "khazix", name: "Kha'Zix", abbr: "KHA", role: "Assassino", ddragonKey: "Khazix" },
  { id: "kindred", name: "Kindred", abbr: "KIN", role: "Atirador", ddragonKey: "Kindred" },
  { id: "kled", name: "Kled", abbr: "KLE", role: "Lutador", ddragonKey: "Kled" },
  { id: "kogmaw", name: "Kog'Maw", abbr: "KOG", role: "Atirador", ddragonKey: "KogMaw" },
  { id: "leblanc", name: "LeBlanc", abbr: "LEB", role: "Assassino", ddragonKey: "Leblanc" },
  { id: "leesin", name: "Lee Sin", abbr: "LEE", role: "Lutador", ddragonKey: "LeeSin" },
  { id: "leona", name: "Leona", abbr: "LEO", role: "Tanque", ddragonKey: "Leona" },
  { id: "lillia", name: "Lillia", abbr: "LIL", role: "Lutador", ddragonKey: "Lillia" },
  { id: "lissandra", name: "Lissandra", abbr: "LIS", role: "Mago", ddragonKey: "Lissandra" },
  { id: "locke", name: "Locke", abbr: "LOC", role: "Assassino", ddragonKey: "Locke" },
  { id: "lucian", name: "Lucian", abbr: "LUC", role: "Atirador", ddragonKey: "Lucian" },
  { id: "lulu", name: "Lulu", abbr: "LUL", role: "Suporte", ddragonKey: "Lulu" },
  { id: "lux", name: "Lux", abbr: "LUX", role: "Mago", ddragonKey: "Lux" },
  { id: "malphite", name: "Malphite", abbr: "MAL", role: "Tanque", ddragonKey: "Malphite" },
  { id: "malzahar", name: "Malzahar", abbr: "MA1", role: "Mago", ddragonKey: "Malzahar" },
  { id: "maokai", name: "Maokai", abbr: "MAO", role: "Tanque", ddragonKey: "Maokai" },
  { id: "masteryi", name: "Master Yi", abbr: "MAS", role: "Lutador", ddragonKey: "MasterYi" },
  { id: "mel", name: "Mel", abbr: "MEL", role: "Mago", ddragonKey: "Mel" },
  { id: "milio", name: "Milio", abbr: "MIL", role: "Suporte", ddragonKey: "Milio" },
  { id: "missfortune", name: "Miss Fortune", abbr: "MIS", role: "Atirador", ddragonKey: "MissFortune" },
  { id: "mordekaiser", name: "Mordekaiser", abbr: "MOR", role: "Lutador", ddragonKey: "Mordekaiser" },
  { id: "morgana", name: "Morgana", abbr: "MO1", role: "Suporte", ddragonKey: "Morgana" },
  { id: "naafiri", name: "Naafiri", abbr: "NAA", role: "Assassino", ddragonKey: "Naafiri" },
  { id: "nami", name: "Nami", abbr: "NAM", role: "Suporte", ddragonKey: "Nami" },
  { id: "nasus", name: "Nasus", abbr: "NAS", role: "Lutador", ddragonKey: "Nasus" },
  { id: "nautilus", name: "Nautilus", abbr: "NAU", role: "Tanque", ddragonKey: "Nautilus" },
  { id: "neeko", name: "Neeko", abbr: "NEE", role: "Mago", ddragonKey: "Neeko" },
  { id: "nidalee", name: "Nidalee", abbr: "NID", role: "Assassino", ddragonKey: "Nidalee" },
  { id: "nilah", name: "Nilah", abbr: "NIL", role: "Lutador", ddragonKey: "Nilah" },
  { id: "nocturne", name: "Nocturne", abbr: "NOC", role: "Lutador", ddragonKey: "Nocturne" },
  { id: "nunu", name: "Nunu e Willump", abbr: "NUN", role: "Tanque", ddragonKey: "Nunu" },
  { id: "olaf", name: "Olaf", abbr: "OLA", role: "Lutador", ddragonKey: "Olaf" },
  { id: "orianna", name: "Orianna", abbr: "ORI", role: "Mago", ddragonKey: "Orianna" },
  { id: "ornn", name: "Ornn", abbr: "ORN", role: "Tanque", ddragonKey: "Ornn" },
  { id: "pantheon", name: "Pantheon", abbr: "PAN", role: "Lutador", ddragonKey: "Pantheon" },
  { id: "poppy", name: "Poppy", abbr: "POP", role: "Tanque", ddragonKey: "Poppy" },
  { id: "pyke", name: "Pyke", abbr: "PYK", role: "Suporte", ddragonKey: "Pyke" },
  { id: "qiyana", name: "Qiyana", abbr: "QIY", role: "Assassino", ddragonKey: "Qiyana" },
  { id: "quinn", name: "Quinn", abbr: "QUI", role: "Atirador", ddragonKey: "Quinn" },
  { id: "rakan", name: "Rakan", abbr: "RAK", role: "Suporte", ddragonKey: "Rakan" },
  { id: "rammus", name: "Rammus", abbr: "RAM", role: "Tanque", ddragonKey: "Rammus" },
  { id: "reksai", name: "Rek'Sai", abbr: "REK", role: "Lutador", ddragonKey: "RekSai" },
  { id: "rell", name: "Rell", abbr: "REL", role: "Tanque", ddragonKey: "Rell" },
  { id: "renata", name: "Renata Glasc", abbr: "REN", role: "Suporte", ddragonKey: "Renata" },
  { id: "renekton", name: "Renekton", abbr: "RE1", role: "Lutador", ddragonKey: "Renekton" },
  { id: "rengar", name: "Rengar", abbr: "RE2", role: "Assassino", ddragonKey: "Rengar" },
  { id: "riven", name: "Riven", abbr: "RIV", role: "Lutador", ddragonKey: "Riven" },
  { id: "rumble", name: "Rumble", abbr: "RUM", role: "Lutador", ddragonKey: "Rumble" },
  { id: "ryze", name: "Ryze", abbr: "RYZ", role: "Mago", ddragonKey: "Ryze" },
  { id: "samira", name: "Samira", abbr: "SAM", role: "Atirador", ddragonKey: "Samira" },
  { id: "sejuani", name: "Sejuani", abbr: "SEJ", role: "Tanque", ddragonKey: "Sejuani" },
  { id: "senna", name: "Senna", abbr: "SEN", role: "Suporte", ddragonKey: "Senna" },
  { id: "seraphine", name: "Seraphine", abbr: "SER", role: "Suporte", ddragonKey: "Seraphine" },
  { id: "sett", name: "Sett", abbr: "SET", role: "Lutador", ddragonKey: "Sett" },
  { id: "shaco", name: "Shaco", abbr: "SHA", role: "Assassino", ddragonKey: "Shaco" },
  { id: "shen", name: "Shen", abbr: "SHE", role: "Tanque", ddragonKey: "Shen" },
  { id: "shyvana", name: "Shyvana", abbr: "SHY", role: "Lutador", ddragonKey: "Shyvana" },
  { id: "singed", name: "Singed", abbr: "SIN", role: "Tanque", ddragonKey: "Singed" },
  { id: "sion", name: "Sion", abbr: "SIO", role: "Tanque", ddragonKey: "Sion" },
  { id: "sivir", name: "Sivir", abbr: "SIV", role: "Atirador", ddragonKey: "Sivir" },
  { id: "skarner", name: "Skarner", abbr: "SKA", role: "Tanque", ddragonKey: "Skarner" },
  { id: "smolder", name: "Smolder", abbr: "SMO", role: "Atirador", ddragonKey: "Smolder" },
  { id: "sona", name: "Sona", abbr: "SON", role: "Suporte", ddragonKey: "Sona" },
  { id: "soraka", name: "Soraka", abbr: "SOR", role: "Suporte", ddragonKey: "Soraka" },
  { id: "swain", name: "Swain", abbr: "SWA", role: "Mago", ddragonKey: "Swain" },
  { id: "sylas", name: "Sylas", abbr: "SYL", role: "Mago", ddragonKey: "Sylas" },
  { id: "syndra", name: "Syndra", abbr: "SYN", role: "Mago", ddragonKey: "Syndra" },
  { id: "tahmkench", name: "Tahm Kench", abbr: "TAH", role: "Tanque", ddragonKey: "TahmKench" },
  { id: "taliyah", name: "Taliyah", abbr: "TAL", role: "Mago", ddragonKey: "Taliyah" },
  { id: "talon", name: "Talon", abbr: "TA1", role: "Assassino", ddragonKey: "Talon" },
  { id: "taric", name: "Taric", abbr: "TAR", role: "Suporte", ddragonKey: "Taric" },
  { id: "teemo", name: "Teemo", abbr: "TEE", role: "Atirador", ddragonKey: "Teemo" },
  { id: "thresh", name: "Thresh", abbr: "THR", role: "Suporte", ddragonKey: "Thresh" },
  { id: "tristana", name: "Tristana", abbr: "TRI", role: "Atirador", ddragonKey: "Tristana" },
  { id: "trundle", name: "Trundle", abbr: "TRU", role: "Lutador", ddragonKey: "Trundle" },
  { id: "tryndamere", name: "Tryndamere", abbr: "TRY", role: "Lutador", ddragonKey: "Tryndamere" },
  { id: "twistedfate", name: "Twisted Fate", abbr: "TWI", role: "Mago", ddragonKey: "TwistedFate" },
  { id: "twitch", name: "Twitch", abbr: "TW1", role: "Atirador", ddragonKey: "Twitch" },
  { id: "udyr", name: "Udyr", abbr: "UDY", role: "Lutador", ddragonKey: "Udyr" },
  { id: "urgot", name: "Urgot", abbr: "URG", role: "Lutador", ddragonKey: "Urgot" },
  { id: "varus", name: "Varus", abbr: "VAR", role: "Atirador", ddragonKey: "Varus" },
  { id: "vayne", name: "Vayne", abbr: "VAY", role: "Atirador", ddragonKey: "Vayne" },
  { id: "veigar", name: "Veigar", abbr: "VEI", role: "Mago", ddragonKey: "Veigar" },
  { id: "velkoz", name: "Vel'Koz", abbr: "VEL", role: "Mago", ddragonKey: "Velkoz" },
  { id: "vex", name: "Vex", abbr: "VEX", role: "Mago", ddragonKey: "Vex" },
  { id: "vi", name: "Vi", abbr: "VI", role: "Lutador", ddragonKey: "Vi" },
  { id: "viego", name: "Viego", abbr: "VIE", role: "Lutador", ddragonKey: "Viego" },
  { id: "viktor", name: "Viktor", abbr: "VIK", role: "Mago", ddragonKey: "Viktor" },
  { id: "vladimir", name: "Vladimir", abbr: "VLA", role: "Mago", ddragonKey: "Vladimir" },
  { id: "volibear", name: "Volibear", abbr: "VOL", role: "Lutador", ddragonKey: "Volibear" },
  { id: "warwick", name: "Warwick", abbr: "WAR", role: "Lutador", ddragonKey: "Warwick" },
  { id: "monkeyking", name: "Wukong", abbr: "WUK", role: "Lutador", ddragonKey: "MonkeyKing" },
  { id: "xayah", name: "Xayah", abbr: "XAY", role: "Atirador", ddragonKey: "Xayah" },
  { id: "xerath", name: "Xerath", abbr: "XER", role: "Mago", ddragonKey: "Xerath" },
  { id: "xinzhao", name: "Xin Zhao", abbr: "XIN", role: "Lutador", ddragonKey: "XinZhao" },
  { id: "yasuo", name: "Yasuo", abbr: "YAS", role: "Lutador", ddragonKey: "Yasuo" },
  { id: "yone", name: "Yone", abbr: "YON", role: "Lutador", ddragonKey: "Yone" },
  { id: "yorick", name: "Yorick", abbr: "YOR", role: "Lutador", ddragonKey: "Yorick" },
  { id: "yunara", name: "Yunara", abbr: "YUN", role: "Atirador", ddragonKey: "Yunara" },
  { id: "yuumi", name: "Yuumi", abbr: "YUU", role: "Suporte", ddragonKey: "Yuumi" },
  { id: "zaahen", name: "Zaahen", abbr: "ZAA", role: "Lutador", ddragonKey: "Zaahen" },
  { id: "zac", name: "Zac", abbr: "ZAC", role: "Tanque", ddragonKey: "Zac" },
  { id: "zed", name: "Zed", abbr: "ZED", role: "Assassino", ddragonKey: "Zed" },
  { id: "zeri", name: "Zeri", abbr: "ZER", role: "Atirador", ddragonKey: "Zeri" },
  { id: "ziggs", name: "Ziggs", abbr: "ZIG", role: "Mago", ddragonKey: "Ziggs" },
  { id: "zilean", name: "Zilean", abbr: "ZIL", role: "Suporte", ddragonKey: "Zilean" },
  { id: "zoe", name: "Zoe", abbr: "ZOE", role: "Mago", ddragonKey: "Zoe" },
  { id: "zyra", name: "Zyra", abbr: "ZYR", role: "Mago", ddragonKey: "Zyra" },
]
