---
emoji: 🛠️
title: 'Reflexões sobre a refatoração do 2º simulado do Toss Frontend Fundamentals'
seoTitle: 'Refatoração do 2º simulado do Toss Frontend Fundamentals — separação de componentes e extração da lógica de domínio'
date: '2026-03-28'
categories: frontend React refatoração
description: "Compartilho minha experiência refatorando o aplicativo de reserva de salas do 2º simulado do Toss Frontend Fundamentals. Reuni o processo de separação de componentes monolíticos, extração da lógica de domínio e refatoração orientada por testes."
keywords: "Toss Frontend Fundamentals, refatoração de frontend, separação de componentes React, revisão de código, simulado da Toss, arquitetura frontend"
locale: pt-BR
translationOf: '260328'
sourceHash: e86e832b1598fe8ec2aadc4afd0647977190316292f2adb0fd1d520f28953ab4
---

Neste post, quero contar como foi minha experiência de refatoração durante a 2ª edição do simulado do Toss Frontend Fundamentals.

Como sempre tive interesse por revisão de código e refatoração, decidi encarar esse desafio da Toss, que tinha um formato bem interessante. A tarefa consistia em refatorar um aplicativo de reserva de salas de reunião fornecido pela organização. Como o projeto também vinha acompanhado de testes, havia uma rede de segurança para verificar se alguma funcionalidade havia sido quebrada durante a refatoração.

No fim, trabalhei na refatoração durante dois dias e quero registrar aqui o que percebi ao longo desse processo.


## Meu primeiro contato com o código

A primeira coisa que fiz ao abrir o código foi **ler as especificações dos testes**. Afinal, os testes são a documentação que mostra com mais honestidade o que a aplicação deve fazer. Passei por `App.easy.spec.tsx` e `App.hard.spec.tsx` para entender os requisitos gerais da aplicação.

Em seguida, examinei o código em si e dois componentes monolíticos chamaram minha atenção.

- `ReservationStatusPage` era um componente com cerca de 400 linhas que reunia, em um único arquivo, seleção de data, visualização da timeline, tooltip com os detalhes da reserva, lista das minhas reservas e funcionalidade de cancelamento.
- `RoomBookingPage` era um componente com cerca de 300 linhas no qual filtros, lista de salas, lógica de criação de reservas e sincronização dos parâmetros da URL estavam todos entrelaçados.

Enquanto lia o código, antes mesmo de concluir que ele "precisava melhorar", concentrei-me em **classificar suas características**. A ideia era distinguir o que continha informações de domínio, o que tinha natureza utilitária e o que pertencia puramente à camada de UI.

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

Depois dessa classificação, começou a ficar claro por onde eu deveria começar. Deixei comentários breves em cada área do código para anotar possíveis direções de melhoria. (A sensação era parecida com a que tive ao entrar na empresa atual e migrar um projeto baseado em jquery.)

Mas, afinal, por onde começar?


## Definição da estratégia de refatoração

Planejei executar a refatoração na seguinte ordem:

1. **Tratamento do código de servidor**: separar query e mutation
2. **Separação da lógica de domínio**: modelos Equipment, Room e Reservation
3. **Declaração de tipos**: organizar o sistema de tipos com base nos modelos de domínio
4. **Separação das funções utilitárias**: formatação de data, cálculos da timeline etc.
5. **Separação da camada de UI**: dividir os componentes em unidades coerentes por responsabilidade
6. **Abstração e separação de responsabilidades**: tratamento de erro/carregamento e gerenciamento de query keys

Escolhi essa ordem para avançar **de fora para dentro na direção das dependências**. Primeiro, organizei a infraestrutura — código de servidor e utilitários —, depois estabeleci os modelos de domínio e, por fim, refinei a UI. Se eu separasse os componentes de UI antes, poderia acabar tendo de mover entre vários componentes uma lógica de domínio e um código de query que ainda não estavam organizados.

Com a estratégia definida, era hora de colocá-la em prática, etapa por etapa.


## Começando pelo código de servidor e pelos utilitários

### Extração do utilitário de exibição de data

Comecei pela função `formatDate`, pois ela estava definida inline, de forma idêntica, nas duas páginas.

```typescript
// utils/formatYYYYMMDD.ts
export function formatYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const date = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}
```

Embora fosse uma mudança pequena, ela teve um significado importante como primeiro commit da refatoração. Foi uma espécie de **aquecimento**: começar pela parte mais independente e com menos efeitos colaterais para confirmar que os testes continuavam passando.

### Extração dos hooks do React Query

Depois, extraí para arquivos separados as chamadas a `useQuery` e `useMutation` que estavam escritas diretamente dentro dos componentes. Usei o padrão `queryOptions` para transformar as configurações das queries em unidades reutilizáveis.

Nesse processo, também defini explicitamente os tipos das respostas da API que estavam em `remotes.ts`. Tipos que antes se propagavam como `any` passaram a ficar claros, como `GetRoomsResponse` e `GetReservationsResponse`.

Com a camada de infraestrutura organizada, voltei minha atenção para os modelos de domínio.


## Separação dos modelos de domínio

