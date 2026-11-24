---
emoji: '🧭'
title: 'Dois anos usando Biome: uma avaliação'
seoTitle: 'Biome e ESLint após dois anos de uso'
date: '2026-11-15'
categories: frontend JavaScript
description: 'Usei o Biome por quase dois anos: medi integração e velocidade, lacunas do ESLint, custo das regras com tipos e diferenças ao migrar para o Biome 2.'
keywords: 'Biome, ESLint, Prettier, Biome 2, migração, frontend, análise estática'
locale: pt-BR
translationOf: '261115'
sourceHash: feec0e755ce7548b6041920f4a0c6c5c69e93f2b62859ef17347e02523e41d8a
---

Para quem usa ESLint e Prettier e está pensando em migrar para o Biome ou passar do Biome 1 para o 2, reuni as medições e os resultados da migração que obtive no meu código. Introduzi o Biome 1.9.4 em dois serviços frontend da empresa em novembro de 2024 e janeiro de 2025. [O Biome pode substituir o ESLint e o Prettier?](/241201) é o artigo introdutório que escrevi logo após a adoção.

Em resumo, nos dois serviços o Biome reuniu as configurações em um só lugar, e a verificação completa ficou na faixa de 0,2 segundo mesmo depois de o número de arquivos quase dobrar. Nesse processo, perdemos algumas verificações do ESLint e, ao migrar para o Biome 2, surgiu um diff grande, incluindo a ordenação dos imports. Com base no que observei, vou distinguir as tarefas que o Biome assume daquelas que não assume.

## Integração das configurações e velocidade das verificações

Antes da migração, as configurações não eram gerenciadas em um só lugar. As configurações do ESLint estavam tanto em `.eslintrc.js` quanto em `package.json` com `eslintConfig`, mas o ESLint 8 lia apenas um arquivo de configuração na mesma pasta. A configuração no `package.json` incluía a extensão airbnb, mas a configuração airbnb nem sequer estava instalada. Regras que não eram aplicadas estavam descritas como se estivessem em vigor.

As opções do Prettier também estavam divididas entre `.prettierrc` e a regra `prettier/prettier` do ESLint, e a ordenação dos imports ficava em separado nas configurações do ESLint. No Biome, lint, formatação e ordenação dos imports são definidos em um único `biome.json`. As dependências de desenvolvimento relacionadas a lint e formatação caíram de 12 para 1 em um serviço e de 10 para 1 no outro. Com uma única fonte para decidir quais configurações se aplicam, também diminuiu a possibilidade de as regras descritas divergirem das regras realmente aplicadas.

Comparei a velocidade verificando, sem cache, os 751 arquivos `src` do código imediatamente anterior à adoção, em um Apple M2 Max de 12 núcleos. A pilha ESLint 8.57 levou de 10.34 a 10.93 segundos, enquanto o `check` do Biome 1.9.4 levou de 0.21 a 0.22 segundo, incluindo lint, formatação e ordenação dos imports. Fiz cinco medições de cada. No entanto, os dois lados não verificavam o mesmo conjunto de regras.

Ao desativar a regra `prettier/prettier` no ESLint, o tempo caiu para 5.31 a 5.35 segundos, aproximadamente a metade. Executar o Prettier como regra de lint, reanalisando cada arquivo, respondia por metade do tempo. Depois que o `--cache` do ESLint era preenchido, o tempo ficava entre 0.85 e 0.91 segundo. Ao limitar o Biome a uma thread, o tempo foi de 1.26 segundo.

A partir desses resultados, inferi ao contrário que, dos 0.22 segundo, o processamento paralelo respondia por cerca de 6 vezes e a estrutura restante — binário nativo e uso compartilhado da árvore analisada uma vez pelo lint e pela formatação — por cerca de 8 vezes. Esses valores não resultam de medições em que cada fator foi controlado separadamente; são uma inferência baseada nas medições acima.

Em novembro de 2026, o mesmo serviço tinha crescido para 1,457 arquivos `src`. O tempo reportado pelo próprio `check` do Biome 1.9.4 foi de 220 a 275ms; o do Biome 2.6.8, de 215 a 236ms. Fiz três medições de cada. Embora o número de arquivos quase tenha dobrado, o tempo de verificação reportado permaneceu praticamente igual. Para mim, a vantagem prática era poder executar a verificação completa sem gerenciar um cache à parte.

