# Dados e estatísticas

O app calcula dois tipos de estatística: as de **draft**, que saem dos blocos de treino registrados à mão, e as de **partidas**, que saem de linhas no formato dos dados da GRID (na demo, inventadas). As contas são funções puras, sem rede e sem banco, e por isso têm testes.

## Draft Stats

[`src/lib/draftStats.js`](../src/lib/draftStats.js) parte dos blocos do Histórico de Treinos. Cada jogo com resultado definido gera **um registro por pick**, com o time, a rota, o campeão, o resultado, o pick da mesma rota do outro lado (o matchup direto) e a data. O resultado é sempre do ponto de vista do EiNerd; para o adversário, é invertido.

Com esses registros o app mostra, por time:

- o **winrate por campeão** (vitórias e derrotas de cada pick);
- os **confrontos** de um campeão contra cada pick adversário da mesma rota;
- o **winrate por jogador**, pela rota e pelo nome registrado no pick.

Um jogo sem resultado (em andamento ou não anotado) não entra na conta.

## Dados: indicadores de jogador

[`aggregatePlayers`](../src/lib/grid/kpis.js) agrupa as linhas por jogador. Cada linha é um jogador em um jogo. As médias usam apenas os jogos que **têm estatística**; um jogo sem números conta para o total de jogos e para o pool de campeões, mas não dilui as médias.

| Indicador | Conta |
| --- | --- |
| KDA | (abates + assistências) ÷ máx(mortes, 1) |
| Abates, mortes e assistências | média por jogo |
| CS/min | Σ CS ÷ Σ minutos |
| Ouro/min | Σ ouro ÷ Σ minutos |
| Participação em abates | Σ (abates + assistências) ÷ Σ abates do time |
| Fatia de ouro | Σ ouro ÷ Σ ouro do time |
| Dano/min e fatia de dano | Σ dano ÷ Σ minutos; Σ dano ÷ Σ dano do time |
| Visão/min | Σ pontuação de visão ÷ Σ minutos |
| Wards colocadas, de controle e destruídas por minuto | Σ de cada ÷ Σ minutos |
| First Blood | % dos jogos com o primeiro abate (ignora jogos sem esse dado) |
| Diferença @15 | média de CS, ouro e XP contra o oponente de rota aos 15 minutos, e % de jogos à frente em CS |
| Pool de campeões | contagem dos campeões jogados |

## Dados: indicadores de time

[`aggregateTeams`](../src/lib/grid/kpis.js) agrupa por time.

| Indicador | Conta |
| --- | --- |
| Winrate, e por lado | vitórias ÷ jogos; o mesmo para o lado azul e o vermelho |
| Ouro/min e diferença de ouro/min | Σ ouro ÷ Σ minutos; Σ (ouro − ouro do oponente) ÷ Σ minutos |
| Diferença de torres | média de (torres − torres do oponente) |
| Primeira torre, primeiro dragão e First Blood | % dos jogos (ignora jogos sem o dado) |
| Dragões, arautos, barões e voidgrubs por jogo | médias por jogo |
| Placas de torre por rota | média por jogo em cada rota |
| Dano/min, visão/min, wards/min | por minuto |
| % de wards limpas | wards destruídas ÷ wards colocadas pelo oponente |
| @15 | média de diferença de ouro, CS e torres aos 15 minutos, dragões até os 15 e o winrate **quando está à frente em ouro** aos 15 |

### Macro Intel: objetivos

[`aggregateObjectives`](../src/lib/grid/kpis.js) responde "quando o time garante o objetivo, qual a taxa de vitória?". Para cada objetivo, devolve quantos jogos o time o conquistou, a taxa (`rate`) e o winrate nesses jogos (`wr`):

| Objetivo | Critério |
| --- | --- |
| Barão | ao menos 1 |
| Alma do dragão | 4 dragões ou mais |
| Arauto | ao menos 1 |
| Voidgrubs | 3 ou mais |
| Primeiro dragão, primeira torre, First Blood | o time conseguiu o primeiro |

Para os "primeiros", a taxa considera só os jogos em que o dado existe.

## Meta: tier list

[`aggregateChampions`](../src/lib/grid/proStats.js) calcula, sobre jogos de campeonato, a **presença** de cada campeão (quantos jogos ele foi escolhido ou banido), seus picks, bans e vitórias, e o winrate dos picks. Como num jogo um campeão aparece no máximo uma vez (pick de um time ou ban de um time), picks + bans somados entre jogos é o número de jogos em que ele apareceu.

O **tier** vem da presença:

| Presença | Tier |
| --- | --- |
| 40% ou mais | S |
| de 20% a menos de 40% | A |
| de 8% a menos de 20% | B |
| abaixo de 8% | C |

A aba também tem a tier list **por rota** e os confrontos de um campeão (`aggregateLaneChampions` e `championMatchups`).

## Builds e runas

[`buildStats.js`](../src/lib/grid/buildStats.js) classifica os itens por tipo, monta a sequência de compra de cada jogo e agrega as builds e os confrontos de cada campeão por rota. Os identificadores de item e de runa são os do Data Dragon.

## Regiões

[`regions.js`](../src/lib/grid/regions.js) agrupa ligas em regiões (BR, NA, LATAM, EMEA, KR, CN e APAC), separa ligas de eventos internacionais e deriva a liga de um time pelos torneios em que ele aparece. A tabela de ligas manuais (`MANUAL_TEAM_LEAGUE`) vem vazia neste repositório.

## Identidade de times e de jogadores

Os dados de origem podem entregar um mesmo time ou jogador sob identificadores diferentes (um time sem marca com nome genérico, uma conta reserva). Duas tabelas em `kpis.js` resolvem isso, e ambas vêm **vazias** aqui, com um exemplo no comentário:

- `ROSTER_OVERRIDES`: identifica um time pela assinatura do **elenco** (3 dos 5 jogadores bastam), em vez do `team_id`;
- `PLAYER_ID_ALIASES`: funde as contas de um mesmo jogador num só `player_id`.

Os testes registram entradas fictícias nessas tabelas durante a execução e as removem depois.

## O recorte de datas

A leitura dos dados de scrim ignora o que for anterior a `MIN_DATE` (`gridData.js`, 3 de julho de 2026). O piso vale só para scrims; dados de campeonato não sofrem esse corte. Builds e runas só consideram partidas a partir do patch 16.13.
