---
emoji: 📅
title: 'Kalyx'
seoTitle: 'Kalyx: Four React 19 Headless DatePicker Design Decisions'
date: '2026-06-17'
categories: ignore Library React DatePicker Open-Source
description: 'Why existing DatePickers forced tradeoffs—and how Kalyx answers them with 7 primitives, a 16KB bundle, ISO APIs, adapters, and 4 design decisions.'
keywords: 'Kalyx, React DatePicker, headless DatePicker, react-day-picker, react-datepicker, headless library, bundle size, ISO-8601 timezone, Composition pattern, adapter pattern, Radix dot notation, Ark UI, MUI X DatePicker'
locale: en
translationOf: '260617'
sourceHash: 7ced7d6aab4ab2812c3b1665328a8e5693781ef894c6a997732d5ef3d273e831
---

In this post, I want to tell the story of **Kalyx**, the React headless DatePicker library I built and recently released as 1.0.

As a frontend developer, I often work on projects involving SaaS forms. That means almost every page eventually needs date input: a single date, a range, time, month/year jumps, and even timezone support. Yet every time I started a new project over the past year, I hit the same wall. (Honestly, not once could a single library solve the whole problem cleanly.)

One day, while stitching a homemade TimePicker and a borrowed Popover onto `react-day-picker` for the third time, I began writing down the API I actually wanted. Those notes eventually became Kalyx 1.0's public API. This article records a year of decisions from the builder's perspective: why I made it, the tradeoffs behind four core decisions, and where I spent my time after the 1.0 launch when almost nobody was using it.

---

## Why Is a React DatePicker So Difficult?

First, we need a quick look at the market. It shows that the wall I encountered was not merely a library-selection problem, but a problem inherent in the **tradeoffs themselves**.

Here are the DatePicker options commonly used in the React ecosystem as of June 2026. (npm downloads are weekly figures from June 2026.)

| Library | Weekly downloads | What it does well | What it imposes |
| --- | --- | --- | --- |
| **react-day-picker** | About 42M | Clean headless Calendar | Calendar grid only. Even v10 has no official Input or TimePicker |
| **react-datepicker** | About 4.7M | Every primitive in one bundle | CSS import required. Native `Date` values. 100+ props |
| **Ark UI** | Growing share | Composition + headless | No standalone TimePicker. Time exists only inside DatePicker |
| **MUI X** | High share | Integration + enterprise | About 58KB gzip. RangePicker requires a paid Pro license |
| **React Aria** | About 5.9M | Spec-level accessibility | Requires `@internationalized/date`. Incompatible with date-fns codebases |
| **Headless UI** | Alongside Tailwind | Pioneer of the headless pattern | Declined to build one because maintenance costs are too high |

For each feature in isolation, choosing a winner is easy. Real work, however, rarely consists of one feature. In a SaaS form that simultaneously needs single-date input, a range filter, time selection, and month/year jumps, **not one library covered everything**.

Headless UI's position is especially revealing. Tailwind Labs has effectively kept DatePicker requests on hold in [GitHub Discussion #289](https://github.com/tailwindlabs/headlessui/discussions/289). Opened in 2021, the thread remains open five years later without a maintainer response, and the `@headlessui-react` source tree contains no date-related component at all. Tailwind users are ultimately directed to React Aria. Given that locale, timezone, DST, multiple calendar systems, accessibility, and keyboard navigation all collide in a DatePicker, that hesitation is understandable. (I only grasped the size of the burden after building one myself.)

Ark UI sends the same signal. Ark UI, created by the Chakra UI team, has **no standalone TimePicker component**. Time selection is handled only inside DatePicker through `@internationalized/date`'s `CalendarDateTime`; it is not an independent primitive that Tailwind users can compose for “time only.” (At first I loosely thought “Ark abandoned TimePicker,” but rereading the documentation showed that “it was never separated into an independent component” is more accurate. The point is that even a leading headless-library team treated extracting TimePicker as a separate primitive with caution.)

This naturally raises a question: “Is there really no way to resolve these tradeoffs within one library?”

---

