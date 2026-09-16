---
emoji: 📅
title: 'Kalyx'
seoTitle: 'Kalyx: A Headless React DatePicker That Gets Timezones Right'
date: '2026-06-17'
updatedAt: '2026-09-16'
categories: Library React DatePicker Open-Source
description: 'Why I built Kalyx, a headless React DatePicker, and how it differs from Ark UI, React Aria and react-day-picker: UTC ISO values, Intl DST, timezone tests.'
keywords: 'Kalyx, React DatePicker, headless DatePicker, React date picker timezone, ISO 8601 UTC date string, date off by one day bug, DST bug JavaScript, fast-check property testing, react-day-picker alternative'
locale: en
translationOf: '260617'
sourceHash: 15dcfd39502cf19fbd1b9cae7edec991beacef87ce2bdfc38fe25aa497a6ad87
---

In this post, I want to talk about **Kalyx**, the headless React DatePicker library I built.

This is a rewrite of a retrospective I wrote in June 2026. The original post's headline claim, "seven pickers behind one API, smaller than a single calendar from a competing library," turned out on re-examination to be half wrong and half not a differentiator. So I am reorganizing it in three parts: why I built it, how it differs from existing options, and a technical definition.

To give the conclusion first, what sets Kalyx apart is not the number of components but its **value model**. The reference version is `@kalyx/react` 1.4.7 (MIT, React 19 only), and code excerpts come from the [GitHub repository](https://github.com/jiji-hoon96/kalyx) at `main` as of 2026-09-11.

---

## I wanted to use date libraries declaratively

I had two reasons for building it. I wanted to use complex, hard-to-use date libraries in a more declarative and simple way, and I wanted to learn how such a library is built on the inside. "Hard to use" is vague, so let me point to the places I got stuck, using each library's type definitions.

### An API that switches modes with props

react-datepicker turns on time selection with `showTimeSelect`, month selection with `showMonthYearPicker`, year selection with `showYearPicker`, and range selection with `selectsRange`. One component becomes a different thing depending on its prop combination. The cost shows up in the types. In the 9.1.0 type definitions, depending on the value of `selectsRange`, the `onChange` signature forks.

```ts
// react-datepicker/dist/index.d.ts (발췌)
    selectsRange?: true;
    selectsMultiple?: false | undefined;
    formatMultipleDates?: never;
    onChange?: (date: [Date | null, Date | null], event?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => void;
```

It is a well-crafted union, but branches multiply as modes are added, and the consumer has to reconstruct which combination is active just from prop names. (This has the same shape as "an abstraction that bundles the wrong things increases coupling," which I covered in my post on [abstraction](/260201).) I wanted "an input, a popover, and a calendar" to be readable from the JSX structure itself.

### Where value types and timezones leak

react-datepicker and react-day-picker pass native `Date` objects around. Because a `Date` is interpreted in the runtime's local timezone, in Seoul, `new Date(2026, 3, 15)` run through `toISOString()` gives `2026-04-14T15:00:00.000Z`. You pick April 15, and the server sees the 14th. react-datepicker's ["Date Selected is One Day Off"](https://github.com/Hacker0x01/react-datepicker/issues/1018) issue was opened in September 2017 and closed in December 2025.

On the other side, Ark UI and React Aria use `@internationalized/date` objects such as `CalendarDate` and `ZonedDateTime`. The semantics are precise, but in an app where form state and server responses are all strings, conversion code appears at every boundary.

Timezone support can also be tied to your choice of date library. Looking at the adapter code in MUI X Date Pickers 9.13.0, the dayjs, Luxon, and Moment adapters have `isTimezoneCompatible = true`, while the date-fns family has `false`. An app on date-fns has to bring in a second date library to use the `timezone` prop.

In short, modes were scattered across prop combinations, values across objects bound to the local timezone, and timezone support across the choice of date library, so **it was hard to express intent in a single declaration.**

### Learning by building

A date picker looks small, but it contains calendar arithmetic, locales, timezones and DST, keyboard navigation, and SSR. Reading about these in documentation is different from drawing the boundaries yourself and guarding them with tests. So I set two goals: on the consumer side, you should be able to read what is being built just from the JSX; on the implementation side, the code should be narrow enough that I can explain where values get converted.

So was there really no library that had already solved these needs?

---

## How it differs from existing options

The short answer is that there was. In the original post I wrote as if "no library is both headless and ships multiple pickers," but when I researched again, that premise was wrong.

### The value model each option chose

The following was verified on 2026-09-16 by installing the latest version of each package from npm and checking its type definitions and official documentation. The size column was measured with the same method described below.

| Library | Headless | Value type | Time input | Month/year-only selection | gzip |
| --- | --- | --- | --- | --- | --- |
| react-day-picker 10.0.1 | No (ships CSS) | `Date` | None | None | 20.0KB |
| react-datepicker 9.1.0 | No (CSS import) | `Date` | `showTimeSelect` | Via props | 45.4KB |
| MUI X 9.13.0 | No (Material) | Adapter object | TimePicker | `views` | 113.1KB |
| Ark UI 5.39.2 | Yes | `@internationalized/date` | Segmented input | `minView` | 42.7KB |
| React Aria Components 1.21.1 | Yes | `@internationalized/date` | `TimeField` segments | None | 78.8KB |
| Kalyx 1.4.7 | Yes | ISO 8601 UTC string | List-based HourList, MinuteList | MonthPicker, YearPicker | 18.9KB (DatePicker), 25.7KB (all) |

react-day-picker states in its [official guide](https://daypicker.dev/guides/timepicker) that "DayPicker does not include a built-in time picker." MUI X's range selection is not in the Community package; it is in Pro. The MUI size includes `@mui/material` and emotion, so if you already have a MUI app, the actual increase is much smaller.

### Complete headless options already exist

The rows that matter in the table are Ark UI and React Aria. [Ark UI](https://ark-ui.com/docs/components/date-picker) offers single, multiple, and range selection plus month- and year-level selection through a dot notation composition API such as `DatePicker.Root`. [React Aria](https://react-aria.adobe.com/DatePicker) is Adobe's accessibility-focused implementation. So Kalyx's niche is narrower than I first thought.

> Complete headless options already exist. However, Ark UI and React Aria exchange values as `@internationalized/date` objects and offer time input as segmented fields. Kalyx fixes values as UTC instant strings that go straight into JSON, and puts a list-based TimePicker along with month, year, and week pickers into the same composition API.

Still, "values are strings, which is nice" is a weak claim. A `CalendarDate` becomes a string with a single `toString()`. The differentiator is not the format but **the contract that the string is always an instant, and the tests that keep that contract**. Dot notation is not a differentiator either, since Ark UI uses it too.

### Re-measuring bundle size with one method

The bundle comparison in the original post was measuring different quantities. The roughly 19.5KB on the README badge is a single file in `@kalyx/react`'s `dist`, and that file leaves `@kalyx/core`, `@kalyx/adapter-date-fns`, and `@floating-ui/react` as external imports. I had placed that number next to other libraries' numbers that included their dependencies.

So I re-measured everything as "how much does the bundle grow when a consumer app adds one import line?"

```bash
echo "import { DatePicker } from '@kalyx/react'; export default DatePicker;" > entry.jsx
npx esbuild entry.jsx --bundle --minify --format=esm --platform=browser \
  --external:react --external:react-dom --external:react/jsx-runtime | gzip -6 | wc -c
```

Measured on 2026-09-16 with esbuild 0.28.2. For react-datepicker I excluded the CSS, and for React Aria Components I imported, all at once, the 14 exports needed to assemble a picker (`DatePicker`, `DateRangePicker`, `Calendar`, `TimeField`, `Popover`, `Dialog`, and so on).

![Measured under the same esbuild conditions, sizes grow in this order: Kalyx DatePicker 18.9KB, react-day-picker 20.0KB, all of Kalyx 25.7KB, Ark UI 42.7KB, react-datepicker 45.4KB, React Aria Components 78.8KB, MUI X 113.1KB.](1.png?w=720)

The original post's "all seven, smaller than react-day-picker's single calendar" was wrong. All seven together (25.7KB) are larger than `DayPicker` (20.0KB). The true statement goes only as far as "one DatePicker is about the same size as one DayPicker." (Even then, DayPicker is just a calendar, while Kalyx DatePicker also includes the input and popover.) Size is sensitive to the import combination and gzip level, so it is better read as an order of magnitude, and the conclusion that size is not the main reason to choose Kalyx does not change.

Then what is the main reason?

---

## Defining Kalyx technically

> Kalyx is a headless React date picker that fixes all input and output as UTC instant strings, confines conversion between calendar coordinates and instants to two functions, and guarantees that round trip with tests across every IANA timezone.

Here is the consumer-facing API. `value` and `onChange` use `string | null`, and `displayTimezone` decides which zone's calendar is shown.

```tsx
<DatePicker value={iso} onChange={setIso} displayTimezone="America/New_York">
  <DatePicker.Input />
  <DatePicker.Popover>
    <DatePicker.Calendar />
  </DatePicker.Popover>
</DatePicker>
```

### Values are instants, calendar cells are coordinates

Two kinds of ISO strings with the same format flow through Kalyx. A **coordinate** is a single cell of the calendar grid, written as `YYYY-MM-DDT00:00:00.000Z` but carrying no notion of timezone. Grid computation runs only in UTC, so it is independent of the runtime environment. An **instant** is the value that leaves through `onChange`: the actual moment that is midnight of that day in `displayTimezone`. The same January 15 is `2026-01-15T05:00:00.000Z` in New York and `2026-01-14T15:00:00.000Z` in Seoul.

![The calendar coordinate 2026-01-15T00:00:00.000Z becomes the New York and Seoul instants through civilMidnightFromUtcDay, and returns to the coordinate through calendarDayFromInstant.](2.png?w=720)

Only two functions in `@kalyx/core` connect them: `civilMidnightFromUtcDay`, which turns a coordinate into an instant, and its inverse, `calendarDayFromInstant`. The latter reads "what day is this instant in this zone?" and writes it back as a UTC-midnight coordinate.

```ts
// packages/core/src/utils/timezone.ts:187-190
export function calendarDayFromInstant(iso: ISODateString, timeZone: string): ISODateString {
  const p = partsInTimezone(new Date(iso), timeZone);
  return new Date(Date.UTC(p.year, p.month - 1, p.day)).toISOString();
}
```

The rule is about direction. When a cell is picked and the value is committed, a coordinate becomes an instant; when the stored value determines which month to show and where focus goes, an instant becomes a coordinate. The DatePicker Root's `selectDate` converts, checks constraints against the converted instant, and commits if it passes.

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

This is not the only call site. Searching `packages/react/src` shows the two functions scattered across the Root and Calendar of DatePicker, RangePicker, and DateTimePicker, the Presets, the keyboard navigation utilities, and six headless hooks. Even so, there is no third conversion function, and every path that commits a value or decides the view goes through one of the two.

This contract is guarded by property-based tests. For every coordinate `c` and zone `z`, `calendarDayFromInstant(civilMidnightFromUtcDay(c, z), z) === c` must hold.

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

[fast-check](https://fast-check.dev/) randomly generates dates between 2020 and 2045 and combines them with 14 representative zones, including +5:45 Kathmandu, +14 Kiritimati, and -11 Niue, for 300 runs. The very next test checks the same round trip 12 times per zone for every zone returned by `Intl.supportedValuesOf('timeZone')`. On my local Node 24.16, that list has 418 entries.

Then why not have the library normalize a user-supplied `"2026-01-15T00:00:00.000Z"` into an instant on its own? That road is closed because you cannot tell from the string alone whether it is a coordinate or an instant. Take the Seoul value `2026-01-14T15:00:00.000Z`, which is already an instant, apply `civilMidnightFromUtcDay` to it again, and you get `2026-01-13T15:00:00.000Z`; apply it on every render and the date keeps slipping by a day. Switching to `startOfDayInTimezone`, which gives the same result no matter how many times it is applied, removes the slipping but can no longer do the original job of turning a coordinate into an instant.

So I gave up on normalization and fixed the contract in documentation. Consumers must pass back exactly the value the picker emitted. Honestly, that is a cost pushed onto consumers, and because `ISODateString` is an alias of `string`, the compiler cannot stop mistakes either. (I have not yet evaluated separating the two with branded types.)

### Solving DST with Intl alone

To turn a coordinate into an instant, you need to know when "00:00 on that day in that zone" is in UTC, but you can only get the offset once you know the instant. On top of that, on DST transition days a local time may not exist (spring forward) or may occur twice (fall back).

Kalyx solves this without a library like `date-fns-tz`. It asks `Intl.DateTimeFormat(...).formatToParts` "what local time is this UTC moment in that zone?" to measure the offset, and it probes twice.

```ts
// packages/core/src/utils/timezone.ts:245-250, 264
const probe1 = new Date(civilEpoch).toISOString();
const offset1 = getTimezoneOffsetMinutes(probe1, timeZone);
const realEpoch1 = civilEpoch - offset1 * 60_000;
const probe2 = new Date(realEpoch1).toISOString();
const offset2 = getTimezoneOffsetMinutes(probe2, timeZone);
const realEpoch2 = civilEpoch - offset2 * 60_000;

if (realEpoch1 === realEpoch2) return new Date(realEpoch1).toISOString();
```

`civilEpoch` is the desired local time read as if it were UTC. It builds a candidate from the offset at that point, builds another from the offset at the candidate, and stops if the two agree. The calendar grid calls this function 42 times, once per cell, so this fast path determines the cost.

If they differ, you are in a spring forward gap. In that case it re-reads both candidates in that zone and picks the one that matches the requested time (`timezone.ts:266-283`). Here is what it actually returns.

| Request (America/New_York) | Situation | Result |
| --- | --- | --- |
| 2026-03-08 02:30 | Nonexistent time | `2026-03-08T07:30:00.000Z` (03:30 EDT, moved forward) |
| 2026-11-01 01:30 | Time that occurs twice | `2026-11-01T05:30:00.000Z` (01:30 EDT, earlier one) |

"Gaps move forward, ambiguity takes the earlier one" matches the `disambiguation` default `"compatible"` described in [MDN's Temporal.ZonedDateTime documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime). (The Kalyx source comment says it is equivalent to `'earlier'`, but Temporal's `'earlier'` moves backward in a gap, so strictly it is `'compatible'`. That is a comment error I found while writing this post.)

### The adapter boundary is 21 string methods

If core computes timezones, what do date-fns or dayjs handle? Date arithmetic and parsing. That boundary, `DateAdapter`, has 21 methods, and every date argument and return value is an ISO string.

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

Four methods accept a timezone, `format`, `isSameDay`, `startOfDay`, and `today`, and even those four hand the computation to core. The date-fns adapter's `format`, when given a `timezone`, calls core's `formatInTimezone` directly (`packages/adapter-date-fns/src/index.ts:112-115`). So whichever adapter you use, timezone answers come from the same code, and the three adapters (date-fns, dayjs, luxon) each run `@kalyx/core/test-helpers`'s `runAdapterConformanceTests` to confirm they produce the same answers.

The two entry points also split along this boundary. The default entry, `@kalyx/react`, calls `setDefaultAdapter(DateFnsAdapter)` at module load, so it works right after installation (`packages/react/src/index.ts:9-11`). `@kalyx/react/headless` has no such call, and with tsup's `splitting: false` the bundles are physically separate, so no date-fns code gets in. "Zero date library dependencies" is true only of this entry and `@kalyx/core`.

This boundary shape came at a price. In June 2026, I shelved a Temporal adapter. Temporal's value lies in **types carrying meaning**, as with `PlainDate` and `ZonedDateTime`, but when the boundary is a string, that meaning cannot pass through. Wrapping it would just flatten it into a string and fall back to core's Intl code, so I judged there was no correctness gain. Looking back, the problem from the previous section, "coordinates and instants are the same `string`," is exactly what Temporal solves in the type system with `PlainDate` and `Instant`. The string boundary made swapping adapters easy, but in exchange it closed off the path to solving this with types.

### Seven pickers are combinations of three contexts

Kalyx ships seven pickers: DatePicker, RangePicker, TimePicker, DateTimePicker, MonthPicker, YearPicker, and WeekPicker. What matters is not the count but **the fact that the seven are not independent implementations**. There are only three contexts: `DatePickerContext`, `RangePickerContext`, and `TimePickerContext`.

| Picker | Root that holds state | Context | Where the difference comes from |
| --- | --- | --- | --- |
| DatePicker | `DatePickerRoot` | Date | |
| MonthPicker, YearPicker | DatePicker's Root implementation | Date | `selectionGranularity` |
| RangePicker | `RangePickerRoot` | Range | |
| WeekPicker | `RangePickerRoot` as is | Range | `selectionMode="week"` on Calendar |
| TimePicker | `TimePickerRoot` | Time | |
| DateTimePicker | Its own Root | Date and Time nested | Stacks two Providers |

MonthPicker's Root merely changes the default display format to `yyyy-MM` and passes `selectionGranularity="month"` to DatePicker's Root implementation (`MonthPicker/Root.tsx:11-20`). DatePicker's `selectDate`, when the granularity is `month`, folds the coordinate to the 1st of that month and then goes through the same conversion and constraint check shown earlier. DateTimePicker provides the two contexts stacked.

```tsx
// packages/react/src/components/DateTimePicker/Root.tsx:401-402
<DatePickerContext.Provider value={dateContext}>
  <TimePickerContext.Provider value={timeContext}>{children}</TimePickerContext.Provider>
```

So `DateTimePicker.Calendar` is the same component as `DatePicker.Calendar`, and it does not know which picker it is inside. A fix in one place reaches every picker that uses the same component, and so does a defect in one place. This shared foundation is also why a single DatePicker came to 74% of the whole in the earlier chart. (The original post said CI verifies SSR with a Next.js App Router build, but the actual CI `ssr-check` only imports the built CJS and ESM in Node, so I removed that sentence too.)

So what has this contract actually protected?

---

## Defects the correctness contract caught, and the bundle ceiling

In the three months since 1.0, I spent more time verifying this contract than building new features, and it surfaced two defects that example-based tests would have let through. The first was found by a property test, the second by a cross-review of the code, and as a result the scope of the property tests widened.

### One hour on October 1 in Sydney

The first was that the property "reading the result of `startOfDayInTimezone` in that zone gives 00:00:00" broke in Australia/Sydney. The implementation at the time measured the offset only once. Sydney moves from +10 to +11 at 02:00 on October 1, 2034, and 00:00 that day is still +10, so the correct answer is `2034-09-30T14:00:00.000Z`. But "the point where 00:00 on October 1 is read as UTC" is after the transition, so it returned +11, and the result was 23:00 on the previous day. It now goes through the two-probe approach, and this counterexample remains as a regression test (`timezone.property.test.ts:276`).

### A test that passed only in Seoul

The second came out of a cross-review on August 3, 2026. The code that decides which calendar cell to mark as selected was converting twice. The cell was already a coordinate, yet both the cell and the stored value were converted to that zone's date. Here is what picking "January 15" produced.

| Zone | Stored value | Cell marked as selected |
| --- | --- | --- |
| `Asia/Seoul` (+9) | `2026-01-14T15:00:00.000Z` | 15th (correct) |
| `America/New_York` (-5) | `2026-01-15T05:00:00.000Z` | 16th (wrong) |

In positive-offset zones the two shifts cancelled out and it happened to be right, and the existing tests covered only Seoul. The same review also found a violation in the opposite direction. When deciding which month to show, the code applied `startOfMonth` directly to an instant, so passing January 1 as the value in Seoul opened the December calendar. The mechanisms differ, but the broken rule is one: convert only once per direction, with the function assigned to that direction.

This incident widened core's round-trip property tests from "a few representative zones" to "every zone the runtime knows." (Component tests on the React side still use representative zones such as `America/New_York`.) **Defects that only appear where the sign flips are not caught by sampling.** The fact that conversion calls are scattered across multiple paths also became meaningful at this point. Correctness was not leaking from one function; it was leaking separately along each path.

### From 17KB to 20KB

These fixes cost code. Kalyx sets a CI ceiling on the default entry bundle, and a PR that exceeds it fails a required check. That ceiling started at 12KB and went up 1KB each time a feature landed, and in August 2026, while overhauling timezone and constraint correctness, I raised it from 17KB to 20KB in one step.

Size was a selling point shown on the README badge. Still, I did not hesitate. A date picker that slips by a day in negative-offset zones is unusable whether it is small or large. **If I have to choose between small and correct, I choose correct.**

The ceiling is tight now. According to the repository's bundle byte map document from 2026-09-11, `dist/index.cjs` measured with Node's default gzip is 20,259B against a ceiling of 20,480B, leaving 221B of headroom. (This is the size of its own file with dependencies left external, so it is a different quantity from the earlier chart.) The next feature will have to reclaim bytes before it can land.

---

## Wrapping up

What I wanted was to use complex date libraries declaratively. After building Kalyx, I found that declarative composition APIs and complete headless options already existed. The remaining difference lay deeper. **Fix the value as a single instant, narrow conversion between coordinates and instants to two functions, and guard that round trip with tests in every timezone.** The Intl-based DST handling, the string adapter boundary, and the seven pickers built from three contexts are the consequences of that decision.

Measured against my goal of learning, the biggest lesson was how to claim that something is "correct." The original post's bundle comparison was measuring different quantities, and the test that passed in Seoul was wrong in New York. Both had numbers and tests, and both were still wrong. Unless you also record what you measured and which samples you checked against, numbers easily turn into bragging.

The limits are clear too. I am the only maintainer, it supports React 19 only, and npm downloads of `@kalyx/react` from September 5 to 11, 2026 were 200, of which 156 were concentrated on the single day 1.4.7 was released. The inability to separate coordinates and instants in the type system is guarded only by documentation, and I have not decided whether to guarantee the styling hooks, `classNames` and `data-*` attributes, as public API.

So if you already have a MUI app, look at MUI X first; if segmented input and proven accessibility come first, React Aria; if you only need a calendar, react-day-picker. If you have run into dates slipping by a day in forms where values travel as JSON, that is when I would be glad if you took a look at Kalyx, and if you know a better solution, I would be grateful if you let me know through a GitHub Issue.

```bash
pnpm add @kalyx/react
```

On the docs site's [Playground](https://kalyx-docs-site.vercel.app/playground), you can try the seven pickers and change locale and timezone settings yourself.

:::ref

[docs] [Kalyx official documentation site](https://kalyx-docs-site.vercel.app/)

[docs] [MUI, Date and Time Pickers Timezone](https://mui.com/x/react-date-pickers/timezone/)

[docs] [Floating UI official documentation](https://floating-ui.com/)

:::
