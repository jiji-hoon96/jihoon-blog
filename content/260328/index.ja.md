---
emoji: 🛠️
title: 'Toss Frontend Fundamentals 模擬試験 第2回のリファクタリングを終えて'
seoTitle: 'Toss Frontend Fundamentals 模擬試験 第2回のリファクタリング — コンポーネント分割とドメインロジックの抽出'
date: '2026-03-28'
categories: フロントエンド React リファクタリング
description: "Toss Frontend Fundamentals 模擬試験 第2回の会議室予約アプリをリファクタリングした経験を共有する。モノリシックなコンポーネントの分割、ドメインロジックの抽出、テストを基盤としたリファクタリングの過程をまとめた。"
keywords: "Toss Frontend Fundamentals, フロントエンドのリファクタリング, Reactコンポーネントの分割, コードレビュー, Toss模擬試験, フロントエンド設計"
locale: ja
translationOf: '260328'
sourceHash: e86e832b1598fe8ec2aadc4afd0647977190316292f2adb0fd1d520f28953ab4
---

今回の記事では、Toss Frontend Fundamentals 模擬試験の第2回に参加し、取り組んだリファクタリングについて振り返ってみたい。

以前からコードレビューやリファクタリングに関心があった筆者は、Tossが公開した「Frontend Fundamentals 模擬試験」という興味深い形式の課題に取り組むことになった。課題は、与えられた会議室予約アプリをリファクタリングするというものだった。テストコードも用意されており、リファクタリングの過程で機能が壊れていないかを検証できるセーフティネットが整っていた。

最終的に2日間かけてリファクタリングを行った。ここでは、その過程で感じたことをまとめてみようと思う。


## 初めてコードに向き合ったとき

コードを初めて開いたとき、筆者が真っ先にしたのは**テスト仕様を読むこと**だった。テストコードは、このアプリケーションが何をすべきかを最も正直に教えてくれるドキュメントだからだ。`App.easy.spec.tsx`と`App.hard.spec.tsx`に目を通し、アプリケーション全体の要件を把握した。

次に実際のコードを確認すると、目に入ったのは2つのモノリシックなコンポーネントだった。

- `ReservationStatusPage` は400行あまりのコンポーネントで、日付選択、タイムラインの可視化、予約詳細のツールチップ、自分の予約一覧、キャンセル機能がすべて1つのファイルに収められていた。
- `RoomBookingPage` は300行あまりのコンポーネントで、フィルター、部屋一覧、予約作成ロジック、URLパラメーターの同期がひとつに絡み合っていた。

筆者はコードを読みながら、「改善が必要だ」と判断するより先に、まず**コードの性質を分類すること**に集中した。どのコードがドメイン情報を持ち、どのコードがユーティリティの役割を担い、どのコードが純粋なUIレイヤーなのかを見分けていった。

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

このように性質ごとに分類しておくと、どこから手を付けるべきかが自然と見え始めた。それぞれのコード領域に簡単なコメントを付け、改善の方向性をメモしていった。（今の会社に入社した当時、jQueryベースのプロジェクトを移行していたときと似た気分だった）

では、どこから手を付けるべきだろうか。


## リファクタリング戦略を立てる

筆者は、次の順序でリファクタリングを進めることにした。

1. **サーバーコードの整理**：queryとmutationの分離
2. **ドメインロジックの分離**：Equipment、Room、Reservationモデル
3. **型定義**：ドメインモデルに基づく型体系の整理
4. **ユーティリティ関数の分離**：日付フォーマット、タイムライン計算など
5. **UIレイヤーの分離**：コンポーネントを関心事ごとに適切な粒度で分ける
6. **抽象化と関心の分離**：エラー／ローディング処理、クエリキー管理

この順序を選んだのは、**依存関係の外側から内側へ**進めるためだ。インフラ（サーバーコード、ユーティリティ）から整理し、ドメインモデルを確立したあと、最後にUIを整える。もしUIコンポーネントを先に分割すると、まだ整理されていないドメインロジックやクエリコードを複数のコンポーネント間で何度も移動させることになりかねない。

戦略が決まったところで、一つずつ実行に移そう。


## サーバーコードとユーティリティから整理する

### 日付表示ユーティリティの分離

最初に手を付けたのは`formatDate`関数だった。2つのページで同じ関数がそれぞれインライン定義されていたためだ。

```typescript
// utils/formatYYYYMMDD.ts
export function formatYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const date = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}
```

小さな変更ではあるが、リファクタリングの最初のコミットとして重要な意味があった。最も独立していて副作用の少ない部分から触り、テストが引き続き通るかを確かめる**ウォームアップ**のようなものだ。

### React Queryフックの分離

次に、コンポーネント内へ直接記述されていた`useQuery`、`useMutation`の呼び出しを別ファイルに分離した。`queryOptions`パターンを活用し、クエリ設定を再利用可能な単位にまとめた。

この過程で、`remotes.ts`にあったAPIレスポンスの型も明示的に定義した。従来は`any`のまま流れていた型が、`GetRoomsResponse`、`GetReservationsResponse`などとして明確になった。

