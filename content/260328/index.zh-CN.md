---
emoji: 🛠️
title: 'Toss Frontend Fundamentals 模拟考试第 2 期重构复盘'
seoTitle: 'Toss Frontend Fundamentals 模拟考试第 2 期重构——拆分组件与提取领域逻辑'
date: '2026-03-28'
categories: 前端 React 重构
locale: zh-CN
translationOf: '260328'
sourceHash: e86e832b1598fe8ec2aadc4afd0647977190316292f2adb0fd1d520f28953ab4
description: "分享参加 Toss Frontend Fundamentals 模拟考试第 2 期时重构会议室预订应用的经历，并梳理单体组件拆分、领域逻辑提取以及基于测试的重构过程。"
keywords: "Toss Frontend Fundamentals, 前端重构, React 组件拆分, 代码审查, Toss 模拟考试, 前端设计"
---

这篇文章想聊聊我参加 Toss Frontend Fundamentals 模拟考试第 2 期时所经历的重构过程。

我平时就对代码审查和重构很感兴趣，因此参与了 Toss 发布的一项形式颇为有趣的 Frontend Fundamentals 模拟考试。题目提供了一个会议室预订应用，要求对它进行重构。项目还附带了测试代码，为验证重构过程中功能是否遭到破坏提供了安全网。

最终，我用了两天时间完成重构，也想借此整理一下过程中的感受。


## 初次面对代码时

第一次打开代码时，我做的第一件事就是**阅读测试规格**。因为测试代码是最如实说明这个应用应该做什么的文档。我浏览了 `App.easy.spec.tsx` 和 `App.hard.spec.tsx`，了解了应用的整体需求。

接着查看实际代码时，最先映入眼帘的是两个单体组件。

- `ReservationStatusPage` 是一个 400 多行的组件，日期选择、时间线可视化、预订详情工具提示、我的预订列表和取消功能全都塞在同一个文件里。
- `RoomBookingPage` 是一个 300 多行的组件，筛选器、房间列表、创建预订逻辑和 URL 参数同步交织在一起。

阅读代码时，比起先下结论说“需要改进”，我更专注于**对代码的特性进行分类**。也就是区分哪些代码承载领域信息，哪些具有工具性质，哪些属于纯粹的 UI 层。

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

完成这样的特性分类后，该从哪里着手也就自然清晰起来。我在各个代码区域旁加上简短注释，记录改进方向。（感觉就像刚进现在这家公司时迁移基于 jquery 的项目一样）

那么，究竟应该从哪里开始呢？


## 制定重构策略

我计划按照以下顺序进行重构。

1. **处理服务器代码**：拆分 query、mutation
2. **拆分领域逻辑**：Equipment、Room、Reservation 模型
3. **声明类型**：梳理基于领域模型的类型体系
4. **拆分工具函数**：日期格式化、时间线计算等
5. **拆分 UI 层**：按关注点将组件划分为节奏合适的单元
6. **抽象与关注点分离**：错误/加载处理、查询键管理

之所以选择这个顺序，是为了沿着**依赖方向从外到内**推进。先整理基础设施（服务器代码、工具），确立领域模型，最后再打磨 UI。如果先拆分 UI 组件，尚未整理好的领域逻辑和查询代码可能就得在多个组件之间反复搬动。

策略已经定好，接下来逐项付诸实践。


## 先整理服务器代码和工具

### 拆分日期显示工具

我最先处理的是 `formatDate` 函数，因为两个页面里分别内联定义了同一个函数。

```typescript
// utils/formatYYYYMMDD.ts
export function formatYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const date = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}
```

改动虽小，但作为重构的第一个提交却有着重要意义。先从最独立、副作用最少的部分入手，再确认测试是否依然通过，就像一次**热身**。

### 拆分 React Query hook

接下来，我把直接写在组件内部的 `useQuery`、`useMutation` 调用拆到了单独的文件中，并利用 `queryOptions` 模式将查询配置整理为可复用单元。

在这个过程中，也显式定义了 `remotes.ts` 中的 API 响应类型。原先以 `any` 流转的类型，变得明确为 `GetRoomsResponse`、`GetReservationsResponse` 等。

基础设施层已经整理完毕，接下来把目光转向领域模型。


## 拆分领域模型

