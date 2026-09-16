---
emoji: 📅
title: 'Kalyx'
seoTitle: 'Kalyx: um ano criando um DatePicker headless em React 19'
date: '2026-06-17'
updatedAt: '2026-09-16'
categories: bibliotecas React DatePicker código-aberto
description: 'Todo DatePicker React exigia abrir mão de headless, bundle ou primitivas. Fiz o meu: as 4 decisões de design e por que troquei o teto por exatidão.'
keywords: 'Kalyx, DatePicker React, DatePicker headless React, react-day-picker, react-datepicker, biblioteca headless, tamanho do bundle React, ISO-8601 timezone, Composition pattern, padrão adapter, Ark UI, MUI X DatePicker, displayTimezone IANA, bug de horário de verão, teste de propriedades fast-check'
locale: pt-BR
translationOf: '260617'
sourceHash: b7e7be3efa404583193adba50f933c85c2d044497af8da1f75cbaa9c00bab69c
---

Neste post, quero falar sobre o **Kalyx**, a biblioteca headless de DatePicker para React que eu mesmo criei.

Como desenvolvedor frontend, trabalho com frequência em projetos que envolvem formulários SaaS. Neles, quase todas as páginas acabam precisando de algum tipo de entrada de data: uma data única, um intervalo, horário, saltos por mês ou ano e, além disso, timezone. No entanto, ao iniciar cada novo projeto ao longo do último ano, encontrei sempre a mesma barreira. (Minha experiência sincera é que não houve uma única ocasião em que uma biblioteca resolvesse tudo de forma limpa.)

Um dia, enquanto costurava pela terceira vez um TimePicker feito por mim e um Popover emprestado de algum lugar sobre o `react-day-picker`, comecei a anotar em um caderno o formato da API que eu realmente queria. Essas anotações acabaram se tornando a API pública do Kalyx 1.0.

Este texto é o registro das decisões, do ponto de vista de quem as tomou. A primeira metade trata das quatro decisões que levaram até a 1.0; a segunda, dos três meses seguintes. É a segunda que eu mais quero contar. **A maior decisão depois da 1.0 não foi um recurso novo: foi quebrar por conta própria o teto de bundle que eu vendia como argumento e comprar exatidão com ele.** A versão de hoje é a 1.4.7, e os sete patches desse intervalo foram gastos inteiramente na correção do mesmo tipo de bug.

---

## Por que um DatePicker para React é difícil

Primeiro, vale examinar rapidamente o mercado. Isso mostra que a barreira que encontrei não era um problema de escolher a biblioteca certa, mas **um problema inerente de trade-offs**.

Reuni em uma tabela as opções de DatePicker mais usadas no ecossistema React em junho de 2026. (Os números de downloads do npm são semanais e correspondem a junho de 2026.)

| Biblioteca | Downloads semanais | O que faz bem | O que impõe |
| --- | --- | --- | --- |
| **react-day-picker** | cerca de 42 mi | Calendar headless limpo | Apenas Calendar grid. Mesmo na v10, Input e TimePicker não têm suporte oficial |
| **react-datepicker** | cerca de 4,7 mi | Todas as primitive em um único bundle | Importação de CSS obrigatória. O value é um `Date` nativo. Mais de 100 props |
| **Ark UI** | participação em crescimento | Composition + headless | Não há TimePicker standalone. O horário só existe dentro do DatePicker |
| **MUI X** | participação alta | Integração + recursos empresariais | cerca de 58 KB gzip. RangePicker exige licença Pro paga |
| **React Aria** | cerca de 5,9 mi | Acessibilidade no nível da spec | Impõe `@internationalized/date`. Incompatível com bases de código date-fns |
| **Headless UI** | junto com Tailwind | Pioneira do padrão headless | Recusa-se a criá-lo porque “o custo de manutenção é alto demais” |

Ao separar cada recurso, é fácil escolher um vencedor. Mas uma unidade real de trabalho não consiste em um único recurso. Em um formulário SaaS que precisa simultaneamente de entrada de data única, filtro de intervalo, seleção de horário e saltos por mês ou ano, **não havia uma biblioteca que atendesse a tudo**.

