// ═══════════════════════════════════════════════════════════════════
// Builds & Runas — área própria (fora de Dados, que já estava cheia).
// Recorte fixo: só CAMPEONATO e patch >= 16.13 (igual à Tierlist Meta).
//
// Organização da tela, em ordem de "quanto responde de imediato":
//   1. BUILD MAIS COMUM — a resposta que 90% das visitas quer, em 1 linha
//   2. RUNAS            — 4 cards = uma fileira cheia
//   3. ITENS            — 7 cards na MESMA grade de 4 (o último ocupa 2
//                         colunas, fechando a 2ª fileira sem buraco)
//   4. MATCHUPS         — clicável, vira filtro
// Seções EMPILHADAS, não lado a lado: com 4 cards de um lado e 7 do outro,
// as colunas ficavam com alturas muito diferentes. Todas usam a mesma grade
// fixa de 4 colunas e a mesma altura de card, pra grade ficar simétrica.
// A barra de filtros é STICKY: trocar de lane/matchup no meio da leitura é
// o gesto mais repetido aqui, e rolar de volta ao topo a cada troca cansa.
//
// ⚠️ WR sempre com o Nº DE JOGOS ao lado e asterisco em amostra pequena.
// Não calculamos WPA: exigiria um modelo calibrado sobre milhões de partidas;
// com algumas centenas de jogos seria ruído com aparência de precisão.
// ═══════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Package, Sparkles, Info, ChevronRight, X, Swords } from 'lucide-react'
import { useApp } from '../../context/AppContext.jsx'
import { champImgUrl, champKeyOf, champKeyIndex } from '../../data/champions.js'
import { loadItems, loadRunes, itemImgUrl, runeImgUrl, itemName, runeName } from '../../data/ddragon.js'
import { fetchChampionsWithBuilds, fetchBuildData } from '../../lib/grid/gridData.js'
import { aggregateBuilds, aggregateMatchups } from '../../lib/grid/buildStats.js'
import PageHeader from '../ui/PageHeader.jsx'
import { Panel, HudTag, SearchableSelect, wrColor, pct, CYAN, GOLD } from './vizBits.jsx'

const LANES = ['Top', 'Jng', 'Mid', 'Bot', 'Sup']
const AMOSTRA_BAIXA = 4   // abaixo disso a % é ilustrativa, não estatística


function ChampIcon({ name, keyByNorm, size = 22 }) {
  const key = champKeyOf(name, keyByNorm)
  const url = key ? champImgUrl(key) : null
  return url
    ? <img src={url} alt={name} title={name} width={size} height={size} className="shrink-0 rounded" draggable={false} />
    : <span className="flex shrink-0 items-center justify-center rounded text-[9px]"
        style={{ width: size, height: size, background: 'var(--input-bg)', color: 'var(--text-faint)' }}>{name?.slice(0, 3)}</span>
}

const ItemIcon = ({ id, size = 30 }) => (
  <img src={itemImgUrl(id)} alt="" width={size} height={size} className="shrink-0 rounded" draggable={false}
    style={{ background: 'var(--input-bg)' }} />
)

function RuneIcon({ id, info, size = 24 }) {
  const url = runeImgUrl(info?.[id]?.icon)
  return url
    ? <img src={url} alt="" width={size} height={size} className="shrink-0" draggable={false} />
    : <span className="flex shrink-0 items-center justify-center text-[10px]"
        style={{ width: size, height: size, color: 'var(--text-faint)' }}>◆</span>
}

// Barra de WR embutida na linha: dá a leitura visual sem ocupar coluna extra.
function Linha({ icon, nome, games, wr, pick }) {
  const baixa = games < AMOSTRA_BAIXA
  const cor = baixa ? 'var(--text-faint)' : wrColor(wr)
  return (
    <div className="relative flex items-center gap-2 px-2.5 py-1.5" style={{ borderTop: '1px solid var(--divider)' }}>
      {/* trilho de WR ao fundo — some quando a amostra é fraca demais */}
      {!baixa && <span className="absolute bottom-0 left-0 top-0 -z-0 opacity-[0.07]" style={{ width: `${Math.round(wr * 100)}%`, background: cor }} />}
      <span className="z-10 shrink-0">{icon}</span>
      <span className="z-10 min-w-0 flex-1 truncate text-[12px]" style={{ color: 'var(--text)' }} title={nome}>{nome}</span>
      {pick != null && <span className="condensed z-10 shrink-0 text-[9px] tabular-nums" style={{ color: 'var(--text-faint)' }}>{pct(pick)}</span>}
      <span className="condensed z-10 shrink-0 text-[10px] tabular-nums" style={{ color: 'var(--text-faint)' }}>{games}j</span>
      <span className="z-10 shrink-0 text-right text-[12px] font-bold tabular-nums" style={{ width: 44, color: cor }}>
        {pct(wr)}{baixa && <span title={`Amostra baixa: ${games} jogo${games > 1 ? 's' : ''}`}>*</span>}
      </span>
    </div>
  )
}

