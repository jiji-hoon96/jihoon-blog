---
emoji: 📅
title: 'Kalyx'
seoTitle: 'Kalyx: evitar a data um dia errada no DatePicker React'
date: '2026-06-17'
updatedAt: '2026-09-19'
categories: bibliotecas React DatePicker código-aberto
description: 'Por que criei o Kalyx, DatePicker headless para React, e como difere de Ark UI, React Aria e react-day-picker: valores ISO UTC, DST com Intl e testes IANA.'
keywords: 'Kalyx, DatePicker React, DatePicker headless React, DatePicker React fuso horário, ISO 8601 UTC, data com um dia a menos, bug de horário de verão JavaScript, teste de propriedades fast-check, alternativa ao react-day-picker'
locale: pt-BR
translationOf: '260617'
sourceHash: '3ef642d1bca4f9c8c3029970e3fe56ac1bc3e6e3623f9dad7d017e7dcf9d292f'
---

Neste post, quero falar sobre o **Kalyx**, a biblioteca headless de DatePicker para React que eu criei.

Este texto é uma reescrita de uma retrospectiva que publiquei em junho de 2026. A frase que abria o post original, "sete pickers em uma única API, menores que um único calendário de uma biblioteca concorrente", ao ser verificada de novo, se mostrou metade errada e metade irrelevante como diferencial. Por isso reorganizo tudo nesta ordem: por que criei, em que difere das opções existentes e qual é a definição técnica.

