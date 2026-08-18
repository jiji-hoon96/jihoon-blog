---
emoji: 📅
title: 'Kalyx'
seoTitle: 'Kalyx：React 19 headless DatePickerを作った4つの設計判断'
date: '2026-06-17'
categories: ignore ライブラリ React DatePicker オープンソース
description: '既存DatePickerのトレードオフを解くため、7つの部品、約16KB gzip、ISO文字列API、アダプターを採用したKalyxの4つの設計判断を振り返る。'
keywords: 'Kalyx, React DatePicker, headless DatePicker, react-day-picker, react-datepicker, headlessライブラリ, bundleサイズ, ISO-8601 timezone, Composition pattern, adapter pattern, Radix dot notation, Ark UI, MUI X DatePicker'
locale: ja
translationOf: '260617'
sourceHash: 7ced7d6aab4ab2812c3b1665328a8e5693781ef894c6a997732d5ef3d273e831
---

今回は、私が自ら作り、最近1.0としてリリースしたReact headless DatePickerライブラリ、**Kalyx**について書こうと思う。

フロントエンド開発者として、私はSaaSのフォームを扱うプロジェクトをよく担当する。すると、ほぼすべてのページで日付入力が必要になる。単一の日付、期間、時刻、月・年単位の移動、さらにtimezoneまで。しかしこの1年間、新しいプロジェクトを始めるたびに同じ壁にぶつかった。（正直なところ、1つのライブラリだけできれいに解決できたケースは一度もなかった。）

3度目となる`react-day-picker`の上に、自作のTimePickerとどこかから借りたPopoverをつなぎ合わせていたある日、本当に欲しかったAPIの形をノートに書き始めた。そのノートが、最終的にKalyx 1.0の公開APIになった。この記事は、作り手の立場からまとめた1年間の意思決定の記録だ。なぜ作ったのか、4つの中核的な判断にはどんなトレードオフがあったのか、そして1.0のリリース後、利用者がほぼいない状況で何に時間を使ったのかまで、ありのままに書く。

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

1.0でshipしたものをまとめると、次のようになる。

- **7つのprimitiveコンポーネント**: `DatePicker`, `RangePicker`, `TimePicker`, `DateTimePicker`, `MonthPicker`, `YearPicker`, `WeekPicker`
- **3つのHeadless Hook**: `useDatePicker`, `useRangePicker`, `useTimePicker`（ライブラリ提供のUIをすべて捨て、自分のUIを作りたいときの入口）
- **単一のComposition API**: 7つのprimitiveすべてで同じContextとdot notationパターンを使用
- **約16KB gzip (ESM)**: 17KBの上限内で完成
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

今後shipするadapterも同じ21メソッドの契約に従う。異なるのは実装だけだ。

- `@kalyx/adapter-dayjs`: 統計上Reactユーザーの約半数がdayjsを使っているため優先度1（Mantineはdayjsを強制peerにしているほどだ）
- `@kalyx/adapter-luxon`: エンタープライズと高度なtimezoneケース
- Temporal: TC39 Temporal API対応はadapterではなくcoreレベルで解くべきだと、抽出後に結論づけた。adapterインターフェースがISO文字列in/outであるため、Temporal固有の力をそのまま運べないからだ。（この判断は後の「現在の状態」で再び扱う。）

### 17KBの上限

1.0リリース時のbundleは、ESM約15.8KB / CJS約15.9KB gzipだった。上限は当初16KBに設定し、v1.1で17KBへ1段階上げた（理由は後述）。CIがこの上限を強制する。すべてのPRで`pnpm check-bundle`を実行し、上限を超えるPRはbuildがfailする。

この数値は恣意的ではない。市場の基準線を意識して決めた。

- `react-day-picker`: Calendar 1つだけで約22KB
- `react-datepicker`: 全primitiveで約40～60KB
- `MUI X`: 約58KB（しかもRangeはPro有料）
- `Kalyx`: 7つのprimitiveが`react-day-picker`のCalendar 1つより小さい

bundleの変遷もRC段階ごとに追跡した。

| 段階 | 変更 | 上限 |
| --- | --- | --- |
| rc.0 | 7 primitive初期完成 | 12 → 13KB |
| rc.3 | gridキーボードナビゲーション (Arrow/Page/Home/End) | 13 → 14KB |
| rc.4 | MonthPicker/YearPicker disabled month/year prop | 14 → 15KB |
| rc.8 | TimePicker `filterTime`プログラムcallback | 15 → 16KB |
| 1.0.0 | 最終安定化 (2026-06-08) | ESM 15.8KB / CJS 15.9KB |
| 1.1 | a11y `announce()` live region parity | 16 → 17KB |

上げるたびに「なぜ増やしたか」を明記する。1KBずつ曖昧に漏れるのではなく、意図した判断にするためだ。拒否した機能も明確に残した。RTLモード、holiday plugin、virtualized year/month gridは意図的に除外した。17KB上限で実際に残る余裕はCJS約126byte、ESM約221byteしかない（より厳しいCJSがbinding基準）。次のruntime機能を入れるなら、(a)既存コードを減量して中へ押し込むか、(b)意図的に上限を再び上げて告知するかのどちらかだ。（逆にテスト、別adapterパッケージ、`/headless` entryなど、default bundle graphに入らない作業は予算に影響しない。）