// Todos os cards mostram no MÁXIMO o mesmo número de linhas e têm altura
// mínima igual. Sem isso, um card com 2 opções e outro com 9 deixavam a
// grade visivelmente irregular — foi a queixa principal do layout anterior.
const LINHAS_POR_CARD = 6
const ALTURA_CARD = 214   // cabeçalho + 6 linhas

function SlotCard({ titulo, icon, accent = CYAN, linhas, vazio = 'sem dados', className }) {
  const extra = linhas.length - LINHAS_POR_CARD
  return (
    <Panel accent={accent} className={`flex min-w-0 flex-col ${className || ''}`} style={{ minHeight: ALTURA_CARD }}>
      <div className="flex items-center justify-between px-2.5 pb-1 pt-2.5">
        <HudTag icon={icon} color={accent}>{titulo}</HudTag>
        {extra > 0 && <span className="condensed shrink-0 text-[9px]" style={{ color: 'var(--text-faint)' }}>+{extra}</span>}
      </div>
      {linhas.length === 0
        ? <p className="px-3 pb-3 text-[11px]" style={{ color: 'var(--text-faint)' }}>{vazio}</p>
        : <div className="pb-1">{linhas.slice(0, LINHAS_POR_CARD)}</div>}
    </Panel>
  )
}

// Cabeçalho de seção — separa visualmente RUNAS de ITENS, que antes eram
// só duas colunas lado a lado sem divisa clara.
function Secao({ icon: Icon, titulo, cor, sub, children }) {
  return (
    <section className="mb-5">
      <div className="mb-2.5 flex items-center gap-2 border-b pb-2" style={{ borderColor: 'var(--divider)' }}>
        <span className="flex h-6 w-6 items-center justify-center rounded" style={{ background: `${cor}22`, color: cor }}>
          <Icon size={14} />
        </span>
        <h2 className="font-display text-base tracking-wide" style={{ color: 'var(--text)' }}>{titulo}</h2>
        {sub && <span className="condensed text-[10px]" style={{ color: 'var(--text-faint)' }}>{sub}</span>}
      </div>
      {children}
    </section>
  )
}

// Uma única grade para as duas seções: 4 colunas no desktop, 2 no tablet,
// 1 no celular. Fixa (não auto-fill) justamente para as duas seções terem
// exatamente o mesmo ritmo de colunas.
const GRADE = 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4'