## Where Kalyx Fits

Kalyx is my answer. In one sentence, it is **“a React headless DatePicker that works immediately without a CSS import and can be freely customized with any styling approach.”**

Here is what shipped in 1.0.

- **Seven primitive components**: `DatePicker`, `RangePicker`, `TimePicker`, `DateTimePicker`, `MonthPicker`, `YearPicker`, `WeekPicker`
- **Three Headless Hooks**: `useDatePicker`, `useRangePicker`, `useTimePicker` (entry points for discarding all library-provided UI and building your own)
- **One Composition API**: all seven primitives use the same Context and dot notation pattern
- **About 16KB gzip (ESM)**: completed within a 17KB ceiling
- **Zero CSS imports**: Tailwind, CSS Modules, vanilla CSS—anything works

The API looks like this.

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

The same pattern repeats across all seven primitives. There is not a single bomb of boolean props like `showTimeSelect` or `showMonthDropdown`.

Its position looks like this in one picture.

![Positioning diagram showing which parts of existing libraries Kalyx combines](1.png?w=620)

It is the union of the best parts of existing libraries, with one more decision layered on top: **integrate even the TimePicker that Ark UI lacks as a standalone component into the same Composition as an independent primitive.**

---

## Four Core Decisions

These are the four heaviest, hardest-to-reverse decisions from the design stage. Now that the 1.0 API is frozen, it is fair to say they forced nearly every other decision.

### Composition over Props

The first design draft looked like `<DatePicker showTime showMonthGrid presets={[...]} renderHeader={(props) => ...} />`. It was essentially the default `react-datepicker` pattern. After spending a week trying to express prop interactions cleanly in types, I deleted it.

The reason was clear: **the real cost of prop explosion is lost type safety.** Only when `showTimeSelect` is `true` does `timeFormat` matter, but the type system cannot directly express that conditional dependency. Model it with a discriminated union and the props interface explodes into groups of 50; every new prop requires revalidating every combination. (This is exactly the same idea as “a bad abstraction increases coupling” in my earlier article on [abstraction](/260201).)

Radix UI and shadcn/ui's dot notation pattern solves this most elegantly by making constraints explicit at the callsite.

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

The cost is obvious: a one-line `<DatePicker>` grows into a six-line JSX block. The gains are equally clear.

- Clarity that remains readable a year later
- Types that do not leak across prop combinations
- An infinitely extensible styling surface because every subcomponent owns its own `classNames` slot map

The implementation is simply tied together with an `Object.assign` pattern.

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

It is tree-shaking friendly, and because components are assembled in a single `index.ts` per component, there are no namespacing collisions. (When I first saw Radix UI, I did not understand why people called this the standard. Only after building a library did I understand why the pattern became an industry standard so quickly.)

### ISO-8601 Strings In and Out

Kalyx's `value` is `string | null`: an ISO-8601 UTC string, with `onChange` returning the same form. A native `Date` object appears nowhere in the public API.

