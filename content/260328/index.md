---
emoji: 🛠️
title: 'Toss Frontend Fundamentals 모의고사 2회차 리팩토링 후기'
seoTitle: 'Toss Frontend Fundamentals 모의고사 2회차 리팩토링 — 컴포넌트 분리와 도메인 로직 추출'
date: '2026-03-28'
categories: 프론트엔드 React 리팩토링
description: "Toss Frontend Fundamentals 모의고사 2회차 회의실 예약 앱 리팩토링 경험을 공유한다. 모놀리식 컴포넌트 분리, 도메인 로직 추출, 테스트 기반 리팩토링 과정을 정리했다."
keywords: "Toss Frontend Fundamentals, 프론트엔드 리팩토링, React 컴포넌트 분리, 코드 리뷰, 토스 모의고사, 프론트엔드 설계"
---

이번 포스팅에서는 Toss Frontend Fundamentals 모의고사 2회차에 참여하며 진행한 리팩토링 경험에 대한 이야기를 해보려고 한다.

평소 코드 리뷰나 리팩토링에 관심이 있었던 필자는, 토스에서 공개한 Frontend Fundamentals 모의고사라는 흥미로운 형식의 과제를 진행하게되었다. 과제는 회의실 예약 앱이 주어지고, 이를 리팩토링하는 과제였다. 테스트 코드가 함께 제공되어 있어서, 리팩토링 과정에서 기능이 깨지지 않았는지 검증할 수 있는 안전망이 갖추어져 있었다.

결과적으로 2일동안 리팩토링을 진행했고, 그 과정에서 느낀 점들을 정리해보려 한다.


## 코드를 처음 마주했을 때

필자가 코드를 처음 열었을 때 가장 먼저 한 일은 **테스트 스펙을 읽는 것**이었다. 테스트 코드는 이 애플리케이션이 무엇을 해야 하는지를 가장 정직하게 알려주는 문서이기 때문이다. `App.easy.spec.tsx`와 `App.hard.spec.tsx`를 훑으며 애플리케이션의 전체 요구사항을 파악했다.

그다음으로 실제 코드를 살펴보았는데, 눈에 들어온 것은 두 개의 모놀리식 컴포넌트였다.

- `ReservationStatusPage` 는 400여줄의 컴포넌트로 날짜 선택, 타임라인 시각화, 예약 상세 툴팁, 내 예약 목록, 취소 기능이 하나의 파일에 전부 들어가 있었다.
- `RoomBookingPage` 는 300여줄의 컴포넌트로 필터, 방 목록, 예약 생성 로직, URL 파라미터 동기화가 하나로 얽혀 있었다.

필자는 코드를 읽으면서 "개선이 필요하다"는 판단 이전에, 먼저 **코드의 특성을 분류**하는 데 집중했다. 어떤 코드가 도메인 정보를 담고 있고, 어떤 코드가 유틸리티 성격이며, 어떤 코드가 순수한 UI 레이어인지를 구분하는 것이다.

```typescript
// 도메인 정보: 장비 라벨, 타임 슬롯 등 비즈니스 상수
const EQUIPMENT_LABELS: Record<string, string> = {
  tv: 'TV', whiteboard: '화이트보드', video: '화상장비', speaker: '스피커',
};

// 유틸리티: 날짜 포맷, 시간 변환
function formatDate(date: Date): string { ... }
function timeToMinutes(time: string): number { ... }

// 서버 상태: 인라인 useQuery, useMutation 호출
const { data: rooms = [] } = useQuery(['rooms'], getRooms);
const { data: reservations = [] } = useQuery(['reservations', date], () => getReservations(date));

// UI + 비즈니스 로직 혼재: 필터링, 정렬, 충돌 감지가 JSX 사이에 산재
```

이런 특성 분류를 해두니, 어디부터 손을 대야 할지가 자연스럽게 보이기 시작했다. 각 코드 영역에 간단한 주석을 달아두며 개선 방향을 메모했다. (마치 지금 회사에 입사했을 때 jquery 기반 프로젝트를 마이그레이션 하는 것과 비슷한 기분이었다)

그렇다면 어디서부터 손을 대야 할까?


## 리팩토링 전략 수립

필자는 다음과 같은 순서로 리팩토링을 진행하기로 계획했다.

1. **서버 코드 핸들링** : query, mutation 분리
2. **도메인 로직 분리** : Equipment, Room, Reservation 모델
3. **타입 선언** : 도메인 모델 기반의 타입 체계 정리
4. **유틸 함수 분리** : 날짜 포맷, 타임라인 계산 등
5. **UI 레이어 분리** : 컴포넌트를 관심사별 호흡 단위로 나누기
6. **추상화 및 관심사 분리** : 에러/로딩 처리, 쿼리 키 관리

