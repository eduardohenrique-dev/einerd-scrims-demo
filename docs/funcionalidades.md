# Funcionalidades

O menu lateral tem oito telas (a de Configurações só aparece para administradores). A navegação é um estado simples do app, sem rotas de URL.

## Vocabulário

| Termo | Significado |
| --- | --- |
| **Scrim** | treino competitivo contra outro time |
| **Bloco** | uma sessão de scrim contra um adversário, com vários jogos (Bo3, Bo5…) |
| **Jogo** | uma partida dentro do bloco |
| **Draft** | a fase de escolher (pick) e banir (ban) campeões antes do jogo |
| **VOD** | a gravação da partida, para revisão |

## Login e papéis

A entrada é uma tela de login com usuário e senha. Na demo, a primeira visita já entra como **Visitante**. Há dois papéis na demo:

| Papel | Vê |
| --- | --- |
| **admin** (staff) | tudo, incluindo Configurações e o quadro kanban das Notas Pessoais |
| **player** | as telas do dia a dia; não vê Configurações nem o kanban |

O código também prevê um terceiro papel, o **convidado externo** (`matchviewer`), que só enxerga a aba Match History da área de Dados. A demo não traz nenhuma conta com esse papel.

Confira as contas em [como a demo funciona](modo-demo.md#elenco-e-contas).

## Histórico de Treinos

O painel inicial. Quatro cartões: **blocos no mês**, **winrate dos jogos**, **winrate dos blocos** (um bloco só conta quando o último jogo tem resultado, e é vitória se ganhou mais jogos do que perdeu) e **próximo treino**. Abaixo, os **treinos recentes**, em grade ou em lista, com busca por adversário e o botão **Novo bloco**.

Cada cartão mostra o adversário, a data, o formato (Bo3, Bo5), o placar, a marca de VOD e as bolinhas de cada jogo.

### Novo bloco

Pede o adversário, a data, a quantidade de jogos e o lado em que o EiNerd joga. O lado pode ser trocado em cada jogo depois.

### Detalhe do bloco

- O **VOD do bloco**, com um campo de link e o botão de abrir.
- Uma aba por jogo, com um ponto colorido pelo resultado.
- O **draft** de cada jogo: 5 bans e 5 picks por lado, com a ordem do pick, a rota e o jogador. Escolher um campeão abre um seletor com busca e filtro por rota.
- O resultado do jogo (vitória ou derrota, sempre do ponto de vista do EiNerd), a duração, o botão de trocar o lado e as **notas do coach** daquele jogo.
- Editar o bloco (adversário e quantidade de jogos), o modo de visualização e excluir.

## Calendário

Grade mensal de eventos, com tipos coloridos: scrim, review, reunião, folga e os que você criar (nome e cor, pelo editor de categorias do próprio calendário). No celular, a grade mostra só pontos, e um painel abaixo lista os eventos do dia selecionado.

O tipo **scrim** é especial: criar um evento desse tipo gera **automaticamente um bloco** no Histórico, com o título do evento como adversário, e apagar o evento remove o bloco ligado a ele. Por isso o tipo scrim não pode ser excluído, só renomeado e recolorido. Um tipo de evento também não pode ser apagado enquanto houver eventos que o usam.

## Draft Stats

O winrate de campeões do EiNerd e dos adversários, vindo dos drafts registrados nos blocos. Duas visões: **Por Campeão** e **Por Jogador**, com o resumo do time (picks vencidos e perdidos, winrate e jogos na base) e, em cada campeão, o KDA médio e os confrontos. As contas estão em [dados e estatísticas](dados-e-estatisticas.md#draft-stats).

## Draft Tool

Um simulador de pick e ban na **ordem oficial do draft competitivo**. Os bans e os picks dos dois lados são preenchidos na sequência, com busca e filtro por rota. O clique num campeão já usado o remove do slot. O botão **Reset** limpa tudo.

## Dados

Estatísticas de partidas. Cinco abas: **Jogadores**, **Times**, **Radar**, **Match History** e **Tierlist Meta**. Os filtros são:

| Filtro | Opções |
| --- | --- |
| Região | todas, ou uma região (BR, NA, LATAM, EMEA, KR, CN, APAC) |
| Time | qualquer time da base (abre no EiNerd) |
| Origem | scrim, campeonato ou ambos |
| Período | 7, 14 ou 30 dias, tudo, ou um intervalo de datas |

- **Jogadores**: um cartão por jogador, com KDA, participação, dano, economia, visão e o pool de campeões, em formato visual ou de tabela, e o botão **Comparar**.
- **Times**: winrate, por lado, objetivos, economia e o painel de **Macro Intel** (taxa de vitória condicional a cada objetivo).
- **Radar**: um mapa com os pontos por onde o jungler passou (**Jungler**) ou onde foram colocadas as **wards**, por lado azul ou vermelho.
- **Match History**: as partidas de campeonato, com os drafts dos dois times e o vencedor.
- **Tierlist Meta**: a presença, o winrate e o tier de cada campeão nos jogos de campeonato, por rota e com os confrontos.

Como cada indicador é calculado: [dados e estatísticas](dados-e-estatisticas.md).

## Builds & Runas

As builds e as runas mais usadas por campeão e rota, com a sequência de compra, e os confrontos diretos. Dá para filtrar por rota e por oponente.

## Notas Pessoais

Um espaço privado de cada usuário:

- **caderno de matchups**: seu campeão contra o do oponente, com anotações por linha;
- **anotações livres** com formatação e cores aplicadas ao trecho selecionado;
- **tier list** pessoal;
- um **quadro kanban** estilo FigJam, visível só para administradores.

## Configurações (admin)

- **Times**: cadastro de adversários, com logo, cores, sigla, tag, contato e jogadores. O perfil do EiNerd fica na barra lateral.
- **Campeões**: a lista vem da base do código; dá para adicionar, trocar a foto e remover.
- **Backup**: exportar e importar todos os dados em JSON.
- **Zona de perigo**: apagar todos os dados, o que exige digitar uma frase de confirmação.

Na demo, tudo isso mexe apenas no banco em memória do navegador.

## Chat

Um botão flutuante no canto inferior direito abre a conversa entre os usuários. Cada conversa é entre duas pessoas, com contador de não lidas, e o staff aparece como "Staff" e os demais como "Jogador".

## Tema claro e escuro

Um botão na barra lateral alterna o tema. O escuro é o padrão. As cores vêm de variáveis CSS e a escolha fica no navegador.
