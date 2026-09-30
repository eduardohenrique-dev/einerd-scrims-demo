# Como a demo funciona

O app foi escrito para guardar seus dados no Supabase (banco na nuvem com tempo real). Na demo, nada disso existe: um **banco em memória** responde às mesmas chamadas, e uma cópia dele fica no `localStorage` do navegador. Como o código das telas fala com a mesma interface nos dois casos, ele não muda.

```
  componentes ──► lib/db.js, lib/chat.js ... ──► supabase (src/lib/supabase.js)
                                                     │
                                modo demo ligado ────┘
                                                     ▼
                              createDemoSupabase()  ──►  banco em memória
                              (src/demo/demoClient.js)   + cópia no localStorage
```

## O modo demo está sempre ligado

O [`vite.config.js`](../vite.config.js) fixa `import.meta.env.VITE_DEMO = '1'` e **zera** `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no código. Em [`src/lib/supabase.js`](../src/lib/supabase.js), com a flag ligada, o cliente é o de demonstração e nenhuma URL é lida. Então a demo não tem como falar com um banco de verdade, mesmo que exista um arquivo `.env` com chaves.

O caminho do app original (criar o cliente real do Supabase a partir de variáveis de ambiente) ainda está no código, mas fica desligado e **não é exercitado por este repositório**.

## O imitador do `supabase-js`

[`src/demo/mockSupabase.js`](../src/demo/mockSupabase.js) reproduz a parte do `supabase-js` que o app usa, sobre um objeto `{ tabela: linhas[] }`:

- consultas com `select` e filtros, ordenação, `single` e `maybeSingle`;
- `insert`, `update`, `upsert` e `delete`;
- **tempo real**: as mudanças feitas na aba são reemitidas para as assinaturas da própria aba, e é isso que mantém as telas e o chat atualizados;
- `createLocalDb`: o banco em memória, com persistência no `localStorage` (chave `einerd-scrims:demo:db`).

A inicialização está em [`src/demo/demoClient.js`](../src/demo/demoClient.js): se não houver nada salvo, o banco é montado por `seed()`, que reúne os times, os blocos, os eventos, as mensagens do chat e as partidas.

## Restaurar

A faixa amarela no topo (`DemoBanner`) tem o botão **Restaurar demo**. Ele apaga a cópia do `localStorage` e recarrega a página com os dados iniciais. Apagar os dados do site no navegador tem o mesmo efeito.

## Os dados fictícios

### Blocos e calendário

Vêm de `seedBlocks()` e `seedEvents()`, em [`src/lib/storage.js`](../src/lib/storage.js): seis blocos contra adversários inventados (Tigres Academy, Aurora Five, Lobo Esports, Farol Gaming, Cometa e Dragões de Jade) e uma agenda de junho com scrims, reviews, reuniões e folgas. Só o primeiro bloco tem o draft do primeiro jogo preenchido; nos demais há apenas os resultados. As datas são **deslocadas** para que o bloco mais recente fique dois dias antes de "hoje" e a agenda caia ao redor do dia atual, senão o painel abriria com "0 blocos no mês".

### Elenco e contas

O time é o **EiNerd**, com cinco jogadores inventados: Rocha (top), Cipó (jungle), Lume (mid), Faísca (bot) e Âncora (suporte). As contas de login são todas fictícias, com a senha `demo`:

| Usuário | Papel |
| --- | --- |
| `visitante` | admin (entra direto, sem tela de login na primeira visita) |
| `Rocha`, `Cipó`, `Lume`, `Faísca`, `Âncora` | jogador |

### A área de Dados

[`src/demo/seedGrid.js`](../src/demo/seedGrid.js) gera as partidas com um **sorteio de semente fixa** (`mulberry32`, semente 2026): o resultado é sempre o mesmo. Nenhum número veio da GRID ou da Riot. Ele cria:

- 4 times de scrim (o EiNerd e três adversários) e 4 times profissionais, com jogadores inventados;
- partidas de scrim e de campeonato, com patches entre 16.14 e 16.17, no formato das tabelas `grid_*` (séries, times, jogadores, builds, caminhos do jungler e wards);
- escolhas de campeão sorteadas dentro de um pool por rota, e itens e runas com identificadores reais do Data Dragon, só para a aba Builds ter ícones.

O time do usuário tem o id fictício `900001`, e a aba Dados abre filtrada nele.

## O chat

O widget de chat mostra mensagens de exemplo entre `visitante`, `Lume` e `Rocha`, inclusive uma não lida. As mensagens novas ficam no banco da demo, como o resto.

## O que a demo não faz

- Não baixa replays: o botão de download, na área de Dados, avisa que o recurso está indisponível na demonstração.
- Não sincroniza entre abas ou visitantes: o "tempo real" é local, só dentro da aba.
- Os ícones de campeões, itens e runas vêm do **Data Dragon**, o CDN público da Riot, e exigem internet.