インフラレイヤーを整理できたので、次はドメインモデルに目を向けよう。


## ドメインモデルの分離

リファクタリングにおける最大の転換点は、**ドメインモデルを独立した`models/`ディレクトリへ分離**したことだった。

従来のコードでは、`EQUIPMENT_LABELS`や`TIME_SLOTS`のようなビジネス上の定数がコンポーネントファイルの先頭に宣言されていた。`Room`や`Reservation`の型もサーバーハンドラー（`_tosslib/server/types.ts`）にしか存在せず、クライアントコードでは`any`に近い状態で使われていた。

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

なぜドメインモデルの分離が重要なのだろうか。ビジネスロジックがUIコンポーネントに依存していると、そのロジックを変更する際にコンポーネントのレンダリングロジックまで確認しなければならない。一方、`models/`ディレクトリに独立して存在していれば、ビジネスルールの変更をUIから切り離して行える。もちろん現実的に完全な分離は難しい。それでも少なくとも、**「このロジックならここにあるはずだ」と予測できる構造**を作ることが重要だ。

ドメインモデルを分離したことで、UIはどこまで軽くできるだろうか。


## コンポーネントの解体

### ReservationStatusPage

この作業は、最も劇的な変化をもたらしたコミットであり、最も時間がかかった。385行のモノリシックなコンポーネントを次のように分割した。

```
ReservationStatusPage/
├── index.tsx                    # 페이지 레벨
└── components/
    ├── DateSelector.tsx         # 날짜 선택 UI
    ├── ReservationTimeline.tsx  # 타임라인
    └── MyReservation.tsx        # 내 예약 목록 + 취소
```

分割の基準は、**「このコードが独立して意味を持つか」**だった。タイムラインの可視化は、日付に応じた予約データを受け取ってグリッドを描画する独立した関心事だ。自分の予約一覧は、ユーザーの予約データを取得してキャンセルする独立した関心事だ。それらが同じファイルにある理由はなかった。

分割後の`index.tsx`は、**オーケストレーター（orchestrator）**としての役割だけを担うようになった。状態管理、メッセージの表示、子コンポーネントの組み合わせを担当するだけで、実際のデータ取得やレンダリングの詳細は子コンポーネントへ委ねた。

### RoomBookingPage

予約ページも同じ原則で分割した。

```
RoomBookingPage/
├── index.tsx                    # 페이지 레벨
├── components/
│   ├── BookingFilter.tsx        # 날짜, 시간, 인원, 장비, 층 UI
│   └── AvailableRoomList.tsx    # 예약 가능 방 목록
└── hooks/
    └── useBookingParams.ts      # URL searchParams 기반 상태 관리
```

この過程では、ひとつ興味深い選択があった。当初は`react-hook-form` + `zod`を導入してフォームのバリデーションを試みた。しかし最終的にはそれを取り除き、カスタムフック`useBookingParams`へ置き換えた。この決定については、後ほど詳しく説明する。

ここまで読めば、自然とひとつの疑問が浮かぶ。いったいどこまで抽象化すべきなのだろうか。


## 抽象化の適切なライン

このセクションは、筆者が今回の模擬試験で最も悩んだ部分だ。

### ネストした条件文は、どこまで分解すべきか

会議室が予約可能かを判定するロジックには、複数の条件が組み合わされている。収容人数が十分か、必要な設備があるか、希望する階と一致するか、時間が重なっていないか。元のコードでは、これらすべての条件がひとつの`filter`コールバック内にインラインで記述されていた。

筆者はこれを`models/roomFilter.ts`へ抽出し、各条件を**名前の付いた関数**に分けた。

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

ここで重要なのは、**抽象化できる明確な名前がある場合に限って関数へ分割した**ことだ。`isEnoughCapacity`や`hasRequiredEquipment`という名前なら、実装を見なくても何をするのか予測できる。もし`processRoomConditions`のような曖昧な名前にせざるを得ないなら、その抽象化はかえって読み手の認知負荷を高める可能性がある。

もちろん、これが唯一の正解というわけではない。ただ、筆者の判断基準は**「この関数名だけを見て動作を予測できるか」**だった。予測できるなら抽象化し、できないならインラインのままにするほうが、かえって可読性を高められると考えた。

### searchParamsとフォームの状態

予約フィルターの状態をどこに置くかも、かなり悩んだ部分だった。元のコードでは`useState`で各フィルター値を管理しつつ、`useEffect`でURLのsearchParamsと同期していた。

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

筆者は最初に`react-hook-form` + `zod`を導入し、フォームとして管理する方法を試した。しかし最終的にはこれを取り除き、**searchParamsを信頼できる唯一の情報源（Single Source of Truth）**として使う`useBookingParams`フックに置き換えた。

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

この決定の核心にあったのは、**「状態が別々に動くのは適切ではない」**という判断だ。`useState`と`searchParams`がそれぞれ状態を持つと、同期するタイミングによって不整合が起きる可能性がある。一方、searchParamsだけを状態として使えば、URLそのものがアプリケーションの状態となり、同期の問題自体がなくなる。ユーザーがURLを共有すれば同じフィルター状態を再現できるのは、おまけの利点だ。