O ponto de virada mais importante da refatoração foi **separar os modelos de domínio em um diretório `models/` próprio**.

No código original, constantes de negócio como `EQUIPMENT_LABELS` e `TIME_SLOTS` estavam declaradas no topo dos arquivos de componentes. Os tipos de `Room` e `Reservation` também existiam apenas no handler do servidor (`_tosslib/server/types.ts`), enquanto no código do cliente eram usados praticamente como `any`.

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

Por que separar os modelos de domínio é tão importante? Quando a lógica de negócio depende de um componente de UI, qualquer alteração nessa lógica exige que se examine também a lógica de renderização do componente. Quando ela existe de forma independente no diretório `models/`, porém, as regras de negócio podem mudar separadamente da UI. É claro que, na prática, uma separação perfeita é difícil, mas o essencial é ao menos criar uma estrutura na qual seja possível prever que **"essa lógica estará aqui"**.

Com os modelos de domínio separados, até que ponto a UI poderia ficar mais leve?


## Decomposição dos componentes

### ReservationStatusPage

Esse foi o commit que produziu a mudança mais drástica e também o que mais consumiu tempo. Dividi o componente monolítico de 385 linhas da seguinte forma:

```
ReservationStatusPage/
├── index.tsx                    # 페이지 레벨
└── components/
    ├── DateSelector.tsx         # 날짜 선택 UI
    ├── ReservationTimeline.tsx  # 타임라인
    └── MyReservation.tsx        # 내 예약 목록 + 취소
```

O critério para a separação foi: **"este código tem significado por si só?"** A visualização da timeline é uma responsabilidade independente, que recebe os dados das reservas de uma data e desenha uma grade. A lista das minhas reservas é outra responsabilidade independente, que consulta os dados de reserva do usuário e permite cancelá-las. Não havia motivo para que ambas ficassem no mesmo arquivo.

Depois da separação, `index.tsx` passou a exercer apenas o papel de **orquestrador (orchestrator)**. Ele ficou responsável pelo gerenciamento de estado, pela exibição de mensagens e pela composição dos componentes filhos, enquanto o fetching de dados e os detalhes de renderização foram delegados a esses componentes.

### RoomBookingPage

Separei a página de reservas seguindo o mesmo princípio.

```
RoomBookingPage/
├── index.tsx                    # 페이지 레벨
├── components/
│   ├── BookingFilter.tsx        # 날짜, 시간, 인원, 장비, 층 UI
│   └── AvailableRoomList.tsx    # 예약 가능 방 목록
└── hooks/
    └── useBookingParams.ts      # URL searchParams 기반 상태 관리
```

Durante esse processo, fiz uma escolha interessante. No início, tentei introduzir `react-hook-form` + `zod` para validar o formulário. No fim, porém, removi essa abordagem e a substituí pelo hook customizado `useBookingParams`. Falarei dessa decisão em mais detalhes adiante.

Neste ponto, surge naturalmente uma pergunta: até onde devemos abstrair?


## O nível adequado de abstração

Esta foi a questão sobre a qual mais refleti durante o simulado.

### Até onde devemos decompor condicionais aninhadas?

A lógica que determina se uma sala está disponível para reserva combina várias condições: se a capacidade é suficiente, se há os equipamentos necessários, se o andar preferido corresponde e se os horários não se sobrepõem. No código original, todas essas condições estavam escritas inline dentro de um único callback de `filter`.

Ao extrair essa lógica para `models/roomFilter.ts`, separei cada condição em uma **função com nome próprio**.

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

O ponto central aqui é que **só extraí uma função quando havia um nome claro para a abstração**. Nomes como `isEnoughCapacity` e `hasRequiredEquipment` permitem prever o comportamento sem olhar a implementação. Se o nome inevitavelmente ficasse vago, como `processRoomConditions`, a abstração poderia, na verdade, aumentar a carga cognitiva de quem lê.

Isso não significa, é claro, que essa seja a única resposta correta. Meu critério foi: **"é possível prever o comportamento apenas pelo nome da função?"** Se sim, vale abstrair; caso contrário, manter inline pode até favorecer a legibilidade.

### searchParams vs. estado do formulário

Também pensei bastante sobre onde manter o estado dos filtros da reserva. No código original, cada valor de filtro era gerenciado com `useState` e sincronizado com os searchParams da URL por meio de `useEffect`.

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

Primeiro, tentei introduzir `react-hook-form` + `zod` para gerenciar os filtros como um formulário. No fim, porém, removi essa solução e a substituí pelo hook `useBookingParams`, que usa os **searchParams como única fonte da verdade (Single Source of Truth)**.

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

A principal razão para essa decisão foi a conclusão de que **"não fazia sentido que os estados evoluíssem separadamente"**. Quando `useState` e `searchParams` mantêm estados próprios, podem surgir divergências dependendo do momento da sincronização. Quando apenas os searchParams são usados como estado, por outro lado, a URL passa a ser o próprio estado da aplicação e o problema de sincronização simplesmente desaparece. De quebra, se o usuário compartilhar a URL, o mesmo estado dos filtros será reproduzido.