이 순서를 선택한 이유는 **의존 방향의 바깥에서 안쪽으로** 진행하기 위해서다. 인프라(서버 코드, 유틸)부터 정리하고, 도메인 모델을 확립한 뒤, 마지막으로 UI를 다듬는 것이다. 만약 UI 컴포넌트를 먼저 분리하면, 아직 정리되지 않은 도메인 로직과 쿼리 코드를 여러 컴포넌트에 걸쳐 옮겨 다녀야 하는 상황이 생길 수 있다. 

전략을 세웠으니, 이제 하나씩 실행에 옮겨보자.


## 서버 코드와 유틸부터 정리하기

### 날짜 표시 유틸 분리

가장 먼저 손을 댄 곳은 `formatDate` 함수였다. 두 페이지에서 동일한 함수가 각각 인라인으로 정의되어 있었기 때문이다.

```typescript
// utils/formatYYYYMMDD.ts
export function formatYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const date = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}
```

작은 변경이지만, 리팩토링의 첫 커밋으로서 중요한 의미가 있었다. 가장 독립적이고 사이드이펙트가 적은 부분부터 건드려서, 테스트가 여전히 통과하는지 확인하는 **워밍업** 같은 것이다.

### React Query 훅 분리

다음으로 컴포넌트 내부에 직접 작성되어 있던 `useQuery`, `useMutation` 호출을 별도의 파일로 분리했다. `queryOptions` 패턴을 활용하여 쿼리 설정을 재사용 가능한 단위로 만들었다.

이 과정에서 `remotes.ts`에 있던 API 응답 타입도 명시적으로 정의했다. 기존에는 `any`로 흘러가던 타입들이 `GetRoomsResponse`, `GetReservationsResponse` 등으로 명확해졌다.

인프라 레이어를 정리했으니, 이제 도메인 모델로 눈을 돌려보자.


## 도메인 모델 분리

리팩토링에서 가장 중요한 전환점은 **도메인 모델을 별도의 `models/` 디렉토리로 분리**한 것이었다.

기존 코드에서는 `EQUIPMENT_LABELS`, `TIME_SLOTS` 같은 비즈니스 상수가 컴포넌트 파일 상단에 선언되어 있었다. `Room`이나 `Reservation`의 타입도 서버 핸들러(`_tosslib/server/types.ts`)에만 존재하고, 클라이언트 코드에서는 `any`에 가까운 상태로 사용되고 있었다.

```ts
// models/equipment.ts
export const EQUIPMENT_LABELS = {
  tv: 'TV', whiteboard: '화이트보드', video: '화상장비', speaker: '스피커',
} as const;

export type Equipment = keyof typeof EQUIPMENT_LABELS;
export const ALL_EQUIPMENT = Object.keys(EQUIPMENT_LABELS) as Equipment[];
```

```ts
// models/reservation.ts
export interface Room {
  id: string;
  name: string;
  floor: number;
  capacity: number;
  equipment: Equipment[];
}

export interface Reservation {
  id: string;
  roomId: string;
  date: string;
  start: string;
  end: string;
  attendees: number;
  equipment: Equipment[];
}
```

도메인 모델 분리가 왜 중요한가? 비즈니스 로직이 UI 컴포넌트에 종속되어 있으면, 해당 로직을 변경할 때 컴포넌트의 렌더링 로직까지 함께 들여다봐야 한다. 반면 `models/` 디렉토리에 독립적으로 존재하면, 비즈니스 규칙의 변경이 UI와 분리된 채로 이루어질 수 있다. 물론 완벽한 분리란 현실적으로 어렵지만, 최소한 **"이 로직은 여기 있을 것이다"라고 예측할 수 있는 구조**를 만드는 것이 핵심이다.

도메인 모델을 분리했다면, 이제 UI는 얼마나 가벼워질 수 있을까?


## 컴포넌트 해체 작업

### ReservationStatusPage

이 작업이 가장 극적인 변화를 만들어낸 커밋이자 시간을 많이 소요했다. 385줄의 모놀리식 컴포넌트를 다음과 같이 분리했다.

```
ReservationStatusPage/
├── index.tsx                    # 페이지 레벨
└── components/
    ├── DateSelector.tsx         # 날짜 선택 UI
    ├── ReservationTimeline.tsx  # 타임라인
    └── MyReservation.tsx        # 내 예약 목록 + 취소
```

