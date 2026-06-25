---
emoji: 📅
title: 'Kalyx'
seoTitle: 'Kalyx, React 19 헤드리스 DatePicker 라이브러리 직접 만든 회고와 4가지 설계 결정'
date: '2026-06-17'
categories: ignore 라이브러리 React DatePicker 오픈소스
description: 'React 프로젝트에서 DatePicker를 고를 때마다 헤드리스, 번들 사이즈, 7개 primitive 전부 중 한두 가지는 늘 포기해야 했다. 그래서 직접 만들었다. 약 16KB gzip, 7 primitive, ISO 문자열 API, 어댑터 패턴까지 Kalyx에서 내린 4가지 핵심 결정을 정리한다.'
keywords: 'Kalyx, React DatePicker, headless DatePicker, react-day-picker, react-datepicker, 헤드리스 라이브러리, 번들 사이즈, ISO-8601 timezone, Composition pattern, 어댑터 패턴, Radix dot notation, Ark UI, MUI X DatePicker'
---

이번 포스팅에서는 필자가 직접 만들고 최근 1.0으로 출시한 React 헤드리스 DatePicker 라이브러리 **Kalyx** 에 대한 이야기를 해보려고 한다.

필자는 프론트엔드 개발자로 일하면서 SaaS 폼을 다루는 프로젝트를 자주 맡는다. 그러다 보면 거의 모든 페이지에서 날짜 입력이 필요해진다. 단일 날짜, 기간, 시간, 월/연 단위 점프, 거기에 timezone까지. 그런데 지난 1년간 새 프로젝트를 시작할 때마다 같은 벽에 부딪쳤다. (라이브러리 하나로 깔끔하게 해결되는 케이스가 단 한 번도 없었다는 게 솔직한 경험이다.)

세 번째로 `react-day-picker` 위에 직접 만든 TimePicker와 어디서 빌려온 Popover를 스티칭하고 있던 어느 날, 진짜 원했던 API 모양을 노트에 적기 시작했다. 그 노트가 결국 Kalyx 1.0의 공개 API가 되었다. 이 글은 만든 사람 입장에서 정리한 1년의 의사결정 기록이다. 왜 만들었는지, 4가지 핵심 결정의 트레이드오프는 무엇이었는지, 그리고 1.0 출시 후 사용자가 거의 없는 상태에서 시간을 어디에 썼는지까지 가감 없이 적어보려고 한다.

---

## React DatePicker는 왜 어려운가

먼저 시장 상황을 잠깐 짚어둘 필요가 있다. 필자가 부딪친 벽이 라이브러리 선택의 문제가 아니라 **트레이드오프 자체의 문제**였다는 걸 보여주는 부분이기 때문이다.

2026년 6월 기준 React 생태계에서 자주 쓰이는 DatePicker 후보들을 한 표에 모아봤다. (npm 다운로드 수는 2026년 6월 시점 주간 기준이다.)

| 라이브러리 | 주간 다운로드 | 잘하는 것 | 강요하는 것 |
| --- | --- | --- | --- |
| **react-day-picker** | 약 42M | 깔끔한 헤드리스 Calendar | Calendar grid만. v10에서도 Input, TimePicker는 공식 미지원 |
| **react-datepicker** | 약 4.7M | 모든 primitive 한 번에 번들 | CSS import 필수. value가 native `Date`. props 100개+ |
| **Ark UI** | 점유율 성장 중 | Composition + 헤드리스 | standalone TimePicker 없음. 시간은 DatePicker 안에서만 |
| **MUI X** | 점유율 높음 | 통합 + 엔터프라이즈 | 약 58KB gzip. RangePicker는 Pro 유료 라이선스 |
| **React Aria** | 약 5.9M | spec 수준의 접근성 | `@internationalized/date` 강제. date-fns 코드베이스와 비호환 |
| **Headless UI** | Tailwind와 함께 | 헤드리스 패턴의 선구자 | "유지 보수 비용이 너무 큼"이라며 만들기 거부 |

한 기능씩 따로 떼서 보면 승자를 쉽게 고를 수 있다. 그런데 현실의 작업 단위는 한 기능이 아니다. 한 SaaS 폼 안에서 단일 날짜 입력, 범위 필터, 시간 선택, 월/연 점프가 동시에 필요한 케이스에서는 **전부를 충족하는 라이브러리가 하나도 없었다**.

