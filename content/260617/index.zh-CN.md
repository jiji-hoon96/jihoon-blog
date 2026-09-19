---
emoji: 📅
title: 'Kalyx'
seoTitle: 'React DatePicker 时区导致日期差一天怎么办：headless 库 Kalyx 设计记录'
date: '2026-06-17'
updatedAt: '2026-09-19'
categories: 库 React DatePicker 开源
description: '整理了我为什么开发 React headless DatePicker Kalyx，以及它与 Ark UI、React Aria、react-day-picker 的区别。结合代码与实测，讲解 ISO 8601 UTC 值模型、基于 Intl 的夏令时处理和覆盖全部 IANA 时区的属性测试。'
keywords: 'Kalyx, React DatePicker, headless DatePicker, React 日期选择器 时区, ISO 8601 UTC, 日期 差一天, DST 夏令时 bug, fast-check 属性测试, react-day-picker 对比'
locale: zh-CN
translationOf: '260617'
sourceHash: '3ef642d1bca4f9c8c3029970e3fe56ac1bc3e6e3623f9dad7d017e7dcf9d292f'
---

这篇文章想聊聊我开发的 React headless DatePicker 库 **Kalyx**。

本文是对 2026 年 6 月所写复盘的重写。最初那篇文章打出的“七种选择器共用一套 API，比竞品库的一个日历还小”，重新核实后发现一半是错的，另一半算不上差异点。所以这次按照开发原因、与现有方案的区别、技术定义的顺序重新整理。

