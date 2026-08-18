---
emoji: 🔧
title: 'O Biome pode substituir o ESLint e o Prettier?'
seoTitle: 'Biome vs ESLint vs Prettier — Comparativo de desempenho e migração para uma toolchain all-in-one baseada em Rust'
date: '2024-12-01'
categories: 프론트엔드 자바스크립트
description: "Comparamos o desempenho de linting e formatação do Biome com ESLint e Prettier, além da experiência prática de adoção e de um guia de migração para essa toolchain all-in-one baseada em Rust."
keywords: "Biome vs ESLint, Biome vs Prettier, migração para Biome, comparação de linters JavaScript, linter baseado em Rust, ferramentas de desenvolvimento frontend"
locale: pt-BR
translationOf: '241201'
sourceHash: 16af1949a7c5575b586c919af82c78646819b783ebee024a579d48a0c0ac5032
---

Neste post, quero falar sobre uma ferramenta chamada Biome.

A equipe em que trabalho enfrentava bastante dificuldade para manter um estilo de código consistente em um ambiente no qual as pessoas usavam IDEs diferentes, como WebStorm e VSCode. Também era trabalhoso gerenciar arquivos de configuração separados para cada IDE, e as revisões de código frequentemente recebiam comentários sobre diferenças de formatação sem relação com a lógica.

Nesse cenário, as regras de formatação do ESLint foram marcadas como Deprecated, e tivemos que procurar uma nova alternativa. A combinação **Prettier + ESLint** exigia configurações adicionais para evitar conflitos entre as ferramentas, enquanto o **@stylistic/eslint-plugin-ts** ainda estava em uma fase inicial de adoção pela comunidade e não tinha estabilidade suficientemente comprovada. Foi então que o Biome chamou nossa atenção.

Mas o que exatamente é o Biome e será que ele realmente pode substituir o ESLint e o Prettier?

<hr>

## O que é o Biome?

O Biome é uma toolchain all-in-one para projetos web. Ele oferece, em uma única ferramenta, formatação e linting integrados para código JavaScript, TypeScript, JSX, CSS, JSON, GraphQL e muito mais. Sua filosofia central é cumprir, com um único binário, os papéis que tradicionalmente ficavam divididos entre ESLint e Prettier.

