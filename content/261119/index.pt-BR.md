---
emoji: '🛠️'
title: 'Índice da série sobre o Chrome DevTools'
seoTitle: 'Chrome DevTools: índice da série e 32 perguntas'
date: '2026-11-19'
categories: frontend DevTools
description: 'Na série sobre Chrome DevTools, exploro Network, Elements e Sources a partir das perguntas dos leitores. Veja o índice de 32 artigos e a ordem de leitura.'
keywords: 'Chrome DevTools, série Chrome DevTools, painel Network, painel Elements, painel Performance, ferramentas de desenvolvedor do navegador, desenvolvimento frontend'
locale: pt-BR
translationOf: '261119'
sourceHash: 702bba9ed249e486a86c7ef8f342eb15e8e15bf31740c2ac62f44abae34eb97d
---

Quem abre o painel Network para investigar o desempenho de uma página pode usar esta série para encontrar outros painéis e recursos do DevTools de acordo com suas dúvidas. Cada artigo parte de uma pergunta e apresenta os recursos usados para respondê-la.

No meu trabalho com desempenho de páginas, abro o painel Network todos os dias. Ao usar as ferramentas de desenvolvedor do navegador, é fácil acabar recorrendo sempre aos mesmos recursos. Por isso, escrevo uma série que aborda em profundidade, um a um, Elements, Sources, Console, Network, Performance, Memory, Application, Security, Lighthouse e Recorder. Explico os temas com base na documentação oficial e em materiais especializados, e incluo capturas de telas reais do navegador.

## 32 artigos organizados por perguntas

O índice desta série é organizado pelas perguntas que levam os leitores a abrir uma aba, não pelos nomes das abas. Um texto que apenas enumera recursos acaba virando um catálogo, porque a seção final não consegue reunir as anteriores em uma única decisão. Cada artigo parte de uma pergunta e reúne apenas os recursos necessários para respondê-la. Recursos que não cabem em um artigo sobre uma aba serão tratados em outro artigo sobre a mesma aba, a partir de uma pergunta diferente.

Cada artigo pode ser lido sem ter lido os anteriores. Quando um painel exige mais de uma pergunta, divido o conteúdo em uma série própria. Comparei a documentação oficial com as telas reais do Chrome, registrei todos os elementos dentro de cada painel e defini em qual artigo cada um será abordado. O índice tem 32 artigos.

### Network

- **O que a primeira tela recebe e em que quantidade?**: lista de solicitações, filtros, colunas, Size, Initiator. [42 MB pelo painel Network](/261120)
- **Em que etapa do tempo de uma solicitação se gasta cada parte?**: Waterfall, etapas de Timing, Priority, Protocol, Connection ID
- **O que circula dentro de uma solicitação e de uma resposta?**: abas de detalhes, cookies, preflight, WebSocket, EventStream
- **Como restringir as causas alterando as condições?**: throttling, Request conditions, Overrides, Copy as, HAR

### Elements

- **Onde este elemento da tela está no DOM?**: árvore, badges, pesquisa, edição, Break on
- **De onde veio este estilo?**: Styles, Computed, cascade layer, editores
- **Como verificar o layout e a acessibilidade?**: Layout, Accessibility, Properties, Event Listeners

### Console

- **Como filtrar e ler as mensagens do Console?**: níveis, filtros, configurações, stack trace
- **Como investigar a página pelo Console?**: Utilities, Live expressions, visualização de objetos

### Sources

- **Como ler um bundle minificado?**: árvore de arquivos, pretty print, source maps, ignore list
- **Como decidir quando pausar?**: 11 tipos de breakpoints
- **O que observar depois de pausar?**: Scope, Watch, Call Stack, controles de execução, Threads
- **Como manter o código corrigido no DevTools?**: Snippets, Workspace, Overrides, Changes

### Performance