The “obvious” alternative is a `Date` object. It is also the root of issues that have remained open for years in every DatePicker using native Date: timezone offsets drift, `JSON.stringify` round trips break, and SSR produces different values on the server and client. The canonical `react-datepicker` timezone issue, [#1018](https://github.com/Hacker0x01/react-datepicker/issues/1018), opened in 2017 and ran for eight years before closing in 2025 with the conclusion that this was expected JavaScript `Date` behavior, not a bug. It closed with documentation alone and no source change. As long as a library uses native `Date` as its value type, this class of friction cannot structurally disappear.

Requiring ISO-8601 strings provides three guarantees.

- **wire-safe**: after `JSON.stringify` and retrieval, it is the exact same string byte for byte
- **SSR-safe**: server and client hydrate from the same string
- **Makes timezone explicit**: consumers must declare the display zone, such as `displayTimezone="Asia/Seoul"`

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

Displaying the same ISO value in different timezones becomes natural.

```tsx
const iso = "2026-01-15T15:00:00.000Z";

<DatePicker value={iso} displayTimezone="Asia/Seoul" />       // 2026-01-16 00:00
<DatePicker value={iso} displayTimezone="America/New_York" /> // 2026-01-15 10:00
```

There is a real cost. Downstream code needing a `Date` object must call `new Date(iso)` itself. But I judged that concentrating this boundary in one place in consumer code is much better than letting `Date` objects flow through the entire library. (Across several projects, I learned that once you accept an object, it becomes impossible to trace how far it has traveled.)

Boundaries such as DST are handled by Intl-based timezone utilities in `@kalyx/core`. Rather than living in the adapter interface, they are centralized in core functions such as `civilMidnightFromUtcDay`, `setTimeInTimezone`, and `startOfDayInTimezone`, all based on `Intl.DateTimeFormat`. They accurately calculate DST boundaries when converting civil midnight in a timezone to UTC; once users provide an IANA timezone string, the library handles the rest. (It matters that this timezone logic is embedded in core, not an adapter: whether using date-fns or dayjs, timezone correctness comes from the same core code.)

### The Adapter Pattern

`@kalyx/core` has zero date-fns dependencies. The same 21-method `DateAdapter` interface is implemented by `@kalyx/adapter-date-fns`, which is separated into its own package, and `@kalyx/react` receives the adapter through Context. Interestingly, the adapter itself is a thin shim of about 200 lines. Only four of the 21 methods accept timezone (`format`, `isSameDay`, `startOfDay`, `today`), and even those delegate every actual timezone calculation to core's Intl utilities. The adapter maps date arithmetic and parsing to a particular library's syntax; it does not own correctness.

The package split looks like this.

```
@kalyx/core               # 플랫폼 독립 로직 + Intl 기반 timezone, date-lib 의존 0
@kalyx/adapter-date-fns   # default adapter (별도 패키지)
@kalyx/react              # 컴포넌트 (default로 adapter-date-fns 자동 wire)
@kalyx/react/headless     # zero date-lib entry, 자기 adapter 들고 옴
```

I considered three options during design.

| Option | Advantages | Disadvantages |
| --- | --- | --- |
| A. Put date-fns in core | Simple implementation, easy beginner onboarding | Cannot replace it without a major bump |
| B. Make core entirely BYO | Future-proof | Beginners must configure an adapter every time |
| C. Hybrid (default + replaceable) | Beginner convenience + an escape for serious users | Two packages and two entries to maintain |

I chose C. The 0.x line actually began with A, but just before freezing the API for v1 stable, I realized: **once a date library is embedded, it cannot be removed without a major bump.** Extracting the adapter then was the biggest decision before graduating to 1.0.

Future adapters follow the same 21-method contract; only their implementations differ.

- `@kalyx/adapter-dayjs`: first priority because statistics suggest about half of React users use dayjs (Mantine even mandates dayjs as a peer)
- `@kalyx/adapter-luxon`: enterprise and advanced timezone cases
- Temporal: after the extraction, I concluded that supporting the TC39 Temporal API must be solved at the core level, not through an adapter. Because the adapter interface uses ISO strings in/out, it cannot carry Temporal's native capabilities intact. (I revisit this judgment in “Current Status.”)

### The 17KB Ceiling

At the 1.0 release, the bundle was about 15.8KB ESM / 15.9KB CJS gzip. I initially set the ceiling at 16KB, then raised it one notch to 17KB in v1.1 (explained later). CI enforces it. Every PR runs `pnpm check-bundle`, and a PR that exceeds the ceiling fails the build.

The number was not arbitrary; it was chosen against the market baseline.

- `react-day-picker`: about 22KB for Calendar alone
- `react-datepicker`: about 40–60KB for all primitives
- `MUI X`: about 58KB (and Range is paid Pro)
- `Kalyx`: seven primitives smaller than `react-day-picker`'s single Calendar

I also tracked bundle history through each RC stage.

| Stage | Change | Ceiling |
| --- | --- | --- |
| rc.0 | Initial completion of seven primitives | 12 → 13KB |
| rc.3 | Grid keyboard navigation (Arrow/Page/Home/End) | 13 → 14KB |
| rc.4 | MonthPicker/YearPicker disabled month/year prop | 14 → 15KB |
| rc.8 | TimePicker `filterTime` programmatic callback | 15 → 16KB |
| 1.0.0 | Final stabilization (2026-06-08) | ESM 15.8KB / CJS 15.9KB |
| 1.1 | a11y `announce()` live-region parity | 16 → 17KB |

Every increase states why. The budget grows by a deliberate decision, not by quietly leaking 1KB at a time. Rejected features are recorded too: RTL mode, a holiday plugin, and virtualized year/month grids were intentionally excluded. Under the 17KB ceiling, actual working headroom is only about 126 bytes for CJS and 221 bytes for ESM (the tighter CJS figure is binding). The next runtime feature must either (a) slim existing code and fit inside, or (b) deliberately raise the ceiling again and announce it. (Tests, separate adapter packages, and work such as the `/headless` entry do not affect the budget because they do not enter the default bundle graph.)

Changing the ceiling requires synchronizing several files: `scripts/check-bundle-size.js` and its `TARGET_KB`, `tsup.config.ts`, and CI workflows. I made that cumbersome on purpose. (If only one place had to change, a quiet increase would be too easy; the friction makes moving the ceiling a weighty decision.)

Those are the four decisions embedded in the library code itself. What happened during the actual build?

---

## Building 1.0

### Fourteen RC Stages from 0.x to 1.0

I tagged rc.0, containing all seven primitives, on May 27, 2026. From there, fourteen RC iterations led to the stable 1.0.0 release on June 8—about twelve days. (I do not think that pace was ideal. The textbook approach is to move more slowly and polish one thing at a time, but as a solo maintainer, once I entered build mode I had to finish quickly.)

The major work along the way included:

- **Security fix**: GHSA-5xrq-8626-4rwp Critical vulnerability (vitest 4 upgrade)
- **Adapter-neutral extraction**: reduced date-fns dependencies in `@kalyx/core` to zero
- **Separate `@kalyx/adapter-date-fns` package**
- **Added `@kalyx/react/headless` entry**: for zero date-lib users

I also made the test baseline a graduation requirement for 1.0: 497/497 unit tests, 14/14 axe accessibility checks, and 31 e2e scenarios.

### Aurora Visual Unification

The most memorable feedback immediately after 1.0 was a one-line user message: **“It's ugly, filthy, and hideous.”** Three HeroDemo screenshots were attached. (That was when I learned viscerally that even excellent library code gets zero clicks if the demo looks bad.)

The symptoms were clear: grid lines leaked into the Calendar grid, MonthPicker cells stretched horizontally, and DateTimePicker felt cramped. Diagnosis showed two CSS systems had diverged. `.kx-live-*` and `:global([role='grid'])` inside HeroDemo had evolved independently, so fixes on one side did not reach the other.

The solution was not a redesign, but **one unification and polish pass**. After seven visual iterations (v1 → v7), I finalized the Aurora token system. Its single source of truth is one file, `apps/docs-site/src/css/custom.css`, and every picker is forced to share the same tokens.

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

Here are three traps I preserved from that process. You are likely to encounter exactly the same problems when embedding headless components in another environment, especially a documentation site such as Docusaurus.

First, **Docusaurus Infima's `table th, td` rule penetrates every `<table>`**. That is why grid lines leak into a Calendar grid. Isolate it with CSS Modules or apply an explicit reset.

Second, **on `<table role="grid">`, you cannot use `display: grid`**. `<thead>/<tbody>/<tr>` become grid items, so the seven columns never reach the `<td>` elements. The solution is ultimately `display: table` + `table-layout: fixed` + an explicit width.

Third, **range visualization needs asymmetric rounding**: only the left side for start, only the right side for end, and no rounded corners for middle. Making them uniform causes cells to look as if they float apart and breaks intuitive visual grouping.

### Where I Spent Time with Zero Users

Here is the honest first-week data after 1.0.

- 5 GitHub stars, 0 forks, 0 watchers
- 480 weekly npm downloads (mostly assumed to be CI mirror bots)
- 0 directly dependent packages

There were two possible places to spend time: (a) add more features, or (b) expand into a new track such as a React Native adapter. Both had low ROI. With zero external users, new features could not be validated, and a new track would be more effective after users arrived.

So I invested in the **first 30-second impression**: the interval in which someone first entering the GitHub repository or docs site decides whether the library is worth trying. I organized the work into five PRs.

| PR | Work |
| --- | --- |
| A1 | Animated WebP recorder for the hero + `<HeroDemo>` component + `/recorder` route |
| A2 | Landing redesign. 6 sections (Hero/FeatureGrid/SameJsxBlock/PickerGrid/WhyKalyx/GetStarted) |
| B | Sandbox infrastructure. `<StackBlitzEmbed>` + seven `examples/*` projects |
| C | Interactive `/playground`. Picker selector + classNames editor + locale/timezone toggles |
| D | `/docs/comparison` page + inline SVG bundle chart |

I learned one thing in the process: **localhost Lighthouse scores can differ from real Vercel deployment scores by more than ten points.** In Issue #103, the localhost simulate score appeared to regress by 11 points, from 72 → 61. After deploying the same change to Vercel, the measured score was 73–74, actually 1–2 points better. The localhost simulation itself had created the artifact. (Relying only on localhost numbers when tracking performance regressions can lead to the wrong decision.)

Honestly, this “first 30 seconds” investment did not have much effect. Polishing the demo and landing page with zero external users was like cleaning a shop for customers who never came in. So I changed direction. I concluded that for a solo maintainer, turning **core correctness into a verifiable asset** had a higher ROI than refining the promotional surface. (The concrete result appears in “Current Status.”)

---

## A Tour of the Technical Structure

This is a short tour for people building a library themselves or curious about the internals. (If you only want to use Kalyx, feel free to skip this section.)

### Context + Dot Notation Implementation

For each primitive, the Root component creates a Context Provider, and every subcomponent consumes the same Context.

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

The key is that components sharing the same Context live in one `Object.assign` group. Consumers naturally call them as `<DatePicker.Input>`, and the tree shaker automatically removes unused subcomponents.

### Headless Hook

If you want to ignore every component the library provides and build a completely custom UI, use the Hook directly.

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

The state machine is exactly the same one used by the components. The Hook above and the `<DatePicker>` JSX run on the same core logic. (This structure avoids maintaining the library API on two separate tracks.)

### SSR Safety

I enforced patterns that survive the Next.js App Router from the beginning.

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

Positioning uses Floating UI, the successor to Popper.js: SSR-safe and lightweight at about 3KB. CI verifies every time that a Next.js App Router build passes without a `renderToString` error.

### Accessibility

WAI-ARIA roles follow the spec.

- Calendar grid → `role="grid"`, cells → `role="gridcell"`
- Input + Popover → `role="combobox"` + `aria-expanded`
- HourList / MinuteList → `role="listbox"`

Keyboard-navigation mappings are also close to the spec: Arrow keys move between cells, PageUp/Down changes the month, Shift+PageUp/Down changes the year, Home/End moves to the start/end of the week, Enter selects, and Escape closes the Popover.

All 14 automated axe accessibility checks pass. ARIA labels can also be localized.

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

`@kalyx/core` provides default labels for multiple locales, including `ko-KR`.

---

## Current Status and Acknowledged Limitations

### What Actually Shipped after 1.0 (as of v1.1)

The first part of this article reflects on the 1.0 launch, but Kalyx had reached v1.1 by the time I finished writing. To keep the retrospective from remaining merely a “plan,” here is exactly what shipped and what changed direction.

Some of the planned adapter expansion became real.

- **`@kalyx/adapter-dayjs` released**: statistics put dayjs near half of React users, and ecosystems such as Mantine require it as a peer, so this first-priority adapter was published as a separate package.
- **Added the `@kalyx/core/test-helpers` conformance suite**: it modularizes automatic verification of the same 21-method contract whenever a new adapter is added. With one line—`runAdapterConformanceTests(adapter, { describe, it, expect })`—any adapter is judged against the same correctness standard. This was the backbone that moved adapters from a “promise” to “verified capability.”
- **`@kalyx/adapter-luxon`**: the next candidate, inexpensive to add atop the conformance suite for enterprise and advanced timezone cases.

I should also be candid about what was **dropped** from the plan.

- **I decided not to build `@kalyx/adapter-temporal` as an adapter.** Because the adapter interface uses ISO-8601 strings in/out, it cannot carry Temporal's native capabilities—type-safe time models such as `PlainDate` and `ZonedDateTime`—intact. Wrapping it as an adapter would merely flatten everything into ISO strings and delegate back to core's Intl code, yielding zero correctness benefit. Temporal support belongs in a core-level strategy.

Items under consideration based on user signals are grouped separately.

- **Missing headless hooks**: only Date/Range/Time hooks exist today. Month/Year/Week/DateTime hooks are planned exclusively for the `/headless` entry so they do not touch the default bundle ceiling.
- **fast-check property tests**: for pure functions such as date calculations, property-based tests deepen the moat more than example-based tests. This moved to the top priority for core correctness.
- **Integration recipes**: guides for form libraries such as React Hook Form / Zod.
- **RTL mode / Holiday plugin**: when bundle margin permits or clear demand appears.

Deferred tracks are explicit too. A React Native adapter remains on the roadmap, but web users come first. Non-Gregorian calendars (Persian/Buddhist/Islamic/Hebrew) will begin when enough GitHub issues accumulate or an enterprise sponsor appears.

### Limitations I Candidly Acknowledge

Finally, an honest disclosure for anyone considering the library. (I believe overmarketing a young library ultimately destroys trust.)

- **Solo maintainer**: the sustainable pace is one minor release per month. Demand can change priorities.
- **Young library**: with a small user base, you may well be the first to discover an edge case. Test coverage is also uneven among pickers (WeekPicker is the thinnest, for example).
- **React 19+ only**: relies on React 19 features such as RSC, `useId`, no `useLayoutEffect` warning, and `<Input>` form-action integration. There will be no React 18 back-port.
- **No “battle-tested” claim**: I will not use that phrase for a new library. What it does have is hundreds of unit tests per primitive, a complete axe pass, SSR verification in Next.js App Router CI, and an adapter conformance suite.

If you need deployment-grade stability at a 100K-user scale today, `react-datepicker` is honestly the safer choice. Kalyx is closer to a **bet** on a smaller, more headless future. It is waiting for someone to become the first bettor.

---

## Closing Thoughts

This is less a promotional article than a retrospective on a year of decisions. In my experience, recording what shipped, what was rejected, and which choices carried weight becomes the most valuable asset when building the next library—or evaluating someone else's.

Composition over Props, enforced ISO strings, the adapter pattern, and a bundle ceiling: all four decisions sacrificed some short-term convenience to buy long-term adaptability. Whether they were right can probably be judged only a year from now. (What I can say with confidence today is that without these four decisions, the library would never have reached 1.0.)

If you have hit a similar wall with a DatePicker in a React project, I would be grateful if you took a look at Kalyx. And if you have solved the same problem in a better way, please feel free to share it in a GitHub Issue. A library is ultimately something refined not by its single creator, but by the people who use it together.

Installation is one line.

```bash
pnpm add @kalyx/react
```

You can immediately try all seven pickers in the documentation site's [Playground](https://kalyx-docs-site.vercel.app/playground). Toggle locale and timezone, edit classNames directly, and apply your own design tokens.

:::ref

[repo] [jiji-hoon96/kalyx](https://github.com/jiji-hoon96/kalyx)

[docs] [Official Kalyx documentation](https://kalyx-docs-site.vercel.app/)


[docs] [Ark UI DatePicker documentation](https://ark-ui.com/docs/components/date-picker)

[docs] [Radix UI Composition pattern](https://www.radix-ui.com/primitives/docs/overview/introduction)

[docs] [React Aria headless component guide](https://react-spectrum.adobe.com/react-aria/)

[docs] [Official Floating UI documentation](https://floating-ui.com/)

:::
