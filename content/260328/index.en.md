---
emoji: 🛠️
title: 'Reflections on Refactoring the Second Toss Frontend Fundamentals Mock Exam'
seoTitle: 'Refactoring the Second Toss Frontend Fundamentals Mock Exam — Component Decomposition and Domain Logic Extraction'
date: '2026-03-28'
categories: 프론트엔드 React 리팩토링
description: "A look back at refactoring the meeting room reservation app from the second Toss Frontend Fundamentals mock exam, covering monolithic component decomposition, domain logic extraction, and a test-driven refactoring process."
keywords: "Toss Frontend Fundamentals, frontend refactoring, React component decomposition, code review, Toss mock exam, frontend architecture"
locale: en
translationOf: '260328'
sourceHash: e86e832b1598fe8ec2aadc4afd0647977190316292f2adb0fd1d520f28953ab4
---

In this post, I want to share my experience refactoring the project from the second Toss Frontend Fundamentals mock exam.

I have always been interested in code review and refactoring, so I decided to take on Toss's Frontend Fundamentals mock exam, which presented the challenge in an intriguing format. The task was to refactor a provided meeting room reservation app. It also came with tests, giving me a safety net for verifying that the refactoring had not broken any functionality.

In the end, I spent two days on the refactoring. Here are my reflections on the process.


## My First Encounter with the Code

The first thing I did after opening the code was **read the test specifications**. Tests are the most honest documentation of what an application is supposed to do. I skimmed through `App.easy.spec.tsx` and `App.hard.spec.tsx` to understand the application's overall requirements.

I then turned to the implementation itself, where two monolithic components immediately stood out.

- `ReservationStatusPage` was a component of roughly 400 lines, with date selection, timeline visualization, reservation detail tooltips, the user's reservation list, and cancellation functionality all packed into a single file.
- `RoomBookingPage` was a component of roughly 300 lines, with filters, the room list, reservation creation logic, and URL parameter synchronization all tangled together.

As I read through the code, rather than immediately deciding that it “needed improvement,” I first focused on **classifying the characteristics of the code**. I distinguished between code that contained domain knowledge, code that behaved like a utility, and code that belonged purely to the UI layer.

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

Once I had classified the code this way, it became much easier to see where to begin. I added brief comments to each area of the code to note possible directions for improvement. (It felt a little like migrating the jQuery-based project I encountered when I first joined my current company.)

So where should I start?


## Developing a Refactoring Strategy

I planned to carry out the refactoring in the following order.

1. **Handle server code**: separate queries and mutations
2. **Separate domain logic**: create Equipment, Room, and Reservation models
3. **Define types**: organize the type system around the domain models
4. **Extract utility functions**: date formatting, timeline calculations, and so on
5. **Separate the UI layer**: divide components into coherent units by concern
6. **Abstract and separate concerns**: handle errors/loading and manage query keys

I chose this order so I could work **from the outside of the dependency structure inward**. The idea was to organize the infrastructure—the server code and utilities—first, establish the domain models next, and refine the UI last. If I split the UI components first, I might end up moving still-unorganized domain logic and query code back and forth across multiple components.

With the strategy in place, it was time to execute it one step at a time.


## Organizing the Server Code and Utilities First

### Extracting the Date Formatting Utility

The first thing I tackled was the `formatDate` function because the same function had been defined inline on both pages.

```typescript
// utils/formatYYYYMMDD.ts
export function formatYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const date = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}
```

It was a small change, but it was an important first commit in the refactoring. Starting with the most independent part with the fewest side effects and confirming that the tests still passed served as a kind of **warm-up**.

### Extracting the React Query Hooks

Next, I moved the `useQuery` and `useMutation` calls that had been written directly inside the components into separate files. I used the `queryOptions` pattern to turn the query configuration into reusable units.

During this process, I also explicitly defined the API response types in `remotes.ts`. Values that had previously flowed through the code as `any` now had clear types such as `GetRoomsResponse` and `GetReservationsResponse`.

