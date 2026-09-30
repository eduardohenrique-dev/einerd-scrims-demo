# Desenvolvimento

## Preparando o ambiente

```bash
npm install
npm run dev          # http://localhost:5181 (ou a porta da variável PORT)
```

Não há arquivo `.env` para preencher: o modo demo está sempre ligado e não lê nenhuma chave.

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento, com recarga a quente |
| `npm run build` | build de produção em `dist/` |
| `npm run preview` | serve o build para conferir |
| `npm test` | roda os testes uma vez |
| `npm run test:watch` | testes em modo contínuo |

## Testes

Os testes usam o Vitest e cobrem só lógica pura: não abrem a interface, não usam a rede e não tocam em banco.

| Arquivo | O que cobre |
| --- | --- |
| `src/lib/draftStats.test.js` | registros de pick, winrate por campeão e por jogador, confrontos diretos e a associação do nome de um time do app com um time da base |
| `src/lib/grid/kpis.test.js` | a normalização de um jogo em linhas planas (inclusive o descarte de remakes e jogos sem dados), a identidade de times por elenco e de jogadores por conta, e os indicadores de jogador, time e objetivos |
| `src/lib/grid/proStats.test.js` | presença, tier e winrate de campeões e os objetivos de campeonato |
| `src/lib/grid/buildStats.test.js` | a classificação de itens e a agregação de builds e confrontos |
| `src/lib/grid/regions.test.js` | o agrupamento de ligas em regiões |
| `src/lib/resultColors.test.js` | as cores da escala de winrate |

Os testes de identidade (`ROSTER_OVERRIDES` e `PLAYER_ID_ALIASES`) registram entradas **fictícias** nas tabelas antes de rodar e as removem no fim, já que as tabelas vêm vazias.

## Tarefas comuns

### Mudar o elenco padrão

`src/data/teams.js` (`DEFAULT_TEAMS`) e `src/data/constants.js` (`DEFAULT_ROSTER`).

### Mudar os dados iniciais de blocos e eventos

`src/lib/storage.js`, nas funções `seedBlocks()` e `seedEvents()`.

### Mudar as partidas inventadas da área Dados

`src/demo/seedGrid.js`. O sorteio usa semente fixa, então alterar a semente ou os pools muda todos os números, mas o resultado continua igual a cada visita.

### Acrescentar uma tela

1. Crie o componente em `src/components/<funcionalidade>/`.
2. Importe em `src/App.jsx` e acrescente um `route === 'x'` no `AppShell`.
3. Acrescente um item em `NAV`, na `Sidebar.jsx`.

### Atualizar a versão dos ícones de campeão

A constante `DDRAGON_VERSION`, em `src/data/champions.js`.

### Mexer nas cores e fontes

`tailwind.config.js` e as variáveis CSS em `src/index.css`.

## Convenções de código

- Componentes são funções React com Hooks; não há classes.
- O estilo é feito com classes do Tailwind. As cores do tema vêm de variáveis CSS (`var(--text)`, `var(--card-bg)`…), para funcionar nos dois temas.
- O estado global passa só por `useApp()`, `useAuth()` e `useTheme()`; não há variáveis globais soltas.
- Comentários em português, explicando o **porquê**, não o óbvio.
- Funções que criam objetos começam com `make…` (fábricas).
- Datas são strings `AAAA-MM-DD`. Use os auxiliares de `lib/utils.js` para não cair em problemas de fuso horário.