O antecessor do Biome foi o [Rome](https://github.com/rome/tools). A **Rome Tools Inc.** começou com grandes ambições depois de captar US$ 4,5 milhões em investimento de venture capital em 2021, mas, em meados de 2023, demitiu todos os funcionários e arquivou o repositório. Depois disso, os principais contributors fizeram um fork do projeto e o relançaram como Biome em agosto de 2023. Deixando para trás a imagem do Rome de “prometer demais e entregar de menos”, o projeto vem conquistando confiança com releases práticas e constantes.

Sua característica mais marcante é ter sido escrito em Rust. Mais adiante, veremos em detalhes a diferença que isso faz no desempenho.

<hr>

## Por que usar o Biome?

Há três motivos principais para escolher o Biome.

**Uma única ferramenta cuida tanto da formatação quanto do linting.** Com a combinação ESLint + Prettier, eram necessárias configurações adicionais, como `eslint-config-prettier`, para evitar conflitos de regras entre as duas ferramentas. O Biome elimina essa complexidade pela raiz.

**O desempenho é impressionante.** Segundo os benchmarks oficiais, ele é cerca de 25 vezes mais rápido que o Prettier e aproximadamente 15 vezes mais rápido que o ESLint. Mais adiante, vamos comparar diretamente o que esses números representam na prática.

![1.png](1.png)

**Ele é compatível com as ferramentas existentes.** O Biome oferece cerca de 97% de compatibilidade de formatação com o Prettier e inclui nativamente as principais regras do ESLint. Regras de plugins usados com frequência, como `eslint-plugin-react-hooks` e `eslint-plugin-jsx-a11y`, também vêm integradas, o que torna a migração relativamente tranquila.

<hr>

## Como usar?

A configuração do Biome é bastante simples. A [documentação oficial](https://biomejs.dev/guides/getting-started/) explica tudo de forma clara, então vale consultá-la.

Primeiro, instale o Biome.

```bash
npm install --save-dev --save-exact @biomejs/biome
```

Depois, gere o arquivo de configuração.

```bash
npx @biomejs/biome init
```

Isso cria um arquivo `biome.json`. Nele, você pode definir as regras de formatação e linting da equipe.

Também é preciso instalar uma extensão para a IDE. Se você usa VSCode, instale o [VSCode Biome](https://marketplace.visualstudio.com/items?itemName=biomejs.biome); se usa WebStorm, instale o plugin [WebStorm Biome](https://plugins.jetbrains.com/plugin/22761-biome).

Por fim, adicione a configuração abaixo ao `settings.json` do VSCode para aplicar automaticamente a formatação e o linting ao salvar.

```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  }
}
```

<hr>

## Vamos comparar diretamente

Dizer apenas que é rápido não torna a diferença muito concreta, então comparei o Biome e o ESLint + Prettier no mesmo projeto. À esquerda está o Biome; à direita, o ESLint + Prettier.

### Tempo de execução local de um projeto Vite

![biome1.png](biome1.png)  ![lint1.png](lint1.png)


O Biome levou **506ms**, enquanto o ESLint + Prettier levou **630ms**, resultando em um tempo de execução cerca de 20% menor.

<hr>

### Tempo de build de um projeto Vite

![biome2.png](biome2.png) ![lint2.png](lint2.png)


O Biome levou **117.13s**, enquanto o ESLint + Prettier levou **131.48s**, resultando em um tempo de build cerca de 10% menor.

<hr>

### Tarefa de linting

![biome3.png](biome3.png) ![lint3.png](lint3.png)

A maior diferença apareceu na tarefa de linting. O Biome levou **0.79s** (CPU 0.470s), enquanto o ESLint levou **16.32s** (CPU 8.600s), ou seja, **o Biome apresentou um desempenho cerca de 20 vezes mais rápido**. O uso da CPU também foi muito mais eficiente.

A diferença já é perceptível no ambiente de desenvolvimento, mas se torna ainda mais drástica quando uma pipeline de CI/CD verifica centenas de arquivos. Como o Biome pode executar seu binário diretamente, sem instalação via npm, ele também reduz o tempo de cold start do CI.

<hr>

![3.jpeg](3.jpeg)

Hmm... (A essa altura, é mais difícil encontrar um motivo para não usar.)

<hr>

## Por que ele é tão rápido?

“É rápido porque foi feito em Rust” é uma afirmação correta, mas não explica tudo. Vamos examinar os fatores técnicos específicos por trás da vantagem de desempenho do Biome.

<hr>

### Desempenho de baixo nível do Rust

| ![5.webp](5.webp) | ![6.webp](6.webp) |
| --- | --- |

O Biome é escrito em Rust, uma linguagem de programação de sistemas. O Rust é voltado para abstrações de custo zero (Zero-cost Abstraction), o que significa que abstrações de alto nível podem ter o mesmo desempenho de código de baixo nível otimizado manualmente. Além disso, ele gerencia a memória por meio de um sistema de ownership, sem garbage collector (GC), evitando o overhead de runtime causado pelo GC.

Já o ESLint e o Prettier são escritos em JavaScript e executados sobre o runtime do Node.js. Embora a compilação JIT (Just-In-Time) do motor V8 otimize o JavaScript, ela não consegue evitar completamente as limitações fundamentais de uma linguagem interpretada nem o custo da coleta de lixo.

<hr>

### Arquitetura de parsing único

O Biome faz o parsing do código apenas uma vez com um único parser para gerar uma AST (Abstract Syntax Tree, árvore sintática abstrata). Essa AST é reutilizada tanto na formatação quanto no linting.

O que acontece quando usamos a combinação ESLint + Prettier? O ESLint faz o parsing do código, cria uma AST e executa o linting; depois, o Prettier analisa o mesmo código novamente, cria outra AST e executa a formatação. O mesmo arquivo passa por parsing duas vezes. A arquitetura de parsing único do Biome elimina essa duplicação na origem.

<hr>

### Processamento paralelo nativo

![7.png](7.png)

Aproveitando o modelo de concorrência do Rust, o Biome processa arquivos em paralelo em várias threads. Ele divide o trabalho em unidades pequenas e distribui a carga de forma eficiente entre as threads por meio de um scheduler de work-stealing. Como o sistema de ownership do Rust impede data races em tempo de compilação, o custo de sincronização durante o runtime também é minimizado.

O Node.js usa, por padrão, um modelo single-thread baseado em event loop. É possível obter processamento paralelo com Worker Threads, mas isso acrescenta overhead devido à criação de threads e ao message passing. O Biome usa diretamente threads nativas no nível do sistema operacional e, por isso, consegue aproveitar ao máximo os núcleos da CPU sem esse overhead.

<hr>

### Processamento de AST eficiente em memória

![4.svg](4.svg)

O Biome usa uma CST (Concrete Syntax Tree, árvore sintática concreta). Segundo a documentação oficial de arquitetura do Biome, essa CST implementa o padrão Green/Red Tree com base em um fork interno da biblioteca rowan, preservando todas as informações do código original, incluindo comentários e espaços em branco. A alocação de memória no estilo arena da rowan coloca os nós em regiões contíguas de memória, melhorando a localidade de cache (Cache Locality) da CPU e minimizando alocações desnecessárias de objetos.

No processamento de AST baseado em objetos do JavaScript, cada nó existe como um objeto independente no heap, o que dispersa a memória e aumenta a pressão sobre o GC. A abordagem do Biome permite percorrer a árvore mais rapidamente usando menos memória.

<hr>

## Então, vale a pena adotar o Biome?

O desempenho e a praticidade do Biome são claramente atraentes. No entanto, não acredito que adotá-lo sem ressalvas seja a resposta certa para todos os projetos. Vamos analisar algumas considerações práticas.

<hr>

### Quando o Biome é uma boa opção

- Quando você mantém uma **base de código de grande escala** em que o desempenho de build e linting é importante
- Quando quer reduzir o tempo de verificação de código em uma pipeline de CI/CD
- Quando está cansado da complexidade de configurar ESLint + Prettier
- Quando está iniciando um projeto novo e quer uma configuração de ferramentas simples

Minha equipe também mantinha um projeto de grande escala no qual o linting consumia muito tempo da pipeline de CI, e os desenvolvedores se incomodavam com a lentidão desse processo. Por isso, decidimos adotar o Biome.

<hr>

### Pontos que exigem atenção

**A maior limitação é o ecossistema de plugins.** O ESLint tem milhares de plugins da comunidade, enquanto o Biome se concentra em regras integradas. Muitas regras de plugins importantes, como `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, `eslint-plugin-unicorn` e `typescript-eslint`, vêm incluídas, mas nem todas as regras de cada plugin foram portadas. Um sistema de plugins baseado em GritQL foi anunciado para o Biome v2, porém ainda está em fase experimental. Projetos que dependem de regras específicas de frameworks, como `@next/eslint-plugin-next` ou `eslint-plugin-angular`, precisam abordar a migração com cautela.

**Também é preciso verificar o escopo do suporte a linguagens.** JavaScript, TypeScript, JSX, CSS, JSON e GraphQL têm suporte estável, mas, nos arquivos SFC (Single File Component) do Vue e do Svelte, apenas o bloco `<script>` tem suporte parcial. HTML, YAML e Markdown ainda não são compatíveis.

**Não podemos esquecer que o ESLint também está evoluindo.** O Flat Config (`eslint.config.js`), introduzido no ESLint v9 em abril de 2024, simplificou significativamente a complexidade do antigo formato `.eslintrc`. Além disso, com os lançamentos de `@eslint/json` em outubro de 2024 e `@eslint/css` em fevereiro de 2025, o ESLint vem expandindo o linting para linguagens além do JavaScript. O projeto ESLint Stylistic (`@stylistic/eslint-plugin`) oferece a opção de cuidar da formatação somente com o ESLint, sem o Prettier. Assim, a vantagem “all-in-one” do Biome está sendo um pouco reduzida pela evolução do ecossistema do ESLint.

Também vale lembrar a história da transição do Rome para o Biome. Os transtornos enfrentados pelos usuários existentes quando o Rome foi arquivado mostram como a sustentabilidade de um projeto é importante na escolha de uma ferramenta. Felizmente, o Biome é financiado pelo OpenCollective e pelo GitHub Sponsors e mantém um ritmo constante de releases.

![8.png](8.png)

Segundo o npm trends, os downloads semanais do Biome, cerca de 6,9 milhões, ainda estão bem abaixo dos aproximadamente 120 milhões do ESLint e dos 82 milhões do Prettier. Mas a velocidade de crescimento do Biome chama a atenção. Em pouco mais de um ano, os downloads semanais aumentaram mais de três a quatro vezes, com uma alta especialmente visível na adoção por projetos novos.

<hr>

## Conclusão

Minha resposta à pergunta sobre o Biome poder substituir completamente o ESLint e o Prettier é: **“ainda não, mas ele é uma alternativa muito forte”**.

O desempenho é impressionante, a configuração é simples e o ritmo de desenvolvimento é rápido. Porém, a imaturidade do ecossistema de plugins e as limitações no suporte a algumas linguagens podem ser obstáculos, dependendo do projeto. O ideal é analisar cuidadosamente a stack tecnológica do projeto e as necessidades da equipe antes de decidir pela adoção.

Uma coisa é certa: o ecossistema de ferramentas frontend está avançando na direção de soluções “mais rápidas, mais simples e mais integradas”. É inegável que o Biome está na linha de frente desse movimento. Sem dúvida, é uma ferramenta cujo crescimento futuro merece atenção.

## Referências

:::ref
:::