先说结论：Kalyx 的区别不在组件数量，而在 **值模型**。基准版本是 `@kalyx/react` 1.4.7 与 `@kalyx/core` 1.4.8（MIT，仅支持 React 19），引用的代码基于 [GitHub 仓库](https://github.com/jiji-hoon96/kalyx) 2026-09-16 的 `main`（`0bb302e`）。

---

## 我想以声明式的方式使用日期选择器

开发它的原因有两个。一是想用更声明式、更简单的方式使用复杂难用的日期库，二是想学习这类库在内部是如何构建的。“难用”这个说法太笼统，所以我用各个库的类型定义重新确认了一遍，我当初卡住的地方在最新版本里是否依然存在。

### 用 prop 开启模式的 API

react-datepicker 用 `showTimeSelect` 开启时间选择，用 `showMonthYearPicker` 开启月份选择，用 `showYearPicker` 开启年份选择，用 `selectsRange` 开启范围选择。同一个组件会随着 prop 组合变成不同的东西。代价体现在类型上。在 9.1.0 的类型定义中，根据 `selectsRange` 的值，`onChange` 的签名会分叉。

```ts
// react-datepicker/dist/index.d.ts (발췌)
    selectsRange?: true;
    selectsMultiple?: false | undefined;
    formatMultipleDates?: never;
    onChange?: (date: [Date | null, Date | null], event?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => void;
```

这是一个写得很好的 union，但模式越多，分支就成倍增加，使用方只能看着 prop 名称去推想当前是哪种组合。（这和我在[抽象](/260201)一文中讨论的“捆绑错误的抽象会增加耦合”是同一种形态）我希望“输入框、弹出层和日历”能直接从 JSX 结构本身读出来。

### 值类型与时区泄漏的地方

react-datepicker 和 react-day-picker 传递的是原生 `Date`。两者确实都有接收 IANA 时区的 `timeZone` prop。react-datepicker 需要可选 peer 依赖 `date-fns-tz`，react-day-picker 的那个则是实验性功能，但无论哪一边，值的类型依然是 `Date`。`Date` 会按运行环境的本地时区解释，所以在首尔，`new Date(2026, 3, 15)` 经 `toISOString()` 得到的是 `2026-04-14T15:00:00.000Z`。选的是 4 月 15 日，服务器看到的却是 14 日。react-datepicker 的 ["Date Selected is One Day Off"](https://github.com/Hacker0x01/react-datepicker/issues/1018) issue 于 2017 年 9 月打开，2025 年 12 月才关闭。

另一端的 Ark UI 和 React Aria 使用 `@internationalized/date` 的 `CalendarDate`、`ZonedDateTime` 对象。语义很精确，但在表单状态和服务器响应全是字符串的应用里，每个边界都会冒出转换代码。

时区支持有时还和日期库的选择绑定在一起。查看 MUI X Date Pickers 9.13.0 的适配器代码，dayjs、Luxon、Moment 适配器是 `isTimezoneCompatible = true`，date-fns 系列则是 `false`。使用 date-fns 的应用若想用 `timezone` prop，就得再引入一个日期库。

模式分散在 prop 组合里，值分散在解释依赖运行环境的 `Date` 里，时区支持分散在日期库的选择里。

**很难用一个声明写清意图。**

### 在构建中学习

日期选择器看起来很小，却包含了日历计算、区域设置、时区与夏令时（DST）、键盘导航和 SSR。所以我定下的目标是：在使用方，只看 JSX 就能读懂在构建什么；在实现方，把范围收窄到能说清值在哪里被转换。

那么，真的没有已经解决这些需求的库吗？

---

## 与现有方案有什么不同

先说答案：有。我一开始认定没有既是 headless 又具备多种选择器的库，但重新调查后发现这个前提是错的。

### 各方案选择的值模型

以下内容是 2026-09-16 安装 npm 最新版本后，通过类型定义和官方文档确认的。体积一列是用下文介绍的同一方法测得的。

| 库 | headless | 值类型 | 时间输入 | 单独选择月、年 | gzip |
| --- | --- | --- | --- | --- | --- |
| react-day-picker 10.0.1 | 否（自带 CSS） | `Date` | 无 | 无 | 20.0KB |
| react-datepicker 9.1.0 | 否（CSS import） | `Date` | `showTimeSelect` | 通过 prop | 45.4KB |
| MUI X 9.13.0 | 否（Material） | 适配器对象 | TimePicker | `views` | 113.1KB |
| Ark UI 5.39.2 | 是 | `@internationalized/date` | 另外的 `DateInput` 分段（不计入体积） | `minView` | 42.7KB |
| React Aria Components 1.21.1 | 是 | `@internationalized/date` | `TimeField` 分段 | 无 | 75.3KB（DatePicker），78.8KB（含范围与时间） |
| Kalyx 1.4.7 | 是 | ISO 8601 UTC 字符串 | 列表式 HourList、MinuteList | MonthPicker、YearPicker | 18.9KB（DatePicker），25.6KB（全部） |

react-day-picker 在[官方指南](https://daypicker.dev/guides/timepicker)中明确写道 "DayPicker does not include a built-in time picker"。MUI 的体积包含 `@mui/material` 和 emotion，所以如果本来就是 MUI 应用，增量要小得多。

### headless 的完整方案早已存在

表中重要的是 Ark UI 和 React Aria 两行。[Ark UI](https://ark-ui.com/docs/components/date-picker) 通过 `DatePicker.Root` 这类 dot notation 组合 API，提供单选、多选、范围选择以及按月、按年选择。[React Aria](https://react-aria.adobe.com/DatePicker) 是 Adobe 以无障碍为核心的实现。所以 Kalyx 的位置比我最初想的要窄。

> headless 的完整方案早已存在。不过 Ark UI 和 React Aria 以 `@internationalized/date` 对象传递值，时间输入采用分段字段。Kalyx 把值固定为可以直接放进 JSON 的 UTC 时刻字符串，并把从列表中选择的 TimePicker 以及月、年、周选择器放进了同一套组合 API。

不过，“值是字符串所以好”是个站不住的主张。`CalendarDate` 调用一次 `toString()` 也能变成字符串。差异不在格式，而在于 **这个字符串始终是真实的瞬间（时刻），不会与日历格子（坐标）混用的契约，以及守护这个契约的测试**。

### 用同一方法重新测量包体积

README 徽章上的包体积并不是能和其他库比较的量。徽章上约 19.5KB 的数字，是 `@kalyx/react` 的 `dist` 中的一个文件，而这个文件把 `@kalyx/core`、`@kalyx/adapter-date-fns`、`@floating-ui/react` 留作外部 import。我把这个数字和别人包含依赖的数字摆在了一起。

所以我按“消费方应用加一行 import 时，包会增大多少”把所有库重新测了一遍。

```bash
echo "import { DatePicker } from '@kalyx/react'; export default DatePicker;" > entry.jsx
npx esbuild entry.jsx --bundle --minify --format=esm --platform=browser \
  --external:react --external:react-dom --external:react/jsx-runtime | gzip -6 | wc -c
```

测量使用 esbuild 0.28.2，时间为 2026-09-16，KB 是字节数除以 1024 的值。react-datepicker 排除了 CSS。React Aria Components 测了两次：一次是组装单个 DatePicker 所需的 12 个 export（`DatePicker`、`DateInput`、`Calendar`、`Popover`、`Dialog` 等），一次是加入范围和时间的 14 个 export（含 `DateRangePicker`、`RangeCalendar`、`TimeField`）。

![在相同的 esbuild 条件下测量，体积依次为 Kalyx DatePicker 18.9KB、react-day-picker 20.0KB、Kalyx 全部 25.6KB、Ark UI 42.7KB、react-datepicker 45.4KB、React Aria Components 75.3KB（含范围与时间为 78.8KB）、MUI X 113.1KB。](1.png?w=720)

在相同条件下，成立的说法只有一个。一个 DatePicker（18.9KB）与 `DayPicker`（20.0KB）体积相当，七种全部（25.6KB）则比它大。（即便如此，DayPicker 只有日历，而 Kalyx DatePicker 还包含输入框和弹出层）体积对 import 组合和 gzip 级别很敏感，按数量级来读更合适，体积也不是选择 Kalyx 的核心理由。

---

## 从技术上定义 Kalyx

> Kalyx 是一个 headless React 日期选择器：它把所有输入输出固定为 UTC 时刻字符串，把日历坐标与时刻之间的转换只放在两个函数里，并针对运行时知道的所有时区用属性测试检查这一往返。

使用方的 API 如下。`value` 和 `onChange` 是 `string | null`，`displayTimezone` 决定用哪个时区的日历来显示。

```tsx
<DatePicker value={iso} onChange={setIso} displayTimezone="America/New_York">
  <DatePicker.Input />
  <DatePicker.Popover>
    <DatePicker.Calendar />
  </DatePicker.Popover>
</DatePicker>
```

### 值是时刻，日历格子是坐标

Kalyx 内部流动着格式相同的两种 ISO 字符串。**坐标** 是日历网格中的一格，写作 `YYYY-MM-DDT00:00:00.000Z`，却没有时区概念。网格计算只在 UTC 中进行，因此与运行环境无关。**时刻** 是通过 `onChange` 输出的值，是 `displayTimezone` 中当天零点对应的真实瞬间。同样是 1 月 15 日，在纽约是 `2026-01-15T05:00:00.000Z`，在首尔是 `2026-01-14T15:00:00.000Z`。

![日历坐标 2026-01-15T00:00:00.000Z 通过 civilMidnightFromUtcDay 变为纽约和首尔的时刻，再通过 calendarDayFromInstant 回到坐标。](2.png?w=720)

连接二者的函数只有 `@kalyx/core` 中的两个：把坐标转为时刻的 `civilMidnightFromUtcDay`，以及反方向的 `calendarDayFromInstant`。后者读取“这个时刻在该时区是几号”，再重新写成 UTC 零点坐标。

```ts
// packages/core/src/utils/timezone.ts:187-190
export function calendarDayFromInstant(iso: ISODateString, timeZone: string): ISODateString {
  const p = partsInTimezone(new Date(iso), timeZone);
  return new Date(Date.UTC(p.year, p.month - 1, p.day)).toISOString();
}
```

规则在于方向。选中格子并提交值时，坐标转为时刻；根据存储值决定显示哪个月和焦点位置时，时刻转为坐标。DatePicker Root 的 `selectDate` 先转换，再用转换后的时刻检查约束，通过后提交。

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

调用点不止这一处。搜索 `packages/react/src` 会发现，这两个函数分散在 DatePicker、RangePicker、DateTimePicker 的 Root 和 Calendar、Presets、键盘移动工具函数以及六个 headless hook 中。即便如此，所有提交日期格子或决定视图的路径都会经过二者之一。提交时间由 `setTimeInTimezone` 负责，它在内部也用同一个内部函数 `resolveCivilDateTime` 转换。

这个契约由基于属性的测试（property-based test）守护。对任意坐标 `c` 和时区 `z`，都必须满足 `calendarDayFromInstant(civilMidnightFromUtcDay(c, z), z) === c`。

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

[fast-check](https://fast-check.dev/) 随机生成 2020 年到 2045 年之间的日期，与 +5:45 的 Kathmandu、+14 的 Kiritimati、-11 的 Niue 等 14 个代表性时区组合，运行 300 次。紧接着的测试对 `Intl.supportedValuesOf('timeZone')` 返回的所有时区，逐个时区各检查 12 次同样的往返。在我本地的 Node 24.16 上，这个列表有 418 个时区。1.4.8 又加入了一个全量测试，在每次夏令时切换处把边界时间的转换结果与 Temporal 实现对照。

那么，库能不能自动把用户传入的 `"2026-01-15T00:00:00.000Z"` 规范化为时刻？这条路走不通，因为仅凭字符串无法判断它是坐标还是时刻。对已经是时刻的首尔值 `2026-01-14T15:00:00.000Z` 再套一次 `civilMidnightFromUtcDay`，就会得到 `2026-01-13T15:00:00.000Z`，在首尔这样偏移为正的时区，每次渲染日期都会再往前挪一天。（纽约的值再套一次也不变）换成无论应用多少次结果都相同的 `startOfDayInTimezone`，虽然不会挪动，却做不了把坐标转为时刻这个本职工作。

所以我放弃了规范化，用文档固定契约。使用方必须原样传回选择器输出的值。坦白说，这是转嫁给使用方的成本，而且 `ISODateString` 是 `string` 的别名，编译器也拦不住。

### 只用 Intl 解决夏令时

要把坐标转为时刻，需要知道“该时区当天的 00:00”在 UTC 中是什么时候，但偏移量只有知道时刻才能求出。更麻烦的是，在夏令时切换日，当地时间可能不存在（spring forward），也可能出现两次（fall back）。

Kalyx 不借助 `date-fns-tz` 这样的库来解决这个问题。它用 `Intl.DateTimeFormat(...).formatToParts` 询问“这个 UTC 瞬间在该时区是几点”，以此测出偏移量，并在请求时间的前一天和后一天两个点读取偏移量。

```ts
// packages/core/src/utils/timezone.ts:251-254, 259
const candidate = (probeEpoch: number) =>
  civilEpoch - getTimezoneOffsetMinutes(new Date(probeEpoch).toISOString(), timeZone) * 60_000;
const epochBefore = candidate(civilEpoch - 86_400_000);
const epochAfter = candidate(civilEpoch + 86_400_000);

if (epochBefore === epochAfter) return new Date(epochBefore).toISOString();
```

`civilEpoch` 是把目标当地时间当作 UTC 读出的值。偏移量在 ±14 小时以内，所以前一天和后一天会分别给出附近切换之前和之后的偏移量。两者相同说明附近没有切换，两次 `formatToParts` 就结束；网格的 42 个格子各调用一次，所以这条快速路径决定了开销。（前提是 48 小时内最多一次切换，这在 2020 至 2045 年的所有时区都成立）

两者不同时，会在该时区重新读取两个候选，看哪个与请求时间一致（`timezone.ts:261-279`）。fall back 的重叠中两者都一致，于是选用切换前偏移量得出的较早一个；spring forward 的空隙中两者都不一致，于是同样选这一侧，把时间按空隙长度往后推。实际运行的结果如下。

| 请求 | 情况 | 1.4.7 | 1.4.8 |
| --- | --- | --- | --- |
| New_York 2026-03-08 02:30 | 不存在的时间 | `2026-03-08T07:30:00.000Z` | 相同（03:30 EDT，向后推） |
| New_York 2026-11-01 01:30 | 出现两次的时间 | `2026-11-01T05:30:00.000Z` | 相同（01:30 EDT，较早的一个） |
| London 2026-10-25 01:30 | 出现两次的时间 | `2026-10-25T01:30:00.000Z`（较晚的一个） | `2026-10-25T00:30:00.000Z`（01:30 BST，较早的一个） |

“空隙往后推，歧义取较早”与 [MDN 的 Temporal.ZonedDateTime 文档](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime)所说明的 `disambiguation` 默认值 `"compatible"` 相同。1.4.7 的 London 一行为什么出错，后面再讲。

### 适配器边界是 21 个字符串方法

既然时区由 core 计算，那 date-fns 或 dayjs 负责什么？日期运算和解析。这条边界 `DateAdapter` 有 21 个方法，日期参数和返回值全都是 ISO 字符串。

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

接收时区的方法有 `format`、`isSameDay`、`startOfDay`、`today` 四个，而这四个也把计算交给 core。date-fns 适配器的 `format` 在有 `timezone` 时，会直接调用 core 的 `formatInTimezone`（`packages/adapter-date-fns/src/index.ts:112-115`）。因此无论使用哪个适配器，时区的答案都出自同一段代码，三个适配器（date-fns、dayjs、luxon）各自运行 `@kalyx/core/test-helpers` 的 `runAdapterConformanceTests`，确认给出相同的答案。

两个入口也在这条边界上分开。默认入口 `@kalyx/react` 在模块加载时调用 `setDefaultAdapter(DateFnsAdapter)`，所以安装后即可使用（`packages/react/src/index.ts:9-11`）。`@kalyx/react/headless` 没有这个调用，打包也是分开的，date-fns 的代码不会混进来。

这种边界形态是有代价的。2026 年 6 月，我放弃了 Temporal 适配器。Temporal 的价值在于像 `PlainDate`、`ZonedDateTime` 这样 **由类型携带语义**，可一旦边界是字符串，这层语义就无法通过。包一层也只会被压平成字符串，我判断这在正确性上没有收益。回头看，上一节“坐标和时刻是同一个 `string`”的问题，恰恰就是 Temporal 用 `PlainDate` 和 `Instant` 在类型层面解决的问题。字符串边界让替换适配器变得容易，代价是堵住了用类型解决问题的路。

### 七种选择器是三个上下文的组合

Kalyx 的选择器有 DatePicker、RangePicker、TimePicker、DateTimePicker、MonthPicker、YearPicker、WeekPicker 七种。比数量更重要的是，**这七种并不是独立实现**。上下文只有 `DatePickerContext`、`RangePickerContext`、`TimePickerContext` 三个。

| 选择器 | 持有状态的 Root | 上下文 | 差异来自哪里 |
| --- | --- | --- | --- |
| DatePicker | `DatePickerRoot` | Date | |
| MonthPicker、YearPicker | DatePicker 的 Root 实现 | Date | `selectionGranularity` |
| RangePicker | `RangePickerRoot` | Range | |
| WeekPicker | 直接使用 `RangePickerRoot` | Range | Calendar 上的 `selectionMode="week"` |
| TimePicker | `TimePickerRoot` | Time | |
| DateTimePicker | 自己的 Root | Date 与 Time 嵌套 | 叠加两个 Provider |

MonthPicker 的 Root 只是把显示格式默认值改为 `yyyy-MM`，再把 `selectionGranularity="month"` 传给 DatePicker 的 Root 实现（`MonthPicker/Root.tsx:11-20`）。DatePicker 的 `selectDate` 在 granularity 为 `month` 时，把坐标折叠到当月 1 日，之后照样走前面看到的转换和约束检查。DateTimePicker 则叠加提供两个上下文。

```tsx
// packages/react/src/components/DateTimePicker/Root.tsx:401-402
<DatePickerContext.Provider value={dateContext}>
  <TimePickerContext.Provider value={timeContext}>{children}</TimePickerContext.Provider>
```

所以 `DateTimePicker.Calendar` 和 `DatePicker.Calendar` 是同一个组件，它并不知道自己处在哪个选择器里。一处修改会作用到所有使用该组件的选择器，一处缺陷也会波及全部。前面图表中单个 DatePicker 占全部体积 74% 的原因，也正是这层共享基础。

---

## 守住契约的代价

1.0 之后的三个月，我更多用来确认这个契约而不是做新功能，结果出现了三次靠示例测试会被放过的缺陷。第一个由属性测试发现，第二个由代码交叉审查发现，第三个由本文的核查发现。

### Sydney 10 月 1 日的一小时

第一个是“把 `startOfDayInTimezone` 的结果放到该时区读取，得到 00:00:00”这一属性在 Australia/Sydney 被打破。当时的实现只测一次偏移量。Sydney 在 2034 年 10 月 1 日 02:00 从 +10 切换到 +11，当天 00:00 仍是 +10，所以正确答案是 `2034-09-30T14:00:00.000Z`。然而“把 10 月 1 日 00:00 当作 UTC 读取的那个点”已经在切换之后，返回的是 +11，结果变成了前一天 23:00。这个反例也作为回归测试保留了下来（`timezone.property.test.ts:276`）。

### 只在首尔通过的测试

第二个出自 2026 年 8 月 3 日的交叉审查。决定日历中哪一格显示为选中的代码做了两次转换。格子本来就是坐标，却把格子和存储值都转换成了该时区的日期。选择“1 月 15 日”的结果如下。

| 时区 | 存储值 | 显示为选中的格子 |
| --- | --- | --- |
| `Asia/Seoul`（+9） | `2026-01-14T15:00:00.000Z` | 15 日（正确） |
| `America/New_York`（-5） | `2026-01-15T05:00:00.000Z` | 16 日（错误） |

在正偏移时区，两次偏移相互抵消，碰巧是对的，而已有测试只覆盖了首尔。同一次检查还发现了反方向的违规。决定显示哪个月时，直接对时刻套用了 `startOfMonth`，于是在首尔把 1 月 1 日作为值传入，打开的却是 12 月的日历。

机制不同，违反的规则却是同一条：每个方向只用指定的函数转换一次。

这次事故让 core 的往返属性测试从“几个代表性时区”扩展到“运行时知道的全部时区”。（React 一侧的组件测试仍在使用 `America/New_York` 这类代表性时区）

**只在符号翻转处暴露的缺陷，靠抽样是抓不到的。**

### London 的 01:30 被解析成较晚的一个

第三个是在把本文的 DST 表格扩展到其他时区时发现的。1.4.7 从“把请求时间当作 UTC 读取的那个点”开始测偏移量，而在切换后偏移量为 0 或以上的时区，那个点已经在切换之后，于是收敛到较晚的偏移量。用 temporal-polyfill 对 418 个时区 2020 至 2045 年的全部切换逐一对照，3,395 次重叠切换中有 1,908 次选了较晚的一个，涉及 84 个时区。（3,394 次空隙切换全部正确，偏移为负的纽约只是碰巧正确）

在 [#226](https://github.com/jiji-hoon96/kalyx/pull/226) 中我改成读取前一天和后一天，作为 `@kalyx/core` 1.4.8 发布，并把同样的对照保留为 `timezone.dst-oracle.test.ts`。（temporal-polyfill 只在测试中使用）之前错写成 `'earlier'` 的源码注释也改成了 `'compatible'`。这一次，**样本同样集中在一种符号上。**

### 花在正确性上的 3KB

这些修复需要代码。Kalyx 为默认入口的包设置了 CI 上限，超出的 PR 会在必需检查中失败。这个上限从 12KB 起步，每加一个功能就上调 1KB，而在 2026 年 8 月全面修正时区和约束的正确性时，我把它从 17KB 一次性提到了 20KB。

体积是 README 徽章上展示的卖点。在负偏移时区每次差一天的日期选择器，不管大小都没法用。

**如果必须在小和对之间选一个，那就选对的。**

现在的上限很紧。根据仓库 2026-09-11 的包字节分布文档，用 Node 默认 gzip 测量 `dist/index.cjs` 的结果是 20,259B，上限是 20,480B，余量只有 221B。（这是把依赖留在外部的自身文件大小，与前面图表测的是不同的量）下一个功能得先回收字节才能加进来。

---

## 与最初设想不同的结论

我想要的是以声明式的方式使用复杂的日期库。做完之后才发现，声明式的组合 API 和 headless 的完整方案早已存在。剩下的差异藏在更里面。**把值固定为一个时刻，把坐标与时刻之间的转换收窄到两个函数，并用测试在所有时区守住这个往返。** 基于 Intl 的夏令时处理、字符串适配器边界、由三个上下文组成的七种选择器，都是这一决定的结果。

从学习这个目标来看，我学到最多的是如何主张“正确”。最初文章的包体积对比测的是不同的量，在首尔通过的测试在纽约是错的。如果不把测了什么、用什么样本确认一并写下来，数字很容易沦为炫耀。

局限也很明确。维护者只有我一个人，仅支持 React 19，`@kalyx/react` 在 2026 年 9 月 5 日至 11 日的 npm 下载量是 200 次，其中 156 次集中在 1.4.7 发布当天。坐标与时刻无法用类型区分的问题只靠文档挡着，作为样式接入点的 `classNames` 和 `data-*` 属性是否作为公开 API 来保证，我也还没决定。可访问性方面，日历有 `grid`、输入框有 `combobox`、时间列表有 `listbox` 角色，支持方向键、Home/End、PageUp/PageDown 导航，CI 会运行 8 个测试文件中的 `jest-axe` 检查，但还没有依据说它和 React Aria 一样经过充分验证。

所以，如果本来就是 MUI 应用，先看 MUI X；如果分段输入和经过验证的无障碍是首要需求，先看 React Aria；如果只需要一个日历，先看 react-day-picker，这样更合适。如果你在值以 JSON 往来的表单中遇到过日期差一天的问题，那时再来看看 Kalyx 我会很高兴；如果你知道更好的解法，也欢迎通过 GitHub Issue 告诉我。

```bash
pnpm add @kalyx/react
```

在文档站的 [Playground](https://kalyx-docs-site.vercel.app/playground) 中，可以亲手试用七种选择器，并修改 locale 和 timezone 设置。

:::ref

[docs] [Kalyx 官方文档站](https://kalyx-docs-site.vercel.app/)

[docs] [MUI，Date and Time Pickers Timezone](https://mui.com/x/react-date-pickers/timezone/)

[docs] [Floating UI 官方文档](https://floating-ui.com/)

:::