With the infrastructure layer organized, it was time to turn to the domain models.


## Separating the Domain Models

The most important turning point in the refactoring was **moving the domain models into a dedicated `models/` directory**.

In the original code, business constants such as `EQUIPMENT_LABELS` and `TIME_SLOTS` were declared at the top of component files. Types for `Room` and `Reservation` existed only in the server handler (`_tosslib/server/types.ts`), while the client code used values that were effectively treated as `any`.

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

Why is separating domain models important? When business logic is coupled to UI components, changing that logic requires inspecting the component's rendering logic as well. When it exists independently in a `models/` directory, changes to business rules can be made separately from the UI. Perfect separation is difficult in practice, of course, but the key is at least to create a structure where people can predict that **“this logic will be here.”**

Once the domain models were separated, how much lighter could the UI become?


## Breaking Apart the Components

### ReservationStatusPage

This commit produced the most dramatic change and took the most time. I split the 385-line monolithic component as follows.

```
ReservationStatusPage/
├── index.tsx                    # 페이지 레벨
└── components/
    ├── DateSelector.tsx         # 날짜 선택 UI
    ├── ReservationTimeline.tsx  # 타임라인
    └── MyReservation.tsx        # 내 예약 목록 + 취소
```

My criterion for separating the code was **“Does this code have independent meaning?”** Timeline visualization is an independent concern: it takes reservation data for a date and renders a grid. The user's reservation list is another independent concern: it retrieves and cancels the user's reservations. There was no reason for them to live in the same file.

After the split, `index.tsx` served only as an **orchestrator**. It managed state, displayed messages, and composed the child components, while delegating the actual data fetching and rendering details to those components.

### RoomBookingPage

I applied the same principle to the booking page.

```
RoomBookingPage/
├── index.tsx                    # 페이지 레벨
├── components/
│   ├── BookingFilter.tsx        # 날짜, 시간, 인원, 장비, 층 UI
│   └── AvailableRoomList.tsx    # 예약 가능 방 목록
└── hooks/
    └── useBookingParams.ts      # URL searchParams 기반 상태 관리
```

One interesting decision emerged during this process. At first, I introduced `react-hook-form` and `zod` to validate the form. In the end, however, I removed them and replaced them with a custom `useBookingParams` hook. I will explain that decision in more detail later.

At this point, a natural question arises: how far should abstraction go?


## Finding the Right Level of Abstraction

This was the part I wrestled with most during the mock exam.

### How Far Should Nested Conditionals Be Unraveled?

The logic that determines whether a room is available combines several conditions: whether its capacity is sufficient, whether it has the required equipment, whether it is on the preferred floor, and whether its schedule overlaps with another reservation. In the original code, all of these conditions were written inline inside a single `filter` callback.

When I extracted this logic into `models/roomFilter.ts`, I separated each condition into a **named function**.

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

The key here was that I extracted a condition into a function **only when there was a clear name for the abstraction**. Names such as `isEnoughCapacity` and `hasRequiredEquipment` let readers predict what the functions do without seeing their implementations. If the name had to be vague, like `processRoomConditions`, the abstraction could instead impose additional cognitive load on the reader.

This is not to say that my approach is the one correct answer. My criterion was simply **“Can I predict the behavior from the function name alone?”** If so, I abstracted it. If not, I thought leaving it inline might actually make the code easier to read.

### searchParams vs. Form State

I also spent considerable time deciding where the booking filter state should live. In the original code, each filter value was managed with `useState` and synchronized with the URL searchParams through `useEffect`.

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

I initially tried managing it as a form with `react-hook-form` and `zod`. Ultimately, however, I removed them and replaced them with a `useBookingParams` hook that uses **searchParams as the Single Source of Truth**.

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

The core rationale for this decision was that **“it does not make sense for these states to evolve separately.”** If `useState` and `searchParams` each hold their own state, they can fall out of sync depending on when synchronization occurs. If searchParams alone holds the state, however, the URL becomes the application state and the synchronization problem disappears entirely. As a bonus, sharing the URL reproduces the same filter state for another user.

