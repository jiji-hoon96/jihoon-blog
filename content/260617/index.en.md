---
emoji: 📅
title: 'Kalyx'
seoTitle: 'Kalyx: A Year Building a React 19 Headless DatePicker'
date: '2026-06-17'
updatedAt: '2026-09-16'
categories: Library React DatePicker Open-Source
description: 'Every React DatePicker forced a tradeoff, so I built one. Four design decisions, and why I later broke my own bundle ceiling to buy correctness.'
keywords: 'Kalyx, React DatePicker, headless DatePicker, react-day-picker, react-datepicker, headless React library, bundle size budget, ISO-8601 timezone, Composition pattern, adapter pattern, Radix dot notation, Ark UI, MUI X DatePicker, IANA displayTimezone, DST bug, fast-check property testing'
locale: en
translationOf: '260617'
sourceHash: b7e7be3efa404583193adba50f933c85c2d044497af8da1f75cbaa9c00bab69c
---

In this post, I want to tell the story of **Kalyx**, the React headless DatePicker library I built myself.

As a frontend developer, I often work on projects involving SaaS forms. That means almost every page eventually needs date input: a single date, a range, time, month/year jumps, and even timezone support. Yet every time I started a new project over the past year, I hit the same wall. (Honestly, not once could a single library solve the whole problem cleanly.)

One day, while stitching a homemade TimePicker and a borrowed Popover onto `react-day-picker` for the third time, I began writing down the API I actually wanted. Those notes eventually became Kalyx 1.0's public API.

This article is a record of decisions from the builder's perspective. The first half covers the four decisions I made on the way to 1.0; the second half covers the three months after that. The second half is what I most want to say here. **The biggest decision after 1.0 was not a new feature. It was breaking the bundle ceiling I had been selling the library on, and buying correctness with it.** The current version is 1.4.7, and all seven patches in between went into fixing the same class of bug.

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

Here is what shipped in 1.0. (Figures in parentheses are the values as of 1.4.7, when I updated this article.)

- **Seven primitive components**: `DatePicker`, `RangePicker`, `TimePicker`, `DateTimePicker`, `MonthPicker`, `YearPicker`, `WeekPicker`
- **Three Headless Hooks**: `useDatePicker`, `useRangePicker`, `useTimePicker` (entry points for discarding all library-provided UI and building your own. The remaining four were filled in later under the `@kalyx/react/headless` entry, so all seven exist today)
- **One Composition API**: all seven primitives use the same Context and dot notation pattern
- **About 16KB gzip (ESM)**: completed within a 17KB ceiling (now about 19.5KB against a 20KB ceiling. Why I raised it is the subject of the second half of this article)
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

The adapters I shipped afterward follow the same 21-method contract; only their implementations differ. All three adapters run `@kalyx/core/test-helpers`, specifically `runAdapterConformanceTests`, inside their own test suites to verify that they produce the same answers.

- `@kalyx/adapter-dayjs`: first priority, because statistics suggest about half of React users use dayjs (Mantine even mandates dayjs as a peer)
- `@kalyx/adapter-luxon`: for enterprise and advanced timezone cases
- Temporal: after the extraction, I concluded that supporting the TC39 Temporal API must be solved at the core level, not through an adapter. Because the adapter interface uses ISO strings in/out, it cannot carry Temporal's native capabilities intact. (I revisit this judgment in “Current Status.”)

### The Bundle Ceiling

At the 1.0 release, the bundle was about 15.8KB ESM / 15.9KB CJS gzip. I initially set the ceiling at 16KB, then raised it one notch to 17KB in v1.1. CI enforces it. Every PR runs `pnpm check-bundle`, and a PR that exceeds the ceiling fails the build.

The number was not arbitrary; it was chosen against the market baseline.

- `react-day-picker`: about 22KB for Calendar alone
- `react-datepicker`: about 40–60KB for all primitives
- `MUI X`: about 58KB (and Range is paid Pro)
- `Kalyx`: seven primitives smaller than `react-day-picker`'s single Calendar

That last line was the boast of the 1.0 era. It is still true, but the margin has shrunk a lot: about 19.5KB against about 22KB, a gap of 2.5KB.

I also tracked bundle history through each RC stage.