분리 기준은 **"이 코드가 독립적으로 의미를 가지는가"** 였다. 타임라인 시각화는 날짜에 따른 예약 데이터를 받아 그리드를 그리는 독립적인 관심사다. 내 예약 목록은 사용자의 예약 데이터를 조회하고 취소하는 독립적인 관심사다. 이들이 한 파일에 있을 이유는 없었다.

분리 후 `index.tsx`는 **조율자(orchestrator)** 역할만 하게 되었다. 상태 관리, 메시지 표시, 하위 컴포넌트 조합을 담당할 뿐, 실제 데이터 페칭이나 렌더링 디테일은 하위 컴포넌트에 위임했다.

### RoomBookingPage

예약 페이지도 동일한 원칙으로 분리했다.

```
RoomBookingPage/
├── index.tsx                    # 페이지 레벨
├── components/
│   ├── BookingFilter.tsx        # 날짜, 시간, 인원, 장비, 층 UI
│   └── AvailableRoomList.tsx    # 예약 가능 방 목록
└── hooks/
    └── useBookingParams.ts      # URL searchParams 기반 상태 관리
```

이 과정에서 한 가지 흥미로운 선택이 있었다. 초기에는 `react-hook-form` + `zod`를 도입해서 폼 유효성 검증을 시도했다. 그런데 최종적으로는 이를 제거하고 커스텀 훅 `useBookingParams`로 대체했다. 이 결정에 대해서는 뒤에서 더 자세히 이야기하겠다.

여기까지 읽으면 자연스럽게 떠오르는 질문이 하나 있다. 과연 어디까지 추상화해야 할까?


## 추상화의 적정선

이 섹션이 필자가 이번 모의고사에서 가장 많이 고민한 부분이다.

### 중첩 조건문, 어디까지 풀어야 할까

방 예약 가능 여부를 판단하는 로직에는 여러 조건이 결합되어 있다. 수용 인원이 충분한지, 필요한 장비가 있는지, 선호 층수가 맞는지, 시간이 겹치지 않는지. 원본 코드에서는 이 모든 조건이 하나의 `filter` 콜백 안에 인라인으로 작성되어 있었다.

필자는 이를 `models/roomFilter.ts`로 추출하면서, 각 조건을 **이름이 있는 함수**로 분리했다.

```typescript
const isEnoughCapacity = (room: Room, attendees: number) => room.capacity >= attendees;
const hasRequiredEquipment = (room: Room, equipment: Equipment[]) =>
  equipment.every(eq => room.equipment.includes(eq));
const isOnPreferredFloor = (room: Room, floor: number | null) =>
  floor === null || room.floor === floor;
const hasNoTimeConflict = (room: Room, reservations: Reservation[], date: string, start: string, end: string) =>
  !reservations.some(reservation => reservation.roomId === room.id && reservation.date === date && reservation.start < end && reservation.end > start);

export function filterAvailableRooms(rooms: Room[], reservations: Reservation[], params: Params): Room[] {
  return rooms
    .filter(room =>
      isEnoughCapacity(room, params.attendees) &&
      hasRequiredEquipment(room, params.equipment) &&
      isOnPreferredFloor(room, params.floor) &&
      hasNoTimeConflict(room, reservations, params.date, params.startTime, params.endTime)
    )
    .sort((a, b) => {
      if (a.floor !== b.floor) return a.floor - b.floor;
      return a.name.localeCompare(b.name);
    });
}
```

여기서 핵심은 **추상화할 수 있는 이름이 명확한 경우에만 함수로 분리**했다는 점이다. `isEnoughCapacity`, `hasRequiredEquipment` 같은 이름은 구현을 보지 않아도 무엇을 하는지 예측할 수 있다. 만약 이름이 `processRoomConditions`처럼 모호해질 수밖에 없다면, 그 추상화는 오히려 읽는 사람에게 인지 부하를 줄 수 있다.

물론 이것이 정답이라는 의미는 아니다. 다만 필자의 판단 기준은 **"이 함수 이름만 보고 동작을 예측할 수 있는가?"** 였다. 예측 가능하다면 추상화하고, 그렇지 않다면 인라인으로 두는 것이 오히려 가독성에 도움이 된다고 생각했다.

### searchParams vs form state

예약 필터 상태를 어디에 둘 것인가도 상당히 고민한 부분이었다. 원본 코드에서는 `useState`로 각 필터 값을 관리하면서, `useEffect`로 URL searchParams와 동기화하고 있었다.

