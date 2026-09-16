---
emoji: 📅
title: 'Kalyx'
seoTitle: 'React DatePickerのタイムゾーンで日付が1日ずれるのを防ぐ、headlessライブラリKalyxの設計記録'
date: '2026-06-17'
updatedAt: '2026-09-16'
categories: ライブラリ React DatePicker オープンソース
description: 'React headless DatePicker「Kalyx」を作った理由と、Ark UI、React Aria、react-day-pickerとの違いを整理した。ISO 8601 UTCの値モデル、IntlによるDST処理、全IANAタイムゾーンのプロパティテストをコードと実測で説明する。'
keywords: 'Kalyx, React DatePicker, headless DatePicker, React 日付 タイムゾーン, ISO 8601 UTC, 日付 1日ずれる, DST バグ, fast-check プロパティテスト, react-day-picker 比較'
locale: ja
translationOf: '260617'
sourceHash: 5abb83b574bf7a755c4f28002285feb908df52664684cce8182222c53694936d
---

今回は、筆者が作ったReactのheadless DatePickerライブラリ **Kalyx** について書こうと思う。

この記事は2026年6月に書いた振り返りを書き直したものだ。最初の記事が掲げた「7つのピッカーを1つのAPIで、競合ライブラリのカレンダー1つより小さく」は、改めて確かめてみると半分は誤りで、半分は差別化要因ではなかった。そこで、作った理由、既存の選択肢との違い、技術的な定義の順に整理し直す。