## Análise sintática e estrutura de execução do Biome

O parser do Biome foi projetado para se recuperar mesmo quando há erros de sintaxe. De acordo com a documentação oficial de architecture, o resultado da análise é uma CST (concrete syntax tree), que implementa o padrão de árvore green/red usando um fork interno da biblioteca rowan. A CST preserva até comentários e espaços em branco.

A sintaxe inválida é marcada com nós Bogus. Assim, as regras e o formatador não tratam esse trecho como sintaxe válida. A documentação oficial explica que o parser do Biome é intencionalmente mais rigoroso do que o parser do Prettier, e que o formatador emite os nós Bogus sem corrigi-los. As configurações da minha equipe usam `formatWithErrors: true`, então também formatamos arquivos com erros de sintaxe.

O Biome também tem uma arquitetura de servidor e cliente. Um daemon em segundo plano processa as solicitações do editor e da CLI, e a extensão do editor encaminha mensagens LSP ao daemon por meio de `biome lsp-proxy`. A documentação oficial também apresenta o comando `biome inspect`, que permite examinar a representação intermediária (IR) do formatador. Esse comando está disponível a partir da versão 2.6.

O scanner não é executado por padrão; é opt-in. Ao ativar regras de domínio do projeto ou regras baseadas em informações de tipos, o scanner procura `biome.json` aninhados e `.gitignore`, além de indexar `package.json` e arquivos de código-fonte. O FAQ oficial informa que, para cerca de 2 mil arquivos, a execução leva cerca de 800ms sem o scanner e cerca de 2 segundos com ele ativado. Na minha avaliação, as medições do `check` padrão e aquelas com regras baseadas em informações de tipos não medem o mesmo escopo de execução.

## Escopo das regras e correções

As regras de lint do Biome estão divididas em oito grupos: Accessibility, Complexity, Correctness, Nursery, Performance, Security, Style e Suspicious. A partir da v2, todas as regras têm um nível de severidade padrão, e o grupo Style emite avisos por padrão. As regras Nursery precisam ser ativadas diretamente nas configurações, ao contrário das regras da versão estável.

As regras não se limitam a emitir diagnósticos; algumas também corrigem o código. O Biome garante que as correções safe não alteram o significado do código, e elas são aplicadas com `--write`. As correções unsafe podem alterar o significado, por isso exigem `--write --unsafe`. A correção de `noFloatingPromises` é unsafe.

Os comentários de supressão do Biome incluem o motivo na sintaxe. Por exemplo, usa-se o formato `// biome-ignore lint/<그룹>/<규칙>: <이유>`. Para suprimir um arquivo inteiro, usa-se `biome-ignore-all` no início do arquivo; para suprimir um trecho específico, usam-se `biome-ignore-start` e `biome-ignore-end`. Comentários de supressão não utilizados são sinalizados com o diagnóstico `suppression/unused`.

No meu código, ainda há 326 avisos da regra recommended `useExhaustiveDependencies`, que verifica os arrays de dependências dos hooks do React. A equipe mantém esses avisos como avisos, não como erros.

## Informações de tipos e regras de domínio do projeto

O Biome não é um verificador de tipos. O escopo descrito na documentação oficial é permitir o uso de regras de lint baseadas em informações de tipos sem o pacote `typescript`. Nos meus dois serviços, a verificação de tipos na CI continua a cargo do `tsc` dentro do comando de build.

As regras do Biome 1 só analisavam a sintaxe de um único arquivo, por isso não podiam verificar se precisavam saber se a função chamada retornava uma Promise. O Biome 2 introduziu regras de lint baseadas em informações de tipos sem depender do compilador TypeScript. A primeira regra, `noFloatingPromises`, detectou cerca de 75% dos casos identificados pelo typescript-eslint em testes preliminares. Na v2.1, foi anunciado que melhorias na inferência de tipos elevaram essa taxa para cerca de 85%, além da adição de sete regras, incluindo `noMisusedPromises`.

Quando ativei `noFloatingPromises` no código atual com a versão 2.6.8, obtive 22 ocorrências. Um exemplo era um código que chamava uma função de callback de confirmação que retorna uma Promise sem usar `await` e, em seguida, fechava a janela. Essa regra ainda pertence ao grupo Nursery na versão 2.6.8. A documentação oficial descreve Nursery como experimental e diz que o comportamento pode mudar a qualquer momento. A severidade padrão é info e, ao ativá-la, o scanner percorre os arquivos do projeto e o mecanismo de inferência de tipos é executado, aumentando o tempo de verificação.

