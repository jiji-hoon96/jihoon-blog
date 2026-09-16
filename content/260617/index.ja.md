---
emoji: 📅
title: 'Kalyx'
seoTitle: 'Kalyx：React 19 headless DatePickerを1年作った振り返り'
date: '2026-06-17'
updatedAt: '2026-09-16'
categories: ライブラリ React DatePicker オープンソース
description: 'React DatePickerを選ぶたび、headless、bundleサイズ、7つのprimitiveのどれかを諦めていた。だから自作した。4つの設計判断と、セリングポイントだったbundle上限を正確性と引き換えたその後の記録。'
keywords: 'Kalyx, React DatePicker, headless DatePicker, react-day-picker, react-datepicker, headless ライブラリ, bundleサイズ 削減, ISO-8601 timezone, Composition pattern, adapter pattern, Ark UI, MUI X DatePicker, IANA displayTimezone, DST バグ, fast-check プロパティテスト, React 日付 タイムゾーン'
locale: ja
translationOf: '260617'
sourceHash: b7e7be3efa404583193adba50f933c85c2d044497af8da1f75cbaa9c00bab69c
---

今回は、私が自ら作ったReact headless DatePickerライブラリ、**Kalyx**について書こうと思う。

フロントエンド開発者として、私はSaaSのフォームを扱うプロジェクトをよく担当する。すると、ほぼすべてのページで日付入力が必要になる。単一の日付、期間、時刻、月・年単位の移動、さらにtimezoneまで。しかしこの1年間、新しいプロジェクトを始めるたびに同じ壁にぶつかった。（正直なところ、1つのライブラリだけできれいに解決できたケースは一度もなかった。）

3度目となる`react-day-picker`の上に、自作のTimePickerとどこかから借りたPopoverをつなぎ合わせていたある日、本当に欲しかったAPIの形をノートに書き始めた。そのノートが、最終的にKalyx 1.0の公開APIになった。

この記事は、作り手の立場からまとめた意思決定の記録だ。前半は1.0までに下した4つの判断で、後半はその後の3か月の記録だ。私がこの記事で最も伝えたいのは後半のほうだ。**1.0以降に下した最大の判断は新機能ではなく、セリングポイントとして掲げていたbundle上限を自ら破り、正確性を買ったことだった。** 現在のバージョンは1.4.7で、その間の7回のパッチはすべて同じ種類のバグを直すことに費やされた。

---

## React DatePickerはなぜ難しいのか

まず、市場の状況を簡単に確認しておく必要がある。私がぶつかった壁はライブラリ選びの問題ではなく、**トレードオフそのものの問題**だったと分かるからだ。

2026年6月時点で、Reactエコシステムでよく使われるDatePicker候補を表にまとめた。（npmのダウンロード数は2026年6月時点の週間値。）

| ライブラリ | 週間ダウンロード | 得意なこと | 強いるもの |
| --- | --- | --- | --- |
| **react-day-picker** | 約42M | すっきりしたheadless Calendar | Calendar gridのみ。v10でもInput、TimePickerは公式未対応 |
| **react-datepicker** | 約4.7M | すべてのprimitiveを1つのbundleで提供 | CSS import必須。valueはnative `Date`。propsは100個以上 |
| **Ark UI** | シェア拡大中 | Composition + headless | standalone TimePickerなし。時刻はDatePicker内のみ |
| **MUI X** | 高いシェア | 統合 + エンタープライズ | 約58KB gzip。RangePickerはPro有料ライセンス |
| **React Aria** | 約5.9M | specレベルのアクセシビリティ | `@internationalized/date`を強制。date-fnsコードベースと非互換 |
| **Headless UI** | Tailwindと共に利用 | headlessパターンの先駆者 | 「保守コストが高すぎる」として実装を見送り |

機能を1つずつ切り離せば、勝者は簡単に選べる。しかし現実の作業単位は1機能ではない。1つのSaaSフォームで、単一日付入力、範囲フィルター、時刻選択、月・年の移動が同時に必要な場合、**すべてを満たすライブラリは1つもなかった**。