这次重构最重要的转折点，是**将领域模型拆分到独立的 `models/` 目录中**。

原有代码把 `EQUIPMENT_LABELS`、`TIME_SLOTS` 等业务常量声明在组件文件顶部。`Room` 或 `Reservation` 的类型也只存在于服务器处理器（`_tosslib/server/types.ts`）中，在客户端代码中使用时几乎等同于 `any`。

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

为什么拆分领域模型如此重要？如果业务逻辑依附于 UI 组件，修改这段逻辑时，就不得不连组件的渲染逻辑一起查看。反过来，如果它独立存在于 `models/` 目录，业务规则的变更就可以与 UI 分离。当然，现实中很难做到完美分离，但关键至少是构建一种**能让人预测“这段逻辑应该在这里”的结构**。

既然领域模型已经拆分，UI 又能变得多轻量呢？


## 拆解组件

### ReservationStatusPage

这是带来最显著变化、同时也最耗时的一次提交。我将 385 行的单体组件拆分成了以下结构。

```
ReservationStatusPage/
├── index.tsx                    # 페이지 레벨
└── components/
    ├── DateSelector.tsx         # 날짜 선택 UI
    ├── ReservationTimeline.tsx  # 타임라인
    └── MyReservation.tsx        # 내 예약 목록 + 취소
```

拆分标准是**“这段代码能否独立表达意义”**。时间线可视化接收某个日期的预订数据并绘制网格，是一个独立的关注点。我的预订列表负责查询和取消用户的预订数据，同样是一个独立的关注点。它们没有理由待在同一个文件里。

拆分后，`index.tsx` 只承担**协调者（orchestrator）**的角色。它仅负责状态管理、消息展示和组合子组件，而将实际的数据获取和渲染细节交给子组件。

### RoomBookingPage

预订页面也按照同样的原则进行了拆分。

```
RoomBookingPage/
├── index.tsx                    # 페이지 레벨
├── components/
│   ├── BookingFilter.tsx        # 날짜, 시간, 인원, 장비, 층 UI
│   └── AvailableRoomList.tsx    # 예약 가능 방 목록
└── hooks/
    └── useBookingParams.ts      # URL searchParams 기반 상태 관리
```

这个过程中有一个有趣的取舍。起初，我尝试引入 `react-hook-form` + `zod` 来进行表单校验。但最终还是将它移除，换成了自定义 hook `useBookingParams`。关于这个决定，后面还会更详细地谈到。

读到这里，自然会浮现出一个问题：究竟应该抽象到什么程度？


## 抽象的适当边界

这一节是我在本次模拟考试中思考最多的部分。

### 嵌套条件语句，应该拆到什么程度

判断房间能否预订的逻辑结合了多个条件：容纳人数是否足够、是否具备所需设备、是否符合偏好的楼层，以及时间是否冲突。在原始代码中，所有条件都内联写在一个 `filter` 回调里。

我将其提取到 `models/roomFilter.ts` 时，把每个条件拆成了**有名字的函数**。

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

这里的关键在于，**只有在能够明确命名抽象时才拆分成函数**。像 `isEnoughCapacity`、`hasRequiredEquipment` 这样的名字，无需查看实现也能预测它们的作用。如果名字只能像 `processRoomConditions` 一样模糊，这种抽象反而会增加读者的认知负担。

当然，这并不意味着它就是标准答案。我的判断标准只是：**“仅凭函数名能否预测其行为？”**如果可以预测，就进行抽象；如果不能，保留内联反而可能更有利于可读性。

### searchParams 与 form state

预订筛选状态应该放在哪里，也是让我颇费思量的问题。原始代码使用 `useState` 管理各项筛选值，再通过 `useEffect` 与 URL searchParams 同步。

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

我一开始引入了 `react-hook-form` + `zod`，尝试以表单的方式管理。但最终还是将其移除，改用把 **searchParams 作为单一事实来源（Single Source of Truth）**的 `useBookingParams` hook。

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

这一决定的核心依据，是我认为**“让状态各自独立变动并不合适”**。如果 `useState` 和 `searchParams` 各自持有状态，就可能因同步时机不同而产生不一致。反之，如果只用 searchParams 作为状态，URL 就等同于应用状态，同步问题本身也就消失了。用户分享 URL 时能够复现相同的筛选状态，则算是额外的好处。