| Stage | Change | Ceiling |
| --- | --- | --- |
| rc.0 | Initial completion of seven primitives | 12 → 13KB |
| rc.3 | Grid keyboard navigation (Arrow/Page/Home/End) | 13 → 14KB |
| rc.4 | MonthPicker/YearPicker disabled month/year prop | 14 → 15KB |
| rc.8 | TimePicker `filterTime` programmatic callback | 15 → 16KB |
| 1.0.0 | Final stabilization (2026-06-08) | ESM 15.8KB / CJS 15.9KB |
| 1.1 | a11y `announce()` live-region parity | 16 → 17KB |
| 2026-08 | Full correctness overhaul for timezone and constraints | 17 → 20KB |
| 2026-08 | Split out the `/headless` entry only | 20 → 22KB |

Every increase states why. The budget grows by a deliberate decision, not by quietly leaking 1KB at a time. Rejected features are recorded too. The top six rows are the record as of 1.0, and back then every raise was a single notch. The last two rows were added when I updated this article, and they are different in kind: not one notch, but three at once. **That decision is the subject of the second half of this article.**

Moving the ceiling is deliberately annoying. If a single place were enough, the number would creep upward unnoticed, so today two constants in `scripts/bundle-policy.js` are the single source of truth and a required check on every PR enforces them. That is also where the split in the last row came from. The two entries originally shared one ceiling, but `/headless` ships the same seven components as the default entry plus all seven hooks and `DateTimePicker.Presets`. **The entry carrying more code had less room, which is backwards.** When I measured, the default entry had 1.4KB left while headless had dried up to under 200 bytes, so headless was blocking every change, including ones that had nothing to do with the default entry. I raised the headless ceiling alone and left the default entry at 20KB, because that number goes out in the README badge, and raising it would mean changing a promise.

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

Three months on, stars are at 7. The numbers have barely moved, and that fact is the starting point for the change of direction I describe later.

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

### Three Months Spent Selling Size to Buy Correctness

The first part of this article is a retrospective on the 1.0 launch. But as I update it, the library is at 1.4.7, and the biggest change in between was not the feature list. It was the priority order.

The turning point came the day after 1.0. It had become clear that the “first 30 seconds” investment described earlier was not working, and the observation of zero external users kept holding. So I stopped promoting. I took down every marketing asset that was still live: the announcement banner on the docs site, the carefully built `/docs/comparison` page, and the blog post you are reading right now. **That is why this article sat unpublished for more than three months.** It came down the day I decided to stop promoting, and I am bringing it back now with the record of that period attached.

With no users, whether what has already shipped behaves correctly matters more than shipping more of it. That judgment inverted the order of work.

**I pulled property-based testing forward from v1.2.** It generates large volumes of random input to find where an invariant breaks. For pure functions such as date arithmetic, it builds a thicker moat than example-based testing. And it caught one immediately. `startOfDayInTimezone` was returning a time one hour early on DST transition days. The cause was an implementation that measured the offset only once, from “local midnight read as UTC,” and that reading can land on the wrong side of the transition. When Australia/Sydney moves to daylight saving time on October 1, local 00:00 is still AEST +10, but reading it as UTC 00:00 gives AEDT +11, which is after the transition. Example-based testing would have walked past this bug forever unless I had happened to write that exact date into a test.

**And I raised the bundle ceiling from 17KB to 20KB.** I did it even though size was one of the library's selling points. The reason is that a full correctness overhaul of timezone and constraint handling took code. Calendar cells were laid out a day off in negative-offset zones, and the constraint (`disabled`) check existed only on the component path, missing from the preset, keyboard, hook, and context-change paths. Raising three notches at once was not comfortable. But I had no hesitation about the principle: **if you have to choose between “small” and “correct,” a library should choose the latter.**

The seven 1.4.x patches that followed are all of the same family. Instead of listing release notes, here is what each one taught me.

| Version | What it fixed | What it revealed |
| --- | --- | --- |
| 1.4.1 | Calendar-day identity under `displayTimezone`, and consistency across every constraint-check path | Correctness does not leak from one function; it leaks path by path |
| 1.4.2 | Date preservation in UTC+12 through +14 zones, and navigation stuck inside a fully disabled month | Some defects only surface where the sign of the offset changes |
| 1.4.3 | `selectMonth` / `selectYear` committing while ignoring the disabled state they had rendered themselves | The code that draws and the code that writes must read the same verdict |
| 1.4.4 | `workspace:*` pinning to an exact version, so a core patch could not reach users on its own | The shape of a release can itself create a bug |
| 1.4.5 | One bad `value` throwing during render and taking down the whole tree | Values arriving from a form field or a database row are data, not programmer error |
| 1.4.6 | Rejecting impossible dates and out-of-range times, and ISO submission for named inputs | A guard belongs at every entrance, not at one of them |
| 1.4.7 | All seven hooks rebuilding derived data on every render | An optimization fitted to components alone never reaches hook users |