Adiantando a conclusão: o que diferencia o Kalyx não é a quantidade de componentes, e sim o **modelo de valor**. As versões de referência são `@kalyx/react` 1.4.7 e `@kalyx/core` 1.4.8 (MIT, apenas React 19), e os trechos de código vêm do [repositório no GitHub](https://github.com/jiji-hoon96/kalyx) na `main` de 2026-09-16 (`0bb302e`).

---

## Eu queria usar seletores de datas de forma declarativa

Tive dois motivos para criá-lo. Eu queria usar bibliotecas de datas complexas e difíceis de usar de um jeito mais declarativo e simples, e queria aprender como uma biblioteca dessas é construída por dentro. "Difícil de usar" é vago, então voltei às definições de tipos de cada biblioteca para conferir se os lugares onde travei ainda existem nas versões mais recentes.

### Uma API que liga modos com props

O react-datepicker liga a seleção de horário com `showTimeSelect`, a de mês com `showMonthYearPicker`, a de ano com `showYearPicker` e a de intervalo com `selectsRange`. É uma estrutura em que um mesmo componente vira outra coisa conforme a combinação de props. O custo aparece nos tipos. Nas definições de tipos da 9.1.0, conforme o valor de `selectsRange`, a assinatura de `onChange` se ramifica.

```ts
// react-datepicker/dist/index.d.ts (발췌)
    selectsRange?: true;
    selectsMultiple?: false | undefined;
    formatMultipleDates?: never;
    onChange?: (date: [Date | null, Date | null], event?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => void;
```

É uma union bem feita, mas os ramos se multiplicam à medida que os modos aumentam, e quem usa precisa deduzir qual combinação está ativa só pelos nomes das props. (Tem o mesmo formato de "uma abstração que agrupa as coisas erradas aumenta o acoplamento", tema do meu post sobre [abstração](/260201).) Eu queria que "um campo de entrada, um popover e um calendário" pudessem ser lidos na própria estrutura do JSX.

### Onde tipos de valor e fuso horário vazam

O react-datepicker e o react-day-picker trocam objetos `Date` nativos. Os dois têm, sim, uma prop `timeZone` que aceita fusos IANA. O react-datepicker exige a peer opcional `date-fns-tz` e a do react-day-picker é experimental, mas, em qualquer um dos dois, o tipo do valor continua sendo `Date`. Como um `Date` é interpretado no fuso horário local do ambiente de execução, em Seul `new Date(2026, 3, 15)` passado por `toISOString()` resulta em `2026-04-14T15:00:00.000Z`. Você escolhe 15 de abril e o servidor enxerga dia 14. A issue ["Date Selected is One Day Off"](https://github.com/Hacker0x01/react-datepicker/issues/1018) do react-datepicker foi aberta em setembro de 2017 e fechada em dezembro de 2025.

Do outro lado, Ark UI e React Aria usam objetos `@internationalized/date` como `CalendarDate` e `ZonedDateTime`. A semântica é precisa, mas em um app em que o estado dos formulários e as respostas do servidor são todos strings, surge código de conversão em cada fronteira.

O suporte a fusos horários também pode ficar preso à escolha da biblioteca de datas. No código dos adapters do MUI X Date Pickers 9.13.0, os adapters de dayjs, Luxon e Moment têm `isTimezoneCompatible = true`, e a família date-fns tem `false`. Um app que usa date-fns precisa trazer mais uma biblioteca de datas para usar a prop `timezone`.

Os modos estavam espalhados em combinações de props, os valores em objetos `Date` cuja interpretação depende do ambiente e o suporte a fusos horários na escolha da biblioteca de datas.

**Era difícil expressar a intenção em uma única declaração.**

### Aprender construindo

Um seletor de datas parece pequeno, mas contém aritmética de calendário, locales, fusos horários e horário de verão (DST), navegação por teclado e SSR. Por isso defini como objetivo que, do lado de quem usa, desse para entender o que está sendo construído só olhando o JSX, e que, do lado de quem constrói, o código fosse enxuto o bastante para eu conseguir explicar onde os valores são convertidos.

Então, será que não existia mesmo nenhuma biblioteca que já resolvesse essas necessidades?

---

## Em que ele difere das opções existentes

A resposta curta é que existia. Comecei acreditando que não havia nenhuma biblioteca headless com vários pickers, mas ao pesquisar de novo essa premissa se mostrou errada.

### O modelo de valor que cada opção escolheu

O conteúdo abaixo foi verificado em 2026-09-16, instalando a versão mais recente do npm e conferindo as definições de tipos e a documentação oficial. A coluna de tamanho foi medida com o mesmo método explicado mais adiante.

| Biblioteca | Headless | Tipo de valor | Entrada de horário | Seleção só de mês ou ano | gzip |
| --- | --- | --- | --- | --- | --- |
| react-day-picker 10.0.1 | Não (inclui CSS) | `Date` | Não | Não | 20.0KB |
| react-datepicker 9.1.0 | Não (import de CSS) | `Date` | `showTimeSelect` | Via props | 45.4KB |
| MUI X 9.13.0 | Não (Material) | Objeto do adapter | TimePicker | `views` | 113.1KB |
| Ark UI 5.39.2 | Sim | `@internationalized/date` | Segmentos com `DateInput` à parte (fora do tamanho) | `minView` | 42.7KB |
| React Aria Components 1.21.1 | Sim | `@internationalized/date` | Segmentos de `TimeField` | Não | 75.3KB (DatePicker), 78.8KB (com intervalo e hora) |
| Kalyx 1.4.7 | Sim | String ISO 8601 UTC | HourList e MinuteList em lista | MonthPicker, YearPicker | 18.9KB (DatePicker), 25.6KB (tudo) |

O react-day-picker afirma no [guia oficial](https://daypicker.dev/guides/timepicker) que "DayPicker does not include a built-in time picker". O tamanho do MUI inclui `@mui/material` e emotion, então, se o seu app já usa MUI, o aumento é bem menor.

### Opções headless completas já existem

As linhas que importam na tabela são Ark UI e React Aria. O [Ark UI](https://ark-ui.com/docs/components/date-picker) oferece seleção única, múltipla e de intervalo, além de seleção por mês e ano, com uma API de composição em dot notation como `DatePicker.Root`. O [React Aria](https://react-aria.adobe.com/DatePicker) é a implementação da Adobe focada em acessibilidade. Então o espaço do Kalyx é mais estreito do que eu pensava no início.

> Opções headless completas já existem. Porém, Ark UI e React Aria trocam valores como objetos `@internationalized/date` e oferecem a entrada de horário como campos segmentados. O Kalyx fixa os valores como strings de instante UTC que vão direto para o JSON, e coloca na mesma API de composição um TimePicker baseado em listas e pickers de mês, ano e semana.

Ainda assim, "os valores são strings, e isso é bom" é um argumento fraco. Um `CalendarDate` também vira string com um único `toString()`. O diferencial não é o formato, e sim **o contrato de que essa string é sempre um momento real (um instante) e nunca se mistura com uma célula do calendário (uma coordenada), e os testes que garantem esse contrato**.

### Medi o tamanho do bundle de novo com um mesmo método

O tamanho do bundle no badge do README não era uma quantidade comparável à de outras bibliotecas. Os cerca de 19.5KB do badge são um único arquivo de `@kalyx/react` em `dist`, e esse arquivo deixa `@kalyx/core`, `@kalyx/adapter-date-fns` e `@floating-ui/react` como imports externos. Eu tinha colocado esse número ao lado dos números de outras bibliotecas que incluíam suas dependências.

Então medi tudo de novo com esta pergunta: "quanto o bundle cresce quando um app consumidor adiciona uma linha de import?"

```bash
echo "import { DatePicker } from '@kalyx/react'; export default DatePicker;" > entry.jsx
npx esbuild entry.jsx --bundle --minify --format=esm --platform=browser \
  --external:react --external:react-dom --external:react/jsx-runtime | gzip -6 | wc -c
```

Medição de 2026-09-16 com esbuild 0.28.2; KB são bytes divididos por 1024. No react-datepicker excluí o CSS. O React Aria Components medi duas vezes: com os 12 exports necessários para montar um único DatePicker (`DatePicker`, `DateInput`, `Calendar`, `Popover`, `Dialog` etc.) e com 14 exports que acrescentam intervalo e hora (incluindo `DateRangePicker`, `RangeCalendar` e `TimeField`).

![Nas mesmas condições de esbuild, o tamanho cresce nesta ordem: Kalyx DatePicker 18.9KB, react-day-picker 20.0KB, Kalyx completo 25.6KB, Ark UI 42.7KB, react-datepicker 45.4KB, React Aria Components 75.3KB (78.8KB com intervalo e hora), MUI X 113.1KB.](1.png?w=720)

Nas mesmas condições, só uma afirmação é verdadeira. Um DatePicker (18.9KB) tem tamanho parecido com o de `DayPicker` (20.0KB), e os sete juntos (25.6KB) são maiores. (E mesmo assim, o DayPicker é só o calendário, enquanto o Kalyx DatePicker inclui também o campo de entrada e o popover.) O tamanho é sensível à combinação de imports e ao nível de gzip, então é melhor lê-lo como ordem de grandeza, e tamanho não é o motivo central para escolher o Kalyx.

---

## Uma definição técnica do Kalyx

> O Kalyx é um seletor de datas headless para React que fixa todas as entradas e saídas como strings de instante UTC, confina a conversão entre coordenadas de calendário e instantes a duas funções e verifica essa ida e volta com testes de propriedades em todos os fusos horários que o runtime conhece.

A API do lado de quem usa é esta. `value` e `onChange` usam `string | null`, e `displayTimezone` decide o calendário de qual fuso é exibido.

```tsx
<DatePicker value={iso} onChange={setIso} displayTimezone="America/New_York">
  <DatePicker.Input />
  <DatePicker.Popover>
    <DatePicker.Calendar />
  </DatePicker.Popover>
</DatePicker>
```

### Valores são instantes, células do calendário são coordenadas

Dentro do Kalyx circulam dois tipos de strings ISO com o mesmo formato. Uma **coordenada** é uma célula da grade do calendário; é escrita como `YYYY-MM-DDT00:00:00.000Z`, mas não tem noção de fuso horário. O cálculo da grade roda só em UTC, então não depende do ambiente de execução. Um **instante** é o valor que sai por `onChange`: o momento real que corresponde à meia-noite daquele dia em `displayTimezone`. O mesmo 15 de janeiro é `2026-01-15T05:00:00.000Z` em Nova York e `2026-01-14T15:00:00.000Z` em Seul.

![A coordenada de calendário 2026-01-15T00:00:00.000Z vira os instantes de Nova York e Seul por meio de civilMidnightFromUtcDay e volta a ser coordenada por meio de calendarDayFromInstant.](2.png?w=720)

Só duas funções de `@kalyx/core` ligam os dois: `civilMidnightFromUtcDay`, que transforma coordenada em instante, e sua inversa, `calendarDayFromInstant`. Esta última lê "que dia é esse instante neste fuso" e escreve de novo como coordenada de meia-noite UTC.

```ts
// packages/core/src/utils/timezone.ts:187-190
export function calendarDayFromInstant(iso: ISODateString, timeZone: string): ISODateString {
  const p = partsInTimezone(new Date(iso), timeZone);
  return new Date(Date.UTC(p.year, p.month - 1, p.day)).toISOString();
}
```

A regra é de direção. Ao escolher uma célula e confirmar o valor, a coordenada vira instante; ao decidir, a partir do valor salvo, qual mês exibir e onde colocar o foco, o instante vira coordenada. O `selectDate` do Root do DatePicker converte, verifica as restrições com o instante convertido e, se passar, confirma.

```ts
// packages/react/src/components/DatePicker/Root.tsx:182-194
const normalized =
  coordinate && displayTimezone
    ? civilMidnightFromUtcDay(coordinate, displayTimezone)
    : coordinate;

if (normalized && isDateDisabled(normalized, disabledRules, adapter, displayTimezone)) {
  return;
}

if (!isControlled) {
  setUncontrolledValue(normalized);
}
onChange?.(normalized);
```

Esse não é o único ponto de chamada. Buscando em `packages/react/src`, as duas funções aparecem espalhadas pelo Root e pelo Calendar de DatePicker, RangePicker e DateTimePicker, pelos Presets, pelos utilitários de navegação por teclado e por seis hooks headless. Mesmo assim, todo caminho que confirma uma célula de data ou decide a visualização passa por uma das duas. Confirmar um horário fica com `setTimeInTimezone`, que por dentro converte com a mesma função interna, `resolveCivilDateTime`.

Esse contrato é protegido por testes baseados em propriedades (property-based tests). Para toda coordenada `c` e todo fuso `z`, `calendarDayFromInstant(civilMidnightFromUtcDay(c, z), z) === c` precisa valer.

```ts
// packages/core/src/__tests__/timezone.property.test.ts:86-94
it('round-trips every UTC calendar coordinate through civil midnight', () => {
  fc.assert(
    fc.property(utcCalendarCoordinate(), zone(), (coordinate, timeZone) => {
      const instant = civilMidnightFromUtcDay(coordinate, timeZone);
      expect(calendarDayFromInstant(instant, timeZone)).toBe(coordinate);
    }),
    RUNS,
  );
});
```

O [fast-check](https://fast-check.dev/) gera datas aleatórias entre 2020 e 2045 e as combina com 14 fusos representativos, como Kathmandu (+5:45), Kiritimati (+14) e Niue (-11), em 300 execuções. O teste logo em seguida verifica a mesma ida e volta 12 vezes por fuso para todos os fusos retornados por `Intl.supportedValuesOf('timeZone')`. No meu Node 24.16 local, essa lista tem 418 fusos. A 1.4.8 acrescentou um teste exaustivo que compara, em cada transição de horário de verão, a conversão dos horários-limite com uma implementação do Temporal.

Então por que a biblioteca não normaliza sozinha para instante um `"2026-01-15T00:00:00.000Z"` passado pelo usuário? Esse caminho está fechado, porque só pela string não dá para saber se é coordenada ou instante. Se o valor de Seul `2026-01-14T15:00:00.000Z`, que já é um instante, passar de novo por `civilMidnightFromUtcDay`, vira `2026-01-13T15:00:00.000Z`; em fusos com offset positivo como Seul, a data continua voltando um dia a cada render. (O valor de Nova York não muda se passar de novo.) Trocar por `startOfDayInTimezone`, que dá o mesmo resultado não importa quantas vezes seja aplicado, elimina o deslocamento, mas deixa de fazer o trabalho original de transformar coordenada em instante.

Por isso desisti da normalização e fixei o contrato na documentação. Quem usa precisa repassar exatamente o valor que o picker emitiu. Sendo sincero, é um custo empurrado para quem consome a biblioteca, e como `ISODateString` é um alias de `string`, o compilador também não impede o erro.

### Resolvendo DST só com Intl

Para transformar uma coordenada em instante, é preciso saber quando é, em UTC, "00:00 daquele dia naquele fuso", mas o offset só pode ser obtido quando já se conhece o instante. Além disso, nos dias de transição do horário de verão, o horário local pode não existir (spring forward) ou existir duas vezes (fall back).

O Kalyx resolve isso sem uma biblioteca como `date-fns-tz`. Ele pergunta ao `Intl.DateTimeFormat(...).formatToParts` "que horas são neste fuso neste momento UTC" para medir o offset, e lê esse offset em dois pontos: um dia antes e um dia depois do horário pedido.

```ts
// packages/core/src/utils/timezone.ts:251-254, 259
const candidate = (probeEpoch: number) =>
  civilEpoch - getTimezoneOffsetMinutes(new Date(probeEpoch).toISOString(), timeZone) * 60_000;
const epochBefore = candidate(civilEpoch - 86_400_000);
const epochAfter = candidate(civilEpoch + 86_400_000);

if (epochBefore === epochAfter) return new Date(epochBefore).toISOString();
```

`civilEpoch` é o horário local desejado lido como se fosse UTC. Os offsets ficam dentro de ±14 horas, então um dia antes e um dia depois dão o offset de cada lado de qualquer transição próxima. Se os dois coincidem não há transição e bastam duas chamadas a `formatToParts`; como a grade chama isso uma vez para cada uma das suas 42 células, é esse caminho rápido que determina o custo. (A premissa de no máximo uma transição em 48 horas vale em todos os fusos de 2020 a 2045.)

Se forem diferentes, ele relê os dois candidatos naquele fuso e confere qual coincide com o horário pedido (`timezone.ts:261-279`). Na sobreposição do fall back os dois coincidem, então ele escolhe o mais cedo, montado com o offset anterior à transição; no buraco do spring forward nenhum coincide, então escolhe esse mesmo lado e avança o horário pela duração do buraco. Este é o resultado de rodar de verdade.

| Pedido | Situação | 1.4.7 | 1.4.8 |
| --- | --- | --- | --- |
| New_York 2026-03-08 02:30 | Horário inexistente | `2026-03-08T07:30:00.000Z` | Igual (03:30 EDT, para frente) |
| New_York 2026-11-01 01:30 | Horário que ocorre duas vezes | `2026-11-01T05:30:00.000Z` | Igual (01:30 EDT, o mais cedo) |
| London 2026-10-25 01:30 | Horário que ocorre duas vezes | `2026-10-25T01:30:00.000Z` (o mais tarde) | `2026-10-25T00:30:00.000Z` (01:30 BST, o mais cedo) |

"Buracos vão para frente, ambiguidade fica com o mais cedo" coincide com o padrão de `disambiguation`, `"compatible"`, descrito na [documentação do Temporal.ZonedDateTime no MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime). Por que a linha de Londres erra na 1.4.7 fica para mais adiante.

### A fronteira do adapter são 21 métodos de strings

Se o core calcula fusos horários, do que date-fns ou dayjs cuidam? Da aritmética de datas e do parsing. Essa fronteira, `DateAdapter`, tem 21 métodos, e todos os argumentos de data e valores de retorno são strings ISO.

```ts
// packages/core/src/types.ts:71-102 (발췌)
export interface DateAdapter {
  parse(value: string, format?: string): string;
  format(iso: string, formatStr: string, timezone?: string): string;
  addDays(iso: string, n: number): string;
  isSameDay(a: string, b: string, timezone?: string): boolean;
  startOfDay(iso: string, timezone?: string): string;
  today(timezone?: string): string;
  // addMonths, isBefore, startOfMonth, getYear 등 15개
}
```

Os métodos que recebem fuso horário são quatro, `format`, `isSameDay`, `startOfDay` e `today`, e até esses quatro delegam o cálculo ao core. O `format` do adapter de date-fns, quando recebe `timezone`, chama diretamente o `formatInTimezone` do core (`packages/adapter-date-fns/src/index.ts:112-115`). Por isso, seja qual for o adapter, as respostas sobre fuso horário saem do mesmo código, e os três adapters (date-fns, dayjs, luxon) pegam em `@kalyx/core/test-helpers` a função `runAdapterConformanceTests` e a rodam cada um para confirmar que dão as mesmas respostas.

Os dois entry points também se separam sobre essa fronteira. O entry padrão, `@kalyx/react`, chama `setDefaultAdapter(DateFnsAdapter)` ao carregar o módulo, então funciona logo após a instalação (`packages/react/src/index.ts:9-11`). `@kalyx/react/headless` não faz essa chamada e é empacotado à parte, então nenhum código de date-fns entra.

O formato dessa fronteira teve um preço. Em junho de 2026, desisti de um adapter de Temporal. O valor do Temporal está em **os tipos carregarem o significado**, como `PlainDate` e `ZonedDateTime`, mas se a fronteira é uma string, esse significado não consegue atravessá-la. Envolver o Temporal só achataria tudo em string, então concluí que não havia ganho de exatidão. Olhando para trás, o problema da seção anterior, "coordenadas e instantes são o mesmo `string`", é exatamente o que o Temporal resolve no sistema de tipos com `PlainDate` e `Instant`. A fronteira de strings facilitou a troca de adapters, mas em troca fechou o caminho de resolver isso com tipos.

### Sete pickers são combinações de três contextos

O Kalyx tem sete pickers: DatePicker, RangePicker, TimePicker, DateTimePicker, MonthPicker, YearPicker e WeekPicker. O que importa não é a quantidade, e sim **o fato de os sete não serem implementações independentes**. Existem só três contextos: `DatePickerContext`, `RangePickerContext` e `TimePickerContext`.

| Picker | Root que guarda o estado | Contexto | Onde está a diferença |
| --- | --- | --- | --- |
| DatePicker | `DatePickerRoot` | Date | |
| MonthPicker, YearPicker | Implementação do Root do DatePicker | Date | `selectionGranularity` |
| RangePicker | `RangePickerRoot` | Range | |
| WeekPicker | `RangePickerRoot` sem alterações | Range | `selectionMode="week"` no Calendar |
| TimePicker | `TimePickerRoot` | Time | |
| DateTimePicker | Root próprio | Date e Time aninhados | Sobrepõe dois Providers |

O Root do MonthPicker apenas muda o formato de exibição padrão para `yyyy-MM` e passa `selectionGranularity="month"` para a implementação do Root do DatePicker (`MonthPicker/Root.tsx:11-20`). O `selectDate` do DatePicker, quando a granularity é `month`, dobra a coordenada para o dia 1 daquele mês e depois passa pela mesma conversão e verificação de restrições vistas antes. O DateTimePicker fornece os dois contextos sobrepostos.

```tsx
// packages/react/src/components/DateTimePicker/Root.tsx:401-402
<DatePickerContext.Provider value={dateContext}>
  <TimePickerContext.Provider value={timeContext}>{children}</TimePickerContext.Provider>
```

Por isso `DateTimePicker.Calendar` é o mesmo componente que `DatePicker.Calendar` e não sabe dentro de qual picker está. Uma correção em um lugar chega a todos os pickers que usam esse componente, e um defeito em um lugar também. Essa base compartilhada também explica por que um único DatePicker representava 74% do total no gráfico anterior.

---

## O que custou manter o contrato

Os três meses desde a 1.0 foram mais para verificar esse contrato do que para criar funcionalidades, e surgiram três defeitos que testes baseados em exemplos teriam deixado passar. O primeiro foi encontrado por um teste de propriedades, o segundo por uma revisão cruzada do código e o terceiro pela checagem deste post.

### Uma hora em 1º de outubro em Sydney

O primeiro foi a propriedade "ler no fuso o resultado de `startOfDayInTimezone` dá 00:00:00" quebrar em Australia/Sydney. A implementação da época media o offset só uma vez. Sydney passa de +10 para +11 às 02:00 de 1º de outubro de 2034, e 00:00 desse dia ainda é +10, então a resposta certa é `2034-09-30T14:00:00.000Z`. Mas "o ponto em que 00:00 de 1º de outubro é lido como UTC" fica depois da transição, então retornava +11, e o resultado era 23:00 do dia anterior. Esse contraexemplo continua como teste de regressão (`timezone.property.test.ts:276`).

### Um teste que só passava em Seul

O segundo apareceu em uma revisão cruzada em 3 de agosto de 2026. O código que decide qual célula do calendário marcar como selecionada convertia duas vezes. A célula já era uma coordenada, mas tanto a célula quanto o valor salvo eram convertidos para a data daquele fuso. Veja o resultado de escolher "15 de janeiro".

| Fuso | Valor salvo | Célula marcada como selecionada |
| --- | --- | --- |
| `Asia/Seoul` (+9) | `2026-01-14T15:00:00.000Z` | Dia 15 (certo) |
| `America/New_York` (-5) | `2026-01-15T05:00:00.000Z` | Dia 16 (errado) |

Em fusos com offset positivo, os dois deslocamentos se anulavam e por acaso dava certo, e os testes existentes só cobriam Seul. A mesma revisão encontrou também uma violação na direção oposta. Ao decidir qual mês exibir, `startOfMonth` era aplicado direto a um instante, então, em Seul, passar 1º de janeiro como valor abria o calendário de dezembro.

Os mecanismos são diferentes, mas a regra violada é uma só: converter uma única vez por direção, com a função definida para aquela direção.

Esse incidente ampliou os testes de propriedades de ida e volta do core de "alguns fusos representativos" para "todos os fusos que o runtime conhece". (Os testes de componentes do lado React ainda usam fusos representativos como `America/New_York`.)

**Defeitos que só aparecem onde o sinal muda não são pegos por amostragem.**

### O 01:30 de Londres que resolvia tarde

O terceiro apareceu quando estendi a tabela de DST deste post para outros fusos. A 1.4.7 começava a medir o offset no ponto em que o horário pedido é lido como UTC, e nos fusos cujo offset após a transição é 0 ou mais, esse ponto já fica depois da transição, então convergia para o offset mais tarde. Comparando com o temporal-polyfill todas as transições de 2020 a 2045 em 418 fusos, em 1.908 das 3.395 transições com sobreposição o resultado era o mais tarde, espalhadas por 84 fusos. (As 3.394 transições com buraco estavam todas certas, e Nova York, com offset negativo, acertava por acaso.)

Em [#226](https://github.com/jiji-hoon96/kalyx/pull/226) mudei para ler um dia antes e um dia depois, publiquei como `@kalyx/core` 1.4.8 e deixei a mesma comparação como `timezone.dst-oracle.test.ts`. (O temporal-polyfill é usado só nos testes.) O comentário no código que dizia erroneamente `'earlier'` agora diz `'compatible'`. De novo, **as amostras estavam concentradas em um só sinal.**

### Os 3KB gastos com exatidão

Essas correções custaram código. O Kalyx define na CI um teto para o bundle do entry padrão, e um PR que o ultrapassa falha em um check obrigatório. Esse teto começou em 12KB e subia 1KB a cada funcionalidade que entrava, e em agosto de 2026, ao refazer por completo a exatidão de fusos horários e restrições, eu o subi de 17KB para 20KB de uma vez.

O tamanho era um argumento de venda exibido no badge do README. Um seletor de datas que desloca um dia em fusos com offset negativo não serve, seja pequeno ou grande.

**Se eu tiver que escolher entre pequeno e correto, fico com o correto.**

Hoje o teto está apertado. Segundo o documento de mapa de bytes do bundle do repositório, de 2026-09-11, `dist/index.cjs` medido com o gzip padrão do Node tem 20.259 B, contra um teto de 20.480 B, deixando 221 B de folga. (É o tamanho do próprio arquivo com as dependências externas, então é uma quantidade diferente da do gráfico anterior.) A próxima funcionalidade vai precisar recuperar bytes antes de entrar.

---

## Uma conclusão diferente da inicial

O que eu queria era usar bibliotecas de datas complexas de forma declarativa. Depois de construir, percebi que APIs de composição declarativas e opções headless completas já existiam. A diferença que restou estava mais para dentro. **Fixar o valor como um único instante, reduzir a conversão entre coordenadas e instantes a duas funções e proteger essa ida e volta com testes em todos os fusos horários.** O tratamento de DST baseado em Intl, a fronteira de adapter com strings e os sete pickers feitos com três contextos são consequências dessa decisão.

Pelo objetivo de aprender, a maior lição foi como afirmar que algo está "correto". A comparação de bundles do post original media quantidades diferentes, e o teste que passava em Seul estava errado em Nova York. Se você não registra junto o que mediu e com qual amostra verificou, números viram facilmente motivo de vaidade.

Os limites também são claros. Sou o único maintainer, só há suporte a React 19, e os downloads no npm de `@kalyx/react` de 5 a 11 de setembro de 2026 foram 200, dos quais 156 se concentraram no único dia do lançamento da 1.4.7. A impossibilidade de separar coordenadas e instantes por tipos é contida só pela documentação, e também não decidi se vou garantir como API pública os pontos de contato para estilo, `classNames` e os atributos `data-*`. Em acessibilidade, há os papéis `grid` nos calendários, `combobox` nos campos de entrada e `listbox` nas listas de horário, com navegação por setas, Home/End e PageUp/PageDown, e a CI roda as verificações de `jest-axe` de 8 arquivos de teste, mas ainda não tenho base para dizer que ela é tão comprovada quanto a do React Aria.

Por isso, se o seu app já usa MUI, vale olhar primeiro o MUI X; se entrada por segmentos e acessibilidade comprovada vêm primeiro, o React Aria; e se você só precisa de um calendário, o react-day-picker. Se você já passou por datas deslocando um dia em formulários onde os valores trafegam como JSON, eu ficaria feliz se desse uma olhada no Kalyx nesse momento, e se conhece uma solução melhor, agradeceria se me contasse em uma GitHub Issue.

```bash
pnpm add @kalyx/react
```

No [Playground](https://kalyx-docs-site.vercel.app/playground) do site de documentação, você pode testar os sete pickers e mudar as configurações de locale e timezone por conta própria.

:::ref

[docs] [Site de documentação oficial do Kalyx](https://kalyx-docs-site.vercel.app/)

[docs] [MUI, Date and Time Pickers Timezone](https://mui.com/x/react-date-pickers/timezone/)

[docs] [Documentação oficial do Floating UI](https://floating-ui.com/)

:::