As regras de domínio do projeto ativam automaticamente conjuntos de regras com base nas dependências do `package.json`. Por exemplo, ativam regras relacionadas com base em ferramentas como React 16 ou superior, Next 14 ou superior e Vitest. Medi diretamente o código atual na versão 2.6.8, em um Apple M2 Max, com 1,438 arquivos `src`. Com as configurações atuais e executando apenas o lint, o tempo ficou entre 122 e 160ms; ao ativar apenas `noFloatingPromises`, que usa inferência de tipos, ficou entre 225 e 262ms.

`noImportCycles` é uma regra do grupo Suspicious, com severidade padrão de aviso. A documentação oficial explica que o custo de cálculo é alto. No meu código, uma execução com essa regra levou de 253 a 264ms e gerou 88 avisos.

`noUnresolvedImports` é uma regra do grupo Correctness, com severidade padrão de erro, que verifica se o nome importado é realmente exportado. Ela não verifica `import()` dinâmico nem `require()`. Com `node_modules` reais vinculados, a execução levou de 243 a 253ms e gerou 553 erros. O código compila e os testes passam, mas nenhum dos 553 erros era um erro real.

Entre eles, 499 eram nomes como `describe`, `it`, `expect` e `vi`, importados do Vitest; 28 eram `Fragment` e `Suspense` do React; e 25 eram imports do Vite com os sufixos `?url` e `?worker`. O caso restante era de um pacote. O arquivo de entrada do pacote React exporta por meio de `module.exports` do CommonJS. A ideia de que o Biome não conseguiu localizar estaticamente esse tipo de export é uma inferência minha.

Ao executar a mesma regra sem vincular `node_modules`, foram gerados 4,136 erros em cerca de 700ms. Com base nesse resultado, concluí que, no código atual, seria difícil recuperar a verificação `import/no-unresolved` da época do ESLint usando regras de domínio do projeto. Essa conclusão se limita aos resultados do meu código.

Confirmei o tempo por regra usando `--profile-rules`, disponível a partir da v2.4. O método exclui o tempo de pré-processamento e soma o tempo de execução das regras em cada thread. Nas minhas medições, `useExhaustiveDependencies` foi a mais longa, com 54.6ms em 24,086 execuções. Em seguida vieram `noFallthroughSwitchClause`, com 13.0ms; `noUnusedVariables`, com 9.3ms; e `useImportType`, com 8.7ms. O `check` completo levou de 215 a 236ms, incluindo formatação e ordenação dos imports. A ideia de que a diferença em relação aos 122 a 160ms do lint isolado corresponde à formatação e ao assist é uma inferência minha. Também tentei medir o oxlint com o mesmo código, mas não consegui fazer essa medição desta vez, então não o incluo na comparação de velocidade.

## Funcionalidades adicionadas ao longo de dois anos

A versão 1.9.4 que adotei foi lançada no npm em 17 de outubro de 2024. A v2.0.0 foi lançada em 17 de junho de 2025, e a v2.6.8, em 15 de novembro de 2026. Nesse intervalo, além do lint baseado em informações de tipos, o Biome ampliou o escopo de suporte e as ferramentas de execução.

A v2 adicionou suporte a monorepos com o plugin GritQL e vários arquivos de configuração.

A v2.3 adicionou suporte experimental a Vue, Svelte e Astro, além de uma nova sintaxe de exclusão com `!` e do parsing de diretivas do Tailwind v4. A v2.4 passou a verificar CSS e fragmentos de GraphQL dentro de JavaScript e adicionou 15 regras de acessibilidade para HTML. Essa versão também incluiu `--profile-rules`, que mede o tempo por regra.

Na v2.5, as regras de lint ultrapassaram 500, e o modo `--watch` foi adicionado. O plugin GritQL também passou a poder sugerir correções no código. A v2.6 adicionou suporte a Markdown, SCSS e YAML e lançou plugins JavaScript como developer preview.

Não é possível trazer intacto o ecossistema de plugins do ESLint. Os plugins GritQL não têm acesso ao semantic model usado pelas regras Rust do Biome. Os plugins JavaScript estão em developer preview e podem mudar até mesmo em versões de patch. Portanto, não há fundamento para presumir que os plugins existentes do ESLint possam ser trazidos intactos.

