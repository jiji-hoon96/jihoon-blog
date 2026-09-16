---
emoji: 📅
title: 'Kalyx'
seoTitle: 'Kalyx：我用一年打造 React 19 headless DatePicker 的复盘'
date: '2026-06-17'
updatedAt: '2026-09-16'
categories: 库 React DatePicker 开源
description: '每次挑选React DatePicker，headless、bundle体积、7个primitive总得放弃一样。所以我自己写了一个。记录四项设计决策，以及后来用卖点级的bundle上限换取正确性的三个月。'
keywords: 'Kalyx, React DatePicker, headless DatePicker, react-day-picker, react-datepicker, headless 组件库, bundle 体积, ISO-8601 时区, Composition 组合模式, adapter 适配器模式, Radix dot notation, Ark UI, MUI X DatePicker, displayTimezone, DST 夏令时 bug, 属性测试 fast-check'
locale: zh-CN
translationOf: '260617'
sourceHash: b7e7be3efa404583193adba50f933c85c2d044497af8da1f75cbaa9c00bab69c
---

这篇文章想聊聊我亲手打造的React headless DatePicker库——**Kalyx**。

作为前端开发者，我经常负责涉及SaaS表单的项目。于是几乎每个页面都需要日期输入：单个日期、日期范围、时间、按月/年跳转，甚至还有timezone。然而过去一年里，每当我开始新项目，都会撞上同一堵墙。（坦白说，从来没有一次能用一个库干净地解决所有需求。）

有一天，我第三次在`react-day-picker`上拼接自制的TimePicker和从别处借来的Popover，开始在笔记里写下自己真正想要的API形态。这份笔记最终成为Kalyx 1.0的公开API。

这篇文章是我以作者视角整理的决策记录。前半是走到1.0之前做的四个决策，后半是那之后三个月的记录。后半才是我最想讲的部分。**1.0之后最大的决策不是新功能，而是我亲手打破了当作卖点的bundle上限，用它换来了正确性。** 现在的版本是1.4.7，这期间的7次patch全部用在修同一类bug上。

---

## React DatePicker为什么这么难

首先有必要简单看看市场现状，因为它说明我遇到的并非库选择问题，而是**权衡本身的问题**。

下面汇总了截至2026年6月React生态中常用的DatePicker候选项。（npm下载量为2026年6月的每周数据。）

| 库 | 每周下载量 | 擅长之处 | 强制接受的东西 |
| --- | --- | --- | --- |
| **react-day-picker** | 约42M | 简洁的headless Calendar | 只有Calendar grid。v10仍不官方支持Input、TimePicker |
| **react-datepicker** | 约4.7M | 一个bundle包含全部primitive | 必须CSS import。value是native `Date`。100多个props |
| **Ark UI** | 份额增长中 | Composition + headless | 没有standalone TimePicker。时间仅存在于DatePicker内 |
| **MUI X** | 份额高 | 一体化 + 企业级 | 约58KB gzip。RangePicker需要Pro付费许可 |
| **React Aria** | 约5.9M | spec级无障碍 | 强制使用`@internationalized/date`。与date-fns代码库不兼容 |
| **Headless UI** | 与Tailwind配套 | headless模式的先驱 | 以“维护成本太高”为由拒绝开发 |

把功能逐一拆开时，很容易选出赢家。但真实工作的单位并不是单个功能。在一个同时需要单日输入、范围筛选、时间选择和月/年跳转的SaaS表单里，**没有任何一个库能满足全部要求**。