ほかの参加者の振り返りにも、似た悩みが見られた。**「URLのsearchParamsを信頼できる唯一の情報源として統一した」「個別のフィルターpropsをひとつの`filter`オブジェクトへまとめる方法を選んだ」**。表現は異なっていても、**「分散した状態をひとつの概念にまとめる必要がある」**という問題意識は同じだった。


## 安定性

### SuspenseとErrorBoundary

コンポーネント構造が固まったあと、エラー処理とローディング処理を追加した。順序が重要なのは、境界（Boundary）をどこに設けるかは、コンポーネントツリーが決まって初めて判断できるからだ。

`react-error-boundary`ライブラリを使い、独立したデータ取得単位ごとに`ErrorBoundary`と`Suspense`で囲んだ。タイムラインの取得に失敗しても自分の予約一覧は正常に表示されるべきであり、その逆も同じだからだ。

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

### Query Keyの一元管理

リファクタリングの過程でクエリフックを分離すると、query keyが複数のファイルへ分散する問題が生じた。mutationの`onSuccess`でinvalidationを行う際、どのkeyを使うべきか追いにくくなったのだ。

`@lukemorales/query-key-factory`を導入し、クエリキーを一元管理するよう変更した。

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

これにより、`useSuspenseQueries({ queries: [roomKeys.list, reservationKeys.list(date)] })`という形で利用でき、クエリキーと取得関数が常に一緒に扱われるようになる。また、routeのパスも`PATHS`定数へ抽出し、文字列のハードコーディングを取り除いた。


## 出題者の意図は何だったのか

リファクタリングを終えたあと、筆者は一歩引いて考えてみた。この模擬試験が評価しようとしていたものは何だったのだろうか。

ほかの参加者の振り返りを読み、興味深い共通点に気づいた。ほぼすべての記事に、**「コードは読むものではなく、予測するものだ」**という一文が登場していた。私たちの脳はコードを一行ずつ解釈するのではなく、経験から蓄積したパターンをもとに予測しながら読む。そして、その予測が外れたときに認知負荷が急激に高まる。

この観点から見れば、模擬試験が評価するのは単なるコーディング能力ではなく、**「同僚が読むコードを、どれだけ予測可能なものにできるか」**という協働の力なのだ。（出題者や同僚の心を読むことこそ、真のソフトウェアエンジニアの能力なのかもしれない）

ほかの参加者の振り返りを見ると、**「他人が書いたコードを理解するのは簡単ではない」「インターフェースを先に設計することは重要だが、膨大な既存コードを前にすると、そのアプローチが揺らぐこともある」**という内容に共感した。筆者も同じような経験をした。既存のコードがすでに動いていると、その構造を合理化したくなる。「もう動いているコードなのに、わざわざ？」という考えだ。しかし模擬試験の核心は、その誘惑を乗り越え、**「自分ではない誰かがこのコードを読んだとき、どれだけ早く把握できるか、自分の認識に基づいて問題を判断し解決していけるか」**を基準に判断することにあった。


## リファクタリングから学んだこと

**リファクタリングの順序が結果を左右する。** 外側（インフラ）から内側（UI）へ進めるのが、途中で絡まない安全な道筋だった。ユーティリティとドメインモデルを整理してからコンポーネントを分割すると、各コンポーネントが何に依存しているのかが明確になった。

**抽象化の判断基準は「名前」だ。** 関数や変数として抽出したとき、その名前で動作を説明できるなら抽象化する価値がある。どうしても名前が曖昧になるなら、インラインのほうが適切な選択かもしれない。

**状態を置く場所が、そのままアーキテクチャになる。** 一緒に動くべき状態は同じ場所に置く必要がある。`useState`と`searchParams`を同期させるよりも、searchParamsだけを信頼できる唯一の情報源として使うほうが、構造として健全だ。


## おわりに

課題を終えたあと、2人の同僚と話をした。一人でコードを眺めていたときには見えなかったものが、対話を通じて考えを解きほぐす過程で姿を現し始めた。筆者が当然のこととして見過ごしていた構造上の選択に「なぜそうしたの？」と問われた瞬間、それまで意識していなかった判断の隙が見えてくる。

AIがコードの作成やレビューにかかる時間を劇的に減らしているのは事実だ。それでもコードレビューやデイリーミーティングが今なお重要だと思う理由は、まさにこうした経験にある。AIはコードの整合性を検証できるが、**「あなたが見落としている観点はこれだ」**と指摘するのは、結局のところ同じ文脈を共有する同僚の役割だ。自分には見えなかった部分の発見、そしてその発見を通じたプロダクトの安定化。これこそが協働の本質ではないだろうか。

問題を解いていく過程で書くコードに、唯一の正解はない。同じ模擬試験に取り組んだほかの参加者も、それぞれ異なる道筋を選び、それぞれに根拠があった。大切なのは、**「なぜこのように書いたのか」を説明できること**だ。この記事を読む方にも、一度は自分のコードを初めて見る人の視点で眺めてみることを勧めたい。その視点こそが、コードの品質を決める最も強力な基準になり得るだろう。