Segundo o site oficial em 15 de novembro de 2026, o Biome é 97% compatível com o Prettier e tem 816 regras de lint. A documentação oficial não explica como os 97% foram medidos.

Os downloads do Biome também aumentaram. Comparando os downloads semanais do npm de 11 a 17 de novembro de 2024 com os de 9 a 15 de novembro de 2026, o Biome passou de 1.24 milhão para 27.39 milhões. No mesmo período, o ESLint passou de 48.06 milhões para 207.05 milhões, o Prettier de 43.79 milhões para 184.72 milhões, e o oxlint de 90 mil para 4.828 milhões.

Também há casos concretos em que o resultado da formatação difere do Prettier. Ao remover as aspas de propriedades de objetos e classes, o Prettier só considera identificadores ES5, enquanto o Biome também remove as aspas de identificadores posteriores ao ES2015. Em expressões de atribuição dentro de chaves computadas, o Biome remove os parênteses.

## Verificações que deixaram de existir ao sair do ESLint

Algumas verificações realmente se perderam ao migrar para o Biome. O Biome 1.9 não tinha `import/no-unresolved` nem `import/named`, por isso não verificava os caminhos nem os nomes dos imports; nos meus serviços, o `tsc` faz essa verificação. Ainda assim, por causa dos diagnósticos que não correspondiam a erros reais na medição de `noUnresolvedImports` descrita na seção anterior, concluí que seria difícil substituí-las por regras de domínio do projeto.

Também perdemos a verificação da posição das chamadas de hooks. Elas eram erros no ESLint, mas, na época da adoção, deixamos desativada a regra `useHookAtTopLevel` do Biome. As regras de nomes de arquivos e pastas também se perderam. O `check-file` do ESLint identificava 336 ocorrências naquela época, mas o Biome só tem `useFilenamingConvention` para nomes de arquivos e não tem regras para nomes de pastas.

A verificação de Promises não tratadas também não existia no Biome 1. Para saber se o valor retornado por uma função é uma Promise, são necessárias informações de tipos; as regras do Biome 1 só analisavam a sintaxe de um único arquivo. O monitoramento de erros que captura `unhandledrejection` no navegador era uma rede de segurança que detectava apenas alguns casos. O Biome 2 introduziu `noFloatingPromises`, mas ela pertence ao grupo Nursery e aumenta o tempo de execução quando ativada.

## Migração para o Biome 2

Os dois serviços ainda usam Biome 1.9.4. Executei `biome migrate --write` em cópias do código atual para verificar as mudanças de configuração e as diferenças nos diagnósticos. `files.include` e `ignore` são reunidos em um único `includes`, e os padrões de exclusão começam com `!`. `organizeImports` foi movido para `assist.actions.source.organizeImports`. Algumas regras também mudaram de nome ou de grupo. Por exemplo, `noMultipleSpacesInRegularExpressionLiterals` passou a ser `noAdjacentSpacesInRegex`, e `noWith` e `noVar` foram movidas para o grupo Suspicious.

De acordo com o guia oficial de atualização, o método de ordenação dos imports mudou, tornando impossível reproduzir exatamente a mesma ordem da versão 1.x. Também houve uma mudança para não prefixar globs com `**/`. Depois de migrar as configurações com `biome migrate --write` e executar as verificações, apareceram diagnósticos de diferenças na ordenação dos imports em 322 arquivos, e diferenças de formatação em 15 arquivos. Para migrar para o Biome 2, é preciso um commit que corrija essas diferenças de uma só vez.

`biome migrate eslint --write` migra regras, globals, overrides e padrões ignore do ESLint. Lê tanto o antigo eslintrc quanto a flat config e segue as extensões configuradas. O preset de regras fica como none, e apenas as regras migradas são ativadas. Por padrão, migra somente regras equivalentes; com `--include-inspired`, também migra regras semelhantes. O guia oficial recomenda revisar o resultado antes de usar.

`biome migrate prettier --write` declara explicitamente todas as opções do Prettier para preservar a saída atual.

## Verificações na CI

No meu fluxo de desenvolvimento, o Biome corrige e verifica o código ao salvar no editor e antes do commit. Na CI dos pull requests e do pipeline de deploy, executo `biome ci` para verificar formatação, lint e assist sem alterar os arquivos. Como os hooks de commit podem ser ignorados, quem decide se a verificação passou é a CI.