Headless UI维护者的态度尤其值得关注。Tailwind Labs实际上一直在[GitHub Discussion #289](https://github.com/tailwindlabs/headlessui/discussions/289)中搁置DatePicker请求。这个讨论开于2021年，五年后的今天仍没有维护者回复，`@headlessui-react`源码树里也没有任何日期相关组件。Tailwind用户最终会被引导到React Aria。想到locale、timezone、DST、多种日历系统、无障碍与键盘导航会同时在DatePicker这个领域发生冲突，这种搁置完全可以理解。（我也是亲手做完后，才真正体会到负担有多大。）

Ark UI的案例也传递了同样的信号。Chakra UI团队打造的Ark UI里**没有standalone TimePicker组件**。时间选择只通过`@internationalized/date`的`CalendarDateTime`在DatePicker内部处理。也就是说，它并非Tailwind用户可以单独组合来“只选时间”的独立primitive。（起初我粗略地理解成“Ark放弃了TimePicker”，但重读文档后发现，更准确的说法是“从一开始就没有拆成独立组件”。关键在于，即使是headless库的顶尖团队，也谨慎对待把TimePicker拆成独立primitive这件事。）

看到这里，自然会产生一个问题：“真的没有办法在一个库里解决这些权衡吗？”

---

## Kalyx的位置

Kalyx是我对这个问题的回答。一句话定义就是：**“无需CSS import、安装即可运行，并能用任何样式方案自由定制的React headless DatePicker。”**

1.0中ship的内容如下。（括号里是更新本文时1.4.7的数值）

- **7个primitive组件**: `DatePicker`, `RangePicker`, `TimePicker`, `DateTimePicker`, `MonthPicker`, `YearPicker`, `WeekPicker`
- **3个Headless Hook**: `useDatePicker`, `useRangePicker`, `useTimePicker`（想丢掉库提供的全部UI、自行构建UI时使用的入口。其余4个后来由`@kalyx/react/headless`入口补上，现在7个全都有了）
- **单一Composition API**: 7个primitive全部使用相同的Context和dot notation模式
- **约16KB gzip (ESM)**: 在17KB上限内完成（现在约19.5KB，上限20KB。为什么上调，是本文后半的主题）
- **0个CSS import**: Tailwind、CSS Modules、vanilla CSS，任意选择

API长这样。

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

同一模式会在7个primitive中重复。完全没有`showTimeSelect`、`showMonthDropdown`这样的boolean炸弹props。

用一张图表示它的定位如下。

![展示Kalyx组合了现有库哪些部分的定位图](1.png?w=620)

它像是在现有库优秀部分的并集上又加了一点：**把Ark UI中并非standalone的TimePicker，也作为独立primitive整合进同一个Composition。**

---

## 四个核心决策

这里整理设计阶段最沉重、最难撤回的四个决策。如今1.0 API已经freeze，可以说这四项决定强制塑造了其他所有选择。

### Composition over Props

最初的设计草稿是`<DatePicker showTime showMonthGrid presets={[...]} renderHeader={(props) => ...} />`这种形式，本质上就是`react-datepicker`的默认模式。我花了一周尝试用类型干净地描述props之间的相互作用，最后还是全部删掉了。

原因很明确：**Props爆炸的真正代价是失去type safety。** 只有`showTimeSelect`为`true`时，`timeFormat`才有意义，但类型系统无法直接表达这种条件依赖。若用discriminated union解决，props接口会以50个为单位爆炸，每增加一个prop都要重新验证全部组合。（这与我之前写的[抽象](/260201)一文中“错误的抽象会增加耦合”完全是同一语境。）

Radix UI和shadcn/ui的dot notation模式最优雅地解决了这个问题：在callsite显式表达约束。

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

代价很清楚：一行`<DatePicker>`变成六行JSX块。但收获同样明确。

- 一年后再看仍能读懂的清晰度
- 不在prop组合之间leak的类型
- 每个subcomponent都拥有自己的`classNames` slot map，因此样式表面可以无限扩展

实现只需用`Object.assign`模式简单组合。

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

它对tree shaking友好，每个组件只在一处`index.ts`中组合，也不会产生namespacing冲突。（第一次看到Radix UI时，我不明白“为什么称它为标准”。亲自构建库之后，才理解这种模式为何如此迅速地成为行业标准。）

### ISO-8601字符串in/out

Kalyx的`value`是`string | null`，即ISO-8601 UTC格式字符串，`onChange`也返回相同形式的字符串。公开API中完全不会出现native `Date`对象。

“理所当然”的替代方案是`Date`对象，而这正是所有使用native Date的DatePicker中多年未关闭issue的根源：timezone offset错位、`JSON.stringify` round-trip损坏、SSR时服务器与客户端生成不同值。`react-datepicker`最具代表性的timezone issue [#1018](https://github.com/Hacker0x01/react-datepicker/issues/1018)于2017年提出，拖了8年，直到2025年才以“这不是bug，而是JavaScript `Date`的预期行为”为结论关闭。没有改源码，只补了文档。只要库将native `Date`作为value类型，这类摩擦就不可能从结构上消失。

强制使用ISO-8601字符串可以获得三项保证。

- **wire-safe**: 经过`JSON.stringify`再取回，仍是byte-for-byte相同的字符串
- **SSR安全**: 服务器和客户端用同一字符串hydrate
- **强制明确timezone**: consumer必须用`displayTimezone="Asia/Seoul"`之类的方式声明显示时区

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

同一ISO值显示在不同时区的场景也能自然表达。

```tsx
const iso = "2026-01-15T15:00:00.000Z";

<DatePicker value={iso} displayTimezone="Asia/Seoul" />       // 2026-01-16 00:00
<DatePicker value={iso} displayTimezone="America/New_York" /> // 2026-01-15 10:00
```

代价确实存在。需要`Date`对象的downstream代码必须自行调用`new Date(iso)`。但我认为，与其让`Date`对象流遍整个库，不如把这条boundary集中在consumer代码的一处。（我从多个项目中学到：一旦开始接收对象，就无法追踪它究竟流到了哪里。）

DST等边界由`@kalyx/core`中基于Intl的timezone工具处理。它们并不放在adapter接口，而是集中为core里的`civilMidnightFromUtcDay`、`setTimeInTimezone`、`startOfDayInTimezone`等函数，全部基于`Intl.DateTimeFormat`运行。把某个timezone的午夜（civil midnight）转换成UTC时，它会准确计算DST边界；用户只需传入IANA timezone字符串，其余由库负责。（关键在于timezone逻辑位于core而非adapter。无论使用date-fns还是dayjs，timezone准确性都由同一套core代码保证。）

### adapter模式

`@kalyx/core`对date-fns的依赖为0。实现相同`DateAdapter`接口（21个方法）的`@kalyx/adapter-date-fns`被拆为独立包，`@kalyx/react`则通过Context注入adapter。有趣的是，adapter本身只是约200行的薄shim。21个接口方法中只有4个接受timezone参数（`format`、`isSameDay`、`startOfDay`、`today`），甚至这4个方法的实际timezone计算也全部委托给core的Intl工具。adapter的职责是把日期运算和解析映射到特定库的语法，而不是负责准确性。

拆包后的结构如下。

```
@kalyx/core               # 플랫폼 독립 로직 + Intl 기반 timezone, date-lib 의존 0
@kalyx/adapter-date-fns   # default adapter (별도 패키지)
@kalyx/react              # 컴포넌트 (default로 adapter-date-fns 자동 wire)
@kalyx/react/headless     # zero date-lib entry, 자기 adapter 들고 옴
```

设计阶段考虑过三个选项。

| 选项 | 优点 | 缺点 |
| --- | --- | --- |
| A. core内置date-fns | 实现简单，新手onboarding容易 | 无法在不major bump的情况下替换 |
| B. core完全BYO | 能适应未来 | 新手每次都要自行配置adapter |
| C. Hybrid (default + 可替换) | 新手便利 + 资深用户的escape | 拆成2个包 + 维护2个entry |

我选择了C。0.x时期其实从A开始，但在v1 stable、API即将freeze之前，我意识到：**一旦内置某个date库，就无法在不major bump的情况下移除。** 当时果断抽出adapter，是1.0毕业前最大的决策。

后续ship的adapter也遵循相同的21方法契约，只有实现不同。三个adapter都会在各自的测试里运行`@kalyx/core/test-helpers`的`runAdapterConformanceTests`，验证它们是否给出相同的答案。

- `@kalyx/adapter-dayjs`: 统计显示约一半React用户使用dayjs，因此当时优先级第一（Mantine甚至将dayjs规定为强制peer）
- `@kalyx/adapter-luxon`: 面向企业与高级timezone场景
- Temporal: 抽离完成后，我得出结论：TC39 Temporal API支持应在core层面解决，而非通过adapter。因为adapter接口是ISO字符串in/out，无法原样传递Temporal的独有能力。（后文“当前状态”会再次讨论这一判断。）

### bundle上限

1.0发布时，bundle为ESM约15.8KB / CJS约15.9KB gzip。我最初将上限设为16KB，v1.1时提高一档到17KB。CI会强制执行这个上限。每个PR都运行`pnpm check-bundle`，超出上限的PR会build fail。

这个数字不是随意选择的，而是参照市场基准设定。

- `react-day-picker`: 仅Calendar就约22KB
- `react-datepicker`: 全部primitive约40～60KB
- `MUI X`: 约58KB（而且Range是付费Pro）
- `Kalyx`: 7个primitive比`react-day-picker`的一个Calendar还小

最后这一行曾是1.0时期的骄傲。现在依然成立，但余地小了很多。约19.5KB对约22KB，只差2.5KB。

bundle演变也按RC阶段进行了追踪。

| 阶段 | 变更 | 上限 |
| --- | --- | --- |
| rc.0 | 7 primitive初步完成 | 12 → 13KB |
| rc.3 | grid键盘导航 (Arrow/Page/Home/End) | 13 → 14KB |
| rc.4 | MonthPicker/YearPicker disabled month/year prop | 14 → 15KB |
| rc.8 | TimePicker `filterTime`编程callback | 15 → 16KB |
| 1.0.0 | 最终稳定化 (2026-06-08) | ESM 15.8KB / CJS 15.9KB |
| 1.1 | a11y `announce()` live region parity | 16 → 17KB |
| 2026-08 | timezone与约束正确性的全面修复 | 17 → 20KB |
| 2026-08 | 仅把`/headless`入口拆出来 | 20 → 22KB |

每次上调都明确记录“为什么增加”，让它成为有意的决策，而不是每次悄悄漏掉1KB。被拒绝的功能也清楚留档。表格上面六行是1.0时期的记录，那时只有一档一档往上加的决定。表格最后两行是这次更新本文时补上的，性质不同：不是一档，而是一次跳了三档。**那个决定就是本文后半的主题。**

移动上限这件事，我故意做得麻烦。只改一处就容易悄悄上调，所以现在`scripts/bundle-policy.js`里的两个常量是单一来源，每个PR的必需检查都会强制它。表格最后一行的拆分，原因也是在这里暴露出来的。两个入口原本共享同一个上限，而`/headless`在与default入口相同的七种组件之外，还要多装全部七种hook和`DateTimePicker.Presets`。**装了更多代码的一侧余量反而更少，出现了这样的倒置。** 实测时default入口还剩1.4KB，headless却干到不足200byte，连与default入口无关的变更也被headless全数挡下。所以我只上调了headless的上限并把两者拆开，default入口的20KB没有动。那个数字已经写进README徽章，上调就等于改变承诺。

以上就是嵌入库代码本身的四个决策。那么实际build过程中发生了什么？

---

## 1.0 build过程

### 从0.x到1.0的14个RC阶段

2026年5月27日，我为包含全部7个primitive的rc.0打了tag。此后经过14次RC iteration，于6月8日毕业为1.0.0 stable，约12天。（我并不认为这个速度是正确的。更稳妥的做法是慢一点、一次只打磨一件事，但作为单人维护者，一旦进入build模式，就必须迅速收尾。）

期间的主要工作包括：

- **安全fix**: GHSA-5xrq-8626-4rwp Critical级漏洞（vitest 4 upgrade）
- **adapter中立抽离**: 将`@kalyx/core`中的date-fns依赖降为0
- **将`@kalyx/adapter-date-fns`拆为独立包**
- **增加`@kalyx/react/headless` entry**: 面向zero date-lib用户

测试基线也被定为1.0毕业条件：unit test 497/497通过、axe无障碍14/14、e2e场景31个。

### Aurora视觉统一

1.0发布后收到的最难忘反馈，是用户直接发来的一句话：**“丑得要死，又脏又难看。”**还附了3张HeroDemo截图。（那时我才真切体会到：库代码再好，demo不好看，点击量就是0。）

症状很明确：Calendar grid漏出网格线，MonthPicker单元格横向拉伸，DateTimePicker则过于拥挤。诊断后发现，这是两套CSS系统分裂的结果。`.kx-live-*`与HeroDemo中的`:global([role='grid'])`独立演进，一边的fix无法覆盖另一边。

解决方案不是重新设计，而是**统一后进行一次polish**。经过7轮视觉iteration（v1 → v7），Aurora token系统最终确定。single source of truth是`apps/docs-site/src/css/custom.css`这一个文件，并强制所有picker共享同一套token。

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

这里分享我在过程中固定记录的三个陷阱。把headless组件嵌入其他环境，尤其是Docusaurus这类文档站时，很可能遇到完全相同的问题。

第一，**Docusaurus Infima的`table th, td`规则会侵入所有`<table>`**，因此Calendar grid会漏出网格线。需要用CSS Modules隔离，或显式加入reset。

第二，**不能对`<table role="grid">`使用`display: grid`。** `<thead>/<tbody>/<tr>`会成为grid item，真正的7 column反而无法传到`<td>`。最终必须用`display: table` + `table-layout: fixed` + 显式width的组合解决。

第三，**Range可视化需要非对称圆角**：start只圆左侧，end只圆右侧，middle没有圆角。统一处理会让单元格看起来“各自漂浮”，破坏直观的视觉分组。

### 用户为0时，我把时间花在哪里

我想如实公开1.0发布第一周的数据。

- GitHub stars 5个、forks 0个、watchers 0人
- npm每周下载480次（推测大部分是CI镜像bot）
- 直接依赖包0个

三个月过去的现在，stars是7个。数字基本没动，而这个事实正是后文那次方向转变的起点。

时间投入分成两条路：(a)继续加强新功能；(b)扩展到React Native adapter等新track。但两者ROI都很低。外部用户为0，新功能无法得到验证；新track也应该等用户出现后再进入才更有效。

于是我决定把时间投入**最初30秒的印象**：用户第一次进入GitHub仓库或docs站点，并在30秒内判断“这个库是否值得一试”的区间。工作整理成5个PR。

| PR | 内容 |
| --- | --- |
| A1 | 首屏动画WebP录制器 + `<HeroDemo>`组件 + `/recorder`路由 |
| A2 | 落地页重设计。6个区块（Hero/FeatureGrid/SameJsxBlock/PickerGrid/WhyKalyx/GetStarted） |
| B | 沙盒基础设施。`<StackBlitzEmbed>` + 7个`examples/*`项目 |
| C | 交互式`/playground`。picker选择器 + classNames编辑器 + locale/timezone切换 |
| D | `/docs/comparison`页面 + 内嵌SVG bundle对比图 |

这个过程中我学到一点：**localhost Lighthouse分数与真实Vercel部署环境的分数可能相差10分以上。** Issue #103中，用localhost simulate模式测得的分数看似从72 → 61，回退11分；但同一变更部署到Vercel后实测为73～74，反而提高1～2分。localhost simulate是测量环境本身制造的artifact。（定位性能回退时只依赖localhost数字，很容易做出错误决策。）

坦白说，这项“最初30秒”投资最终没有产生很大效果。在外部用户为0的情况下打磨demo和landing，近似于为不会进店的客人打扫店铺。于是之后我改变了方向：比起打磨宣传表面，把**core的准确性变成可验证的资产**，对单人维护者而言ROI更高。（具体结果会在后文“当前状态”中总结。）

---

## 技术结构概览

接下来是给想亲自构建库、或好奇内部机制的读者准备的简短导览。（如果只是为了使用，可以跳过本节。）

### Context + Dot Notation实现

每个primitive都由Root组件创建Context Provider，所有subcomponent消费同一个Context。

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

这个模式的核心，是共享同一Context的组件处在同一个`Object.assign`组合里。consumer可以自然地使用`<DatePicker.Input>`调用，tree shaker会自动移除未使用的subcomponent。

### Headless Hook

如果想完全忽略库提供的组件、构建自己的UI，可以直接使用Hook。

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

状态machine与组件使用的完全相同。上面的Hook代码和`<DatePicker>` JSX运行在同一套核心逻辑之上。（凭借这一结构，无需在两条track上维护库API。）

### SSR安全性

从一开始就强制采用能够在Next.js App Router中存活的模式。

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

positioning使用Floating UI。它是Popper.js的后继者，SSR安全且轻量，约3KB。CI每次都会通过Next.js App Router build验证是否能在没有`renderToString` error的情况下通过。

### 无障碍

WAI-ARIA roles按spec设置。

- Calendar grid → `role="grid"`，单元格 → `role="gridcell"`
- Input + Popover → `role="combobox"` + `aria-expanded`
- HourList / MinuteList → `role="listbox"`

键盘导航mapping也接近spec：Arrow keys移动单元格，PageUp/Down切换月份，Shift+PageUp/Down切换年份，Home/End移动到一周首尾，Enter选择，Escape关闭Popover。

axe自动化无障碍验证14项全部通过。ARIA标签也支持多语言定制。

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

`@kalyx/core`提供包括`ko-KR`在内的多种locale默认标签。

---

## 当前状态与承认的局限

### 卖掉体积买来正确性的三个月

本文前半部分是对1.0发布时的回顾。但在更新本文的此刻，库已经到了1.4.7，而这期间变化最大的不是功能列表，而是优先级。

转折点在1.0的第二天。上一节整理的“最初30秒”投资没有见效已经很清楚，外部用户为0的观测也一直持续着。于是我停掉了宣传，把还活着的marketing资产全部撤下：文档站的公告横幅、花了不少心思做的`/docs/comparison`竞品对比页，还有你正在读的这篇博客。**这就是本文有三个多月处于非公开状态的原因。** 它是在我决定停止宣传的那天一起撤下的，现在重新拿出来，顺手补上这期间的记录。

没有用户时，比起继续出新功能，先确认已经出的东西是否正确更重要。这个判断把工作顺序整个翻了过来。

**原本推迟到v1.2的property-based测试被提到了前面。** 它的做法是大量生成随机输入，找出不变式被打破的地方。对日期计算这种纯函数而言，它比基于示例的测试更能把护城河挖厚。而且确实抓到了一个：`startOfDayInTimezone`在DST切换日会返回早一小时的时刻。原因是实现只在“把当地午夜按UTC读出来的值”上测量一次offset，而那个点可能落到切换的另一侧。Australia/Sydney在10月1日进入夏令时，当地00:00还是AEST +10，但按UTC 00:00读取就会得到切换之后的AEDT +11。用基于示例的测试，除非有人恰好挑中这一天来写，否则这个bug会永远溜过去。

**接着我把bundle上限从17KB提到了20KB。** 明知体积是这个库标榜的卖点之一，还是这么做了。上调的理由是，全面修复时区与约束的正确性需要写进代码。负offset时区里日历单元格会整体错开一天，而约束（`disabled`）检查只存在于组件路径上，preset、键盘、hook、context变更这些路径全被漏掉了。一次跳三档的决定并不轻松。但在**“小”和“对”之间只能选一个时，作为一个库应该选后者**这一点上，我没有犹豫。

之后1.4.x的七个patch全是同一类。与其罗列release note，不如按学到了什么来整理。

| 版本 | 修了什么 | 暴露了什么 |
| --- | --- | --- |
| 1.4.1 | `displayTimezone`下日历的日历日身份、约束检查路径的全面对齐 | 正确性不是从某一个函数漏掉，而是每条路径各漏各的 |
| 1.4.2 | UTC+12到+14时区的日期保持、卡在整月全禁用时出不去的导航 | 有些缺陷只在时区符号翻转的地方才显形 |
| 1.4.3 | `selectMonth` / `selectYear`无视自己画出的禁用标记直接提交 | 画的代码和写的代码必须看同一个判定 |
| 1.4.4 | `workspace:*`被锁成精确版本，导致core的patch无法独自抵达 | 发布形态本身也会制造bug |
| 1.4.5 | 一个错误的`value`在渲染中throw，把整棵树带下去 | 来自表单字段或DB行的值不是编程错误，而是数据 |
| 1.4.6 | 拒绝不可能的日期和超出范围的时刻、具名输入的ISO提交 | 防御不能只放在一个入口，而要放在所有入口 |
| 1.4.7 | 7种hook在每次渲染都重新生成派生数据 | 只针对组件做的优化到不了hook使用者那里 |

1.4.5尤其难忘。`value`传入无法解析的字符串时，`RangeError: Invalid time value`会在渲染中被抛出，整棵React树随之卸载；在`renderToString`下面，一行坏数据就变成500响应。可是`value`大多来自表单字段或数据库行。**那不是开发者的失误，就只是数据而已。** 站在库的立场上，把它当成编程错误本身就是错的。

功能也不是没有，只不过全都在填补已有东西的空白。

- **RTL支持**（1.3.0）：所有picker Root都多了`dir` prop。按WAI-ARIA grid模式只翻转物理方向键，ArrowUp/Down和Home/End保持逻辑方向。1.0时这一项被推到“等bundle余量允许时”，上调上限后腾出了位置。
- **缺失的4种headless hook**（`useMonthPicker`、`useYearPicker`、`useWeekPicker`、`useDateTimePicker`）：为了不碰default bundle上限，只放进`@kalyx/react/headless`入口。那个入口先见底的原因就在这里。
- **TimePicker的locale与Popover**（1.4.0）：AM/PM标签改为基于`Intl`本地化（ko-KR下是上午/下午），TimePicker也可以不用内联，改用popover。
- **`@kalyx/adapter-luxon`、`@kalyx/adapter-dayjs`发布**：两个都已经上了npm，三个adapter全部通过conformance suite。

相反，从计划中**drop的内容**也原样留着。`@kalyx/adapter-temporal`决定不做成adapter。adapter接口是ISO-8601字符串in/out，无法原样承载Temporal特有的类型能力（`PlainDate`、`ZonedDateTime`）。包成adapter最终只会被压平为ISO字符串，再委托回core的Intl代码，实测正确性收益为0。这不是放弃Temporal本身，而是把它停放在core层面的需求gate上。

搁置的track，我不写成“以后再说”，而是写成**观察到什么就会改变主意**。非公历（波斯、佛历、伊斯兰、希伯来）需要GitHub issue 3件以上，或企业赞助1件。Storybook与视觉回归测试需要视觉回归发生3次以上。React Native adapter暂缓。把条件写成数字，就不用每次重复同一场争论。

### 坦诚承认的局限

最后，是写给正在考虑这个库的读者的一份坦诚disclosure。（我认为给新库套上夸张marketing，最终只会损害信任。）

- **单人维护者**: 可持续速度是每月1个minor。需求出现时会调整优先级。
- **新生库**: 用户基数小，你很可能成为某个edge case的首位发现者。不过可以说，上面那三个月把这个概率削掉了不少。1.4.x里修掉的缺陷大多不是用户报上来的，而是property测试和时区全量扫描先找到的。
- **仅支持React 19+**: 依赖19的leverage point，包括RSC、`useId`、没有`useLayoutEffect` warning、`<Input>`的form-action集成。不做18 back-port。
- **不声称“battle-tested”**: 新生库不应使用这个词。它拥有的是整个workspace超过700项测试、覆盖core纯模块的property扫描、axe全部通过、Next.js App Router CI中的SSR验证，以及adapter conformance suite。
- **还没有定下来的事**: `classNames`和`data-*`属性算不算公开API，目前没有结论。因为是Zero CSS，这两者是消费者样式的唯一接触面：如果不算公开API，minor发布就可能弄坏别人的画面；如果算公开API，改名就得等major。我判断，把“不知道”写下来更好。

如果今天就需要支撑10万用户规模的生产级稳定性，坦白说`react-datepicker`是更安全的选择。Kalyx更像是对一个更小、更headless的未来所下的**赌注**。

---

## 结语

与其说这是库的宣传文章，不如说是一篇决策回顾。记录ship了什么、拒绝了什么、哪些决策格外沉重，是我在构建下一个库（或评估其他库）时发现的最宝贵资产。

走到1.0之前的四个决策，全部关于**API的形态**：Composition over Props、强制ISO字符串、adapter模式、bundle上限。它们都牺牲了一部分短期便利，换取长期的适应能力。

但重新把这篇文章拿出来更新时我才发现，真正最难的决策发生在1.0之后。**那是打破自己标榜的卖点的决策。** 17KB上限不只是一个数字，它是说明这个库是什么的那句话的一部分。把它提到20KB，就是在削弱那句话。即便如此还是上调了，理由只有一个：在负offset时区里日历整体错开一天的库，无论大小都没法用。

回头看，让这个判断成为可能的，正是用户为0这个事实本身。如果有用户，我会先处理眼前的需求，不会花三个月去用property测试找一个没人报告过的DST bug。**没有用户，反而是一种可以掉头的自由。** 1.0刚结束时我只把它看成失败的信号，现在读起来有点不一样了。

如果你也曾在React项目中因DatePicker撞上类似的墙，欢迎看看Kalyx。如果你曾用更好的方式解决同一问题，也非常感谢你随时在GitHub Issue中分享。归根结底，库并非由一个作者完成，而是由共同使用它的人一起打磨出来的。

安装只需一行。

```bash
pnpm add @kalyx/react
```

你可以在文档站的[Playground](https://kalyx-docs-site.vercel.app/playground)中立即上手试用7个picker，还可以切换locale与timezone，直接编辑classNames，应用自己的design token。

:::ref

[repo] [jiji-hoon96/kalyx](https://github.com/jiji-hoon96/kalyx)

[docs] [Kalyx官方文档站](https://kalyx-docs-site.vercel.app/)


[docs] [Ark UI DatePicker文档](https://ark-ui.com/docs/components/date-picker)

[docs] [Radix UI Composition模式](https://www.radix-ui.com/primitives/docs/overview/introduction)

[docs] [React Aria headless组件指南](https://react-spectrum.adobe.com/react-aria/)

[docs] [Floating UI官方文档](https://floating-ui.com/)

:::