Encontrei reflexões parecidas nos relatos de outros participantes: **"unifiquei os searchParams da URL como única fonte da verdade" e "optei por reunir as props individuais dos filtros em um único objeto `filter`"**. As formas de expressar a solução variavam, mas a percepção do problema era a mesma: **"estados dispersos precisam ser reunidos em um único conceito"**.


## Estabilidade

### Suspense e ErrorBoundary

Depois de definir a estrutura dos componentes, adicionei o tratamento de erro e carregamento. A ordem é importante porque só é possível decidir onde estabelecer cada boundary depois que a árvore de componentes está definida.

Usando a biblioteca `react-error-boundary`, envolvi cada unidade independente de fetching de dados com `ErrorBoundary` e `Suspense`. Isso porque, mesmo se a timeline falhar, a lista das minhas reservas deve continuar aparecendo normalmente — e vice-versa.

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

### Gerenciamento centralizado de Query Keys

À medida que os hooks de query eram separados durante a refatoração, surgiu o problema de as query keys ficarem espalhadas por vários arquivos. Com isso, ficou difícil rastrear qual key deveria ser usada para invalidation no `onSuccess` de uma mutation.

Introduzi `@lukemorales/query-key-factory` para centralizar o gerenciamento das query keys.

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

Assim, é possível usar a forma `useSuspenseQueries({ queries: [roomKeys.list, reservationKeys.list(date)] })`, mantendo a query key e a função de fetching sempre juntas. Também extraí os caminhos das routes para a constante `PATHS`, eliminando strings hardcoded.


## Qual era a intenção dos autores do desafio?

Depois de concluir a refatoração, dei um passo atrás e me perguntei: o que este simulado pretendia avaliar?

Ao ler os relatos de outros participantes, encontrei um ponto em comum interessante. Em quase todos aparecia a frase: **"código não é lido, é previsto"**. Nosso cérebro não interpreta o código linha por linha; ele o lê fazendo previsões com base nos padrões acumulados pela experiência. Quando essas previsões falham, a carga cognitiva aumenta de forma abrupta.

Sob essa perspectiva, o simulado não avaliava apenas a capacidade de programar, mas uma competência de colaboração: **"até que ponto você consegue tornar o código previsível para seus colegas?"**. (Talvez a verdadeira competência de um engenheiro de software seja justamente ler a mente dos autores do desafio e dos colegas.)

Ao examinar os relatos de outros participantes, identifiquei-me com observações como **"não é fácil entender o código escrito por outra pessoa" e "projetar a interface primeiro é importante, mas essa abordagem pode vacilar diante de uma base de código extensa"**. Passei por algo parecido. Quando o código existente já funciona, surge a tentação de racionalizar sua estrutura: "se já está funcionando, para que mexer?". Mas o ponto central do simulado era justamente superar essa tentação e avaliar **"com que rapidez outra pessoa, que não eu, conseguiria entender este código e se eu seria capaz de julgar o problema com meu próprio raciocínio e avançar até resolvê-lo"**.


## O que aprendi com a refatoração

**A ordem da refatoração determina o resultado.** Avançar de fora — infraestrutura — para dentro — UI — foi um caminho seguro, que evitou emaranhados no meio do processo. Ao separar os componentes depois de organizar os utilitários e os modelos de domínio, ficou claro de que cada componente dependia.

**O critério para uma abstração é seu "nome".** Se, ao extrair algo para uma função ou variável, o nome consegue explicar o comportamento, vale a pena abstrair. Se o nome inevitavelmente for vago, manter inline pode ser uma escolha melhor.

**A localização do estado é a própria arquitetura.** Estados que precisam se mover juntos devem ficar no mesmo lugar. Em vez de sincronizar `useState` e `searchParams`, usar apenas os searchParams como fonte da verdade produz uma estrutura mais saudável.


## Conclusão

Depois de terminar a tarefa, conversei com dois colegas. Coisas que eu não percebia ao examinar o código sozinho começaram a aparecer quando desenvolvemos nossas ideias em conjunto. No instante em que alguém pergunta "por que você fez assim?" sobre uma escolha estrutural que eu havia considerado óbvia, tornam-se visíveis as lacunas de raciocínio das quais eu nem sequer tinha me dado conta.

É verdade que a IA está reduzindo drasticamente o tempo necessário para escrever e revisar código. Ainda assim, experiências como essa explicam por que considero code reviews e reuniões diárias tão importantes. A IA pode verificar a consistência do código, mas apontar **"esta é a perspectiva que você deixou passar"** continua sendo papel de colegas que compartilham o mesmo contexto. Descobrir o que eu não consegui enxergar e, a partir dessa descoberta, estabilizar o produto: talvez essa seja a essência da colaboração.

Não existe uma resposta única para escrever código durante o processo de resolução de um problema. Outros participantes do mesmo simulado seguiram caminhos diferentes, cada um com suas próprias razões. O importante é **conseguir explicar "por que foi feito assim"**. Recomendo que os leitores deste texto também tentem olhar para o próprio código pelos olhos de quem o vê pela primeira vez. Essa perspectiva pode ser o critério mais poderoso para determinar a qualidade do código.