1.4.5 sticks with me most. When an unparseable string arrived as `value`, a `RangeError: Invalid time value` was thrown during render and unmounted the entire React tree, and under `renderToString` a single bad row became a 500 response. But `value` usually comes from a form field or a database row. **It is not a developer mistake; it is just data.** Treating it as a programming error was the library's fault, not the caller's.

Features were not absent either. They all filled in blanks in what already existed, though.

- **RTL support** (1.3.0): every picker Root gained a `dir` prop. Following the WAI-ARIA grid pattern, only the physical arrow keys flip, while ArrowUp/Down and Home/End keep their logical direction. At 1.0 this was deferred until “bundle margin permits,” and raising the ceiling made room.
- **The four missing headless hooks** (`useMonthPicker`, `useYearPicker`, `useWeekPicker`, `useDateTimePicker`): added exclusively to the `@kalyx/react/headless` entry so they would not touch the default bundle ceiling. That is why that entry dried up first.
- **TimePicker locale and Popover** (1.4.0): AM/PM labels are now localized through `Intl` (오전/오후 for ko-KR), and TimePicker can be used in a popover instead of inline.
- **`@kalyx/adapter-luxon` and `@kalyx/adapter-dayjs` published**: both are on npm, and all three adapters pass the conformance suite.

What was **dropped** from the plan stays on the record too. I decided not to build `@kalyx/adapter-temporal` as an adapter. Because the adapter interface is ISO-8601 strings in and out, it cannot carry Temporal's own type capabilities (`PlainDate`, `ZonedDateTime`) through intact. Wrapping it as an adapter would just flatten everything into ISO strings and delegate back to core's Intl code, and the correctness gain measured out at zero. I have not abandoned Temporal itself; I parked it behind a demand gate at the core level.

Deferred tracks are written down not as “later” but as **what I would have to observe to change my mind**. Non-Gregorian calendars (Persian, Buddhist, Islamic, Hebrew): three or more GitHub issues, or one enterprise sponsor. Storybook and visual regression testing: three or more visual regressions. A React Native adapter: on hold. Writing the condition as a number means not relitigating the same argument every time.

### Limitations I Candidly Acknowledge

Finally, an honest disclosure for anyone considering the library. (I believe overmarketing a young library ultimately destroys trust.)

- **Solo maintainer**: the sustainable pace is one minor release per month. Demand can change priorities.
- **Young library**: with a small user base, you may well be the first to discover an edge case. What I can say is that the three months described above cut that probability considerably. Most of the defects fixed in 1.4.x were found first by property tests and exhaustive timezone sweeps, not by users.
- **React 19+ only**: relies on React 19 features such as RSC, `useId`, no `useLayoutEffect` warning, and `<Input>` form-action integration. There will be no React 18 back-port.
- **No “battle-tested” claim**: I will not use that phrase for a new library. What it does have is over 700 tests across the workspace, a property sweep covering core's pure modules, a complete axe pass, SSR verification in Next.js App Router CI, and an adapter conformance suite.
- **Still undecided**: whether `classNames` and `data-*` attributes count as public API. With zero CSS, those two are the only surface consumers have for styling. If they are not public API, a minor release can break somebody's screen; if they are, a rename has to wait for a major. I judged it better to write down that I do not know.

If you need deployment-grade stability at a 100K-user scale today, `react-datepicker` is honestly the safer choice. Kalyx is closer to a **bet** on a smaller, more headless future.

---

## Closing Thoughts

This is less a promotional article than a retrospective on decisions. In my experience, recording what shipped, what was rejected, and which choices carried weight becomes the most valuable asset when building the next library—or evaluating someone else's.

The four decisions up to 1.0 were all about **the shape of the API**. Composition over Props, enforced ISO strings, the adapter pattern, and a bundle ceiling. Each one gave up some short-term convenience to buy long-term adaptability.

What I realized while pulling this article back out and updating it, though, is that the hardest decision came after 1.0. **It was the decision to break a selling point I had put forward myself.** The 17KB ceiling was not just a number; it was part of the sentence that explained what this library is. Raising it to 20KB weakened that sentence. I raised it anyway, for one reason: a library whose calendar sits a day off in negative-offset zones is unusable, small or not.

Looking back, what made that judgment possible was the fact of having zero users. With users, I would have handled the demand in front of me first, and I would not have spent three months writing property tests to hunt a DST bug nobody had reported. **Having no users was the freedom to reverse direction.** Right after 1.0 that looked purely like a signal of failure; today I read it a little differently.

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