上限の変更には複数ファイルの同期が必要だ。`scripts/check-bundle-size.js`の`TARGET_KB`、`tsup.config.ts`、CI workflow群。わざと面倒にした。（1か所だけ変えればひそかに引き上げやすいため、上限を動かす判断が重くなるよう設計した。）

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

### 1.0以降、実際にshipしたもの（v1.1時点）

この記事の前半は1.0リリース時点の振り返りだが、執筆時点でライブラリはv1.1へ進んでいる。振り返りが「計画」だけで終わらないよう、実際にshipしたものと方向転換したものを正確に記しておく。

次のmilestoneとしていたadapter拡張は一部実現した。

- **`@kalyx/adapter-dayjs`リリース完了**: Reactユーザー統計でdayjsのシェアは半分近く、Mantineのようにdayjsを強制peerとするエコシステムもあるため、優先度1だったadapterを別パッケージとしてpublishした。
- **`@kalyx/core/test-helpers` conformance suiteを追加**: 新adapterを追加するたび、同じ21メソッドの契約を自動検証する形にmodularizeした。`runAdapterConformanceTests(adapter, { describe, it, expect })`の1行で、どのadapterも同じ正確性基準で合否を検証できる。adapterを「約束」から「検証された実力」へ移す背骨となる作業だった。
- **`@kalyx/adapter-luxon`**: エンタープライズと高度なtimezoneケース向けに、conformance suite上で低コストに追加できる次の候補。

反対に、計画から**dropしたもの**も率直に残す。

- **`@kalyx/adapter-temporal`はadapterとして作らないことにした。** adapterインターフェースがISO-8601文字列in/outなので、Temporal固有の能力（`PlainDate`や`ZonedDateTime`のような型安全な時間model）をそのまま運べない。adapterで包んでも、結局ISO文字列へ平坦化されcoreのIntlコードへ再委譲するだけで、正確性の利得は0だった。Temporal対応はadapterではなくcoreレベルの戦略として保つべきだと結論づけた。

ユーザーシグナルを基に検討中の項目は、別にまとめている。

- **不足しているheadless hook**: 現在のhookはDate/Range/Timeの3種のみ。Month/Year/Week/DateTime用hookは、default bundle上限に触れないよう`/headless` entry専用で追加する計画だ。
- **fast-checkプロパティテスト**: 日付計算のような純粋関数には、例ベースよりプロパティベースのテストのほうが堀を深くする。core正確性強化の最優先項目へ引き上げた。
- **Integration recipes**: React Hook Form / Zodなどフォームライブラリ連携ガイド。
- **RTLモード / Holiday plugin**: bundle余白が許すか、明確な要望が生まれたとき。

保留したtrackも明記する。React Native adapterはroadmapにあるが、まずwebユーザーが先だ。非Gregorianカレンダー（Persian/Buddhist/Islamic/Hebrew）は、GitHub issueが一定数集まるか、エンタープライズスポンサーが現れたときに着手する。

### 率直に認める限界

最後に、ライブラリを検討中の方への率直なdisclosureだ。（新しいライブラリへの過剰なmarketingは、結局信頼を削ると考えている。）

- **1人メンテナー**: 月1 minorが可能なペース。要望に応じて優先順位は変わる。
- **新生ライブラリ**: ユーザーベースが小さいため、edge caseの最初の発見者になる可能性は低くない。テストcoverageもpicker間で偏りがある（例としてWeekPickerが最も薄い）。
- **React 19+専用**: RSC、`useId`、`useLayoutEffect` warningなし、`<Input>`のform-action統合といった19のleverage pointに依存する。18へのback-portはしない。
- **「battle-tested」とは主張しない**: 新生ライブラリにその言葉は使わない。代わりに、primitiveごとに数百件のunit test、axe全件通過、Next.js App Router CIでのSSR検証、adapter conformance suiteがある。

今日、10万人規模のユーザーに耐えるdeployment-gradeの安定性が必要なら、正直`react-datepicker`が安全な選択だ。Kalyxは、より小さく、よりheadlessな未来に賭ける**bet**に近い。その最初のbettorになってくれる人を待っている。

---

## おわりに

この記事はライブラリの宣伝というより、1年間の意思決定を振り返る記事に近い。何をshipし、何を拒否し、どの判断が重かったかを記録しておくことが、次のライブラリを作るとき（あるいは別のライブラリを評価するとき）最大の資産になる、というのが私の経験だ。

Composition over Props、ISO文字列の強制、adapterパターン、bundle上限。4つの判断はいずれも、短期的な利便性の一部を手放し、長期的な適応力を買うものだった。正しかったかは、実際には1年後になって初めて評価できると思う。（今確実に言えるのは、この4つを決めなければライブラリは1.0へ到達できなかった、ということくらいだ。）

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