在其他参与者的复盘中，我也发现了类似的思考。**“将 URL searchParams 统一为单一事实来源”“选择把各个筛选器 prop 合并为一个 `filter` 对象。”**表达方式虽然不同，但都意识到了同一个问题：**“需要将分散的状态归拢成一个概念。”**


## 稳定性

### Suspense 与 ErrorBoundary

组件结构确定后，我才添加了错误和加载状态处理。之所以顺序重要，是因为只有在组件树确定后，才能判断边界（Boundary）应该设置在哪里。

我使用 `react-error-boundary` 库，为每个独立的数据获取单元分别包裹 `ErrorBoundary` 和 `Suspense`。这样即使时间线加载失败，我的预订列表仍能正常显示，反之亦然。

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

### 集中管理 Query Key

重构过程中，随着查询 hook 被拆分，query key 也开始分散到多个文件里。于是，在 mutation 的 `onSuccess` 中执行 invalidation 时，很难追踪究竟应该使用哪个 key。

我引入 `@lukemorales/query-key-factory`，改为集中管理查询键。

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

这样就能以 `useSuspenseQueries({ queries: [roomKeys.list, reservationKeys.list(date)] })` 的形式使用，让查询键和获取函数始终一起移动。此外，我还把 route 路径提取为 `PATHS` 常量，移除了硬编码字符串。


## 出题者的意图是什么

完成重构后，我退一步重新思考：这场模拟考试究竟想考察什么？

阅读其他参与者的复盘时，我发现了一个有趣的共通点。几乎所有文章里都出现了这样一句话：**“代码不是靠阅读，而是靠预测。”**我们的大脑并非逐行解释代码，而是根据经验中积累的模式进行预测式阅读。当预测落空时，认知负担就会急剧增加。

从这个角度来看，模拟考试评估的不只是编码能力，而是**“能把写给同事阅读的代码变得多可预测”**这种协作能力。（也许读懂出题者和同事的心，才是软件工程师真正的能力）

查看其他参与者的复盘后，**“理解别人写的代码并不容易”“优先设计接口很重要，但面对庞大的现有代码时，这种方法也可能动摇”**等内容让我很有共鸣。我也有过类似的经历。当现有代码已经能够运行时，人很容易产生替它的结构寻找合理解释的诱惑，也就是“代码都已经能跑了，有必要吗？”这样的念头。但模拟考试的核心，正是越过这种诱惑，以**“不是我，而是其他人阅读这段代码时，能多快理解它；能否依据自己的认知判断并逐步解决问题”**为标准做出判断。


## 从重构中学到的事

**重构顺序决定结果。**从外部（基础设施）向内部（UI）推进，是避免中途纠缠的稳妥路径。在工具和领域模型都梳理完毕后再拆分组件，各组件依赖什么便一目了然。

**判断是否抽象的标准是“命名”。**如果提取成函数或变量后，其名称能够说明行为，就值得抽象。如果名字不可避免地变得模糊，保留内联反而可能是更好的选择。

**状态的位置就是架构。**需要一起变化的状态应该放在同一个地方。与其同步 `useState` 和 `searchParams`，不如只把 searchParams 作为事实来源，这在结构上更加健康。


## 结语

完成题目后，我和两位同事聊了聊。独自阅读代码时看不见的问题，在通过对话梳理思路的过程中逐渐显露出来。当别人对我觉得理所当然、随手略过的结构选择问出“为什么这么做？”时，我才看见自己此前没有意识到的判断盲点。

AI 确实正在大幅缩短编写和审查代码所需的时间。但即便如此，我依然认为代码审查和每日会议很重要，原因正是这种经历。AI 可以验证代码的一致性，但指出**“你遗漏的是这个视角”**，终究还是要靠共享相同语境的同事。发现我未曾看到的部分，再通过这些发现让产品更加稳定——这或许就是协作的本质。

在解决问题、编写代码的过程中，并不存在唯一的正确答案。参加同一场模拟考试的其他人也选择了各自不同的路径，并且都有自己的依据。重要的是，能够解释**“为什么要这样写”**。也建议各位读者偶尔用第一次看到自己代码的人的视角重新审视它。仅仅这一种视角，就可能成为决定代码质量的最有力标准。