A postura da equipe de manutenção do Headless UI é particularmente interessante. Na prática, a Tailwind Labs mantém há anos em espera a solicitação de DatePicker na [GitHub Discussion #289](https://github.com/tailwindlabs/headlessui/discussions/289). Aberta em 2021, a discussão continua aberta cinco anos depois, sem resposta da equipe, e não há um único componente relacionado a datas na árvore de código do `@headlessui-react`. Usuários de Tailwind acabam sendo encaminhados ao React Aria. Considerando que locale, timezone, DST, diferentes sistemas de calendário, acessibilidade e navegação por teclado entram em conflito ao mesmo tempo em um DatePicker, essa espera é um diagnóstico perfeitamente compreensível. (Eu mesmo só percebi o tamanho do peso depois de criar um.)

O caso do Ark UI transmite o mesmo sinal. O Ark UI, criado pela equipe do Chakra UI, **não tem um componente TimePicker standalone**. A seleção de horário é tratada apenas dentro do DatePicker por meio do `@internationalized/date`, com seu `CalendarDateTime`. Ou seja, não é uma primitive independente que uma pessoa que usa Tailwind possa combinar separadamente para usar “apenas o horário”. (No início, interpretei isso de forma brusca como “o Ark abandonou o TimePicker”, mas, ao reler a documentação, a formulação correta é que “ele nunca foi separado como componente independente”. O ponto central é que até uma equipe de referência entre bibliotecas headless tratou com cautela a separação do TimePicker como primitive própria.)

Até aqui, surge naturalmente uma pergunta: “Então não existe mesmo uma forma de resolver esses trade-offs dentro de uma única biblioteca?”

---

## O lugar do Kalyx

O Kalyx é a minha resposta a essa pergunta. Em uma frase, ele é **“um DatePicker headless para React que funciona assim que é instalado, sem importar CSS, e pode ser personalizado livremente com qualquer abordagem de estilos”**.

Estes foram os itens entregues na versão 1.0. (Entre parênteses estão os valores de hoje, na 1.4.7, quando atualizo este texto.)

- **7 componentes primitive**: `DatePicker`, `RangePicker`, `TimePicker`, `DateTimePicker`, `MonthPicker`, `YearPicker`, `WeekPicker`
- **3 Headless Hook**: `useDatePicker`, `useRangePicker`, `useTimePicker` (pontos de entrada para descartar toda a UI fornecida pela biblioteca e criar a sua própria. Os outros quatro chegaram depois pelo entry `@kalyx/react/headless`, então hoje existem os sete)
- **Uma única Composition API**: as 7 primitive usam o mesmo Context e o mesmo padrão dot notation
- **cerca de 16 KB gzip (ESM)**: concluído dentro de um teto de 17 KB (hoje são cerca de 19,5 KB, com teto de 20 KB. Por que ele subiu é o tema da segunda metade deste texto)
- **0 importações de CSS**: liberdade para usar Tailwind, CSS Modules, CSS puro ou qualquer outra opção

A API tem esta aparência.

```tsx
import { DateTimePicker } from '@kalyx/react';

<DateTimePicker value={iso} onChange={setIso} format="24h">
  <DateTimePicker.Input />
  <DateTimePicker.Popover>
    <DateTimePicker.Calendar
      classNames={{
        daySelected: 'bg-violet-600 text-white',
        dayToday: 'ring-2 ring-violet-400',
        dayOutsideMonth: 'opacity-40',
      }}
    />
    <DateTimePicker.HourList />
    <DateTimePicker.MinuteList step={15} />
  </DateTimePicker.Popover>
</DateTimePicker>
```

O mesmo padrão se repete nas 7 primitive. Não existe uma única prop bomba do tipo boolean, como `showTimeSelect` ou `showMonthDropdown`.

Seu posicionamento pode ser representado assim.

![Diagrama de posicionamento que mostra quais partes das bibliotecas existentes o Kalyx reúne](1.png?w=620)

É a união das melhores partes das bibliotecas existentes, acrescida de uma decisão: **integrar também o TimePicker, que não existe como standalone no Ark UI, como primitive independente dentro da mesma Composition.**

---

## Quatro decisões fundamentais

Entre todas as decisões de design, estas são as quatro mais pesadas e difíceis de reverter. Agora que a API 1.0 está freeze, pode-se dizer que elas forçaram todas as outras decisões.

### Composition over Props

O primeiro rascunho tinha a forma `<DatePicker showTime showMonthGrid presets={[...]} renderHeader={(props) => ...} />`. Era, na prática, o padrão básico do `react-datepicker`. Depois de tentar por uma semana expressar de forma limpa nos tipos as interações entre props, acabei apagando tudo.

O motivo era claro: **o custo real da explosão de props é a perda de type safety.** Somente quando `showTimeSelect` é `true` é que `timeFormat` faz sentido, mas o sistema de tipos não consegue expressar diretamente essa dependência condicional. Se tentarmos resolver com uma discriminated union, a interface de props explode em grupos de 50 e cada nova prop exige revalidar todas as combinações. (Esse é exatamente o mesmo contexto da ideia de que “a abstração errada aumenta o acoplamento”, que organizei antes no texto sobre [abstração](/260201).)

Radix UI e shadcn/ui resolveram esse problema com particular elegância por meio do padrão dot notation: as restrições ficam explícitas no callsite.

```tsx
// 지양 — Props 폭발. 14개 boolean으로 한 컴포넌트 비틀기
<DatePicker
  selected={date}
  showTimeSelect
  timeFormat="HH:mm"
  showMonthDropdown
  showYearDropdown
  excludeDates={[]}
  renderCustomHeader={...}
/>

// 권장 — Composition. "이 picker, 이 부분, 이렇게 스타일"이 명시적
<DatePicker value={iso} onChange={setIso}>
  <DatePicker.Input />
  <DatePicker.Popover>
    <DatePicker.Calendar />
    <DatePicker.Presets>
      <DatePicker.Preset label="Today" value={today} />
      <DatePicker.Preset label="Tomorrow" value={tomorrow} />
    </DatePicker.Presets>
  </DatePicker.Popover>
</DatePicker>
```

O custo é claro: um `<DatePicker>` de uma linha vira um bloco JSX de seis. Mas os ganhos também são claros.

- Clareza que continua legível um ano depois
- Tipos sem leak entre combinações de props
- Uma superfície de estilos infinitamente extensível, pois cada subcomponent tem seu próprio mapa de slots `classNames`

A implementação é agrupada de forma simples com o padrão `Object.assign`.

```tsx
// packages/react/src/components/DatePicker/index.ts
export const DatePicker = Object.assign(DatePickerRoot, {
  Input: DatePickerInput,
  Trigger: DatePickerTrigger,
  Popover: DatePickerPopover,
  Calendar: DatePickerCalendar,
  MonthGrid: DatePickerMonthGrid,
  YearGrid: DatePickerYearGrid,
  Presets: DatePickerPresets,
  Preset: DatePickerPreset,
});
```

É compatível com tree shaking, fica agrupado em um único `index.ts` por componente e não gera colisões de namespacing. (Quando vi o Radix UI pela primeira vez, não entendi por que esse padrão era chamado de padrão do setor. Só depois de criar uma biblioteca percebi por que ele se tornou uma referência tão rapidamente.)

### Entrada e saída como strings ISO-8601

O `value` do Kalyx é `string | null`: uma string no formato UTC ISO-8601. O `onChange` também devolve uma string no mesmo formato. O objeto `Date` nativo não aparece em nenhum ponto da API pública.

A alternativa “óbvia” é um objeto `Date`. Ela também é a origem de issues que permanecem abertas há anos em todos os DatePicker que usam Date nativo: o offset de timezone fica incorreto, o round-trip de `JSON.stringify` quebra e SSR produz valores diferentes no servidor e no cliente. A conhecida issue de timezone [#1018](https://github.com/Hacker0x01/react-datepicker/issues/1018) do `react-datepicker` foi aberta em 2017, arrastou-se por oito anos e só foi encerrada em 2025 com a conclusão de que “não é um bug, e sim o comportamento esperado do `Date` do JavaScript”. Ela foi encerrada apenas com uma adição à documentação, sem alteração no código-fonte. Enquanto uma biblioteca usar `Date` nativo como tipo de value, esse tipo de atrito não poderá desaparecer estruturalmente.

Forçar strings ISO-8601 oferece três garantias.

- **wire-safe**: depois de `JSON.stringify` e de recuperar o dado, a string continua idêntica byte a byte
- **Seguro para SSR**: servidor e cliente fazem hydrate com a mesma string
- **Obriga a explicitar o timezone**: o consumer precisa declarar em qual fuso exibir o valor, por exemplo `displayTimezone="Asia/Seoul"`

```tsx
// 권장
<DatePicker
  value="2026-01-15T00:00:00.000Z"
  displayTimezone="Asia/Seoul"
  onChange={(iso: string | null) => save(iso)}
/>

// 금지
<DatePicker value={new Date()} />
```

Assim, o cenário de exibir o mesmo valor ISO em diferentes timezone é expresso naturalmente.

```tsx
const iso = "2026-01-15T15:00:00.000Z";

<DatePicker value={iso} displayTimezone="Asia/Seoul" />       // 2026-01-16 00:00
<DatePicker value={iso} displayTimezone="America/New_York" /> // 2026-01-15 10:00
```

Há um custo claro. O código downstream que precisar de um objeto `Date` deve chamar diretamente `new Date(iso)`. Ainda assim, considerei muito melhor concentrar esse boundary em um ponto do código do consumer do que deixar objetos `Date` fluírem por toda a biblioteca. (Uma lição que aprendi em vários projetos é que, quando começamos a receber um objeto, fica impossível rastrear até onde ele chegou.)

Limites como DST são tratados pelas utilidades de timezone baseadas em Intl do `@kalyx/core`. Elas não ficam na interface do adapter, mas reunidas em core como funções `civilMidnightFromUtcDay`, `setTimeInTimezone` e `startOfDayInTimezone`, todas baseadas em `Intl.DateTimeFormat`. Ao converter para UTC a meia-noite civil do timezone correspondente, elas calculam corretamente os limites de DST; o usuário só precisa fornecer uma string de timezone IANA e a biblioteca cuida do restante. (É importante que essa lógica de timezone esteja em core, não no adapter. Seja com date-fns ou dayjs, a exatidão do timezone é garantida pelo mesmo código de core.)

### Padrão adapter

`@kalyx/core` não tem nenhuma dependência de date-fns. A mesma interface `DateAdapter` de 21 métodos é implementada no `@kalyx/adapter-date-fns`, separado em um pacote próprio, e o `@kalyx/react` recebe o adapter por Context. O interessante é que o próprio adapter é um shim fino de cerca de 200 linhas. Dos 21 métodos da interface, apenas quatro recebem timezone (`format`, `isSameDay`, `startOfDay`, `today`), e até esses quatro delegam todo o cálculo real de timezone às utilidades Intl de core. O papel do adapter é mapear aritmética e parsing de datas para a sintaxe de uma biblioteca específica, não responder pela exatidão.

O resultado da separação dos pacotes pode ser resumido assim.

```
@kalyx/core               # 플랫폼 독립 로직 + Intl 기반 timezone, date-lib 의존 0
@kalyx/adapter-date-fns   # default adapter (별도 패키지)
@kalyx/react              # 컴포넌트 (default로 adapter-date-fns 자동 wire)
@kalyx/react/headless     # zero date-lib entry, 자기 adapter 들고 옴
```

Durante o design, avaliei três opções.

| Opção | Vantagem | Desvantagem |
| --- | --- | --- |
| A. incorporar date-fns em core | Implementação simples e onboarding fácil para iniciantes | Não pode ser substituído sem um major bump |
| B. core apenas BYO | Adaptável ao futuro | Iniciantes precisam configurar manualmente o adapter toda vez |
| C. híbrida (default + substituível) | Conveniência para iniciantes + escape para usuários avançados | Separar 2 pacotes + manter 2 entry |

Escolhi C. Na época da 0.x, eu tinha começado com A, mas percebi algo pouco antes de fazer freeze da API para a v1 stable: **uma biblioteca de datas incorporada não pode ser removida sem um major bump.** Extrair o adapter naquele momento foi a maior decisão antes de graduar a versão 1.0.

Os adapters lançados depois seguem o mesmo contrato de 21 métodos; só a implementação muda. Os três importam de `@kalyx/core/test-helpers` o `runAdapterConformanceTests` e o executam nos próprios tests, para verificar se todos chegam à mesma resposta.

- `@kalyx/adapter-dayjs`: segundo as estatísticas, cerca de metade dos usuários de React usa dayjs, portanto ele era a prioridade 1 (o Mantine chega a fixar dayjs como peer obrigatório)
- `@kalyx/adapter-luxon`: destinado a empresas e casos avançados de timezone
- Temporal: depois da extração, concluí que a compatibilidade com a API Temporal do TC39 deve ser resolvida em core, não por um adapter. Como a interface do adapter usa strings ISO como entrada e saída, ela não consegue transportar intactas as capacidades próprias do Temporal. (Retomo essa decisão na seção “Estado atual”.)

### O teto do bundle

No lançamento da versão 1.0, o bundle tinha cerca de 15,8 KB ESM / 15,9 KB CJS gzip. O teto foi definido inicialmente em 16 KB e subiu um degrau, para 17 KB, na v1.1. O CI impõe esse teto. Todo PR executa `pnpm check-bundle`; se ultrapassá-lo, o build falha.

Esse número não foi escolhido ao acaso. Ele leva em conta a referência do mercado.

- `react-day-picker`: cerca de 22 KB apenas para Calendar
- `react-datepicker`: cerca de 40–60 KB para todas as primitive
- `MUI X`: cerca de 58 KB (e Range é Pro pago)
- `Kalyx`: 7 primitive em menos espaço que o Calendar do `react-day-picker`

Essa última linha era o orgulho da 1.0. Ela continua verdadeira, mas com muito menos folga: cerca de 19,5 KB contra cerca de 22 KB, uma diferença de 2,5 KB.

Também registrei a evolução do bundle em cada etapa RC.

| Etapa | Mudança | Teto |
| --- | --- | --- |
| rc.0 | Primeira versão completa de 7 primitive | 12 → 13 KB |
| rc.3 | Navegação por teclado no grid (Arrow/Page/Home/End) | 13 → 14 KB |
| rc.4 | prop de mês/ano disabled em MonthPicker/YearPicker | 14 → 15 KB |
| rc.8 | callback programático `filterTime` do TimePicker | 15 → 16 KB |
| 1.0.0 | Estabilização final (2026-06-08) | ESM 15,8 KB / CJS 15,9 KB |
| 1.1 | Paridade da região live a11y com `announce()` | 16 → 17 KB |
| 2026-08 | Correção geral da exatidão de timezone e restrições | 17 → 20 KB |
| 2026-08 | Separação apenas do entry `/headless` | 20 → 22 KB |

Cada aumento explica “por que cresceu”. Assim, não há um vazamento gradual de 1 KB, mas uma decisão intencional. Também deixei claros os recursos recusados. As seis primeiras linhas da tabela são o registro da 1.0, e ali só existiam decisões de subir um degrau por vez. As duas últimas foram acrescentadas nesta atualização do texto, e têm outra natureza: não subi um degrau, subi três de uma vez. **Essa decisão é o tema da segunda metade deste texto.**

Mover o teto é inconveniente de propósito. Se bastasse mudar um lugar, ele subiria discretamente, então hoje duas constantes em `scripts/bundle-policy.js` são a fonte única, e um check obrigatório em cada PR as impõe. Foi ali que apareceu o motivo da separação da última linha. Os dois entry compartilhavam o mesmo teto, mas o `/headless` carrega, além dos mesmos sete componentes do entry padrão, os sete hooks inteiros e o `DateTimePicker.Presets`. **Houve uma inversão: quem carregava mais código ficou com menos folga.** Na medição, sobravam 1,4 KB no entry padrão, enquanto o headless havia secado para menos de 200 bytes e bloqueava até mudanças que nada tinham a ver com o entry padrão. Por isso subi apenas o teto do headless e separei os dois, sem tocar nos 20 KB do entry padrão: esse número sai no badge do README, e subi-lo seria mudar uma promessa.

Essas são as quatro decisões incorporadas ao código da biblioteca. O que aconteceu durante o processo real de build?

---

## O processo de build da versão 1.0

### Catorze etapas RC da 0.x à 1.0

Marquei a rc.0, que já incluía as 7 primitive, em 27 de maio de 2026. A partir daí, foram 14 iterações RC até a graduação como 1.0.0 stable em 8 de junho: cerca de 12 dias. (Não acho que essa velocidade tenha sido correta. O caminho ortodoxo seria avançar mais devagar e lapidar uma coisa por vez, mas, como único maintainer, eu precisava terminar rapidamente depois de entrar em modo build.)

Estes foram os trabalhos mais importantes do período.

- **Correção de segurança**: vulnerabilidade Critical GHSA-5xrq-8626-4rwp (atualização para vitest 4)
- **Extração neutra do adapter**: dependência de date-fns reduzida a 0 em `@kalyx/core`
- **Separação de `@kalyx/adapter-date-fns` como pacote próprio**
- **Novo entry `@kalyx/react/headless`**: para usuários com zero date-lib

Também defini a linha de base de tests como requisito para graduar a versão 1.0: 497/497 unit test, 14/14 verificações de acessibilidade com axe e 31 cenários e2e.

### Integração visual Aurora

O feedback mais marcante que recebi logo após o lançamento da versão 1.0 foi uma mensagem de uma linha enviada por um usuário: **“É feio pra cacete, sujo e grotesco”**. Havia três capturas do HeroDemo anexadas. (Foi quando percebi que, por melhor que seja o código de uma biblioteca, uma demo ruim gera zero cliques.)

Os sintomas eram claros: linhas de grade vazavam para o Calendar grid, as células do MonthPicker se alongavam horizontalmente e o DateTimePicker parecia apertado demais. O diagnóstico mostrou que dois sistemas CSS haviam evoluído separadamente. `.kx-live-*` e `:global([role='grid'])` dentro do HeroDemo não compartilhavam os fixes aplicados ao outro.

A solução não foi redesenhar, mas **unificar e fazer uma única rodada de polish**. Após sete iterações visuais (v1 → v7), fechei o sistema de tokens Aurora. O single source of truth passou a ser um único arquivo, `apps/docs-site/src/css/custom.css`, e todos os picker foram obrigados a compartilhar os mesmos tokens.

```css
/* Aurora 토큰 (라이트 모드) */
--kx-primary: #5b4fe1;
--kx-bg: #ffffff;
--kx-border: rgba(91, 79, 225, 0.1);
--kx-glow: 0 3px 12px rgba(91, 79, 225, 0.32);
--kx-cell: 32px;
--kx-radius-cell: 8px;
--kx-radius-card: 14px;
```

Compartilho três armadilhas documentadas durante o processo. É muito provável encontrar exatamente os mesmos problemas ao incorporar componentes headless em outro ambiente, especialmente em um site de documentação como o Docusaurus.

Primeiro, **a regra `table th, td` do Infima no Docusaurus invade todas as tags `<table>`**. Por isso, linhas de grade vazavam para o Calendar grid. É preciso isolar com módulos CSS ou aplicar um reset explícito.

Segundo, **em `<table role="grid">` não se pode usar `display: grid`**. `<thead>/<tbody>/<tr>` viram grid item, e as sete column não chegam aos `<td>`. No fim, é preciso resolver com a combinação de `display: table`, `table-layout: fixed` e width explícito.

Terceiro, **a visualização de Range exige arredondamento assimétrico**: start apenas à esquerda, end apenas à direita e middle sem cantos arredondados. Se tudo for uniformizado, as células parecem “flutuar” separadamente e o agrupamento visual intuitivo se perde.

### Onde investi tempo com zero usuários

Vale a pena apresentar com franqueza os dados da primeira semana após o lançamento da versão 1.0.

- 5 stars no GitHub, 0 forks e 0 watchers
- 480 downloads semanais no npm (presumivelmente, em sua maioria, bots de espelhamento de CI)
- 0 pacotes com dependência direta

Três meses depois, são 7 stars. Os números praticamente não se moveram, e é desse fato que parte a virada de direção que trato mais adiante.

Havia dois caminhos possíveis para investir o tempo: (a) reforçar novos recursos; (b) expandir para uma nova frente, como um adapter para React Native. Mas ambos tinham ROI baixo. Sem usuários externos, novos recursos não poderiam ser validados, e fazia mais sentido abrir novas frentes depois que surgissem usuários.

Por isso, decidi investir na **primeira impressão de 30 segundos**: o intervalo em que alguém entra pela primeira vez no repositório do GitHub ou no site de documentação e decide, em 30 segundos, se vale a pena testar a biblioteca. Organizei o trabalho em cinco PR.

| PR | Conteúdo |
| --- | --- |
| A1 | Gravador de WebP animado do destaque + componente `<HeroDemo>` + rota `/recorder` |
| A2 | Redesign da página inicial. 6 seções (Hero/FeatureGrid/SameJsxBlock/PickerGrid/WhyKalyx/GetStarted) |
| B | Infraestrutura de sandbox. `<StackBlitzEmbed>` + 7 projetos `examples/*` |
| C | `/playground` interativo. Seletor de picker + editor de classNames + controles de locale/timezone |
| D | Página `/docs/comparison` + gráfico comparativo do bundle em SVG integrado |

Aprendi algo nesse processo: **a pontuação do Lighthouse em localhost pode diferir em mais de 10 pontos do ambiente real de implantação na Vercel.** Na issue #103, uma medição no modo simulate em localhost parecia mostrar uma regressão de 72 → 61, ou seja, −11 pontos. Depois de implantar a mesma mudança na Vercel, a medição real ficou em 73–74, uma melhora de +1–2 pontos. O artifact era produzido pelo próprio ambiente de medição do localhost simulate. (Aprendi que depender apenas de números de localhost ao procurar uma regressão de desempenho pode levar a decisões erradas.)

Sinceramente, esse investimento nos “primeiros 30 segundos” não gerou grandes resultados. Lapidar a demo e a landing sem usuários externos era como limpar uma loja para clientes que não entravam. Depois, mudei de direção: para um único maintainer, transformar **a exatidão de core em ativos verificáveis** oferecia mais ROI do que lapidar a superfície promocional. (Os resultados concretos dessa decisão estão na seção “Estado atual”.)

---

## Uma visão da arquitetura técnica

A partir daqui, apresento um breve tour para quem pretende criar uma biblioteca ou tem curiosidade sobre seu funcionamento interno. (Se o objetivo for apenas usá-la, esta seção pode ser ignorada.)

### Implementação de Context + Dot Notation

Em cada primitive, o componente Root cria um Context Provider, e todos os subcomponent consomem o mesmo Context.

```tsx
// Root, Context 생성
function DatePickerRoot({ value, onChange, children }) {
  const ctx = useDatePicker({ value, onChange });
  return (
    <DatePickerContext.Provider value={ctx}>
      {children}
    </DatePickerContext.Provider>
  );
}

// Subcomponent, Context 소비
function DatePickerInput(props) {
  const { value, onChange, open } = useContext(DatePickerContext);
  return <input value={format(value)} onClick={open} ... />;
}

// Dot notation으로 묶기
export const DatePicker = Object.assign(DatePickerRoot, {
  Input: DatePickerInput,
  Popover: DatePickerPopover,
  Calendar: DatePickerCalendar,
});
```

O ponto central do padrão é que os componentes que compartilham o mesmo Context ficam dentro de um único grupo `Object.assign`. O consumer os chama naturalmente como `<DatePicker.Input>`, e o tree shaker remove automaticamente os subcomponent que não são usados.

### Headless Hook

Para ignorar todos os componentes fornecidos pela biblioteca e criar uma UI completamente própria, usa-se diretamente o Hook.

```tsx
const {
  value,
  calendar,        // { weeks, currentMonth, ... }
  navigate,        // navigate.prevMonth, navigate.nextYear, ...
  select,          // select(iso)
  isOpen,
  open,
  close,
} = useDatePicker({
  value: iso,
  onChange: setIso,
  displayTimezone: 'Asia/Seoul',
  locale: 'ko-KR',
});
```

A máquina de estados é exatamente a mesma usada pelos componentes. O código do Hook acima e o JSX de `<DatePicker>` funcionam sobre a mesma lógica central. (Graças a essa arquitetura, não é preciso manter a API da biblioteca em duas frentes.)

### Segurança em SSR

Desde o início, impus padrões capazes de sobreviver no Next.js App Router.

```tsx
// 지양
const id = Math.random().toString(36);    // 서버/클라이언트 불일치
const width = window.innerWidth;          // window 직접 참조
useLayoutEffect(() => {}, []);            // SSR 경고

// 권장
const id = useId();                       // React 표준
useEffect(() => {                         // 클라이언트에서만
  const width = window.innerWidth;
}, []);
```

Para posicionamento, uso Floating UI. Sucessor do Popper.js, ele é seguro para SSR e uma biblioteca leve, com cerca de 3 KB. Em cada execução de CI, um build do Next.js App Router verifica se tudo passa sem erros de `renderToString`.

### Acessibilidade

Os roles WAI-ARIA seguem a spec.

- Calendar grid → `role="grid"`, célula → `role="gridcell"`
- Input + Popover → `role="combobox"` + `aria-expanded`
- HourList / MinuteList → `role="listbox"`

O mapeamento da navegação por teclado também é próximo da spec: Arrow keys movem entre células, PageUp/Down muda o mês, Shift+PageUp/Down muda o ano, Home/End vai ao início ou ao fim da semana, Enter seleciona e Escape fecha o Popover.

Todas as 14 verificações automatizadas de acessibilidade com axe passam. Os rótulos ARIA também podem ser personalizados para vários idiomas.

```tsx
<DatePicker
  labels={{
    inputLabel: '날짜를 선택하세요',
    prevMonth: '이전 달',
    nextMonth: '다음 달',
    monthYearHeader: (month, year) => `${year}년 ${month}월`,
  }}
/>
```

`@kalyx/core` fornece rótulos padrão para vários locale, incluindo `ko-KR`.

---

## Estado atual e limitações reconhecidas

### Três meses trocando tamanho por exatidão

A primeira parte deste texto é a retrospectiva do lançamento da versão 1.0. Só que, no momento em que o atualizo, a biblioteca está na 1.4.7, e o que mais mudou nesse intervalo não foi a lista de recursos: foi a ordem de prioridades.

A virada veio no dia seguinte à 1.0. Ficou claro que o investimento nos “primeiros 30 segundos” descrito em uma seção anterior não estava surtindo efeito, e a observação de zero usuários externos se manteve. Então encerrei a divulgação e tirei do ar todos os ativos de marketing que ainda existiam: o banner de aviso no site de documentação, a página de comparação `/docs/comparison` que eu havia construído com tanto capricho e até este post que você está lendo. **É por isso que ele passou mais de três meses fora do ar.** Ele caiu junto no dia em que parei de divulgar, e agora volta com o registro desse intervalo anexado.

Sem usuários, verificar se o que já foi entregue funciona corretamente vem antes de entregar mais. Esse juízo inverteu a ordem do trabalho.

**Antecipei os tests baseados em propriedades, que estavam empurrados para a v1.2.** A técnica gera uma grande quantidade de entradas aleatórias para achar onde as invariantes quebram. Em funções puras como cálculos de data, ela cava um fosso mais fundo que os tests baseados em exemplos. E pegou uma falha de verdade: `startOfDayInTimezone` devolvia uma hora a menos nos dias de transição de DST. A causa era uma implementação que media o offset uma única vez, a partir da “meia-noite local lida como UTC”, e esse ponto pode cair do outro lado da transição. Quando a Australia/Sydney entra no horário de verão em 1º de outubro, a meia-noite local ainda é AEST +10, mas lida como 00:00 UTC ela aparece como AEDT +11, já depois da virada. Com tests baseados em exemplos, esse bug passaria batido para sempre, a menos que alguém escrevesse justamente aquela data.

**E subi o teto do bundle de 17 KB para 20 KB.** Fiz isso mesmo sendo o tamanho um dos argumentos de venda da biblioteca. Subi porque corrigir de ponta a ponta a exatidão de timezone e das restrições custou código. Havia células do calendário posicionadas com um dia de deslocamento em fusos de offset negativo, e a verificação de restrições (`disabled`) existia apenas no caminho dos componentes, faltando nos caminhos de presets, teclado, hooks e mudança de contexto. Subir três degraus de uma vez não foi confortável. Mas quanto a isto eu não hesitei: **se for preciso escolher entre “pequena” e “correta”, uma biblioteca escolhe a segunda.**

Os sete patches 1.4.x seguintes são todos da mesma família. Em vez de enfileirar release notes, organizo pelo que cada um deixou claro.

| Versão | O que foi corrigido | O que ficou claro |
| --- | --- | --- |
| 1.4.1 | Identidade do dia de calendário e coerência de todos os caminhos de verificação de restrições sob `displayTimezone` | A exatidão não vazava por uma função, vazava caminho a caminho |
| 1.4.2 | Preservação da data em fusos de UTC+12 a +14 e navegação presa em meses inteiramente desabilitados | Há defeitos que só aparecem onde o sinal do fuso muda |
| 1.4.3 | `selectMonth` / `selectYear` comitavam ignorando a marcação de desabilitado que eles mesmos desenhavam | O código que desenha e o que escreve precisam ver o mesmo veredito |
| 1.4.4 | `workspace:*` fixado na versão exata, impedindo que um patch de core chegasse sozinho | O próprio formato de publicação pode criar bugs |
| 1.4.5 | Um `value` inválido derrubava a árvore inteira ao lançar durante o render | Valor vindo de campo de formulário ou linha de banco é dado, não erro de programação |
| 1.4.6 | Rejeição de datas impossíveis e de horários fora do intervalo, submissão ISO de inputs nomeados | A defesa não fica em uma entrada, fica em todas elas |
| 1.4.7 | Os 7 hooks recriavam dados derivados a cada render | Otimização feita só para os componentes não chega a quem usa os hooks |

A 1.4.5 é a que mais me marcou. Quando chegava em `value` uma string impossível de parsear, um `RangeError: Invalid time value` era lançado durante o render e desmontava a árvore React inteira; sob `renderToString`, uma única linha ruim virava uma resposta 500. Só que `value` costuma vir de um campo de formulário ou de uma linha do banco de dados. **Não é um engano de quem desenvolve, é simplesmente dado.** O erro foi a biblioteca tratá-lo como erro de programação.

Recursos também houve, mas todos do tipo que preenche lacunas do que já existia.

- **Suporte a RTL** (1.3.0): todos os Root de picker ganharam a prop `dir`. Seguindo o padrão de grid do WAI-ARIA, apenas as setas físicas são invertidas; ArrowUp/Down e Home/End mantêm a direção lógica. Na 1.0 esse item estava adiado para “quando a margem do bundle permitir”, e subir o teto abriu o espaço.
- **Os 4 headless hook que faltavam** (`useMonthPicker`, `useYearPicker`, `useWeekPicker`, `useDateTimePicker`): entraram exclusivamente no entry `@kalyx/react/headless`, para não tocar no teto do bundle padrão. É por isso que foi justamente esse entry que secou primeiro.
- **Locale e Popover do TimePicker** (1.4.0): os rótulos AM/PM passaram a ser localizados via `Intl` (em ko-KR, 오전/오후), e o TimePicker também pode ser usado em popover, não apenas inline.
- **Publicação de `@kalyx/adapter-luxon` e `@kalyx/adapter-dayjs`**: os dois estão no npm, e os três adapters passam na conformance suite.

Em contrapartida, deixo registrado também o que **foi descartado** do plano. Decidi não fazer do `@kalyx/adapter-temporal` um adapter. A interface do adapter usa strings ISO-8601 como entrada e saída, portanto não consegue transportar intactas as capacidades de tipo próprias do Temporal (`PlainDate`, `ZonedDateTime`). Envolvê-las em um adapter apenas as achataria em strings ISO e redelegaria ao código Intl de core, e o ganho de exatidão medido foi zero. Não abandonei o Temporal em si: ele ficou estacionado como demanda com gate no nível de core.

As frentes adiadas não estão anotadas como “mais tarde”, e sim como **o que precisa ser observado para eu mudar de ideia**. Calendários não gregorianos (persa, budista, islâmico, hebraico): 3 ou mais issues no GitHub ou 1 patrocínio empresarial. Storybook e tests de regressão visual: quando ocorrerem 3 ou mais regressões visuais. Adapter para React Native: adiado. Escrever as condições em números evita refazer a mesma discussão toda vez.

### Limitações que reconheço com franqueza

Por fim, uma declaração honesta para quem está considerando a biblioteca. (Acredito que acrescentar marketing exagerado a uma biblioteca nova acaba corroendo a confiança.)

- **Um único maintainer**: ritmo possível de um minor por mês. As prioridades são ajustadas quando há demanda.
- **Biblioteca nova**: como a base de usuários é pequena, existe uma chance considerável de você ser a primeira pessoa a encontrar um edge case. Ainda assim, dá para dizer que os três meses acima reduziram bastante essa probabilidade. A maior parte dos defeitos corrigidos na 1.4.x foi encontrada antes pelos tests de propriedades e por uma varredura exaustiva de timezone, não por usuários.
- **Exclusiva para React 19+**: depende de pontos de leverage do React 19, como RSC, `useId`, ausência de aviso de `useLayoutEffect` e integração de form-action no `<Input>`. Não haverá back-port para a versão 18.
- **Nenhuma alegação de ser “battle-tested”**: não uso esse termo para uma biblioteca nova. O que ela tem são mais de 700 tests em todo o workspace, uma varredura de propriedades cobrindo os módulos puros de core, aprovação em todas as verificações do axe, verificação de SSR no CI com Next.js App Router e uma conformance suite para adapters.
- **O que ainda não está decidido**: não defini se `classNames` e os atributos `data-*` contam como API pública. Como não há CSS, eles são o único ponto de contato para os estilos de quem consome a biblioteca. Se não forem API pública, uma release minor pode quebrar a tela de alguém; se forem, qualquer renomeação terá de esperar uma major. Achei melhor registrar que não sei.

Se você precisa hoje de estabilidade de nível produtivo para 100 mil usuários, sinceramente, `react-datepicker` é a escolha segura. O Kalyx se parece mais com uma **aposta** em um futuro menor e mais headless.

---

## Conclusão

Este texto é mais uma retrospectiva de decisões do que uma divulgação da biblioteca. Minha experiência mostrou que registrar o que foi lançado, o que foi recusado e onde as decisões tiveram mais peso se torna o ativo mais valioso na hora de criar a próxima biblioteca ou avaliar outra.

As quatro decisões até a 1.0 eram todas sobre a **forma da API**: Composition over Props, strings ISO obrigatórias, padrão adapter e teto do bundle. Decisões que abriram mão de parte da conveniência de curto prazo para comprar adaptabilidade de longo prazo.

Só que, ao retomar e atualizar este texto, percebi que a decisão realmente difícil veio depois da 1.0. **É a decisão de quebrar o argumento de venda que você mesmo levantou.** O teto de 17 KB não era um número solto: era parte da frase que explicava o que esta biblioteca é. Subi-lo para 20 KB enfraqueceu essa frase. Ainda assim subi, por um único motivo: uma biblioteca cujo calendário fica um dia deslocado em fusos de offset negativo é inutilizável, seja ela pequena ou grande.

Olhando para trás, o que tornou esse juízo possível foi justamente o fato de haver zero usuários. Se houvesse, eu teria atendido primeiro às demandas imediatas e não gastaria três meses usando tests de propriedades para caçar um bug de DST que ninguém reportou. **Não ter usuários era a liberdade de inverter a direção.** Logo depois da 1.0 isso parecia apenas sinal de fracasso; hoje leio de outro jeito.

Se você já encontrou uma barreira semelhante por causa de um DatePicker em um projeto React, ficarei feliz se der uma olhada no Kalyx. E, se resolveu o mesmo problema de uma forma melhor, agradeceria muito se compartilhasse sua experiência em uma GitHub Issue. No fim, uma biblioteca não é algo lapidado por uma única pessoa, mas algo que evolui com quem a usa.

A instalação ocupa uma linha.

```bash
pnpm add @kalyx/react
```

No [Playground](https://kalyx-docs-site.vercel.app/playground) do site de documentação, é possível testar diretamente os sete picker. Você pode alternar locale e timezone, editar classNames e aplicar seus próprios tokens de design.

:::ref

[repo] [jiji-hoon96/kalyx](https://github.com/jiji-hoon96/kalyx)

[docs] [Site oficial de documentação do Kalyx](https://kalyx-docs-site.vercel.app/)


[docs] [Documentação do DatePicker do Ark UI](https://ark-ui.com/docs/components/date-picker)

[docs] [Padrão Composition do Radix UI](https://www.radix-ui.com/primitives/docs/overview/introduction)

[docs] [Guia de componentes headless do React Aria](https://react-spectrum.adobe.com/react-aria/)

[docs] [Documentação oficial do Floating UI](https://floating-ui.com/)

:::
