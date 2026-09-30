# Documentação

Este é o mapa da documentação do **EiNerd Scrims (demo)**. Para a visão geral e para rodar, comece pelo [README](../README.md).

| Documento | Para quê |
| --- | --- |
| [Como a demo funciona](modo-demo.md) | o banco em memória, o imitador do `supabase-js`, os dados inventados e o que fica de fora |
| [Funcionalidades](funcionalidades.md) | cada tela do app, com as regras de cada uma |
| [Dados e estatísticas](dados-e-estatisticas.md) | os indicadores calculados e como a área de Dados funciona |
| [Arquitetura](arquitetura.md) | pastas, estado global, como os dados fluem e o modelo dos blocos |
| [Desenvolvimento](desenvolvimento.md) | testes e convenções de código |

## O que esta demo é (e o que não é)

O EiNerd Scrims original é uma ferramenta interna de um time de esports, com banco na nuvem, contas reais e dados de partidas reais, e por isso é privado. Este repositório reúne a **interface e a lógica de cálculo** do app, com uma camada de demonstração no lugar do banco: tudo roda no navegador, sobre dados fictícios.

O que **não** está aqui:

- o banco (esquema SQL, políticas e configuração do projeto);
- as rotinas que baixam partidas e alimentam o banco;
- as contas e as senhas reais, os nomes de jogadores e adversários reais e os identificadores de times e jogadores dos dados de origem. As tabelas de equivalência que o código usa para isso vêm **vazias**, com um exemplo no comentário.

Comentários que falam de "ingestão" ou de "dados da GRID" se referem a esse lado que fica de fora. Na demo, o formato dos dados é o mesmo, mas o conteúdo é inventado.