結論から言うと、Kalyxの違いはコンポーネントの数ではなく **値モデル** にある。基準バージョンは `@kalyx/react` 1.4.7と `@kalyx/core` 1.4.8（MIT、React 19専用）で、コードの引用は[GitHubリポジトリ](https://github.com/jiji-hoon96/kalyx)の2026-09-16時点の `main`（`0bb302e`）に基づく。

---

## 日付ピッカーを宣言的に使いたかった

作った理由は2つあった。複雑で使いにくい日付ライブラリをもっと宣言的かつシンプルに使いたかったこと、そしてそうしたライブラリが内部でどう作られているのかを学びたかったことだ。「使いにくい」という言葉は漠然としているので、筆者が引っかかった箇所が今の最新バージョンにも残っているかを、各ライブラリの型定義で改めて確認した。

### モードをpropでオンにするAPI

react-datepickerは、時刻選択を `showTimeSelect`、月選択を `showMonthYearPicker`、年選択を `showYearPicker`、範囲選択を `selectsRange` でオンにする。1つのコンポーネントがpropの組み合わせによって別物になる構造だ。そのコストは型に表れる。9.1.0の型定義では、`selectsRange` の値によって `onChange` のシグネチャが分岐する。

```ts
// react-datepicker/dist/index.d.ts (발췌)
    selectsRange?: true;
    selectsMultiple?: false | undefined;
    formatMultipleDates?: never;
    onChange?: (date: [Date | null, Date | null], event?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => void;
```

よくできたunionだが、モードが増えるほど分岐は掛け算で増え、使う側はprop名だけを見て今どの組み合わせなのかを思い浮かべなければならない。（筆者が[抽象化](/260201)の記事で扱った「誤ってまとめた抽象化は結合度を高める」と同じ形だ）筆者は「入力欄とポップオーバーとカレンダー」がJSXの構造そのものから読み取れることを望んだ。

### 値の型とタイムゾーンが漏れる場所

react-datepickerとreact-day-pickerはネイティブの `Date` をやり取りする。どちらにもIANAタイムゾーンを受け取る `timeZone` propはあるが（react-datepickerはoptional peerの `date-fns-tz` が必要で、react-day-pickerでは実験的機能だ）、値の型は `Date` のままだ。`Date` は実行環境のローカルタイムゾーンで解釈されるため、ソウルで `new Date(2026, 3, 15)` の `toISOString()` は `2026-04-14T15:00:00.000Z` になる。4月15日を選んだのに、サーバーには14日に見える問題だ。react-datepickerの["Date Selected is One Day Off"](https://github.com/Hacker0x01/react-datepicker/issues/1018) issueは2017年9月に開かれ、2025年12月に閉じられた。

反対側のArk UIとReact Ariaは、`@internationalized/date` の `CalendarDate`、`ZonedDateTime` オブジェクトを使う。意味は正確だが、フォームの状態とサーバーのレスポンスがすべて文字列のアプリでは、境界ごとに変換コードが生まれる。

タイムゾーン対応が日付ライブラリの選択に縛られることもある。MUI X Date Pickers 9.13.0のアダプターコードを見ると、dayjs、Luxon、Momentのアダプターは `isTimezoneCompatible = true`、date-fns系は `false` だ。date-fnsを使うアプリが `timezone` propを使うには、日付ライブラリをもう1つ導入しなければならない。

まとめると、モードはpropの組み合わせに、値は解釈が実行環境に左右される `Date` に、タイムゾーン対応は日付ライブラリの選択に散らばっていて、**1つの宣言で意図を書き表すのが難しかった。**

### 作りながら学ぶ

日付ピッカーは小さく見えるが、カレンダー計算、ロケール、タイムゾーンとDST、キーボード操作、SSRがすべて詰まっている。そこで、使う側ではJSXを見るだけで何を作っているのかが読み取れるように、作る側では値がどこで変換されるのかを説明できるくらいに絞り込むことを目標にした。

では、こうした要求をすでに解決しているライブラリは本当になかったのだろうか。

---

## 既存の選択肢と何が違うのか

先に答えを言うと、ある。筆者はheadlessで複数のピッカーを備えたライブラリはないと思い込んで始めたが、改めて調べるとその前提は誤りだった。

### 各選択肢が選んだ値モデル

2026-09-16にnpmの最新版をインストールし、型定義と公式ドキュメントで確認した内容だ。サイズ列は後で説明する同じ方法で測った値だ。

| ライブラリ | headless | 値の型 | 時刻入力 | 月・年の単独選択 | gzip |
| --- | --- | --- | --- | --- | --- |
| react-day-picker 10.0.1 | いいえ（CSS同梱） | `Date` | なし | なし | 20.0KB |
| react-datepicker 9.1.0 | いいえ（CSS import） | `Date` | `showTimeSelect` | propで | 45.4KB |
| MUI X 9.13.0 | いいえ（Material） | アダプターオブジェクト | TimePicker | `views` | 113.1KB |
| Ark UI 5.39.2 | はい | `@internationalized/date` | 別パッケージの `DateInput` セグメント（サイズ対象外） | `minView` | 42.7KB |
| React Aria Components 1.21.1 | はい | `@internationalized/date` | `TimeField` セグメント | なし | 75.3KB（DatePicker）、78.8KB（範囲・時刻込み） |
| Kalyx 1.4.7 | はい | ISO 8601 UTC文字列 | リスト形式のHourList、MinuteList | MonthPicker、YearPicker | 18.9KB（DatePicker）、25.6KB（全部） |

react-day-pickerは[公式ガイド](https://daypicker.dev/guides/timepicker)で "DayPicker does not include a built-in time picker" と明言している。MUIのサイズは `@mui/material` とemotionを含む値なので、すでにMUIのアプリであれば増加分はずっと小さい。

### headlessの完成形はすでにある

表で重要なのはArk UIとReact Ariaの行だ。[Ark UI](https://ark-ui.com/docs/components/date-picker)は `DatePicker.Root` のようなdot notationの合成APIで、単一・複数・範囲選択と月・年単位の選択を提供する。[React Aria](https://react-aria.adobe.com/DatePicker)はAdobeによるアクセシビリティ重視の実装だ。だからKalyxの居場所は最初に考えていたより狭い。

> headlessの完成形はすでにある。ただしArk UIとReact Ariaは値を `@internationalized/date` オブジェクトでやり取りし、時刻入力はセグメントフィールドで提供する。Kalyxは値をJSONにそのまま載るUTC時点の文字列に固定し、リストから選ぶTimePickerと月・年・週のピッカーを同じ合成APIに入れた。

とはいえ「値が文字列だから良い」は弱い主張だ。`CalendarDate` も `toString()` を一度呼べば文字列になる。差別化要因は形式ではなく、**その文字列が常に実際の瞬間（時点）であり、カレンダーのマス（座標）と混ざらないという契約、そしてその契約を守るテスト** にある。

### バンドルサイズを同じ方法で測り直した

READMEバッジのバンドルサイズは、他のライブラリと比べられる量ではなかった。バッジの約19.5KBは `@kalyx/react` の `dist` ファイル1つで、このファイルは `@kalyx/core`、`@kalyx/adapter-date-fns`、`@floating-ui/react` を外部importとして残す。その数字を、依存関係込みの他ライブラリの数字の横に並べていたのだ。

そこで「利用側のアプリがimportを1行追加したとき、バンドルがどれだけ大きくなるか」ですべてを測り直した。

```bash
echo "import { DatePicker } from '@kalyx/react'; export default DatePicker;" > entry.jsx
npx esbuild entry.jsx --bundle --minify --format=esm --platform=browser \
  --external:react --external:react-dom --external:react/jsx-runtime | gzip -6 | wc -c
```

esbuild 0.28.2、2026-09-16の測定で、KBはバイト数を1024で割った値だ。react-datepickerはCSSを除いた。React Aria Componentsは、単一のDatePickerの組み立てに必要なexport 12個（`DatePicker`、`DateInput`、`Calendar`、`Popover`、`Dialog` など）と、範囲と時刻まで入れた14個（`DateRangePicker`、`RangeCalendar`、`TimeField` を含む）の2通りで測った。

![同じesbuild条件で測ると、Kalyx DatePicker 18.9KB、react-day-picker 20.0KB、Kalyx全部 25.6KB、Ark UI 42.7KB、react-datepicker 45.4KB、React Aria Components 75.3KB（範囲・時刻込みで78.8KB）、MUI X 113.1KBの順に大きくなる。](1.png?w=720)

同じ条件で正しい文は1つだ。DatePicker 1つ（18.9KB）は `DayPicker`（20.0KB）と同程度のサイズで、7種全部（25.6KB）はそれより大きい。（それすらDayPickerはカレンダーだけで、Kalyx DatePickerは入力欄とポップオーバーまで含む）サイズはimportの組み合わせとgzipレベルに敏感なので桁で読むのが妥当で、サイズはKalyxを選ぶ中心的な理由ではない。

---

## Kalyxを技術的に定義すると

> Kalyxは、すべての入出力をUTC時点の文字列に固定し、カレンダー座標と時点の間の変換を2つの関数だけに置き、その往復をランタイムが知るすべてのタイムゾーンについてプロパティテストで検査するheadlessなReact日付ピッカーだ。

使う側のAPIはこうだ。`value` と `onChange` は `string | null` で、`displayTimezone` はどのゾーンのカレンダーで見せるかを決める。

```tsx
<DatePicker value={iso} onChange={setIso} displayTimezone="America/New_York">
  <DatePicker.Input />
  <DatePicker.Popover>
    <DatePicker.Calendar />
  </DatePicker.Popover>
</DatePicker>
```

### 値は時点、カレンダーのマスは座標

Kalyxの中には、形式が同じ2種類のISO文字列が流れている。**座標** はカレンダーグリッドの1マスで、`YYYY-MM-DDT00:00:00.000Z` と書くがタイムゾーンの概念を持たない。グリッド計算はUTCだけで回るので、実行環境に依存しない。**時点** は `onChange` から出ていく値で、`displayTimezone` におけるその日の0時という実際の瞬間だ。同じ1月15日が、ニューヨークでは `2026-01-15T05:00:00.000Z`、ソウルでは `2026-01-14T15:00:00.000Z` になる。

![カレンダー座標 2026-01-15T00:00:00.000Z は civilMidnightFromUtcDay によってニューヨークとソウルの時点になり、calendarDayFromInstant によって再び座標に戻る。](2.png?w=720)

両者をつなぐ関数は `@kalyx/core` の2つだけだ。座標を時点に変える `civilMidnightFromUtcDay` と、その逆の `calendarDayFromInstant` だ。後者は「その時点はこのゾーンで何日か」を読み取り、UTC 0時の座標として書き直す。

```ts
// packages/core/src/utils/timezone.ts:187-190
export function calendarDayFromInstant(iso: ISODateString, timeZone: string): ISODateString {
  const p = partsInTimezone(new Date(iso), timeZone);
  return new Date(Date.UTC(p.year, p.month - 1, p.day)).toISOString();
}
```

ルールは方向だ。マスを選んで値をコミットするときは座標を時点に、保存値から表示する月とフォーカスを決めるときは時点を座標に変える。DatePicker Rootの `selectDate` は変換し、変換した時点で制約を検査し、通ればコミットする。

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

呼び出し箇所はここだけではない。`packages/react/src` を検索すると、2つの関数はDatePicker、RangePicker、DateTimePickerのRootとCalendar、Presets、キーボード移動のユーティリティ、headlessフック6つに散らばっている。それでも日付のマスをコミットしたりビューを決めたりする経路はすべて2つのどちらかを通る。時刻のコミットは `setTimeInTimezone` が担うが、内部では同じ内部関数 `resolveCivilDateTime` で変換する。

この契約はプロパティベーステスト（property-based test）で守る。すべての座標 `c` とゾーン `z` について `calendarDayFromInstant(civilMidnightFromUtcDay(c, z), z) === c` でなければならない。

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

[fast-check](https://fast-check.dev/) が2020年から2045年の間の日付をランダムに生成し、+5:45のKathmandu、+14のKiritimati、-11のNiueなど代表的なゾーン14個と組み合わせて300回回す。すぐ次のテストは、同じ往復を `Intl.supportedValuesOf('timeZone')` が返すゾーンすべてについて、ゾーンごとに12回ずつ検査する。筆者のローカルのNode 24.16では、そのリストは418個だ。1.4.8では、DSTの切り替えごとに境界時刻の変換結果をTemporal実装と照合する全数テストが加わった。

では、ユーザーが渡した `"2026-01-15T00:00:00.000Z"` をライブラリが自動で時点に正規化すればよいのではないか。文字列だけでは座標なのか時点なのか分からないので、この道は塞がっている。すでに時点であるソウルの値 `2026-01-14T15:00:00.000Z` に `civilMidnightFromUtcDay` をもう一度かけると `2026-01-13T15:00:00.000Z` になり、ソウルのようにオフセットが正のゾーンではレンダーのたびに1日ずつずれ続ける。（ニューヨークの値はもう一度かけても変わらない）何度適用しても結果が同じ `startOfDayInTimezone` に替えればずれは起きないが、座標を時点に変えるという本来の仕事ができない。

そこで正規化を諦め、契約をドキュメントで固定した。利用者はピッカーが出力した値をそのまま渡さなければならない。正直に言えば利用者に押しつけたコストで、`ISODateString` が `string` のエイリアスなのでコンパイラも防いでくれない。

### IntlだけでDSTを解く方法

座標を時点に変えるには「そのゾーンのその日の00:00」がUTCでいつなのかを知る必要があるが、オフセットは時点が分からないと求められない。しかもDSTの切り替え日には、現地時刻が存在しなかったり（spring forward）、2回存在したり（fall back）する。

Kalyxは `date-fns-tz` のようなライブラリなしでこれを解く。`Intl.DateTimeFormat(...).formatToParts` で「このUTCの瞬間はそのゾーンで何時か」を尋ねてオフセットを測り、そのオフセットを要求時刻の1日前と1日後の2地点で読む。

```ts
// packages/core/src/utils/timezone.ts:251-254, 259
const candidate = (probeEpoch: number) =>
  civilEpoch - getTimezoneOffsetMinutes(new Date(probeEpoch).toISOString(), timeZone) * 60_000;
const epochBefore = candidate(civilEpoch - 86_400_000);
const epochAfter = candidate(civilEpoch + 86_400_000);

if (epochBefore === epochAfter) return new Date(epochBefore).toISOString();
```

`civilEpoch` は、求める現地時刻をUTCであるかのように読んだ値だ。オフセットは±14時間以内なので、1日前と1日後は近くの切り替えの前と後のオフセットを1つずつ与える。2つが同じなら切り替えはないので `formatToParts` 2回で終わり、グリッドの42マスごとに1回ずつ呼ばれるこの高速パスがコストを決める。（48時間以内に切り替えは1つという前提は、2020〜2045年のすべてのゾーンで成り立つ）

2つが違えば、2つの候補をそのゾーンで読み直し、要求した時刻と合うかを見る（`timezone.ts:261-279`）。fall backの重なりでは両方が合うので切り替え前のオフセットで作った早い方を選び、spring forwardの隙間ではどちらも合わないので同じ側を選んで隙間の長さだけ時刻を進める。実際に動かした結果はこうだ。

| 要求 | 状況 | 1.4.7 | 1.4.8 |
| --- | --- | --- | --- |
| New_York 2026-03-08 02:30 | 存在しない時刻 | `2026-03-08T07:30:00.000Z` | 同じ（03:30 EDT、時刻を進める） |
| New_York 2026-11-01 01:30 | 2回存在する時刻 | `2026-11-01T05:30:00.000Z` | 同じ（01:30 EDT、早い方） |
| London 2026-10-25 01:30 | 2回存在する時刻 | `2026-10-25T01:30:00.000Z`（遅い方） | `2026-10-25T00:30:00.000Z`（01:30 BST、早い方） |

「隙間では時刻を進め、曖昧なら早い方を取る」は、[MDNのTemporal.ZonedDateTimeドキュメント](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime)が説明する `disambiguation` のデフォルト値 `"compatible"` と同じだ。1.4.7のLondonの行がずれた理由は後で扱う。

### アダプター境界は文字列メソッド21個

タイムゾーンをcoreが計算するなら、date-fnsやdayjsは何を担うのか。日付の演算とパースだ。その境界である `DateAdapter` はメソッド21個で、日付の引数と戻り値はすべてISO文字列だ。

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

タイムゾーンを受け取るメソッドは `format`、`isSameDay`、`startOfDay`、`today` の4つで、その4つも計算はcoreに任せる。date-fnsアダプターの `format` は、`timezone` があればcoreの `formatInTimezone` を直接呼ぶ（`packages/adapter-date-fns/src/index.ts:112-115`）。だからどのアダプターを使ってもタイムゾーンの答えは同じコードから出てくるし、3つのアダプター（date-fns、dayjs、luxon）は `@kalyx/core/test-helpers` の `runAdapterConformanceTests` をそれぞれ回して同じ答えを出すか確認する。

2つのエントリーもこの境界で分かれる。デフォルトエントリーの `@kalyx/react` はモジュール読み込み時に `setDefaultAdapter(DateFnsAdapter)` を呼ぶので、インストールしてすぐ動く（`packages/react/src/index.ts:9-11`）。`@kalyx/react/headless` にはこの呼び出しがなくバンドルも分かれているので、date-fnsのコードは入らない。

この境界の形には代償があった。筆者は2026年6月にTemporalアダプターを畳んだ。Temporalの価値は `PlainDate`、`ZonedDateTime` のように **型が意味を持ち運ぶこと** にあるが、境界が文字列ではその意味が通り抜けられない。包んでも文字列に平坦化されるだけで、正確性の利得はないと判断した。振り返ると、前の節の「座標と時点が同じ `string`」という問題は、Temporalが `PlainDate` と `Instant` で型によって解くまさにその問題だ。文字列の境界はアダプターの交換を容易にした代わりに、型で解く道を塞いだことになる。

### 7つのピッカーは3つのコンテキストの組み合わせ

Kalyxのピッカーは、DatePicker、RangePicker、TimePicker、DateTimePicker、MonthPicker、YearPicker、WeekPickerの7種だ。重要なのは数よりも、**7つが独立した実装ではないという点** だ。コンテキストは `DatePickerContext`、`RangePickerContext`、`TimePickerContext` の3つだけだ。

| ピッカー | 状態を持つRoot | コンテキスト | 違いを生む場所 |
| --- | --- | --- | --- |
| DatePicker | `DatePickerRoot` | Date | |
| MonthPicker、YearPicker | DatePickerのRoot実装 | Date | `selectionGranularity` |
| RangePicker | `RangePickerRoot` | Range | |
| WeekPicker | `RangePickerRoot` そのまま | Range | Calendarに `selectionMode="week"` |
| TimePicker | `TimePickerRoot` | Time | |
| DateTimePicker | 独自のRoot | DateとTimeの入れ子 | 2つのProviderを重ねる |

MonthPickerのRootは、表示形式のデフォルト値を `yyyy-MM` に変え、DatePickerのRoot実装に `selectionGranularity="month"` を渡すだけだ（`MonthPicker/Root.tsx:11-20`）。DatePickerの `selectDate` は、granularityが `month` なら座標をその月の1日に畳んだうえで、先に見た変換と制約検査をそのまま通る。DateTimePickerは2つのコンテキストを重ねて提供する。

```tsx
// packages/react/src/components/DateTimePicker/Root.tsx:401-402
<DatePickerContext.Provider value={dateContext}>
  <TimePickerContext.Provider value={timeContext}>{children}</TimePickerContext.Provider>
```

だから `DateTimePicker.Calendar` は `DatePicker.Calendar` と同じコンポーネントで、自分がどのピッカーの中にいるのかを知らない。1か所の修正が同じコンポーネントを使うピッカー全部に届き、1か所の欠陥も全部に届く。先の図でDatePicker 1つが全体の74%だった理由も、この共有基盤だ。

---

## 契約を守るためにかかったコスト

1.0以降の3か月は新機能よりもこの契約の確認に使い、例示ベースのテストなら素通りしていたはずの欠陥が3回出てきた。1つ目はプロパティテストが、2つ目はコードのクロスレビューが、3つ目はこの記事の検証が見つけた。

### Sydneyの10月1日の1時間

1つ目は、「`startOfDayInTimezone` の結果をそのゾーンで読むと00:00:00になる」というプロパティがAustralia/Sydneyで壊れたことだ。当時の実装はオフセットを1回しか測っていなかった。Sydneyは2034年10月1日02:00に+10から+11へ切り替わるが、その日の00:00はまだ+10なので、正解は `2034-09-30T14:00:00.000Z` だ。ところが「10月1日00:00をUTCとして読んだ地点」は切り替え後なので+11を返し、結果は前日の23:00になった。この反例は回帰テストとして残っている（`timezone.property.test.ts:276`）。

### ソウルでだけ通っていたテスト

2つ目は2026年8月3日のクロスレビューで出てきた。カレンダーで選択表示するマスを決めるコードが、変換を2回していた。マスはすでに座標なのに、マスと保存値の両方をそのゾーンの日付に変換していたのだ。「1月15日」を選んだ結果はこうだった。

| ゾーン | 保存値 | 選択表示されたマス |
| --- | --- | --- |
| `Asia/Seoul`（+9） | `2026-01-14T15:00:00.000Z` | 15日（正しい） |
| `America/New_York`（-5） | `2026-01-15T05:00:00.000Z` | 16日（誤り） |

正のオフセットのゾーンでは2回のずれが相殺されて偶然正しく、既存のテストはソウルしかカバーしていなかった。同じ点検で逆方向の違反も出てきた。表示する月を決めるときに時点へ `startOfMonth` を直接かけていたため、ソウルで1月1日を値として渡すと12月のカレンダーが開いた。仕組みは違っても、破ったルールは1つだ。変換は方向ごとに決まった関数で1回だけ行う。

この事故で、coreの往復プロパティテストは「代表的なゾーンいくつか」から「ランタイムが知るゾーンすべて」に広がった。（React側のコンポーネントテストは、まだ `America/New_York` のような代表ゾーンを使っている）**符号が変わる場所でだけ現れる欠陥は、サンプルでは捕まらない。**

### Londonで遅い方に解決されていた01:30

3つ目は、この記事のDSTの表を他のゾーンに広げる途中で出てきた。1.4.7は要求時刻をUTCとして読んだ地点からオフセットを測っていたが、切り替え後のオフセットが0以上のゾーンではその地点がすでに切り替え後なので、遅いオフセットに収束した。temporal-polyfillで418ゾーンの2020〜2045年の切り替えを全数照合すると、重なりの切り替え3,395件のうち1,908件で遅い方を選んでおり、84ゾーンにまたがっていた。（隙間の切り替え3,394件はすべて正しく、オフセットが負のニューヨークは偶然正しかった）

[#226](https://github.com/jiji-hoon96/kalyx/pull/226)で1日前と1日後を読むように直して `@kalyx/core` 1.4.8としてリリースし、同じ照合を `timezone.dst-oracle.test.ts` として残した。（temporal-polyfillはテストでだけ使う）`'earlier'` と誤って書いていたソースコメントも `'compatible'` に直した。今回も **サンプルが片方の符号に偏っていた。**

### 正確性に使った3KB

これらの修正にはコードが要った。KalyxはデフォルトエントリーのバンドルにCIの上限を設けており、超えるPRは必須チェックで失敗する。12KBから始まり機能が入るたびに1KBずつ上げていたその上限を、2026年8月にタイムゾーンと制約の正確性を全面的に修正する際、17KBから20KBへ一気に引き上げた。

サイズはREADMEバッジに載せていたセールスポイントだった。負のオフセットのゾーンで1日ずつずれる日付ピッカーは、小さかろうが大きかろうが使えない。**小さいと正しいのどちらかを選ばなければならないなら、正しい方だ。**

今の上限はぎりぎりだ。リポジトリの2026-09-11のバンドルバイトマップ文書によれば、`dist/index.cjs` をNodeのデフォルトgzipで測った値は20,259B、上限は20,480Bで、余裕は221Bだ。（依存関係を外部に残した自前ファイルのサイズなので、先の図とは別の量だ）次の機能は、まずバイトを回収しなければ入れられない。

---

## おわりに

筆者が望んだのは、複雑な日付ライブラリを宣言的に使うことだった。作ってみると、宣言的な合成APIもheadlessの完成形もすでにあった。残った違いはもっと内側にあった。**値を1つの時点に固定し、座標と時点の間の変換を2つの関数に絞り、その往復をすべてのタイムゾーンでテストによって守ること。** IntlベースのDST処理、文字列のアダプター境界、3つのコンテキストで作った7つのピッカーは、その決定の結果だ。

学ぶという目標から見ると、一番大きく学んだのは「正しい」と主張する方法だった。最初の記事のバンドル比較は違う量を測っていたし、ソウルで通っていたテストはニューヨークで間違っていた。何を測り、どんなサンプルで確かめたのかを一緒に書かなければ、数字は簡単に自慢になる。

限界もはっきりしている。メンテナーは筆者1人で、React 19専用であり、`@kalyx/react` のnpmダウンロードは2026年9月5日から11日までで200回、そのうち156回が1.4.7のリリース日1日に集中している。座標と時点を型で区別できない問題はドキュメントだけで防いでおり、スタイルの接点である `classNames` と `data-*` 属性を公開APIとして保証するかどうかも決められていない。アクセシビリティは、カレンダーの `grid`、入力欄の `combobox`、時刻リストの `listbox` ロールと、矢印キー、Home/End、PageUp/PageDownの操作を備え、テストファイル8個の `jest-axe` 検査をCIで回しているが、React Ariaと同じくらい検証されていると言える根拠はまだない。

なので、すでにMUIのアプリならMUI Xを、セグメント入力と検証済みのアクセシビリティが優先ならReact Ariaを、カレンダー1つで足りるならreact-day-pickerを先に見るのが妥当だ。値がJSONで行き来するフォームで日付が1日ずつずれる問題を経験したことがあるなら、そのときにKalyxを覗いてもらえると嬉しいし、もっと良い解き方を知っているならGitHub Issueで教えてもらえるとありがたい。

```bash
pnpm add @kalyx/react
```

ドキュメントサイトの[Playground](https://kalyx-docs-site.vercel.app/playground)で、7つのピッカーとlocale、timezoneの設定を実際に変えて試せる。

:::ref

[docs] [Kalyx公式ドキュメントサイト](https://kalyx-docs-site.vercel.app/)

[docs] [MUI、Date and Time Pickers Timezone](https://mui.com/x/react-date-pickers/timezone/)

[docs] [Floating UI公式ドキュメント](https://floating-ui.com/)

:::
