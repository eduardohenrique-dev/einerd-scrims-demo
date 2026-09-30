# Arquitetura

Uma aplicação de página única em **React 18**, empacotada com **Vite 6** e estilizada com **Tailwind CSS 3**. Não há biblioteca de rotas nem gerenciador de estado externo: a navegação é uma variável de estado, e o estado global vem da Context API do React.

## Estrutura

```
einerd-scrims-demo/
├─ index.html, vite.config.js, tailwind.config.js
├─ public/                  ícones do app, objetivos e minimapa (SVGs próprios)
└─ src/
   ├─ main.jsx              liga o React na página
   ├─ App.jsx               casca: login, provedores e a tela ativa
   ├─ index.css             estilos globais, variáveis de tema e fontes
   ├─ context/              estado global
   │  ├─ AppContext.jsx       blocos, times, eventos e campeões + sincronização
   │  ├─ AuthContext.jsx      usuário logado
   │  └─ ThemeContext.jsx     tema claro e escuro
   ├─ lib/                  lógica sem interface
   │  ├─ supabase.js, db.js, chat.js, personalNotes.js   acesso aos dados
   │  ├─ storage.js           fábricas de bloco e jogo, e os dados iniciais
   │  ├─ auth.js              login local
   │  ├─ backup.js            exportar e importar em JSON
   │  ├─ draftStats.js        estatísticas de draft
   │  ├─ utils.js             datas, placares, ids
   │  └─ grid/                estatísticas de partidas (kpis, proStats, buildStats, regions, gridData)
   ├─ data/                 dados de domínio: campeões, constantes, time padrão
   ├─ demo/                 o banco em memória e os dados fictícios
   └─ components/           interface, por funcionalidade
      ├─ auth/ layout/ dashboard/ block/ calendar/
      ├─ stats/ drafttool/ data/ notes/ kanban/ settings/ chat/ ui/
```

**Regra para achar as coisas:** `data/` é fato fixo, `lib/` é função sem tela, `context/` é estado global e `components/` são as telas e os botões.

## Como o app inicia

```
index.html ─► main.jsx ─► <App/>
                            ├─ <ThemeProvider>
                            ├─ há usuário salvo?  não ─► <LoginGate/>
                            └─ sim ─► <AuthProvider> ─► <AppProvider> ─► <AppShell/>
                                                          (carrega os dados)   (menu + tela atual)
```

`App.jsx` consulta o usuário guardado (`getStoredUser`); sem ele, mostra o login. Com ele, monta os provedores e a casca. O `AppProvider` carrega os dados antes de liberar a tela. A "rota" é uma string (`'dashboard'`, `'calendar'`, `'draftstats'`, `'drafttool'`, `'dados'`, `'builds'`, `'settings'`, `'notes'`).

## O estado global: `AppContext`

É o arquivo central. Guarda `blocks`, `events`, `teams` e `champions`, e expõe as ações (`createBlock`, `updateGame`, `createEvent`, `createTeam`…) pelo hook `useApp()`.

### Como os dados fluem

- **Leitura:** ao abrir, o provedor busca cada tabela. Se o banco estiver vazio, semeia os dados iniciais.
- **Escrita com atualização otimista:** a ação muda o estado local primeiro (a tela responde na hora) e depois grava no banco. A gravação tem *debounce* de 350 ms, para que digitar uma duração, por exemplo, não dispare uma escrita a cada tecla.
- **Tempo real:** `subscribeTable` escuta as mudanças do banco e atualiza o estado. Na demo, isso é local à aba.
- Referências (`teamsRef`, `blocksRef`…) guardam o valor atual do estado para serem lidas dentro de `useCallback`, sem recriar as funções a cada renderização.

### Campeões: base mais customizações

A lista final é a soma de `DEFAULT_CHAMPIONS` (no código, em `data/champions.js`) com os *overrides* guardados no banco. Adicionar ou editar grava um override. Apagar um campeão da base grava uma **lápide** `{ id, _deleted: true }`, já que não dá para deletar de verdade algo que só existe no código.

## Modelo de dados

Existem dois formatos de tabela:

### Tabelas "documento"

`teams`, `blocks`, `events`, `champions`, `event_types` e `kanban` guardam um objeto JSON inteiro na coluna `data` (`id` + `data` + `updated_at`). Isso deixa o formato flexível: o objeto muda sem mexer no banco. O acesso passa por [`lib/db.js`](../src/lib/db.js) (`fetchAll`, `upsertDoc`, `removeDoc`, `clearTable`, `subscribeTable`).

Um **bloco**:

```js
{
  id, opponent, date,          // adversário e data (AAAA-MM-DD)
  gamesCount,                  // quantidade de jogos (Bo3, Bo5…)
  vodUrl, createdAt, updatedAt,
  games: [
    {
      id, index,               // número do jogo
      result,                  // 'win' | 'loss' | null, sempre do ponto de vista do EiNerd
      duration, notes, ourSide,
      blue: { team, bans: [5], picks: [5] },
      red:  { team, bans: [5], picks: [5] },
    },
  ],
}
```

Cada pick é `{ championId, role, player }` e cada ban é um `championId` ou `null`.

### Tabelas com colunas normais

`personal_notes` (uma linha por usuário, com o caderno, os matchups e a tier list) e `chat_messages` (`from_username`, `to_username`, `message`, `read`, `created_at`). As estatísticas de partidas vivem em tabelas `grid_*` (séries, times, jogadores, builds), lidas por `lib/grid/gridData.js`.

## Autenticação

[`lib/auth.js`](../src/lib/auth.js) é um login **local e simples**, feito para identificar quem está usando (para separar as notas pessoais e o chat), e **não** é segurança forte. A lista de usuários é fixa no código, e o `username` logado fica no `localStorage`. Os papéis são `admin` e `player` (mais o `matchviewer`, sem contas na demo).

## Interface

Componentes de função com Hooks, sem classes. O estilo é Tailwind com as cores do tema em variáveis CSS (`var(--text)`, `var(--card-bg)`…), para funcionar nos temas escuro e claro. Os cartões têm cantos chanfrados (`clip-notch`), numa estética de interface de jogo. As fontes são Anton, Oswald e Inter, vindas do Google Fonts.

## Módulos de estatística

Toda a conta de indicadores fica em `lib/grid/` e em `lib/draftStats.js`, sem efeitos colaterais e sem acesso a rede, o que as deixa testáveis. Estão descritas em [dados e estatísticas](dados-e-estatisticas.md).
