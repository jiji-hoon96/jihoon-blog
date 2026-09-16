---
emoji: 📅
title: 'Kalyx'
seoTitle: 'Kalyx 설계 기록, ISO 문자열 값 모델로 타임존을 다루는 React 헤드리스 DatePicker'
date: '2026-06-17'
updatedAt: '2026-09-16'
categories: 라이브러리 React DatePicker 오픈소스
description: 'React 헤드리스 DatePicker Kalyx를 왜 만들었고 Ark UI, React Aria, react-day-picker와 무엇이 다른지 정리했다. ISO 8601 UTC 값 모델, Intl 기반 DST 처리, IANA 타임존 속성 테스트를 코드와 실측으로 설명한다.'
keywords: 'Kalyx, React DatePicker, headless DatePicker, React DatePicker 타임존, ISO 8601 UTC, DST 버그, fast-check 속성 테스트, react-day-picker 비교'
---

이번 포스팅에서는 필자가 만든 React 헤드리스 DatePicker 라이브러리 **Kalyx** 에 대한 이야기를 해보려고 한다.

이 글은 2026년 6월에 쓴 회고를 다시 쓴 것이다. 처음 글이 내세운 "일곱 피커를 하나의 API 로, 경쟁 라이브러리의 캘린더 하나보다 작게" 는 다시 확인해 보니 절반은 틀렸고 절반은 차별점이 아니었다. 그래서 만든 이유, 기존 선택지와의 차이, 기술적 정의 순서로 다시 정리한다.