특히 흥미로운 건 Headless UI 메인테이너의 태도다. Tailwind Labs 측은 [GitHub Discussion #289](https://github.com/tailwindlabs/headlessui/discussions/289)에서 DatePicker 요청을 사실상 보류해 왔다. 2021년에 열린 이 스레드는 5년이 지난 지금까지 메인테이너 답변 없이 열려 있고, `@headlessui-react` 소스 트리에 날짜 관련 컴포넌트는 단 하나도 없다. Tailwind 사용자는 결국 React Aria로 안내된다. Locale, timezone, DST, 다양한 캘린더 시스템, 접근성, 키보드 내비게이션이 모두 동시에 충돌하는 영역이 DatePicker라는 점을 생각하면, 그 보류는 충분히 이해되는 진단이다. (필자도 직접 만들어보고 나서야 그 부담의 크기를 체감했다.)

Ark UI의 사례도 같은 신호를 보낸다. Chakra UI 팀이 만든 Ark UI에는 **standalone TimePicker 컴포넌트가 없다**. 시간 선택은 `@internationalized/date`의 `CalendarDateTime`을 통해 DatePicker 내부에서만 다뤄진다. 즉 Tailwind 사용자가 "시간만" 따로 조합해 쓸 수 있는 독립 primitive가 아니다. (필자도 처음엔 "Ark가 TimePicker를 버렸다"고 거칠게 이해했는데, 문서를 다시 읽어보니 정확히는 "처음부터 독립 컴포넌트로 분리하지 않았다"는 쪽이 맞았다. 헤드리스 라이브러리의 표준급 팀조차 TimePicker를 별도 primitive로 떼어내는 건 신중하게 다뤘다는 점이 핵심이다.)

여기까지 보면 자연스럽게 떠오르는 질문이 하나 있다. "그러면 이 트레이드오프를 한 라이브러리 안에서 풀 방법이 정말로 없는 걸까?"

---

## Kalyx의 자리

Kalyx는 그 질문에 대한 필자 나름의 답이다. 한 줄로 정의하면 **"CSS import 없이 설치 즉시 동작하고, 어떤 스타일링 방식으로도 자유롭게 커스터마이징 가능한 React 헤드리스 DatePicker"** 다.

1.0에서 ship한 것들을 정리해 보면 이렇다.

- **7개 primitive 컴포넌트**: `DatePicker`, `RangePicker`, `TimePicker`, `DateTimePicker`, `MonthPicker`, `YearPicker`, `WeekPicker`
- **3개 Headless Hook**: `useDatePicker`, `useRangePicker`, `useTimePicker` (라이브러리가 주는 UI를 전부 버리고 본인 UI를 만들고 싶을 때 쓰는 진입점)
- **단일 Composition API**: 7개 primitive 모두 같은 Context와 dot notation 패턴 사용
- **약 16KB gzip (ESM)**: 17KB 천장 안에서 완성
- **CSS import 0개**: Tailwind, CSS Modules, vanilla CSS, 무엇이든 자유

API는 이렇게 생겼다.

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

같은 패턴이 7개 primitive 모두에 반복된다. `showTimeSelect`, `showMonthDropdown` 같은 boolean 폭탄 props는 단 하나도 없다.

포지셔닝을 한 그림으로 그려보면 이렇다.

![Kalyx의 포지셔닝 다이어그램](그림이나자료필요(AI 이미지 생성 프롬프트: 4개의 라이브러리 박스를 +로 연결한 합성 다이어그램, 위에서부터 "react-day-picker의 헤드리스 철학", "react-datepicker의 통합 primitive 세트", "shadcn의 Composition 패턴 & Tailwind 친화성", "Ark UI에 없는 standalone TimePicker 통합" 순서로 박스 표현, 각 박스 아래 +기호 연결, 맨 아래 화살표로 "= Kalyx" 박스로 수렴, 미니멀 플랫 디자인, 흑백 톤)

기존 라이브러리들의 좋은 부분만 골라 모은 합집합 위에, 한 가지를 더 얹은 셈이다. **Ark UI에 standalone으로 존재하지 않는 TimePicker까지 같은 Composition 안에 독립 primitive로 통합한다는 결정.**

---

## 4가지 핵심 결정

설계 단계에서 내린 결정 중 가장 무겁고 회수가 어려운 4가지를 정리해 둔다. 1.0 API가 freeze된 지금 시점에서 보면 이 4가지가 다른 모든 결정을 강제했다고 봐도 된다.

### Composition over Props

처음 디자인 초안은 `<DatePicker showTime showMonthGrid presets={[...]} renderHeader={(props) => ...} />` 형태였다. 사실상 `react-datepicker` 기본 패턴이다. 일주일 동안 props 간 상호작용을 깨끗하게 타입으로 표현해 보려다 결국 지워버렸다.

이유는 명확했다. **Props 폭발의 진짜 비용은 type safety 손실이다.** `showTimeSelect` 가 `true` 일 때만 `timeFormat` 이 의미 있는데, 타입 시스템은 이 조건부 의존성을 그대로 표현하지 못한다. discriminated union으로 풀려고 들면 props 인터페이스가 50개 단위로 폭발하고, 한 prop을 추가할 때마다 전체 조합을 다시 검증해야 한다. (이 부분은 필자가 이전에 정리한 [추상화](/260201) 글의 "잘못된 추상화는 결합도를 늘린다"는 관점과 정확히 같은 맥락이다.)

이 문제를 가장 우아하게 풀어낸 사례가 Radix UI와 shadcn/ui의 dot notation 패턴이다. 제약을 callsite에 명시하는 방식이다.

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

비용은 명확하다. 한 줄짜리 `<DatePicker>` 가 6줄짜리 JSX 블록으로 늘어난다. 대신 얻는 것이 분명하다.

- 1년 뒤에 다시 봐도 읽히는 명료함
- prop 조합 사이에 leak 없는 타입
- 모든 subcomponent가 자기 `classNames` slot map을 가져서 무한 확장 가능한 스타일링 표면

구현은 `Object.assign` 패턴으로 단순하게 묶는다.

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

트리 쉐이킹 친화적이고, 컴포넌트별 `index.ts` 한 군데에서만 묶여서 namespacing 충돌도 없다. (Radix UI를 처음 봤을 때 "이걸 왜 표준이라고 부르는지" 와닿지 않았는데, 직접 라이브러리를 만들어보고 나서야 이 패턴이 왜 그렇게 빠르게 업계 표준이 되었는지 이해됐다.)

### ISO-8601 문자열 in/out

Kalyx의 `value` 는 `string | null` 이다. ISO-8601 UTC 형식의 문자열이고, `onChange` 도 같은 형태의 문자열을 돌려준다. 공개 API 어디에도 native `Date` 객체가 등장하지 않는다.

"당연한" 대안은 `Date` 객체다. 그리고 그게 native Date를 쓰는 모든 DatePicker에서 몇 년째 닫히지 않고 열려 있던 이슈들의 근원이다. timezone offset이 어긋나고, `JSON.stringify` round-trip이 깨지고, SSR에서 서버와 클라이언트가 다른 값을 만들어낸다. `react-datepicker`의 대표적인 timezone 이슈 [#1018](https://github.com/Hacker0x01/react-datepicker/issues/1018)은 2017년에 열려 8년을 끌다가, 2025년에 와서야 "이건 버그가 아니라 JavaScript `Date`의 예상된 동작"이라는 결론으로 닫혔다. 소스 변경 없이 문서만 추가하고 종결된 것이다. 라이브러리가 native `Date`를 value 타입으로 쓰는 한, 이 종류의 마찰은 구조적으로 사라지지 않는다.

ISO-8601 문자열로 강제하면 얻는 보장이 셋이다.

- **wire-safe**: `JSON.stringify` 후 다시 받아와도 byte-for-byte 같은 문자열
- **SSR 안전**: 서버와 클라이언트가 같은 문자열로 hydrate
- **timezone을 명시하게 강제**: `displayTimezone="Asia/Seoul"` 처럼 consumer가 어디 시간대로 표시할지 선언해야 함

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

같은 ISO 값을 다른 timezone으로 표시하는 시나리오가 자연스럽게 표현된다.

```tsx
const iso = "2026-01-15T15:00:00.000Z";

<DatePicker value={iso} displayTimezone="Asia/Seoul" />       // 2026-01-16 00:00
<DatePicker value={iso} displayTimezone="America/New_York" /> // 2026-01-15 10:00
```

비용은 분명히 있다. `Date` 객체가 필요한 downstream 코드에서는 `new Date(iso)` 를 직접 호출해야 한다. 다만 그 boundary를 라이브러리가 아니라 consumer 코드 한 곳에 모으는 게, 라이브러리 전체에 `Date` 객체를 흘리는 것보다 훨씬 낫다고 판단했다. (한번 객체로 받기 시작하면 그 객체가 어디까지 흘러갔는지 추적할 수 없게 된다는 게 필자가 여러 프로젝트에서 학습한 교훈이다.)

DST 같은 경계는 `@kalyx/core`의 Intl 기반 timezone 유틸리티가 처리한다. 어댑터 인터페이스가 아니라 core 안에 `civilMidnightFromUtcDay`, `setTimeInTimezone`, `startOfDayInTimezone` 같은 함수로 모여 있고, 모두 `Intl.DateTimeFormat`을 기반으로 동작한다. 해당 timezone의 자정(civil midnight)을 UTC로 변환할 때 DST 경계를 정확히 계산해서, 사용자가 IANA timezone 문자열만 넘기면 나머지는 라이브러리가 책임진다. (이 timezone 로직이 어댑터가 아니라 core에 박혀 있다는 점이 중요하다. date-fns든 dayjs든 어떤 어댑터를 쓰든 timezone 정확성은 동일한 core 코드가 보장한다.)

### 어댑터 패턴

`@kalyx/core`는 date-fns 의존이 0이다. 같은 `DateAdapter` 인터페이스(21개 메서드)를 구현한 `@kalyx/adapter-date-fns`가 별도 패키지로 분리되어 있고, `@kalyx/react`가 Context로 adapter를 주입받는 구조다. 흥미로운 건 어댑터 자체는 약 200줄짜리 얇은 shim이라는 점이다. 인터페이스 21개 메서드 중 timezone을 인자로 받는 건 4개(`format`, `isSameDay`, `startOfDay`, `today`)뿐이고, 그 4개조차 실제 timezone 계산은 전부 core의 Intl 유틸리티로 위임한다. 어댑터의 역할은 날짜 산술과 파싱을 특정 라이브러리 문법으로 매핑하는 것이지, 정확성을 책임지는 게 아니다.

패키지를 분리한 결과는 이렇게 정리된다.

```
@kalyx/core               # 플랫폼 독립 로직 + Intl 기반 timezone, date-lib 의존 0
@kalyx/adapter-date-fns   # default adapter (별도 패키지)
@kalyx/react              # 컴포넌트 (default로 adapter-date-fns 자동 wire)
@kalyx/react/headless     # zero date-lib entry, 자기 adapter 들고 옴
```

설계 단계에서 검토한 옵션이 셋이었다.

| 옵션 | 장점 | 단점 |
| --- | --- | --- |
| A. core에 date-fns 박음 | 구현 간단, 초보자 onboarding 쉬움 | major bump 없이 교체 불가 |
| B. core 완전 BYO만 | 미래 적응 가능 | 초보자가 매번 adapter 직접 구성 |
| C. Hybrid (default + 교체 가능) | 초보자 편의 + 진지한 사용자 escape | 패키지 2개 분리 + entry 2개 관리 |

C를 골랐다. 0.x 시절에는 사실 A로 시작했었는데, v1 stable에서 API freeze 직전에 깨달았다. **한 번 박힌 date 라이브러리는 major bump 없이는 빼지 못한다.** 그 시점에 어댑터 추출을 단행한 게 1.0 졸업 전 가장 큰 결정이었다.

이후 ship할 어댑터들도 같은 21개 메서드 계약을 따른다. 구현만 다를 뿐이다.

- `@kalyx/adapter-dayjs`: 통계상 React 사용자 약 절반이 dayjs를 쓰고 있어 우선순위 1 (Mantine은 dayjs를 강제 peer로 못박아두기도 했다)
- `@kalyx/adapter-luxon`: 엔터프라이즈와 timezone 심화 케이스
- Temporal: TC39 Temporal API 대응은 어댑터가 아니라 core 레벨에서 풀어야 한다는 게 추출 이후 내린 결론이다. 어댑터 인터페이스가 ISO 문자열 in/out이라 Temporal 고유 역량을 그대로 실어 나르지 못하기 때문이다. (이 판단은 뒤의 "현재 상태" 절에서 다시 다룬다.)

### 17KB 천장

1.0 출시 시점의 번들은 ESM 약 15.8KB / CJS 약 15.9KB gzip이었다. 천장은 처음 16KB로 잡았다가 v1.1에서 17KB로 한 칸 올렸다(이유는 뒤에서 다룬다). CI가 이 천장을 강제한다. 모든 PR이 `pnpm check-bundle`을 돌리고, 천장을 넘기는 PR은 빌드가 fail한다.

이 숫자는 임의로 잡은 게 아니다. 시장의 기준선을 의식하고 정한 숫자다.

- `react-day-picker`: Calendar 하나만 약 22KB
- `react-datepicker`: 모든 primitive 합쳐서 약 40~60KB
- `MUI X`: 약 58KB (그나마 Range는 Pro 유료)
- `Kalyx`: 7개 primitive를 `react-day-picker`의 Calendar 하나보다 작게

번들 변천사도 RC 단계별로 추적해 뒀다.

| 단계 | 변경 | 천장 |
| --- | --- | --- |
| rc.0 | 7 primitive 초기 완성 | 12 → 13KB |
| rc.3 | grid 키보드 내비게이션 (Arrow/Page/Home/End) | 13 → 14KB |
| rc.4 | MonthPicker/YearPicker disabled month/year prop | 14 → 15KB |
| rc.8 | TimePicker `filterTime` 프로그래밍 콜백 | 15 → 16KB |
| 1.0.0 | 최종 안정화 (2026-06-08) | ESM 15.8KB / CJS 15.9KB |
| 1.1 | a11y `announce()` 라이브 리전 패리티 | 16 → 17KB |

각 상향마다 "왜 늘렸는지"를 명시한다. 1KB씩 흐지부지 새는 게 아니라 의도된 결정이 되도록. 그리고 거절한 기능도 명확하게 남겨뒀다. RTL 모드, holiday plugin, virtualized year/month grid는 의도적으로 제외했다. 17KB 천장 기준으로 실제 working headroom은 CJS 약 126바이트, ESM 약 221바이트밖에 안 남았다(둘 중 더 빡빡한 CJS가 binding 기준이다). 다음 런타임 기능을 넣으려면 둘 중 하나여야 한다. (a) 기존 코드를 다이어트해서 새 기능을 그 안에 욱여넣거나, (b) 의도적으로 천장을 또 올리고 공지하거나. (반대로 테스트나 별도 어댑터 패키지, `/headless` 엔트리처럼 기본 번들 그래프에 안 올라가는 작업은 예산을 건드리지 않는다.)

천장 수정은 여러 파일 동기화가 필요하다. `scripts/check-bundle-size.js`의 `TARGET_KB`, `tsup.config.ts`, CI 워크플로우들. 일부러 귀찮게 만들어 뒀다. (한 군데만 바꾸면 슬그머니 상향되기 십상이라, 천장을 옮기는 결정이 무거워지도록 설계했다.)

여기까지가 라이브러리 코드 자체에 박힌 4가지 결정이다. 그렇다면 실제 빌드 과정에서는 어떤 일들이 있었을까?

---

## 1.0 빌드 과정

### 0.x에서 1.0까지 RC 14단계

7개 primitive를 모두 갖춘 rc.0를 2026년 5월 27일에 태깅했다. 거기서부터 14번의 RC 이터레이션을 거쳐 6월 8일에 1.0.0 stable로 졸업했다. 약 12일이다. (필자는 이 속도가 옳았다고 생각하지 않는다. 더 천천히, 한 번에 한 가지만 다듬는 게 정석이지만 1인 메인테이너의 한계상 한 번 빌드 모드에 들어갔을 때 빠르게 끝내야 했다.)

중간에 들어간 굵직한 작업들이다.

- **보안 fix**: GHSA-5xrq-8626-4rwp Critical 등급 취약점 (vitest 4 업그레이드)
- **어댑터 중립 추출**: `@kalyx/core` 에서 date-fns 의존을 0으로 분리
- **`@kalyx/adapter-date-fns` 별도 패키지화**
- **`@kalyx/react/headless` 추가 entry**: zero date-lib 사용자 대상

테스트 기준선도 1.0 졸업 조건으로 박아뒀다. unit test 497/497 통과, axe 접근성 14/14, e2e 시나리오 31개.

### Aurora 시각 통합

1.0 출시 직후 받은 가장 인상적인 피드백은 사용자가 직접 보낸 한 줄짜리 메시지였다. **"개 못 생기고 더럽고 추잡해"**. HeroDemo 스크린샷 3장이 첨부되어 있었다. (라이브러리 코드는 아무리 좋아도 데모가 안 좋으면 클릭이 0이라는 걸 그때 체감했다.)

증상은 명확했다. Calendar grid에 격자선이 새고, MonthPicker 셀이 가로로 늘어나고, DateTimePicker가 답답하게 좁았다. 진단해 보니 두 CSS 시스템이 갈라진 결과였다. `.kx-live-*` 와 HeroDemo 안의 `:global([role='grid'])` 가 별도로 발전하면서, 한쪽에서 픽스한 게 다른 쪽에 묻지 않는 상태였다.

해결책은 재설계가 아니라 **통합 후 폴리시 한 번**이었다. 7회의 시각 이터레이션 (v1 → v7) 끝에 Aurora 토큰 시스템을 확정했다. single source of truth는 `apps/docs-site/src/css/custom.css` 한 파일. 모든 picker가 같은 토큰을 공유하도록 강제했다.

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

이 과정에서 박제해 둔 함정 3가지를 공유한다. 헤드리스 컴포넌트를 다른 환경(특히 Docusaurus 같은 문서 사이트)에 임베드할 때 정확히 같은 문제를 겪을 가능성이 크다.

첫째, **Docusaurus Infima의 `table th, td` 규칙이 모든 `<table>` 에 침투한다**. 그래서 Calendar grid에 격자선이 새는 현상이 발생한다. CSS 모듈로 격리하거나, 명시적으로 reset을 깔아야 한다.

둘째, **`<table role="grid">` 에는 `display: grid` 를 못 쓴다.** `<thead>/<tbody>/<tr>` 가 grid item이 되어 버려서, 정작 7개 column이 `<td>` 까지 내려가지 않는다. 결국 `display: table` + `table-layout: fixed` + 명시 width 조합으로 풀어야 한다.

셋째, **Range 시각화는 비대칭 라운드 처리**다. start는 좌측만, end는 우측만, middle은 모서리 없이. 통일하면 셀이 "동동 떠 보이는" 느낌이 들어서 직관적인 시각 그루핑이 깨진다.

### 사용자 0명일 때 시간을 어디에 썼나

1.0 출시 1주차 데이터는 솔직하게 공개해 두면 좋겠다.

- GitHub stars 5개, forks 0개, watchers 0명
- npm 주간 다운로드 480회 (대부분 CI 미러봇으로 추정)
- 직접 종속하는 패키지 0개

이 상황에서 어디에 시간을 쓸지가 두 갈래로 갈렸다. (a) 새 기능을 더 보강한다, (b) 새 트랙(React Native adapter 같은)으로 확장한다. 그런데 둘 다 ROI가 낮았다. 외부 사용자가 0이라 새 기능은 검증이 안 되고, 새 트랙도 사용자가 생긴 다음에 진입하는 게 효과적이다.

그래서 **첫 30초 인상**에 시간을 쓰기로 했다. 사용자가 GitHub 저장소나 docs 사이트에 처음 들어와서 30초 안에 "이 라이브러리 써볼 만하다"고 판단할지 말지가 결정되는 구간이다. PR 5건으로 정리했다.

| PR | 내용 |
| --- | --- |
| A1 | hero animated WebP recorder + `<HeroDemo>` 컴포넌트 + `/recorder` 라우트 |
| A2 | landing 리디자인. 6 sections (Hero/FeatureGrid/SameJsxBlock/PickerGrid/WhyKalyx/GetStarted) |
| B | sandbox 인프라. `<StackBlitzEmbed>` + 7개 `examples/*` 프로젝트 |
| C | `/playground` interactive. picker selector + classNames editor + locale/timezone toggles |
| D | `/docs/comparison` 페이지 + inline SVG 번들 차트 |

이 과정에서 한 가지 배운 게 있다. **localhost Lighthouse 점수와 실제 Vercel 배포 환경 점수는 10점 이상 차이가 날 수 있다.** Issue #103에서 localhost simulate 모드로 측정한 점수가 72 → 61로 −11점 회귀로 보였는데, 같은 변경을 Vercel에 배포한 뒤 실측한 점수는 73~74로 오히려 +1~2점이었다. localhost simulate는 측정 환경 자체가 만들어내는 artifact였던 것이다. (성능 회귀를 잡을 때 localhost 숫자에만 의존하면 잘못된 결정을 내리기 쉽다는 걸 이때 학습했다.)

솔직히 말하면, 이 "첫 30초" 투자는 결과적으로 큰 효과를 보지 못했다. 외부 사용자가 0인 상태에서 데모와 랜딩을 다듬는 건 들어오지 않는 손님을 위해 가게를 청소하는 일에 가까웠다. 그래서 이후엔 방향을 바꿨다. 홍보 표면을 다듬는 것보다 **core의 정확성을 검증 가능한 자산으로 만드는 쪽**이 1인 메인테이너에게 ROI가 높다고 판단했다. (이 결정의 구체적인 결과는 뒤의 "현재 상태" 절에서 정리한다.)

---

## 기술 구조 짚어보기

여기서부터는 직접 라이브러리를 만들 사람이나, 안쪽이 어떻게 동작하는지 궁금한 사람을 위한 짧은 투어다. (사용 목적이라면 이 섹션은 건너뛰어도 무방하다.)

### Context + Dot Notation 구현

각 primitive는 Root 컴포넌트가 Context Provider를 만들고, 모든 subcomponent가 같은 Context를 consume한다.

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

이 패턴의 핵심은 같은 Context를 공유하는 컴포넌트들이 한 `Object.assign` 묶음 안에 들어가 있다는 점이다. consumer는 `<DatePicker.Input>` 처럼 자연스럽게 호출하고, 트리 쉐이커는 사용하지 않는 subcomponent를 자동으로 제거한다.

### Headless Hook

라이브러리가 주는 컴포넌트를 전부 무시하고 완전히 자기 UI를 만들고 싶다면 Hook을 직접 쓴다.

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

상태 머신은 컴포넌트가 쓰는 것과 정확히 같다. 위 Hook 코드와 `<DatePicker>` JSX는 같은 핵심 로직 위에서 동작한다. (이 구조 덕분에 라이브러리 API를 두 트랙으로 유지할 필요가 없다.)

### SSR 안전성

Next.js App Router에서 살아남는 패턴을 처음부터 강제했다.

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

포지셔닝은 Floating UI를 쓴다. Popper.js의 후계자로, SSR 안전하고 약 3KB 수준의 경량 라이브러리다. CI에서 Next.js App Router 빌드로 `renderToString` 에러 없이 통과하는지 매번 검증한다.

### 접근성

WAI-ARIA roles는 spec대로 박혀 있다.

- Calendar grid → `role="grid"`, 셀 → `role="gridcell"`
- Input + Popover → `role="combobox"` + `aria-expanded`
- HourList / MinuteList → `role="listbox"`

키보드 내비게이션 매핑도 spec에 가깝다. Arrow keys로 셀 이동, PageUp/Down으로 월 이동, Shift+PageUp/Down으로 연도 이동, Home/End로 주의 시작과 끝, Enter로 선택, Escape로 Popover 닫기.

axe로 자동화된 접근성 검증 14건 모두 통과. ARIA 라벨도 다국어 커스터마이징이 가능하다.

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

`@kalyx/core` 가 `ko-KR` 을 포함한 여러 locale의 기본 라벨을 제공한다.

---

## 현재 상태와 인정하는 한계

### 1.0 이후, 실제로 ship한 것 (v1.1 기준)

이 글의 앞부분은 1.0 출시 시점의 회고지만, 글을 정리하는 지금은 라이브러리가 v1.1로 넘어왔다. 회고가 "계획"으로만 남지 않도록, 실제로 ship된 것과 방향이 바뀐 것을 정확히 적어둔다.

당장의 다음 마일스톤으로 잡았던 어댑터 확장은 일부 실현됐다.

- **`@kalyx/adapter-dayjs` 출시 완료**: React 사용자 통계상 dayjs 점유율이 약 절반에 가깝고, Mantine처럼 dayjs를 강제 peer로 못박는 생태계가 있어 우선순위 1로 잡았던 어댑터가 별도 패키지로 publish됐다.
- **`@kalyx/core/test-helpers` conformance suite 추가**: 새 어댑터가 추가될 때마다 같은 21개 메서드 계약을 자동으로 검증하는 형태로 모듈화했다. `runAdapterConformanceTests(adapter, { describe, it, expect })` 한 줄이면 어떤 어댑터든 동일한 정확성 기준으로 통과 여부를 검증한다. 어댑터를 "약속"에서 "검증된 실력"으로 옮기는 척추 작업이었다.
- **`@kalyx/adapter-luxon`**: 엔터프라이즈와 timezone 심화 케이스 대상으로 conformance suite 위에서 비용 낮게 추가 가능한 다음 후보다.

반대로, 계획에서 **드롭한 것**도 솔직하게 남긴다.

- **`@kalyx/adapter-temporal`은 어댑터로 만들지 않기로 했다.** 어댑터 인터페이스가 ISO-8601 문자열 in/out이라, Temporal 고유의 역량(`PlainDate`, `ZonedDateTime` 같은 타입 안전한 시간 모델)을 그대로 실어 나르지 못한다. 어댑터로 감싸면 결국 ISO 문자열로 평탄화되어 core의 Intl 코드로 재위임될 뿐이라 정확성 이득이 0이었다. Temporal 대응은 어댑터가 아니라 core 레벨 전략으로 보존하는 게 맞다는 결론을 내렸다.

사용자 시그널 기반으로 검토 중인 항목들은 따로 묶어 둔다.

- **누락된 headless hook**: 현재 hook은 Date/Range/Time 3종뿐이다. Month/Year/Week/DateTime용 hook은 `/headless` 엔트리 전용으로(기본 번들 천장을 건드리지 않도록) 추가할 계획이다.
- **fast-check 속성 테스트**: 날짜 계산 같은 순수 함수는 예제 기반 테스트보다 속성 기반 테스트가 해자를 더 두껍게 만든다. core 정확성 강화의 최우선 항목으로 끌어올렸다.
- **Integration recipes**: React Hook Form / Zod 등 폼 라이브러리 연동 가이드.
- **RTL 모드 / Holiday plugin**: 번들 마진이 허용되거나 명확한 요구가 발생할 때.

보류한 트랙도 명시한다. React Native adapter는 로드맵엔 있지만 웹 사용자가 먼저다. 비-Gregorian 캘린더(Persian/Buddhist/Islamic/Hebrew)는 GitHub 이슈가 일정 수 이상 모이거나 엔터프라이즈 스폰서가 생길 때 착수한다.

### 솔직하게 인정하는 한계

마지막은 라이브러리를 고려 중인 분들을 위한 솔직한 디스클로저다. (필자는 신생 라이브러리에 과대 마케팅을 얹는 게 결국 신뢰를 깎아먹는다고 본다.)

- **1인 메인테이너**: 월 1 minor가 가능한 페이스. 요구가 있을 때 우선순위가 조정된다.
- **신생 라이브러리**: 사용자 베이스가 작아서 edge case의 첫 발견자가 될 가능성이 적지 않다. 테스트 커버리지도 picker 사이에 편중이 있다(예: WeekPicker는 가장 얇다).
- **React 19+ 전용**: RSC, `useId`, `useLayoutEffect` 경고 없음, `<Input>`의 form-action 통합 같은 19의 leverage point에 의존한다. 18 back-port는 하지 않는다.
- **"battle-tested" 주장 없음**: 신생 라이브러리에 그 단어를 쓰지 않는다. 대신 갖춘 것은 primitive별 unit test 수백 건, axe 전건 통과, Next.js App Router CI에서 SSR 검증, 그리고 어댑터 conformance suite다.

100K 배포급 안정성이 오늘 필요하다면 솔직히 `react-datepicker`가 안전한 선택이다. Kalyx는 더 작고 더 헤드리스한 미래에 거는 **베팅**에 가깝다. 그 베팅의 첫 번째 베터가 되어 줄 사람을 기다리는 중이다.

---

## 마무리

이 글은 라이브러리 홍보 글이라기보다 1년의 의사결정 회고 글에 가깝다. 무엇을 ship 했고, 무엇을 거절했고, 어떤 부분에서 결정이 무거웠는지를 정리해 두는 게 다음 라이브러리를 만들 때 (혹은 다른 라이브러리를 평가할 때) 가장 큰 자산이 되더라는 게 필자의 경험이다.

Composition over Props, ISO 문자열 강제, 어댑터 패턴, 번들 천장. 4가지 결정 모두 단기 편의를 일부 포기하고 장기 적응성을 산 결정이다. 그게 옳았는지는 사실 1년 뒤에야 평가할 수 있을 것 같다. (지금 시점에서 확실히 말할 수 있는 건, 이 4가지를 정하지 않았다면 라이브러리가 1.0에 도달하지 못했을 거라는 것 정도다.)

혹시 React 프로젝트에서 DatePicker 때문에 비슷한 벽에 부딪쳐 본 적이 있다면, Kalyx를 한 번 살펴봐 주시면 좋겠다. 그리고 더 좋은 방법으로 같은 문제를 풀어본 경험이 있다면, 부담 없이 GitHub Issue로 던져주시면 정말 감사할 것 같다. 결국 라이브러리는 만든 사람 한 명이 아니라 같이 쓰는 사람들이 함께 다듬어 가는 물건이라고 생각한다.

설치는 한 줄이다.

```bash
pnpm add @kalyx/react
```

문서 사이트의 [Playground](https://kalyx-docs-site.vercel.app/playground) 에서 7개 picker를 바로 손에 쥐고 만져볼 수 있다. locale과 timezone을 토글하고, classNames를 직접 편집해 본인 디자인 토큰을 입혀보는 것도 가능하다.

:::ref

[repo] [jiji-hoon96/kalyx](https://github.com/jiji-hoon96/kalyx)

[docs] [Kalyx 공식 문서 사이트](https://kalyx-docs-site.vercel.app/)

[repo] [Tailwind Labs Headless UI DatePicker Discussion](https://github.com/tailwindlabs/headlessui/discussions/289)

[docs] [Ark UI DatePicker 문서](https://ark-ui.com/docs/components/date-picker)

[docs] [Radix UI Composition 패턴](https://www.radix-ui.com/primitives/docs/overview/introduction)

[docs] [React Aria 헤드리스 컴포넌트 가이드](https://react-spectrum.adobe.com/react-aria/)

[docs] [Floating UI 공식 문서](https://floating-ui.com/)

:::