`biome ci --changed` verifica somente os arquivos com alterações commitadas, comparando-os com a branch padrão ou com a referência especificada por `--since`; é voltado à CI. `--staged` verifica somente os arquivos no stage e é voltado ao uso local. É possível escolher entre os reporters github, gitlab, junit, checkstyle, sarif, rdjson e summary; json está em fase experimental.

## Perguntas frequentes

- **O Biome substitui a verificação de tipos**: Não. É possível usar regras de lint baseadas em informações de tipos, mas, nos meus dois serviços, o `tsc` da CI faz a verificação de tipos.
- **`noFloatingPromises` do Biome 2 é uma regra estável**: Não. Ela ainda pertence ao grupo Nursery na versão 2.6.8, e a documentação oficial explica que está em fase experimental e seu comportamento pode mudar.
- **Quanto o tempo de verificação aumentou ao ativar `noFloatingPromises`**: No meu código atual, o lint isolado levava de 122 a 160ms; ao adicionar essa regra, passou para 225 a 262ms.
- **É possível substituir as verificações do ESLint por `noUnresolvedImports` do Biome**: Na minha avaliação, seria difícil. Mesmo com `node_modules` vinculado, os 553 diagnósticos não correspondiam a erros reais; sem o vínculo, foram gerados 4,136 diagnósticos em cerca de 700ms.
- **A migração para o Biome 2 gera grandes mudanças no código**: No meu código, foram gerados diagnósticos de ordenação dos imports em 322 arquivos e diferenças de formatação em 15 arquivos.
- **Todas as correções automáticas do Biome preservam o significado**: Não. As correções safe garantem que o significado não muda, mas as unsafe podem alterá-lo e exigem `--write --unsafe`.
- **`biome ci` altera o código**: Não. Ele verifica formatação, lint e assist sem alterar os arquivos.
- **É possível usar os plugins existentes do ESLint sem alterações**: Os plugins GritQL não têm acesso ao semantic model usado pelas regras Rust do Biome, e os plugins JavaScript estão em developer preview. Não é possível trazer intacto o ecossistema de plugins do ESLint.

## Conclusão

Nos meus dois serviços, o Biome reuniu em um só lugar as configurações realmente aplicadas, e a verificação completa ficou na faixa de 0,2 segundo mesmo depois de o número de arquivos quase dobrar. Isso não significa que o conjunto de regras seja igual ao do ESLint. É preciso levar em conta as verificações que se perderam na migração, como a de imports, a posição das chamadas de hooks e as regras para nomes de pastas, além dos diagnósticos que não correspondiam a erros reais ao testar as regras de domínio do projeto do Biome 2.

O Biome 2 ampliou as regras baseadas em informações de tipos e o escopo de suporte, mas, no meu código, a migração alterou a ordenação dos imports em 322 arquivos e gerou diferenças de formatação em 15 arquivos. Se você está pensando em migrar, recomendo verificar as regras atualmente aplicadas, as verificações que serão perdidas e o diff real da conversão, além de considerar apenas a velocidade e a integração das configurações.

:::ref
- [docs] [Biome, Biome v2](https://biomejs.dev/blog/biome-v2/)
- [docs] [Biome, Migrar para o Biome v2](https://biomejs.dev/guides/upgrade-to-biome-v2/)
- [docs] [Biome, Migrar do ESLint e Prettier](https://biomejs.dev/guides/migrate-eslint-prettier/)
- [docs] [Biome, Arquitetura](https://biomejs.dev/internals/architecture/)
- [docs] [Biome, Linter](https://biomejs.dev/linter/)
- [docs] [Biome, Domínios do Linter](https://biomejs.dev/linter/domains/)
- [docs] [Biome, noFloatingPromises](https://biomejs.dev/linter/rules/no-floating-promises/)
- [docs] [Biome, noUnresolvedImports](https://biomejs.dev/linter/rules/no-unresolved-imports/)
- [docs] [Biome, Supressões](https://biomejs.dev/analyzer/suppressions/)
- [docs] [Biome, CLI](https://biomejs.dev/reference/cli/)
- [docs] [Biome, Diferenças em relação ao Prettier](https://biomejs.dev/formatter/differences-with-prettier/)
:::