결론을 먼저 말하면 Kalyx 의 차이는 컴포넌트 개수가 아니라 **값 모델**에 있다. 기준 버전은 `@kalyx/react` 1.4.7(MIT, React 19 전용)이고, 코드 인용은 [GitHub 저장소](https://github.com/jiji-hoon96/kalyx)의 2026-09-11 `main` 기준이다.

---

## 날짜 라이브러리를 선언적으로 쓰고 싶었다

만든 이유는 두 가지였다. 복잡하고 쓰기 어려운 날짜 라이브러리를 더 선언적이고 단순하게 쓰고 싶었고, 그런 라이브러리가 안에서 어떻게 만들어지는지 공부하고 싶었다. "쓰기 어렵다" 는 말은 막연하니, 필자가 걸렸던 지점을 각 라이브러리의 타입 정의로 짚어 본다.

### 모드를 prop 으로 켜는 API

react-datepicker 는 시간 선택을 `showTimeSelect`, 월 선택을 `showMonthYearPicker`, 연 선택을 `showYearPicker`, 범위 선택을 `selectsRange` 로 켠다. 한 컴포넌트가 prop 조합에 따라 다른 물건이 되는 구조다. 그 비용은 타입에서 보인다. 9.1.0 의 타입 정의에서는 `selectsRange` 값에 따라 `onChange` 시그니처가 갈린다.

```ts
// react-datepicker/dist/index.d.ts (발췌)
    selectsRange?: true;
    selectsMultiple?: false | undefined;
    formatMultipleDates?: never;
    onChange?: (date: [Date | null, Date | null], event?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => void;
```

잘 만든 union 이지만, 모드가 늘수록 분기가 곱해지고 사용하는 쪽은 prop 이름만 보고 지금 어떤 조합인지 떠올려야 한다. (필자가 [추상화](/260201) 글에서 다룬 "잘못 묶은 추상화는 결합도를 늘린다" 와 같은 모양이다) 필자는 "입력 칸과 팝오버와 캘린더" 가 JSX 구조 자체로 읽히길 원했다.

### 값 타입과 타임존이 새는 자리

react-datepicker 와 react-day-picker 는 native `Date` 를 주고받는다. `Date` 는 실행 환경의 로컬 타임존으로 해석되기 때문에 서울에서 `new Date(2026, 3, 15)` 의 `toISOString()` 은 `2026-04-14T15:00:00.000Z` 다. 4월 15일을 골랐는데 서버에는 14일로 보이는 문제다. react-datepicker 의 ["Date Selected is One Day Off"](https://github.com/Hacker0x01/react-datepicker/issues/1018) 이슈는 2017년 9월에 열려 2025년 12월에 닫혔다.

반대편의 Ark UI 와 React Aria 는 `@internationalized/date` 의 `CalendarDate`, `ZonedDateTime` 객체를 쓴다. 의미는 정확하지만 폼 상태와 서버 응답이 전부 문자열인 앱에서는 경계마다 변환 코드가 생긴다.

타임존 지원이 날짜 라이브러리 선택에 묶이기도 한다. MUI X Date Pickers 9.13.0 의 어댑터 코드를 보면 dayjs, Luxon, Moment 어댑터는 `isTimezoneCompatible = true`, date-fns 계열은 `false` 다. date-fns 를 쓰는 앱이 `timezone` prop 을 쓰려면 날짜 라이브러리를 하나 더 들여야 한다.

정리하면 모드는 prop 조합으로, 값은 로컬 타임존에 묶인 객체로, 타임존 지원은 날짜 라이브러리 선택으로 흩어져 있어서 **선언 하나로 의도를 적기 어려웠다.**

### 만들며 배우기

날짜 피커는 작아 보이지만 달력 계산, 로케일, 타임존과 DST, 키보드 탐색, SSR 이 전부 들어 있다. 문서로 읽는 것과 직접 경계를 정하고 테스트로 지키는 것은 다르다. 그래서 쓰는 쪽에서는 JSX 만 보고 무엇을 만드는지 읽히게, 만드는 쪽에서는 값이 어디서 변환되는지 설명할 수 있을 만큼 좁히는 것을 목표로 잡았다.

그렇다면 이런 요구를 이미 풀어 둔 라이브러리는 정말 없었을까?

---

## 이미 있는 선택지와 무엇이 다른가

답부터 말하면 있다. 처음 글에서 필자는 "헤드리스이면서 여러 피커를 갖춘 라이브러리는 없다" 는 투로 썼는데, 다시 조사해 보니 그 전제가 틀렸다.

### 선택지마다 고른 값 모델

2026-09-16 에 npm 최신판을 설치해 타입 정의와 공식 문서로 확인한 내용이다. 크기 열은 아래에서 설명할 같은 방법으로 잰 값이다.

| 라이브러리 | 헤드리스 | 값 타입 | 시간 입력 | 월·연 단독 선택 | gzip |
| --- | --- | --- | --- | --- | --- |
| react-day-picker 10.0.1 | 아니오 (CSS 제공) | `Date` | 없음 | 없음 | 20.0KB |
| react-datepicker 9.1.0 | 아니오 (CSS import) | `Date` | `showTimeSelect` | prop 으로 | 45.4KB |
| MUI X 9.13.0 | 아니오 (Material) | 어댑터 객체 | TimePicker | `views` | 113.1KB |
| Ark UI 5.39.2 | 예 | `@internationalized/date` | 세그먼트 입력 | `minView` | 42.7KB |
| React Aria Components 1.21.1 | 예 | `@internationalized/date` | `TimeField` 세그먼트 | 없음 | 78.8KB |
| Kalyx 1.4.7 | 예 | ISO 8601 UTC 문자열 | 목록형 HourList, MinuteList | MonthPicker, YearPicker | 18.9KB (DatePicker), 25.7KB (전부) |

react-day-picker 는 [공식 가이드](https://daypicker.dev/guides/timepicker)에서 "DayPicker does not include a built-in time picker" 라고 밝힌다. MUI X 의 범위 선택은 Community 패키지에 없고 Pro 에 있다. MUI 크기는 `@mui/material` 과 emotion 을 포함하므로 이미 MUI 앱이라면 실제 증가분은 훨씬 작다.

### 헤드리스 완성형은 이미 있다

표에서 중요한 줄은 Ark UI 와 React Aria 다. [Ark UI](https://ark-ui.com/docs/components/date-picker)는 `DatePicker.Root` 같은 dot notation 합성 API 로 단일, 다중, 범위 선택과 월, 연 단위 선택을 낸다. [React Aria](https://react-aria.adobe.com/DatePicker)는 Adobe 의 접근성 중심 구현이다. 그래서 Kalyx 의 자리는 처음 생각보다 좁다.

> 헤드리스 완성형은 이미 있다. 다만 Ark UI 와 React Aria 는 값을 `@internationalized/date` 객체로 주고받고 시간 입력은 세그먼트 필드로 낸다. Kalyx 는 값을 JSON 에 그대로 실리는 UTC 시점 문자열로 고정했고, 목록에서 고르는 TimePicker 와 월, 연, 주 피커를 같은 합성 API 에 넣었다.

다만 "값이 문자열이라 좋다" 는 약한 주장이다. `CalendarDate` 도 `toString()` 한 번이면 문자열이 된다. 차별점은 형식이 아니라 **그 문자열이 항상 시점이라는 계약과 그 계약을 지키는 테스트**에 있다. dot notation 은 Ark UI 도 쓰니 차별점이 아니다.

### 번들 크기를 같은 방법으로 다시 쟀다

처음 글의 번들 비교는 서로 다른 양을 재고 있었다. README 배지의 약 19.5KB 는 `@kalyx/react` 의 `dist` 파일 하나인데, 이 파일은 `@kalyx/core`, `@kalyx/adapter-date-fns`, `@floating-ui/react` 를 외부 import 로 남긴다. 그 숫자를 의존성이 포함된 남의 숫자 옆에 세워 둔 것이다.

그래서 "소비자 앱이 import 한 줄을 추가했을 때 번들이 얼마나 커지는가" 로 모두 다시 쟀다.

```bash
echo "import { DatePicker } from '@kalyx/react'; export default DatePicker;" > entry.jsx
npx esbuild entry.jsx --bundle --minify --format=esm --platform=browser \
  --external:react --external:react-dom --external:react/jsx-runtime | gzip -6 | wc -c
```

esbuild 0.28.2, 2026-09-16 측정이다. react-datepicker 는 CSS 를 뺐고, React Aria Components 는 피커 조립에 필요한 export 14개(`DatePicker`, `DateRangePicker`, `Calendar`, `TimeField`, `Popover`, `Dialog` 등)를 한 번에 import 했다.

![같은 esbuild 조건으로 재면 Kalyx DatePicker 18.9KB, react-day-picker 20.0KB, Kalyx 전부 25.7KB, Ark UI 42.7KB, react-datepicker 45.4KB, React Aria Components 78.8KB, MUI X 113.1KB 순으로 커진다.](1.png?w=720)

처음 글의 "일곱 종을 react-day-picker 의 캘린더 하나보다 작게" 는 틀렸다. 일곱 종 전부(25.7KB)는 `DayPicker`(20.0KB)보다 크다. 참인 문장은 "DatePicker 하나는 DayPicker 하나와 비슷한 크기다" 까지다. (그마저 DayPicker 는 캘린더만, Kalyx DatePicker 는 입력 칸과 팝오버까지 포함한다) 크기는 import 조합과 gzip 레벨에 민감하니 자릿수로 읽는 편이 맞고, 크기가 Kalyx 를 고를 중심 이유가 아니라는 결론은 바뀌지 않는다.

그렇다면 중심은 무엇일까?

---

## Kalyx 를 기술적으로 정의하면

> Kalyx 는 모든 입출력을 UTC 시점 문자열로 고정하고, 캘린더 좌표와 시점 사이의 변환을 두 함수에만 두어 그 왕복을 모든 IANA 타임존에서 테스트로 보장하는 헤드리스 React 날짜 피커다.

사용하는 쪽의 API 는 이렇다. `value` 와 `onChange` 는 `string | null` 이고 `displayTimezone` 은 어느 존의 달력으로 보여줄지 정한다.

```tsx
<DatePicker value={iso} onChange={setIso} displayTimezone="America/New_York">
  <DatePicker.Input />
  <DatePicker.Popover>
    <DatePicker.Calendar />
  </DatePicker.Popover>
</DatePicker>
```

### 값은 시점이고 캘린더 칸은 좌표다

Kalyx 안에는 형식이 같은 두 종류의 ISO 문자열이 흐른다. **좌표**는 캘린더 그리드의 한 칸으로, `YYYY-MM-DDT00:00:00.000Z` 로 적지만 타임존 개념이 없다. 그리드 계산이 UTC 로만 돌아서 실행 환경과 무관하다. **시점**은 `onChange` 로 나가는 값으로, `displayTimezone` 에서 그날 자정인 실제 순간이다. 같은 1월 15일이 뉴욕에서는 `2026-01-15T05:00:00.000Z`, 서울에서는 `2026-01-14T15:00:00.000Z` 다.

![캘린더 좌표 2026-01-15T00:00:00.000Z 는 civilMidnightFromUtcDay 로 뉴욕과 서울의 시점이 되고, calendarDayFromInstant 로 다시 좌표로 돌아온다.](2.png?w=720)

둘을 잇는 함수는 `@kalyx/core` 의 두 개뿐이다. 좌표를 시점으로 바꾸는 `civilMidnightFromUtcDay` 와 그 반대인 `calendarDayFromInstant` 다. 뒤쪽은 "그 시점이 이 존에서 며칠인가" 를 읽어 UTC 자정 좌표로 다시 적는다.

```ts
// packages/core/src/utils/timezone.ts:187-190
export function calendarDayFromInstant(iso: ISODateString, timeZone: string): ISODateString {
  const p = partsInTimezone(new Date(iso), timeZone);
  return new Date(Date.UTC(p.year, p.month - 1, p.day)).toISOString();
}
```

규칙은 방향이다. 칸을 골라 값을 커밋할 때는 좌표를 시점으로, 저장값에서 보여줄 월과 포커스를 정할 때는 시점을 좌표로 바꾼다. DatePicker Root 의 `selectDate` 는 변환하고, 변환된 시점으로 제약을 검사하고, 통과하면 커밋한다.

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

호출 자리는 여기만이 아니다. `packages/react/src` 를 검색하면 두 함수가 DatePicker, RangePicker, DateTimePicker 의 Root 와 Calendar, Presets, 키보드 이동 유틸, 헤드리스 훅 여섯 개에 흩어져 있다. 그래도 제3의 변환 함수는 없고, 값을 커밋하거나 뷰를 정하는 경로는 전부 둘 중 하나를 지난다.

이 계약은 속성 테스트(property-based test)로 지킨다. 모든 좌표 `c` 와 존 `z` 에 대해 `calendarDayFromInstant(civilMidnightFromUtcDay(c, z), z) === c` 여야 한다.

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

[fast-check](https://fast-check.dev/) 가 2020년에서 2045년 사이의 날짜를 무작위로 만들어, +5:45 Kathmandu, +14 Kiritimati, -11 Niue 등 대표 존 14개와 조합해 300번 돈다. 바로 다음 테스트는 같은 왕복을 `Intl.supportedValuesOf('timeZone')` 이 돌려주는 존 전부에 대해 존마다 12번씩 검사한다. 필자 로컬 Node 24.16 에서 그 목록은 418개다.

그렇다면 사용자가 넘긴 `"2026-01-15T00:00:00.000Z"` 를 라이브러리가 알아서 시점으로 정규화하면 되지 않을까? 문자열만 보고는 좌표인지 시점인지 알 수 없어서 이 길은 막혀 있다. 이미 시점인 서울 값 `2026-01-14T15:00:00.000Z` 에 `civilMidnightFromUtcDay` 를 다시 걸면 `2026-01-13T15:00:00.000Z` 가 되고, 렌더마다 걸면 하루씩 계속 밀린다. 여러 번 적용해도 결과가 같은 `startOfDayInTimezone` 으로 바꾸면 밀림은 없지만 좌표를 시점으로 바꾸는 원래 일을 못 한다.

그래서 정규화를 포기하고 계약을 문서로 고정했다. 소비자는 피커가 내보낸 값을 그대로 넘겨야 한다. 솔직히 소비자에게 떠넘긴 비용이고, `ISODateString` 이 `string` 의 별칭이라 컴파일러도 막아 주지 못한다. (브랜드 타입으로 둘을 가르는 방법은 아직 검토하지 않았다)

### Intl 만으로 DST 를 푸는 방법

좌표를 시점으로 바꾸려면 "그 존의 그날 00:00" 이 UTC 로 언제인지 알아야 하는데, 오프셋은 시점을 알아야 구할 수 있다. 게다가 DST 전환일에는 현지 시각이 없거나(spring forward) 두 번 있다(fall back).

Kalyx 는 `date-fns-tz` 같은 라이브러리 없이 이것을 푼다. `Intl.DateTimeFormat(...).formatToParts` 로 "이 UTC 순간이 그 존에서 몇 시인가" 를 물어 오프셋을 재고, 두 번 탐침한다.

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

`civilEpoch` 는 원하는 현지 시각을 UTC 인 것처럼 읽은 값이다. 그 지점의 오프셋으로 후보를 만들고, 후보 지점의 오프셋으로 다시 만들어 둘이 같으면 끝난다. 캘린더 그리드가 이 함수를 칸마다 42번 부르므로 이 빠른 경로가 비용을 결정한다.

둘이 다르면 spring forward 의 틈이다. 그때는 두 후보를 그 존에서 다시 읽어 요청한 시각과 일치하는지로 고른다(`timezone.ts:266-283`). 실제로 돌린 결과는 이렇다.

| 요청 (America/New_York) | 상황 | 결과 |
| --- | --- | --- |
| 2026-03-08 02:30 | 없는 시각 | `2026-03-08T07:30:00.000Z` (03:30 EDT, 앞으로) |
| 2026-11-01 01:30 | 두 번 있는 시각 | `2026-11-01T05:30:00.000Z` (01:30 EDT, 이른 쪽) |

"틈은 앞으로, 모호함은 이른 쪽" 은 [MDN 의 Temporal.ZonedDateTime 문서](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime)가 설명하는 `disambiguation` 기본값 `"compatible"` 과 같다. (Kalyx 소스 주석은 `'earlier'` 와 같다고 적는데, Temporal 의 `'earlier'` 는 틈에서 뒤로 가므로 정확히는 `'compatible'` 이다. 이 글을 쓰며 찾은 주석 오류다)

### 어댑터 경계는 문자열 메서드 21개다

타임존을 core 가 계산한다면 date-fns 나 dayjs 는 무엇을 맡을까? 날짜 산술과 파싱이다. 그 경계인 `DateAdapter` 는 메서드 21개이고 날짜 인자와 반환값이 전부 ISO 문자열이다.

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

타임존을 받는 메서드는 `format`, `isSameDay`, `startOfDay`, `today` 넷이고, 그 넷도 계산은 core 로 넘긴다. date-fns 어댑터의 `format` 은 `timezone` 이 있으면 core 의 `formatInTimezone` 을 바로 부른다(`packages/adapter-date-fns/src/index.ts:112-115`). 그래서 어떤 어댑터를 쓰든 타임존 답은 같은 코드에서 나오고, 세 어댑터(date-fns, dayjs, luxon)는 `@kalyx/core/test-helpers` 의 `runAdapterConformanceTests` 를 각자 돌려 같은 답을 내는지 확인한다.

두 엔트리도 이 경계 위에서 갈린다. 기본 엔트리 `@kalyx/react` 는 모듈 로드 시 `setDefaultAdapter(DateFnsAdapter)` 를 호출해 설치하면 바로 동작한다(`packages/react/src/index.ts:9-11`). `@kalyx/react/headless` 는 이 호출이 없고, tsup 의 `splitting: false` 로 번들이 물리적으로 분리돼 date-fns 코드가 들어가지 않는다. "날짜 라이브러리 의존 0" 은 이 엔트리와 `@kalyx/core` 에만 맞는 말이다.

이 경계 모양에는 대가가 있었다. 필자는 2026년 6월에 Temporal 어댑터를 접었다. Temporal 의 가치는 `PlainDate`, `ZonedDateTime` 처럼 **타입이 의미를 들고 다니는 데** 있는데, 경계가 문자열이면 그 의미가 통과하지 못한다. 감싸 봐야 문자열로 평탄화돼 core 의 Intl 코드로 되돌아갈 뿐이라 정확성 이득이 없다고 판단했다. 돌아보면 앞 절의 "좌표와 시점이 같은 `string`" 문제는 Temporal 이 `PlainDate` 와 `Instant` 로 타입에서 푸는 바로 그 문제다. 문자열 경계가 어댑터 교체를 쉽게 만든 대신 타입으로 풀 길은 막은 셈이다.

### 일곱 피커는 컨텍스트 세 개의 조합이다

Kalyx 의 피커는 DatePicker, RangePicker, TimePicker, DateTimePicker, MonthPicker, YearPicker, WeekPicker 일곱 종이다. 중요한 것은 개수보다 **일곱 개가 독립 구현이 아니라는 점**이다. 컨텍스트는 `DatePickerContext`, `RangePickerContext`, `TimePickerContext` 세 개뿐이다.

| 피커 | 상태를 가진 Root | 컨텍스트 | 차이를 만드는 곳 |
| --- | --- | --- | --- |
| DatePicker | `DatePickerRoot` | Date | |
| MonthPicker, YearPicker | DatePicker 의 Root 구현 | Date | `selectionGranularity` |
| RangePicker | `RangePickerRoot` | Range | |
| WeekPicker | `RangePickerRoot` 그대로 | Range | Calendar 에 `selectionMode="week"` |
| TimePicker | `TimePickerRoot` | Time | |
| DateTimePicker | 자체 Root | Date 와 Time 중첩 | 두 Provider 를 겹친다 |

MonthPicker 의 Root 는 표시 형식 기본값을 `yyyy-MM` 으로 바꾸고 DatePicker 의 Root 구현에 `selectionGranularity="month"` 를 넘길 뿐이다(`MonthPicker/Root.tsx:11-20`). DatePicker 의 `selectDate` 는 granularity 가 `month` 면 좌표를 그 달 1일로 접은 뒤 앞에서 본 변환과 제약 검사를 그대로 탄다. DateTimePicker 는 두 컨텍스트를 겹쳐 제공한다.

```tsx
// packages/react/src/components/DateTimePicker/Root.tsx:401-402
<DatePickerContext.Provider value={dateContext}>
  <TimePickerContext.Provider value={timeContext}>{children}</TimePickerContext.Provider>
```

그래서 `DateTimePicker.Calendar` 는 `DatePicker.Calendar` 와 같은 컴포넌트이고, 자기가 어느 피커 안에 있는지 모른다. 한 곳의 수정이 같은 컴포넌트를 쓰는 피커 전부에 닿고, 한 곳의 결함도 전부에 닿는다. 앞 도표에서 DatePicker 하나가 전부의 74% 였던 이유도 이 공유 기반이다. (처음 글에는 CI 가 Next.js App Router 빌드로 SSR 을 검증한다고 썼는데, 실제 CI 의 `ssr-check` 는 빌드된 CJS 와 ESM 을 Node 에서 import 하는 수준이라 그 문장도 걷어냈다)

그렇다면 이 계약이 실제로 무엇을 지켜 줬을까?

---

## 정확성 계약이 잡아낸 결함과 번들 천장

1.0 이후 석 달 동안 필자는 새 기능보다 이 계약을 확인하는 데 시간을 썼고, 예제 테스트로는 지나갔을 결함이 두 번 나왔다. 첫 번째는 속성 테스트가, 두 번째는 코드 교차 검토가 찾았고 그 결과 속성 테스트의 범위가 넓어졌다.

### Sydney 10월 1일의 한 시간

첫 번째는 "`startOfDayInTimezone` 의 결과를 그 존에서 읽으면 00:00:00 이다" 는 속성이 Australia/Sydney 에서 깨진 것이다. 당시 구현은 오프셋을 한 번만 쟀다. Sydney 는 2034년 10월 1일 02:00 에 +10 에서 +11 로 넘어가는데, 그날 00:00 은 아직 +10 이라 정답은 `2034-09-30T14:00:00.000Z` 다. 그런데 "10월 1일 00:00 을 UTC 로 읽은 지점" 은 전환 이후라 +11 을 돌려줬고, 결과는 전날 23:00 이었다. 지금은 두 번 탐침을 거치고, 이 반례는 회귀 테스트로 남아 있다(`timezone.property.test.ts:276`).

### 서울에서만 통과하던 테스트

두 번째는 2026년 8월 3일 교차 검토에서 나왔다. 캘린더에서 선택 표시할 칸을 정하는 코드가 변환을 두 번 하고 있었다. 칸은 이미 좌표인데 칸과 저장값을 둘 다 그 존의 날짜로 변환한 것이다. "1월 15일" 을 고른 결과는 이랬다.

| 존 | 저장값 | 선택 표시된 칸 |
| --- | --- | --- |
| `Asia/Seoul` (+9) | `2026-01-14T15:00:00.000Z` | 15일 (맞음) |
| `America/New_York` (-5) | `2026-01-15T05:00:00.000Z` | 16일 (틀림) |

양수 오프셋 존에서는 두 번의 밀림이 상쇄돼 우연히 맞았고, 기존 테스트는 서울만 덮고 있었다. 같은 점검에서 반대 방향 위반도 나왔다. 보여줄 월을 정할 때 시점에 `startOfMonth` 를 바로 걸어서, 서울에서 1월 1일을 값으로 주면 12월 달력이 열렸다. 기전은 달라도 어긴 규칙은 하나다. 변환은 방향마다 정해진 함수로 한 번만 한다.

이 사고로 core 의 왕복 속성 테스트가 "대표 존 몇 개" 에서 "런타임이 아는 존 전부" 로 넓어졌다. (React 쪽 컴포넌트 테스트는 아직 `America/New_York` 같은 대표 존을 쓴다) **부호가 바뀌는 자리에서만 드러나는 결함은 표본으로 잡히지 않는다.** 변환 호출이 여러 경로에 흩어져 있다는 사실도 이때 의미가 생겼다. 정확성은 한 함수가 아니라 경로마다 따로 샜던 것이다.

### 17KB 에서 20KB 로

이 수정들에는 코드가 들었다. Kalyx 는 기본 엔트리 번들에 CI 천장을 두고, 넘기는 PR 은 필수 체크에서 실패한다. 12KB 에서 시작해 기능이 들어올 때마다 1KB 씩 올리던 그 천장을, 2026년 8월 타임존과 제약 정확성을 전면 수정하면서 17KB 에서 20KB 로 한 번에 올렸다.

크기는 README 배지에 나가 있던 셀링 포인트였다. 그래도 망설이지 않았다. 음수 오프셋 존에서 하루씩 밀리는 날짜 피커는 작든 크든 쓸 수 없다. **작다와 맞다 중 하나를 골라야 한다면 맞는 쪽이다.**

지금 천장은 빠듯하다. 레포의 2026-09-11 번들 바이트 지도 문서에 따르면 `dist/index.cjs` 를 Node 기본 gzip 으로 잰 값이 20,259B, 천장이 20,480B 로 여유가 221B 다. (의존성을 외부로 남긴 자기 파일 크기라 앞 도표와는 다른 양이다) 다음 기능은 바이트를 먼저 회수해야 들어온다.

---

## 마무리

필자가 원한 것은 복잡한 날짜 라이브러리를 선언적으로 쓰는 것이었다. 만들고 나서 보니 선언적인 합성 API 와 헤드리스 완성형은 이미 있었다. 남은 차이는 더 안쪽에 있었다. **값을 시점 하나로 고정하고, 좌표와 시점 사이의 변환을 두 함수로 좁히고, 그 왕복을 모든 타임존에서 테스트로 지키는 것.** Intl 기반 DST 처리, 문자열 어댑터 경계, 컨텍스트 세 개로 만든 일곱 피커는 그 결정의 결과다.

공부라는 목표로 보면 가장 크게 배운 것은 "맞다" 를 주장하는 방법이었다. 처음 글의 번들 비교는 다른 양을 재고 있었고, 서울에서 통과하던 테스트는 뉴욕에서 틀리고 있었다. 둘 다 숫자와 테스트가 있었는데도 틀렸다. 무엇을 쟀고 어떤 표본으로 확인했는지를 함께 적지 않으면 숫자는 쉽게 자랑이 된다.

한계도 분명하다. 메인테이너는 필자 한 명이고, React 19 전용이며, `@kalyx/react` 의 npm 다운로드는 2026년 9월 5일부터 11일까지 200회였고 그중 156회가 1.4.7 배포일 하루에 몰려 있다. 좌표와 시점을 타입으로 가르지 못하는 문제는 문서로만 막고 있고, 스타일 접점인 `classNames` 와 `data-*` 속성을 공개 API 로 보장할지도 정하지 못했다.

그래서 이미 MUI 앱이라면 MUI X 를, 세그먼트 입력과 검증된 접근성이 우선이라면 React Aria 를, 캘린더 하나면 react-day-picker 를 먼저 보는 편이 맞다. 값이 JSON 으로 오가는 폼에서 날짜가 하루씩 밀리는 문제를 겪어 봤다면 그때 Kalyx 를 살펴봐 주시면 좋겠고, 더 좋은 풀이를 알고 있다면 GitHub Issue 로 알려 주시면 감사하겠다.

```bash
pnpm add @kalyx/react
```

문서 사이트의 [Playground](https://kalyx-docs-site.vercel.app/playground) 에서 일곱 피커와 locale, timezone 설정을 직접 바꿔 볼 수 있다.

:::ref

[docs] [Kalyx 공식 문서 사이트](https://kalyx-docs-site.vercel.app/)

[docs] [MUI, Date and Time Pickers Timezone](https://mui.com/x/react-date-pickers/timezone/)

[docs] [Floating UI 공식 문서](https://floating-ui.com/)

:::