```typescript
// 원본: useState + useEffect 동기화 방식
const [date, setDate] = useState(searchParams.get('date') || formatDate(new Date()));
const [startTime, setStartTime] = useState(searchParams.get('startTime') || '');

// ... 6개의 개별 상태
useEffect(() => {
  const params: Record<string, string> = {};
  if (date) params.date = date;

  // ... 모든 상태를 searchParams에 동기화
  setSearchParams(params, { replace: true });
}, [date, startTime, endTime, ...]);
```

필자는 처음에 `react-hook-form` + `zod`를 도입해서 폼으로 관리하는 방식을 시도했다. 하지만 결국 이를 제거하고 **searchParams를 단일 진실 공급원(Single Source of Truth)으로** 사용하는 `useBookingParams` 훅으로 대체했다.

```typescript
// useBookingParams: searchParams가 곧 상태
export function useBookingParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const params = useMemo<BookingParams>(() => ({
    date: searchParams.get('date') || formatYYYYMMDD(new Date()),
    startTime: searchParams.get('startTime') || '',
    // ...
  }), [searchParams]);

  const updateParam = useCallback(<K extends keyof BookingParams>(key: K, value: BookingParams[K]) => {
    setSearchParams(prev => {
      // 기존 파라미터 병합 후 업데이트
      return result;
    }, { replace: true });
  }, [setSearchParams]);

  return { params, updateParam };
}
```

이 결정의 핵심 근거는 **"상태가 별개로 움직이는 것이 적합하지 않다"** 는 판단이었다. `useState`와 `searchParams`가 각각 상태를 가지면, 동기화 시점에 따라 불일치가 발생할 수 있다. 반면 searchParams만을 상태로 사용하면, URL이 곧 애플리케이션 상태가 되어 동기화 문제 자체가 사라진다. 사용자가 URL을 공유하면 동일한 필터 상태가 재현되는 것은 덤이다.

다른 참가자의 후기에서도 비슷한 고민을 발견할 수 있었다. **"URL searchParams를 단일 진실 공급원으로 통일했다", "개별 필터 props를 하나의 `filter` 객체로 통합하는 접근을 택했다."** 표현 방식은 다르지만, **"흩어진 상태를 하나의 개념으로 묶어야 한다"** 는 문제 인식은 동일했다.


## 안정성

### Suspense와 ErrorBoundary

컴포넌트 구조가 확정된 후에 에러/로딩 처리를 추가했다. 순서가 중요한 이유는, 경계(Boundary)를 어디에 설정할지는 컴포넌트 트리가 결정된 후에야 판단할 수 있기 때문이다.

`react-error-boundary` 라이브러리를 활용하여, 각 독립적인 데이터 페칭 단위마다 `ErrorBoundary`와 `Suspense`를 감쌌다. 타임라인이 실패해도 내 예약 목록은 정상적으로 보여야 하고, 그 반대도 마찬가지이기 때문이다.

```tsx
{/* 각 영역이 독립적으로 에러/로딩을 처리 */}
<ErrorBoundary FallbackComponent={ErrorFallback} resetKeys={[date]}>
  <Suspense fallback={<Loading message="예약 현황을 불러오는 중..." />}>
    <ReservationTimeline date={date} />
  </Suspense>
</ErrorBoundary>

<ErrorBoundary FallbackComponent={ErrorFallback}>
  <Suspense fallback={<Loading message="내 예약을 불러오는 중..." />}>
    <MyReservation onCancel={handleCancel} />
  </Suspense>
</ErrorBoundary>
```

### Query Key 중앙 관리

리팩토링 과정에서 쿼리 훅을 분리하다 보니, query key가 여러 파일에 분산되는 문제가 생겼다. mutation의 `onSuccess`에서 invalidation할 때 어떤 key를 써야 하는지 추적하기 어려워진 것이다.

`@lukemorales/query-key-factory`를 도입하여 쿼리 키를 중앙에서 관리하도록 변경했다.

```typescript
// queries/queryKeys.ts
export const roomKeys = createQueryKeys('rooms', {
  list: { queryKey: null, queryFn: () => remotes.getRooms() },
});

export const reservationKeys = createQueryKeys('reservations', {
  list: (date: string) => ({ queryKey: [date], queryFn: () => remotes.getReservations(date) }),
  my: { queryKey: null, queryFn: () => remotes.getMyReservations() },
});
```

이렇게 하면 `useSuspenseQueries({ queries: [roomKeys.list, reservationKeys.list(date)] })` 형태로 사용할 수 있어, 쿼리 키와 페칭 함수가 항상 함께 이동한다. 또한 route 경로도 `PATHS` 상수로 추출하여, 문자열 하드코딩을 제거했다.