// Sequência visual da build modal — a resposta de leitura instantânea.
function Sequencia({ passos, info }) {
  const uteis = passos.filter((p) => p.id != null)
  if (!uteis.length) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {uteis.map((p, i) => (
        <div key={`${p.rotulo}-${p.id}`} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight size={13} style={{ color: 'var(--text-faint)' }} />}
          <div className="flex flex-col items-center gap-0.5" title={`${p.rotulo}: ${itemName(info, p.id)} · ${p.games} jogos · ${pct(p.wr)}`}>
            <ItemIcon id={p.id} size={34} />
            <span className="condensed text-[8px]" style={{ color: 'var(--text-faint)' }}>{p.rotulo}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function BuildsRunes() {
  const { champions } = useApp()
  const keyByNorm = useMemo(() => champKeyIndex(champions), [champions])

  const [lista, setLista] = useState([])
  const [champion, setChampion] = useState('')
  const [role, setRole] = useState('')
  const [patch, setPatch] = useState('')
  const [vs, setVs] = useState('')
  const [dados, setDados] = useState(null)
  const [itemInfo, setItemInfo] = useState(null)
  const [runeInfo, setRuneInfo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadItems().then(setItemInfo); loadRunes().then(setRuneInfo) }, [])
  useEffect(() => {
    fetchChampionsWithBuilds().then((l) => {
      setLista(l); setChampion((c) => c || l[0]?.champion || ''); setLoading(false)
    })
  }, [])
  // Trocar de campeão zera o matchup: "vs Rumble" não faz sentido no próximo.
  useEffect(() => { setVs('') }, [champion, role])
  useEffect(() => {
    if (!champion) return
    let cancel = false
    setLoading(true)
    fetchBuildData({ champion, role: role || null, patch: patch || null })
      .then((d) => { if (!cancel) { setDados(d); setLoading(false) } })
      .catch(() => { if (!cancel) setLoading(false) })
    return () => { cancel = true }
  }, [champion, role, patch])

  const { rows, matchupsFiltrados } = useMemo(() => {
    if (!dados) return { rows: [], matchupsFiltrados: [] }
    if (!vs) return { rows: dados.rows, matchupsFiltrados: dados.matchups }
    const f = dados.matchups.filter((m) => m.oponente === vs)
    return { rows: f.map((m) => m.row), matchupsFiltrados: f }
  }, [dados, vs])

  const agg = useMemo(() => (rows.length ? aggregateBuilds(rows, itemInfo) : null), [rows, itemInfo])
  const matchups = useMemo(() => aggregateMatchups(dados?.matchups || []), [dados])

  const linhaItem = (o) => <Linha key={o.id} icon={<ItemIcon id={o.id} size={24} />} nome={itemName(itemInfo, o.id)} games={o.games} wr={o.wr} pick={o.pick} />
  const linhaRuna = (o) => <Linha key={o.id} icon={<RuneIcon id={o.id} info={runeInfo} />} nome={runeName(runeInfo, o.id)} games={o.games} wr={o.wr} pick={o.pick} />

  const sel = lista.find((c) => c.champion === champion)
  const wrGeral = agg?.games ? agg.wins / agg.games : 0
  const topo = (t) => (t?.[0] ? { id: t[0].id, games: t[0].games, wr: t[0].wr } : { id: null })

  return (
    <div>
      <PageHeader
        title="Builds & Runas"
        subtitle="O que os profissionais montam · campeonato · patch 16.13 em diante"
      />

      {/* Filtros — sticky: trocar lane/matchup é o gesto mais repetido aqui */}
      <div className="card sticky top-0 z-20 mb-4 p-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2">
            {champion && <ChampIcon name={champion} keyByNorm={keyByNorm} size={26} />}
            <SearchableSelect value={champion} options={lista.map((c) => ({ value: c.champion, label: `${c.champion} · ${c.games}j` }))}
              onChange={setChampion} allLabel="Selecione…" placeholder="Buscar campeão…" width={220} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="condensed text-[10px]" style={{ color: 'var(--text-faint)' }}>LANE</span>
            {['', ...LANES].map((l) => (
              <button key={l || 'all'} onClick={() => setRole(l)}
                className="clip-notch px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-all"
                style={role === l ? { background: 'var(--accent)', color: '#05060E' }
                  : { background: 'var(--card-bg-soft)', color: 'var(--text-muted)', boxShadow: 'inset 0 0 0 1px var(--card-border)' }}>
                {l || 'Todas'}
              </button>
            ))}
          </div>
          <select value={patch} onChange={(e) => setPatch(e.target.value)} className="field py-1.5 text-sm" style={{ width: 'auto' }}>
            <option value="">Todos os patches (16.13+)</option>
            {(dados?.patches || []).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          {/* Matchup ativo vira um "chip" removível: fica óbvio que há um
              recorte aplicado e como sair dele em um clique. */}
          {vs ? (
            <button onClick={() => setVs('')} className="flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-bold"
              style={{ background: GOLD, color: '#05060E' }} title="Remover filtro de matchup">
              vs {vs} <X size={12} />
            </button>
          ) : (
            <span className="condensed text-[10px]" style={{ color: 'var(--text-faint)' }}>
              clique num matchup abaixo para filtrar
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <p className="flex items-center justify-center gap-2 py-16 text-sm" style={{ color: 'var(--text-faint)' }}>
          <RefreshCw size={15} className="animate-spin" /> Carregando builds…
        </p>
      ) : !agg || !agg.games ? (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <Package size={26} style={{ color: 'var(--text-faint)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Sem builds para este recorte</p>
          <p className="max-w-md text-xs" style={{ color: 'var(--text-faint)' }}>
            Tente outra lane ou remova o filtro de matchup.
          </p>
        </div>
      ) : (
        <>
          {/* 1. Resposta imediata: quem é, como se sai, e a build modal */}
          <div className="card mb-4 flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
            <div className="flex items-center gap-3">
              <ChampIcon name={champion} keyByNorm={keyByNorm} size={44} />
              <div>
                <p className="text-base font-bold" style={{ color: 'var(--text)' }}>{champion}</p>
                <p className="condensed text-[10px]" style={{ color: 'var(--text-faint)' }}>
                  {sel?.role ? `${sel.role} · ` : ''}{agg.games} jogos{vs ? ` · vs ${vs}` : ''}
                </p>
              </div>
            </div>
            <div className="text-center">
              <p className="font-display text-2xl leading-none" style={{ color: wrColor(wrGeral) }}>{pct(wrGeral)}</p>
              <p className="condensed text-[9px]" style={{ color: 'var(--text-faint)' }}>WINRATE</p>
            </div>
            <div className="min-w-0">
              <p className="condensed mb-1 text-[9px]" style={{ color: 'var(--text-faint)' }}>BUILD MAIS COMUM</p>
              <Sequencia info={itemInfo} passos={[
                { rotulo: 'inicial', ...topo(agg.starter) },
                { rotulo: '1º', ...topo(agg.item1) },
                { rotulo: '2º', ...topo(agg.item2) },
                { rotulo: '3º', ...topo(agg.item3) },
                { rotulo: 'botas', ...topo(agg.boots) },
              ]} />
            </div>
            {agg.keystone[0] && (
              <div className="min-w-0">
                <p className="condensed mb-1 text-[9px]" style={{ color: 'var(--text-faint)' }}>KEYSTONE</p>
                <div className="flex items-center gap-2">
                  <RuneIcon id={agg.keystone[0].id} info={runeInfo} size={30} />
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold" style={{ color: 'var(--text)' }}>{runeName(runeInfo, agg.keystone[0].id)}</p>
                    <p className="condensed text-[9px]" style={{ color: 'var(--text-faint)' }}>
                      {pct(agg.keystone[0].pick)} dos jogos · {pct(agg.keystone[0].wr)} WR
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. RUNAS — 4 cards = exatamente uma fileira de 4 */}
          <Secao icon={Sparkles} titulo="RUNAS" cor={CYAN} sub="a página escolhida">
            <div className={GRADE}>
              <SlotCard titulo="Keystone" icon={Sparkles} linhas={agg.keystone.map(linhaRuna)} />
              <SlotCard titulo="Árvores" icon={Sparkles} linhas={[...agg.primary, ...agg.sub].map(linhaRuna)} />
              <SlotCard titulo="Runas escolhidas" icon={Sparkles} linhas={agg.runas.map(linhaRuna)} />
              <SlotCard titulo="Fragmentos" icon={Sparkles} linhas={agg.shards.map(linhaRuna)} />
            </div>
          </Secao>

          {/* 3. ITENS — 8 posições na MESMA grade de 4: duas fileiras cheias.
              "Build final" ocupa 2 colunas para fechar a segunda fileira sem
              deixar buraco. */}
          <Secao icon={Package} titulo="ITENS" cor={GOLD} sub="por ordem de compra">
            <div className={GRADE}>
              <SlotCard titulo="Item inicial" icon={Package} accent={GOLD} linhas={agg.starter.map(linhaItem)} />
              <SlotCard titulo="1º item" icon={Package} accent={GOLD} linhas={agg.item1.map(linhaItem)} />
              <SlotCard titulo="2º item" icon={Package} accent={GOLD} linhas={agg.item2.map(linhaItem)} />
              <SlotCard titulo="3º item" icon={Package} accent={GOLD} linhas={agg.item3.map(linhaItem)} />
              <SlotCard titulo="4º+ item" icon={Package} accent={GOLD} linhas={agg.item4mais.map(linhaItem)} />
              <SlotCard titulo="Botas" icon={Package} accent={GOLD} linhas={agg.boots.map(linhaItem)} />
              <SlotCard titulo="Build final" icon={Package} accent={GOLD} className="sm:col-span-2"
                linhas={agg.itensFinais.map(linhaItem)} />
            </div>
          </Secao>

          {/* 4. Matchups — clicáveis, viram filtro */}
          <Secao icon={Swords} titulo="MATCHUPS DE LANE" cor={GOLD}
            sub={matchups.length ? 'clique para filtrar a página' : null}>
          <Panel accent={GOLD}>
            {matchups.length === 0 ? (
              <p className="p-3 text-[11px]" style={{ color: 'var(--text-faint)' }}>
                Sem oponente de lane identificado — a role vem da timeline, e jogos sem ela ficam de fora.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
                {matchups.map((m) => (
                  <button key={m.champion} onClick={() => setVs(vs === m.champion ? '' : m.champion)}
                    className="text-left transition-colors hover:brightness-125"
                    style={vs === m.champion ? { background: 'var(--card-bg-soft)' } : undefined}>
                    <Linha icon={<ChampIcon name={m.champion} keyByNorm={keyByNorm} size={24} />}
                      nome={m.champion} games={m.games} wr={m.wr} />
                  </button>
                ))}
              </div>
            )}
          </Panel>
          </Secao>

          <p className="mt-4 flex items-start gap-1.5 text-[10px]" style={{ color: 'var(--text-faint)' }}>
            <Info size={12} className="mt-0.5 shrink-0" />
            <span>
              WR sempre com o nº de jogos ao lado; <b>*</b> marca amostra abaixo de {AMOSTRA_BAIXA} jogos, onde a
              porcentagem é ilustrativa. A % antes de "j" é a frequência da escolha naquele slot.
              {agg.gamesComOrdem < agg.games && ` ${agg.gamesComOrdem} dos ${agg.games} jogos têm ordem de compra (o resto não tem timeline).`}
            </span>
          </p>
        </>
      )}
    </div>
  )
}