- **O que verificar antes de gravar?**: Local metrics, Field metrics, Environment settings
- **Como ler as faixas da gravação?**: visão geral, Main flame chart, Network, Frames, Interactions, Layout shifts
- **Como restringir as causas da lentidão?**: Summary, Bottom-up, Call tree, Event log, Insights
- **Como medir com mais profundidade?**: Capture settings, Layers, Selector stats, Annotations, API de extensões

### Memory

- **O que está ocupando memória?**: 4 tipos de visualização de heap snapshot, retainers
- **Quando o uso de memória aumenta?**: Allocations on timeline, sampling, Detached elements, Performance monitor

### Application

- **O que a Toss armazena no navegador?**: cookies, storage, IndexedDB, Cache storage, Storage buckets
- **O que continua funcionando mesmo depois que a página é fechada?**: Service worker, Manifest, Background services
- **O que acelera o retorno e a próxima página?**: bfcache, Speculative loads, Frames

### Security, Issues

- **Onde ler os avisos enviados pelo navegador?**: Security, Issues

### Lighthouse

- **O que analisar além da pontuação?**: 3 modos, métodos de throttling, resultados

### Recorder

- **Como gravar o fluxo do usuário e transformá-lo em um teste?**: Recorder

### Coverage

- **Quanto do código recebido foi realmente executado?**: Coverage

### Rendering

- **Como ver onde a tela é redesenhada e simular media queries**: Rendering

### Layers, Animations

- **Camadas de composição e animações**: Layers, Animations

### Performance monitor

- **Como observar uma tela por muito tempo com métricas em tempo real?**: Performance monitor

### Device mode, Sensors

- **Simulação do ambiente móvel e seus limites**: Device mode, Sensors

### Agentes, IA

- **Como disponibilizar o DevTools para agentes de IA?**: DevTools for agents, AI assistance

### Uso rápido

- **Como usar o DevTools mais rapidamente?**: Command menu, Search, Quick source, atalhos de teclado, Settings

## O que fica de fora

- Não abordarei os painéis Media, WebAudio, WebAuthn e Autofill, nem o CSS overview, que ainda está em prévia.
- Memory inspector será abordado em um parágrafo do artigo sobre Memory, e Developer resources, em um parágrafo do primeiro artigo sobre Sources.

Quando esta série terminar, escreverei separadamente um artigo sobre dispositivos móveis para desenvolvimento nativo.

## Escopo da observação e método de medição

O objeto de observação são as telas públicas do Toss Bank e da Toss Securities. Vou explorá-las em um perfil novo, sem fazer login, e não capturarei a tela de login nem dados de contas. Não posso saber por que o serviço foi construído dessa forma, então não farei suposições. Vou abordar os números exibidos pelos painéis e os princípios por trás deles.

As telas de serviços reais mudam conforme as implantações, até mesmo no mesmo dia. Por isso, registrarei a data da medição e a versão do Chrome para cada número, e só usarei em cada artigo números e capturas medidos em sequência, na mesma sessão. Nos artigos sobre breakpoints e heap snapshots, usarei código local para que os leitores possam acompanhar os passos. Como os bundles do serviço são minificados, os leitores não conseguem reproduzir o processo de pausar nesta linha e ver este valor. Nos artigos em que for necessário, também criarei uma pequena demonstração que reproduz a mesma estrutura e farei as medições junto com ela.

## Ordem de leitura

Escreverei primeiro os quatro artigos sobre Network. Saber ler Network facilita explorar a faixa Network de Performance e o painel Application. Depois, escreverei na ordem Elements, Console, o primeiro artigo sobre Sources e Performance. Os outros três artigos de Sources que exigem código local e os dois artigos sobre Memory virão em seguida. Ainda não defini a ordem dos demais painéis.

A cada novo artigo publicado, acrescentarei um link neste índice. Quem quiser conferir os painéis e recursos abordados em cada artigo pode seguir os itens acima.

:::ref
- [docs] [Chrome for Developers, Chrome DevTools](https://developer.chrome.com/docs/devtools)
:::