## 출제자의 의도는 무엇이었을까

리팩토링을 마치고 나서, 필자는 한 발 물러서서 생각해보았다. 이 모의고사가 평가하고자 한 것은 무엇이었을까?

다른 참가자들의 후기를 읽으며 흥미로운 공통점을 발견했다. 거의 모든 후기에서 **"코드는 읽는 것이 아니라 예측하는 것이다"** 라는 문장이 등장했다. 우리의 뇌는 코드를 한 줄 한 줄 해석하는 것이 아니라, 경험에서 쌓인 패턴을 기반으로 예측하며 읽는다는 것이다. 그리고 그 예측이 어긋날 때 인지 부하가 급격히 증가한다.

이 관점에서 보면, 모의고사가 평가하는 것은 단순한 코딩 능력이 아니라 **"동료가 읽을 코드를 얼마나 예측 가능하게 만들 수 있는가"** 라는 협업 역량인 것이다. (출제자와 동료의 마음을 읽는 것이야말로 진정한 소프트웨어 엔지니어의 역량일지도 모른다)

다른 참가자들의 후기들을 살펴보니, **"남이 작성한 코드를 이해하는 것은 쉽지 않다", "인터페이스를 먼저 설계하는 것이 중요하지만, 방대한 기존 코드 앞에서는 그 접근이 흔들릴 수 있다"** 는 내용이 공감이 되었다. 필자 역시 비슷한 경험을 했다. 기존 코드가 이미 동작하고 있으면, 그 구조를 합리화하려는 유혹이 생긴다. "이미 돌아가는 코드인데 굳이?"라는 생각 말이다. 하지만 모의고사의 핵심은 바로 그 유혹을 넘어서, **"이 코드를 내가 아닌 다른 누군가가 읽었을 때 얼마나 빨리 파악할 수 있는가, 본인의 인지로 문제를 판단하고 해결해나갈 수 있는지"** 를 기준으로 판단하는 것이었다.


## 리팩토링에서 배운 것

**리팩토링 순서가 결과를 좌우한다.** 바깥(인프라)에서 안쪽(UI)으로 진행하는 것이 중간에 꼬이지 않는 안전한 경로였다. 유틸과 도메인 모델이 정리된 상태에서 컴포넌트를 분리하니, 각 컴포넌트가 무엇에 의존하는지가 명확했다.

**추상화의 판단 기준은 "이름"이다.** 함수나 변수로 추출했을 때 그 이름이 동작을 설명할 수 있다면 추상화할 가치가 있다. 이름이 모호해질 수밖에 없다면, 인라인이 오히려 나은 선택일 수 있다.

**상태의 위치가 곧 아키텍처다.** 같이 이동해야 하는 상태는 같은 곳에 두어야 한다. `useState`와 `searchParams`를 동기화하는 것보다, searchParams 하나만을 진실 공급원으로 사용하는 것이 구조적으로 더 건강하다.


## 마무리

과제를 마치고 2명의 동료와 이야기를 나눠보았다. 혼자 코드를 들여다볼 때는 보이지 않던 것들이, 대화를 통해 생각을 풀어나가는 과정에서 드러나기 시작했다. 필자가 당연하다고 넘겼던 구조적 선택에 "왜 그렇게 했어?"라는 질문이 들어오는 순간, 미처 의식하지 못했던 판단의 빈틈이 보이는 것이다.

AI가 코드 작성과 리뷰에 드는 시간을 획기적으로 줄여주고 있는 것은 사실이다. 하지만 그럼에도 코드 리뷰와 데일리 미팅이 여전히 중요하다고 생각하는 이유가 바로 이런 경험에 있다. AI는 코드의 정합성을 검증해줄 수 있지만, **"네가 놓친 관점은 이거야"** 라고 짚어주는 것은 결국 같은 맥락을 공유하는 동료의 몫이다. 내가 보지 못한 부분에 대한 발견, 그리고 그 발견을 통한 프로덕트의 안정화. 이것이 협업의 본질이 아닐까.

문제를 풀어나가는 과정속에 코드를 작성에는 정답은 없다. 같은 모의고사를 풀었던 다른 참가자들도 각자 다른 경로를 택했고, 각자의 근거를 가지고 있었다. 중요한 것은 **"왜 이렇게 짰는가"에 대해 설명할 수 있는 것**이다. 이 글을 읽는 분들도 한 번쯤 자신의 코드를 처음 보는 사람의 시선으로 바라보기를 권한다. 그 시선 하나가 코드의 품질을 결정하는 가장 강력한 기준이 될 수 있을 것이다.