特に興味深いのはHeadless UIメンテナーの姿勢だ。Tailwind Labsは[GitHub Discussion #289](https://github.com/tailwindlabs/headlessui/discussions/289)で、DatePickerの要望を事実上保留し続けている。2021年に開かれたこのスレッドは5年後の今もメンテナーの回答がないまま開いており、`@headlessui-react`のソースツリーに日付関連コンポーネントは1つもない。Tailwindユーザーは最終的にReact Ariaへ案内される。locale、timezone、DST、複数のカレンダー体系、アクセシビリティ、キーボードナビゲーションがすべて同時に衝突する領域がDatePickerだと考えれば、その保留は十分に理解できる診断だ。（私も自分で作って初めて、その負担の大きさを実感した。）

Ark UIの事例も同じシグナルを送っている。Chakra UIチームが作ったArk UIには、**standalone TimePickerコンポーネントがない**。時刻選択は`@internationalized/date`の`CalendarDateTime`を通してDatePicker内部でのみ扱われる。つまり、Tailwindユーザーが「時刻だけ」を組み合わせて使える独立primitiveではない。（最初は「ArkがTimePickerを捨てた」と乱暴に理解していたが、ドキュメントを読み直すと、正確には「最初から独立コンポーネントとして分離しなかった」だった。headlessライブラリの第一級チームでさえ、TimePickerを別primitiveとして切り出すことには慎重だったという点が重要だ。）

ここまで来ると、自然に1つの疑問が浮かぶ。「では、このトレードオフを1つのライブラリの中で解く方法は本当にないのだろうか？」

---

## Kalyxの立ち位置

Kalyxは、その問いに対する私なりの答えだ。一言で定義すれば、**「CSS importなしでインストール直後から動き、どんなスタイリング方法でも自由にカスタマイズできるReact headless DatePicker」**である。

1.0でshipしたものをまとめると、次のようになる。（括弧内は、この記事を更新している1.4.7時点の値だ）

- **7つのprimitiveコンポーネント**: `DatePicker`, `RangePicker`, `TimePicker`, `DateTimePicker`, `MonthPicker`, `YearPicker`, `WeekPicker`
- **3つのHeadless Hook**: `useDatePicker`, `useRangePicker`, `useTimePicker`（ライブラリ提供のUIをすべて捨て、自分のUIを作りたいときの入口。残りの4つはその後`@kalyx/react/headless` entryで埋まり、今は7つすべて揃っている）
- **単一のComposition API**: 7つのprimitiveすべてで同じContextとdot notationパターンを使用
- **約16KB gzip (ESM)**: 17KBの上限内で完成（今は約19.5KB、上限は20KBだ。なぜ上げたのかがこの記事の後半の主題だ）
- **CSS import 0個**: Tailwind、CSS Modules、vanilla CSSなど自由

APIは次のような形だ。

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

同じパターンが7つのprimitiveすべてで繰り返される。`showTimeSelect`や`showMonthDropdown`のようなboolean爆弾propsは1つもない。

位置づけを1枚の図で表すと、こうなる。

![Kalyxが既存ライブラリのどの部分を組み合わせたかを示すポジショニング図](1.png?w=620)

既存ライブラリの良い部分を集めた集合に、もう1つを加えた形だ。**Ark UIにstandaloneで存在しないTimePickerまで、同じCompositionの中へ独立primitiveとして統合するという判断。**

---

## 4つの中核的な判断

設計段階で下した判断のうち、最も重く、取り消しにくい4つをまとめておく。1.0 APIがfreezeされた今から見れば、この4つが他のほぼすべての判断を強制したと言ってよい。

### Composition over Props

最初の設計案は`<DatePicker showTime showMonthGrid presets={[...]} renderHeader={(props) => ...} />`という形だった。実質的に`react-datepicker`の基本パターンだ。1週間、props同士の相互作用を型できれいに表現しようとした末、すべて削除した。

理由は明確だった。**Props爆発の本当のコストはtype safetyの喪失だ。** `showTimeSelect`が`true`のときだけ`timeFormat`に意味があるが、型システムはこの条件付き依存をそのまま表現できない。discriminated unionで解こうとするとpropsインターフェースが50個単位で爆発し、propを1つ追加するたびに全組み合わせを再検証しなければならない。（これは以前まとめた[抽象化](/260201)の記事にある「誤った抽象化は結合度を高める」という視点とまったく同じ文脈だ。）

この問題を最も美しく解いた例が、Radix UIとshadcn/uiのdot notationパターンだ。制約をcallsiteに明示する。

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

コストは明白だ。1行の`<DatePicker>`が6行のJSXブロックになる。その代わり、得られるものも明確だ。

- 1年後に読み返しても理解できる明瞭さ
- propの組み合わせ同士でleakしない型
- 各subcomponentが独自の`classNames` slot mapを持つ、無限に拡張可能なスタイリング面

実装は`Object.assign`パターンで単純にまとめる。

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

tree shakingに適しており、コンポーネントごとの`index.ts` 1か所だけで束ねるため、namespacingの衝突もない。（Radix UIを初めて見たときは「なぜこれが標準と呼ばれるのか」が腑に落ちなかった。自分でライブラリを作って初めて、このパターンがなぜ急速に業界標準になったのか理解できた。）

### ISO-8601文字列 in/out

Kalyxの`value`は`string | null`だ。ISO-8601 UTC形式の文字列で、`onChange`も同じ形式の文字列を返す。公開APIのどこにもnative `Date`オブジェクトは登場しない。

「当然」の代案は`Date`オブジェクトだ。そしてそれこそが、native Dateを使うあらゆるDatePickerで何年も閉じられずにいたissueの根源である。timezone offsetがずれ、`JSON.stringify`のround-tripが壊れ、SSRでサーバーとクライアントが異なる値を作る。`react-datepicker`の代表的なtimezone issue [#1018](https://github.com/Hacker0x01/react-datepicker/issues/1018)は2017年に開かれ、8年続いた末、2025年に「バグではなくJavaScript `Date`の想定された動作」という結論で閉じた。ソース変更はなく、ドキュメントを追加して終わった。ライブラリがnative `Date`をvalue型にする限り、この種の摩擦は構造的に消えない。

ISO-8601文字列を強制すると、3つの保証が得られる。

- **wire-safe**: `JSON.stringify`後に取得し直しても、byte-for-byteで同じ文字列
- **SSR安全**: サーバーとクライアントが同じ文字列でhydrate
- **timezoneの明示を強制**: `displayTimezone="Asia/Seoul"`のように、consumerが表示する時間帯を宣言する

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

同じISO値を別のtimezoneで表示するシナリオも自然に表現できる。

```tsx
const iso = "2026-01-15T15:00:00.000Z";

<DatePicker value={iso} displayTimezone="Asia/Seoul" />       // 2026-01-16 00:00
<DatePicker value={iso} displayTimezone="America/New_York" /> // 2026-01-15 10:00
```

もちろんコストはある。`Date`オブジェクトを必要とするdownstreamコードでは、`new Date(iso)`を自分で呼ぶ必要がある。ただし、そのboundaryをライブラリ全体に`Date`オブジェクトとして流すより、consumerコードの1か所に集めるほうがはるかに良いと判断した。（一度オブジェクトで受け取ると、どこまで流れたか追跡できなくなる。これは複数のプロジェクトで学んだ教訓だ。）

DSTのような境界は、`@kalyx/core`のIntlベースのtimezoneユーティリティが処理する。adapterインターフェースではなく、core内の`civilMidnightFromUtcDay`、`setTimeInTimezone`、`startOfDayInTimezone`といった関数に集約され、すべて`Intl.DateTimeFormat`を基盤に動く。そのtimezoneの真夜中（civil midnight）をUTCへ変換するときDST境界を正確に計算し、ユーザーがIANA timezone文字列を渡せば、残りはライブラリが責任を持つ。（timezoneロジックがadapterではなくcoreに埋め込まれている点が重要だ。date-fnsでもdayjsでも、timezoneの正確性は同じcoreコードが保証する。）

### adapterパターン

`@kalyx/core`にはdate-fns依存が0個だ。同じ`DateAdapter`インターフェース（21メソッド）を実装する`@kalyx/adapter-date-fns`を別パッケージに分離し、`@kalyx/react`がContext経由でadapterを注入される。興味深いのは、adapter自体は約200行の薄いshimだという点だ。21メソッドのうちtimezoneを引数に取るのは4つ（`format`、`isSameDay`、`startOfDay`、`today`）だけで、その4つさえ実際のtimezone計算はすべてcoreのIntlユーティリティへ委譲する。adapterの役割は日付演算とparseを特定ライブラリの文法へ対応づけることであり、正確性を担うことではない。

パッケージ分離の結果は次のとおりだ。

```
@kalyx/core               # 플랫폼 독립 로직 + Intl 기반 timezone, date-lib 의존 0
@kalyx/adapter-date-fns   # default adapter (별도 패키지)
@kalyx/react              # 컴포넌트 (default로 adapter-date-fns 자동 wire)
@kalyx/react/headless     # zero date-lib entry, 자기 adapter 들고 옴
```

設計段階で検討した選択肢は3つだった。

| 選択肢 | 長所 | 短所 |
| --- | --- | --- |
| A. coreにdate-fnsを組み込む | 実装が簡単、初心者のonboardingも容易 | major bumpなしでは交換不能 |
| B. coreを完全BYOにする | 将来に適応可能 | 初心者が毎回adapterを自分で構成 |
| C. Hybrid (default + 交換可能) | 初心者の利便性 + 本格利用者のescape | 2パッケージ + 2 entryの管理 |

Cを選んだ。0.xの頃は実際Aから始めたが、v1 stableでAPIをfreezeする直前に気づいた。**一度組み込んだdateライブラリはmajor bumpなしでは外せない。** その時点でadapterを抽出したことが、1.0卒業前の最大の決断だった。

その後shipしたadapterも同じ21メソッドの契約に従う。異なるのは実装だけだ。3つのadapterはすべて`@kalyx/core/test-helpers`の`runAdapterConformanceTests`をそれぞれのテストで走らせ、同じ答えを返すか検証している。

- `@kalyx/adapter-dayjs`: 統計上Reactユーザーの約半数がdayjsを使っているため優先度1だった（Mantineはdayjsを強制peerにしているほどだ）
- `@kalyx/adapter-luxon`: エンタープライズと高度なtimezoneケース向け
- Temporal: TC39 Temporal API対応はadapterではなくcoreレベルで解くべきだと、抽出後に結論づけた。adapterインターフェースがISO文字列in/outであるため、Temporal固有の力をそのまま運べないからだ。（この判断は後の「現在の状態」で再び扱う。）

### bundle上限

1.0リリース時のbundleは、ESM約15.8KB / CJS約15.9KB gzipだった。上限は当初16KBに設定し、v1.1で17KBへ1段階上げた。CIがこの上限を強制する。すべてのPRで`pnpm check-bundle`を実行し、上限を超えるPRはbuildがfailする。

この数値は恣意的ではない。市場の基準線を意識して決めた。

- `react-day-picker`: Calendar 1つだけで約22KB
- `react-datepicker`: 全primitiveで約40～60KB
- `MUI X`: 約58KB（しかもRangeはPro有料）
- `Kalyx`: 7つのprimitiveが`react-day-picker`のCalendar 1つより小さい

この最後の行が1.0時点の自慢だった。今も真ではあるが、余裕はずっと減った。約19.5KB対約22KBなので、差は2.5KBだ。

bundleの変遷もRC段階ごとに追跡した。

| 段階 | 変更 | 上限 |
| --- | --- | --- |
| rc.0 | 7 primitive初期完成 | 12 → 13KB |
| rc.3 | gridキーボードナビゲーション (Arrow/Page/Home/End) | 13 → 14KB |
| rc.4 | MonthPicker/YearPicker disabled month/year prop | 14 → 15KB |
| rc.8 | TimePicker `filterTime`プログラムcallback | 15 → 16KB |
| 1.0.0 | 最終安定化 (2026-06-08) | ESM 15.8KB / CJS 15.9KB |
| 1.1 | a11y `announce()` live region parity | 16 → 17KB |
| 2026-08 | timezoneと制約の正確性の全面修正 | 17 → 20KB |
| 2026-08 | `/headless` entryだけを分離 | 20 → 22KB |

上げるたびに「なぜ増やしたか」を明記する。1KBずつ曖昧に漏れるのではなく、意図した判断にするためだ。そして拒否した機能も明確に残した。表の上から6行までが1.0時点の記録で、当時は1段ずつ上げる判断しかなかった。表の最後の2行はこの記事を更新しながら加わった行だが、性格が違う。1段ではなく3段を一度に上げた。**その判断がこの記事の後半の主題だ。**

上限を動かす作業は、わざと面倒にしてある。1か所だけ変えればひそかに引き上げられてしまうため、今は`scripts/bundle-policy.js`の2つの定数が単一の出典で、毎PRの必須チェックがそれを強制する。最後の行の分離が生まれた理由も、そこで見えてきた。2つのentryはもともと同じ上限を共有していたが、`/headless`はdefault entryと同じ7種のコンポーネントに加えて、7種のhookすべてと`DateTimePicker.Presets`まで載せる。**コードを多く載せるほうの余裕がより少なくなる逆転が起きていた。** 実測時点でdefault entryには1.4KBが残っていたのに、headlessは200byte未満まで痩せており、default entryと無関係な変更までheadlessがすべてブロックしていた。そこでheadlessの上限だけを上げて分離し、default entryの20KBには手を付けなかった。その数値はREADMEのバッジとして出ているので、上げれば約束を変えることになるからだ。

以上が、ライブラリコードそのものに埋め込まれた4つの判断だ。では実際のbuild過程では何が起きたのか。

---

## 1.0のbuild過程

### 0.xから1.0まで14段階のRC

7つのprimitiveをすべて備えたrc.0を2026年5月27日にtagした。そこから14回のRC iterationを経て、6月8日に1.0.0 stableへ卒業した。約12日だ。（私はこの速度が正しかったとは思わない。ゆっくり、一度に1つずつ磨くのが定石だが、1人メンテナーの限界上、一度buildモードに入ったら素早く終える必要があった。）

途中で行った主な作業は次のとおりだ。

- **セキュリティfix**: GHSA-5xrq-8626-4rwp Critical脆弱性（vitest 4 upgrade）
- **adapter中立の抽出**: `@kalyx/core`のdate-fns依存を0へ分離
- **`@kalyx/adapter-date-fns`を別パッケージ化**
- **`@kalyx/react/headless` entryを追加**: zero date-libユーザー向け

テスト基準も1.0卒業条件にした。unit test 497/497、axeアクセシビリティ14/14、e2eシナリオ31件。

### Auroraの視覚統合

1.0リリース直後に受け取った最も印象的なフィードバックは、ユーザーから直接届いた一言だった。**「クソ不細工で、汚くて、醜い」**。HeroDemoのスクリーンショット3枚が添付されていた。（ライブラリコードがどれほど良くても、demoが悪ければクリックは0だと、そのとき実感した。）

症状は明確だった。Calendar gridに罫線が漏れ、MonthPickerのセルが横に伸び、DateTimePickerは窮屈だった。診断すると、2つのCSSシステムが分裂した結果だった。`.kx-live-*`とHeroDemo内の`:global([role='grid'])`が別々に発展し、一方のfixが他方へ届いていなかった。

解決策は再設計ではなく、**統合して一度polishすること**だった。7回の視覚iteration（v1 → v7）の末、Aurora tokenシステムを確定した。single source of truthは`apps/docs-site/src/css/custom.css`の1ファイル。すべてのpickerが同じtokenを共有するよう強制した。

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

この過程で固定して残した3つの罠を共有する。headlessコンポーネントを別環境、特にDocusaurusのようなドキュメントサイトへ埋め込むと、まったく同じ問題に遭遇する可能性が高い。

第一に、**Docusaurus Infimaの`table th, td`ルールはすべての`<table>`へ侵入する**。そのためCalendar gridに罫線が漏れる。CSS Modulesで隔離するか、明示的なresetを置く必要がある。

第二に、**`<table role="grid">`には`display: grid`を使えない。** `<thead>/<tbody>/<tr>`がgrid itemになり、肝心の7 columnが`<td>`まで届かない。最終的には`display: table` + `table-layout: fixed` + 明示的なwidthの組み合わせで解く。

第三に、**Rangeの視覚化には非対称の角丸処理が必要だ**。startは左だけ、endは右だけ、middleは角丸なし。統一するとセルが「ばらばらに浮いている」ように見え、直感的な視覚グルーピングが壊れる。

### ユーザー0人のとき、どこに時間を使ったか

1.0リリース第1週のデータは、正直に公開しておきたい。

- GitHub stars 5、forks 0、watchers 0
- npm週間ダウンロード480回（大半はCI mirror botと推定）
- 直接依存するパッケージ0

3か月が過ぎた今、starsは7だ。数値は実質的に動いておらず、その事実が後で扱う方向転換の出発点になる。

時間の使い道は2つに分かれた。(a)新機能を強化する、(b)React Native adapterのような新trackへ広げる。しかしどちらもROIが低かった。外部ユーザーが0なので新機能は検証できず、新trackもユーザーが生まれてから入るほうが効果的だ。

そこで**最初の30秒の印象**に時間を使うことにした。ユーザーがGitHubリポジトリやdocsサイトを初めて訪れ、30秒以内に「このライブラリは試す価値がある」と判断する区間だ。5つのPRにまとめた。

| PR | 内容 |
| --- | --- |
| A1 | ヒーロー用アニメーションWebP録画ツール + `<HeroDemo>`コンポーネント + `/recorder`ルート |
| A2 | ランディングページ再設計。6セクション（Hero/FeatureGrid/SameJsxBlock/PickerGrid/WhyKalyx/GetStarted） |
| B | サンドボックス基盤。`<StackBlitzEmbed>` + 7つの`examples/*`プロジェクト |
| C | インタラクティブな`/playground`。picker選択 + classNames編集 + locale/timezone切り替え |
| D | `/docs/comparison`ページ + インラインSVGのbundle比較チャート |

この過程で1つ学んだ。**localhostのLighthouseスコアと実際のVercelデプロイ環境のスコアは、10点以上違うことがある。** Issue #103ではlocalhost simulateモードのスコアが72 → 61へ11点低下したように見えたが、同じ変更をVercelにデプロイして実測すると73～74で、むしろ1～2点上がっていた。localhost simulateは測定環境自体が生んだartifactだった。（性能回帰を探すときlocalhostの数値だけに依存すると、誤った判断をしやすいと学んだ。）

正直、この「最初の30秒」への投資は結果として大きな効果がなかった。外部ユーザーが0の状態でdemoやlandingを磨くのは、来ない客のために店を掃除するようなものだった。そこで以後は方向を変えた。宣伝面を磨くより、**coreの正確性を検証可能な資産にすること**のほうが1人メンテナーにはROIが高いと判断した。（具体的な結果は後の「現在の状態」でまとめる。）

---

## 技術構造を見てみる

ここからは、自分でライブラリを作る人や内部の仕組みに興味がある人向けの短いtourだ。（利用だけが目的なら、このsectionは飛ばしてよい。）

### Context + Dot Notationの実装

各primitiveではRootコンポーネントがContext Providerを作り、すべてのsubcomponentが同じContextをconsumeする。

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

このパターンの核心は、同じContextを共有するコンポーネントが1つの`Object.assign`グループ内に入る点だ。consumerは`<DatePicker.Input>`のように自然に呼び出し、tree shakerは使わないsubcomponentを自動で除去する。

### Headless Hook

ライブラリ提供のコンポーネントをすべて無視し、完全に独自のUIを作りたいなら、Hookを直接使う。

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

状態machineはコンポーネントが使うものとまったく同じだ。上のHookコードと`<DatePicker>` JSXは、同じ中核ロジック上で動く。（この構造のおかげでライブラリAPIを2つのtrackで維持する必要がない。）

### SSR安全性

Next.js App Routerで生き残るパターンを最初から強制した。

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

positioningにはFloating UIを使う。Popper.jsの後継で、SSR安全かつ約3KBの軽量ライブラリだ。CIではNext.js App Router buildで`renderToString` errorなしに通るかを毎回検証する。

### アクセシビリティ

WAI-ARIA rolesはspecどおりに設定している。

- Calendar grid → `role="grid"`、セル → `role="gridcell"`
- Input + Popover → `role="combobox"` + `aria-expanded`
- HourList / MinuteList → `role="listbox"`

キーボードナビゲーションのmappingもspecに近い。Arrow keysでセル移動、PageUp/Downで月移動、Shift+PageUp/Downで年移動、Home/Endで週の先頭と末尾、Enterで選択、EscapeでPopoverを閉じる。

axeによる自動アクセシビリティ検証14件はすべて通過。ARIAラベルも多言語でカスタマイズできる。

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

`@kalyx/core`は`ko-KR`を含む複数localeのdefaultラベルを提供する。

---

## 現在の状態と認める限界

### サイズを売って正確性を買った3か月

この記事の前半は1.0リリース時点の振り返りだ。しかし記事を更新している今、ライブラリは1.4.7になっており、その間に最も大きく変わったのは機能一覧ではなく優先順位だった。

転換点は1.0の翌日だった。前の節でまとめた「最初の30秒」への投資が効果を出せなかったことがはっきりし、外部ユーザーが0だという観測がそのまま続いた。そこで宣伝をやめた。生きていたマーケティング資産をすべて下ろした。ドキュメントサイトの告知バナー、手をかけて作った`/docs/comparison`の競合比較ページ、そして今読んでいるこのブログ記事まで。**この記事が3か月以上も非公開だった理由がそれだ。** 宣伝を止めると決めた日に一緒に下ろし、今また取り出しながら、その間の記録を足している。

ユーザーがいないなら、機能をさらに出すことより、すでに出したものが正しく動くかが先だ。その判断が作業の順序をひっくり返した。

**v1.2へ先送りしていたpropertyベースのテストを前倒しした。** ランダムな入力を大量に生成し、不変条件が壊れる地点を探す方式だ。日付計算のような純粋関数では、例ベースのテストよりこちらのほうが堀を厚くする。そして実際に1つ捕まえた。`startOfDayInTimezone`がDST切り替え日に1時間早い時刻を返していた。原因は「現地の真夜中をUTCとして読んだ値」からオフセットを一度だけ測る実装で、その地点が切り替えの反対側へ落ちることがある。Australia/Sydneyが10月1日に夏時間へ入るとき、現地の00:00はまだAEST +10だが、UTC 00:00として読むと切り替え後のAEDT +11になる。例ベースのテストでは、この1日を名指しで書かない限り永遠に見逃していたバグだ。

**そしてbundle上限を17KBから20KBへ上げた。** サイズはこのライブラリが掲げていたセリングポイントの1つだったにもかかわらず、そうした。上げた理由は、timezoneと制約の正確性を全面的に直すのにコードが必要だったからだ。負のオフセットのゾーンでカレンダーのセルが1日ずれて配置される問題があり、制約（`disabled`）の検査がコンポーネントの経路にしかなく、プリセット、キーボード、hook、context変更の経路には抜けていた。3段を一度に上げる判断は気楽ではなかった。ただ、**「小さい」と「正しい」のどちらかを選ぶなら後者を選ぶのがライブラリとして正しい**という点に迷いはなかった。

以降の1.4.xのパッチ7つは、すべて同じ系列だ。リリースノートを並べる代わりに、何を学んだかで整理する。

| バージョン | 直したもの | 見えたこと |
| --- | --- | --- |
| 1.4.1 | `displayTimezone`におけるカレンダーの暦日の同一性と、制約検査の経路全体の整合 | 正確性は1つの関数ではなく、経路ごとに別々に漏れていた |
| 1.4.2 | UTC+12から+14ゾーンでの日付の保存、すべて無効な月に閉じ込められるナビゲーション | ゾーンの符号が変わる場所でだけ現れる欠陥がある |
| 1.4.3 | `selectMonth` / `selectYear` が自分で描いた無効表示を無視してcommitしていた問題 | 描くコードと書くコードは同じ判定を見なければならない |
| 1.4.4 | `workspace:*` が正確なバージョンへ固定され、coreのパッチが単独で届かなかった問題 | 配布の形そのものがバグを生むことがある |
| 1.4.5 | 不正な`value` 1つがレンダー中にthrowしてツリー全体を落としていた問題 | フォーム項目やDBの行から来る値はプログラミングエラーではなくデータだ |
| 1.4.6 | ありえない日付と範囲外の時刻の拒否、名前付き入力のISO送信 | 防御は入口1か所ではなく、すべての入口に置く必要がある |
| 1.4.7 | hook 7種が派生データを毎レンダー作り直していた問題 | コンポーネントにだけ合わせた最適化はhook利用者に届かない |

1.4.5が特に記憶に残っている。`value`にparseできない文字列が入ると、レンダー中に`RangeError: Invalid time value`が投げられてReactツリー全体がunmountされ、`renderToString`の下では不正な1行が500応答になった。ところが`value`は多くの場合、フォーム項目やデータベースの行から来る。**開発者のミスではなく、ただのデータなのだ。** ライブラリの側がそれをプログラミングエラーとして扱ったのが間違いだった。

機能がなかったわけでもない。ただ、どれもすでにあるものの空白を埋めるほうだ。

- **RTL対応**（1.3.0）: すべてのpicker Rootに`dir` propが加わった。WAI-ARIA gridパターンどおり、物理方向キーだけを反転し、ArrowUp/DownとHome/Endは論理方向を保つ。1.0時点では「bundleの余白が許すとき」へ先送りしていた項目だが、上限を上げたことで場所ができた。
- **不足していたheadless hook 4種**（`useMonthPicker`, `useYearPicker`, `useWeekPicker`, `useDateTimePicker`）: default bundleの上限に触れないよう、`@kalyx/react/headless` entry専用で入れた。そのentryが先に痩せ細った理由がこれだ。
- **TimePickerのlocaleとPopover**（1.4.0）: AM/PMラベルが`Intl`ベースでローカライズされ（ko-KRなら午前・午後）、TimePickerもinlineではなくpopoverとして使えるようになった。
- **`@kalyx/adapter-luxon`、`@kalyx/adapter-dayjs`の公開**: どちらもnpmに上がっており、3つのadapterすべてがconformance suiteを通過する。

反対に、計画から**dropしたもの**もそのまま残す。`@kalyx/adapter-temporal`はadapterとして作らないことにした。adapterインターフェースがISO-8601文字列in/outなので、Temporal固有の型の力（`PlainDate`、`ZonedDateTime`）をそのまま運べない。adapterで包んでも結局ISO文字列へ平坦化され、coreのIntlコードへ再委譲されるだけで、正確性の利得は0と実測された。Temporal自体を捨てたわけではなく、coreレベルの需要ゲートとしてparkingした。

保留したtrackは「いつか」ではなく、**何が観測されたら考えを変えるか**で書いてある。非グレゴリオ暦（ペルシャ、仏教、イスラム、ヘブライ）はGitHub issue 3件以上、またはエンタープライズ後援1件。Storybookとvisual regression testは、visual regressionが3件以上発生したとき。React Native adapterは保留。条件を数値で書いておけば、同じ議論を毎回やり直さずに済む。

### 率直に認める限界

最後に、ライブラリを検討中の方への率直なdisclosureだ。（新しいライブラリへの過剰なmarketingは、結局信頼を削ると考えている。）

- **1人メンテナー**: 月1 minorが可能なペース。要望に応じて優先順位は変わる。
- **新生ライブラリ**: ユーザーベースが小さいため、edge caseの最初の発見者になる可能性は低くない。ただ、上の3か月がその確率をかなり削ったとは言える。1.4.xで直した欠陥の大半は、ユーザーではなくpropertyテストとtimezoneの全数スイープが先に見つけたものだ。
- **React 19+専用**: RSC、`useId`、`useLayoutEffect` warningなし、`<Input>`のform-action統合といった19のleverage pointに依存する。18へのback-portはしない。
- **「battle-tested」とは主張しない**: 新生ライブラリにその言葉は使わない。代わりに、workspace全体で700件を超えるテスト、coreの純粋moduleを覆うpropertyスイープ、axe全件通過、Next.js App Router CIでのSSR検証、そしてadapter conformance suiteがある。
- **まだ確定できていないこと**: `classNames`と`data-*`属性を公開APIと見なすかが決まっていない。Zero CSSなので、この2つが利用者スタイルの唯一の接点だが、公開APIでないならminorリリースで他人の画面が壊れうるし、公開APIなら名前の変更がmajorを待たねばならない。分からないと書いておくほうがよいと判断した。

今日、10万人規模のユーザーに耐えるdeployment-gradeの安定性が必要なら、正直`react-datepicker`が安全な選択だ。Kalyxは、より小さく、よりheadlessな未来に賭ける**bet**に近い。

---

## おわりに

この記事はライブラリの宣伝というより、意思決定を振り返る記事に近い。何をshipし、何を拒否し、どの判断が重かったかを記録しておくことが、次のライブラリを作るとき（あるいは別のライブラリを評価するとき）最大の資産になる、というのが私の経験だ。

1.0までの4つの判断は、すべて**APIの形**に関するものだった。Composition over Props、ISO文字列の強制、adapterパターン、bundle上限。短期的な利便性の一部を手放し、長期的な適応力を買った判断だ。

ところが、この記事を取り出して更新しながら分かったのは、いちばん難しい判断はむしろ1.0以降にあったということだ。**自ら掲げたセリングポイントを壊す判断である。** 17KBの上限は単なる数値ではなく、このライブラリが何であるかを説明する文章の一部だった。それを20KBへ上げることは、その文章を弱めることだった。それでも上げた理由は1つだ。負のオフセットのゾーンでカレンダーが1日ずつずれているライブラリは、小さかろうが大きかろうが使えない。

振り返れば、この判断を可能にしたのは、ユーザーが0人だという事実そのものだった。ユーザーがいれば目の前の要望を先に片づけていただろうし、誰も報告していないDSTのバグを探すためにpropertyテストへ3か月を使うこともなかっただろう。**ユーザーがいないことが、方向を反転できる自由だった。** 1.0の直後にはそれが失敗の合図にしか見えなかったが、今は少し違って読める。

ReactプロジェクトでDatePickerに同じような壁を感じたことがあるなら、Kalyxを一度見ていただけるとうれしい。そして同じ問題をもっと良い方法で解いた経験があれば、気軽にGitHub Issueへ寄せてほしい。結局ライブラリは、作った1人ではなく、一緒に使う人たちが共に磨いていくものだと思う。

インストールは1行だ。

```bash
pnpm add @kalyx/react
```

ドキュメントサイトの[Playground](https://kalyx-docs-site.vercel.app/playground)では、7つのpickerをすぐに触って試せる。localeとtimezoneを切り替え、classNamesを直接編集して、自分のdesign tokenを適用することもできる。

:::ref

[repo] [jiji-hoon96/kalyx](https://github.com/jiji-hoon96/kalyx)

[docs] [Kalyx公式ドキュメントサイト](https://kalyx-docs-site.vercel.app/)


[docs] [Ark UI DatePickerドキュメント](https://ark-ui.com/docs/components/date-picker)

[docs] [Radix UI Compositionパターン](https://www.radix-ui.com/primitives/docs/overview/introduction)

[docs] [React Aria headlessコンポーネントガイド](https://react-spectrum.adobe.com/react-aria/)

[docs] [Floating UI公式ドキュメント](https://floating-ui.com/)

:::