I found similar considerations in other participants' retrospectives. **“We standardized on URL searchParams as the Single Source of Truth,” and “We chose to consolidate the individual filter props into a single `filter` object.”** The expressions differed, but the underlying recognition was the same: **“Scattered state needs to be grouped into a single concept.”**


## Resilience

### Suspense and ErrorBoundary

I added error and loading handling after the component structure had been finalized. The order matters because you can only decide where to place a boundary after the component tree has been established.

Using the `react-error-boundary` library, I wrapped each independent data-fetching unit in an `ErrorBoundary` and `Suspense`. If the timeline fails, the user's reservation list should still render normally, and vice versa.

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

### Centralizing Query Keys

As I extracted the query hooks during the refactoring, query keys became scattered across multiple files. This made it difficult to determine which key to use for invalidation in a mutation's `onSuccess` callback.

I introduced `@lukemorales/query-key-factory` to manage the query keys centrally.

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

This makes it possible to use them in the form `useSuspenseQueries({ queries: [roomKeys.list, reservationKeys.list(date)] })`, ensuring that a query key and its fetching function always travel together. I also extracted route paths into `PATHS` constants to eliminate hard-coded strings.


## What Was the Exam Designed to Assess?

After completing the refactoring, I took a step back and reflected. What was this mock exam trying to evaluate?

While reading other participants' retrospectives, I noticed an interesting common thread. Nearly every post included the sentence **“Code is not read; it is predicted.”** Our brains do not interpret code one line at a time. We read by making predictions based on patterns accumulated through experience, and cognitive load rises sharply when those predictions are violated.

From this perspective, the mock exam was assessing not merely coding ability, but the collaborative skill of **“making code as predictable as possible for your colleagues.”** (Perhaps the ability to read the minds of exam authors and coworkers is the true mark of a software engineer.)

Looking through other participants' retrospectives, I related to comments such as **“Understanding code written by someone else is not easy,” and “Designing the interface first is important, but that approach can falter when you face a vast existing codebase.”** I had a similar experience. When existing code already works, there is a temptation to rationalize its structure: “It already works, so why bother?” But the point of the mock exam was to move past that temptation and judge the code by **“how quickly someone other than me can understand it, and whether I can assess and solve the problem using my own judgment.”**


## What I Learned from Refactoring

**The order of refactoring shapes the outcome.** Working from the outside—the infrastructure—inward to the UI was a safe path that kept the process from becoming tangled midway through. Once the utilities and domain models were organized, splitting the components made each component's dependencies clear.

**The criterion for abstraction is the name.** If the name of an extracted function or variable can explain its behavior, it is worth abstracting. If the name must remain vague, leaving the code inline may be the better choice.

**Where state lives is architecture.** State that needs to move together should live in the same place. Using searchParams alone as the source of truth is structurally healthier than synchronizing `useState` with `searchParams`.


## Closing Thoughts

After finishing the task, I discussed it with two colleagues. Things I had not noticed while examining the code alone began to emerge as I worked through my thoughts in conversation. The moment someone asked “Why did you do it that way?” about a structural choice I had taken for granted, gaps in my reasoning that I had not recognized became visible.

It is true that AI is dramatically reducing the time required to write and review code. Even so, experiences like this are precisely why I believe code reviews and daily meetings remain important. AI can verify the consistency of code, but pointing out **“Here is the perspective you missed”** ultimately falls to colleagues who share the same context. Discovering what I could not see, then using that discovery to make the product more stable—is that not the essence of collaboration?

There is no single correct answer when writing code as part of solving a problem. Other participants who took the same mock exam followed different paths, each with their own rationale. What matters is being able to explain **“why the code was written this way.”** I encourage readers to look at their own code through the eyes of someone seeing it for the first time. That perspective may be the most powerful standard for determining code quality.
