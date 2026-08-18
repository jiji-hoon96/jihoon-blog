---
emoji: 🛠️
title: 'Reflexiones sobre la refactorización del segundo simulacro de Toss Frontend Fundamentals'
seoTitle: 'Refactorización del segundo simulacro de Toss Frontend Fundamentals — separación de componentes y extracción de la lógica de dominio'
date: '2026-03-28'
categories: 프론트엔드 React 리팩토링
description: "Comparto mi experiencia al refactorizar la aplicación de reserva de salas del segundo simulacro de Toss Frontend Fundamentals. Repaso la separación de componentes monolíticos, la extracción de la lógica de dominio y el proceso de refactorización guiado por pruebas."
keywords: "Toss Frontend Fundamentals, refactorización frontend, separación de componentes React, revisión de código, simulacro de Toss, diseño frontend"
locale: es
translationOf: '260328'
sourceHash: e86e832b1598fe8ec2aadc4afd0647977190316292f2adb0fd1d520f28953ab4
---

En este artículo quiero hablar de mi experiencia de refactorización al participar en el segundo simulacro de Toss Frontend Fundamentals.

Como siempre me han interesado las revisiones de código y la refactorización, decidí afrontar este interesante ejercicio publicado por Toss bajo el formato de simulacro de Frontend Fundamentals. El ejercicio consistía en refactorizar una aplicación de reserva de salas de reuniones. También incluía tests, por lo que contaba con una red de seguridad para comprobar que ninguna funcionalidad se rompiera durante el proceso.

Al final, dediqué dos días a la refactorización y quiero resumir lo que aprendí durante el proceso.


## El primer encuentro con el código

Lo primero que hice al abrir el código fue **leer las especificaciones de los tests**. Los tests son la documentación que explica con mayor honestidad qué debe hacer una aplicación. Revisé `App.easy.spec.tsx` y `App.hard.spec.tsx` para comprender todos sus requisitos.

Después examiné el código real y encontré dos componentes monolíticos.

- `ReservationStatusPage` era un componente de unas 400 líneas que reunía en un único archivo la selección de fecha, la visualización de la línea temporal, el tooltip con los detalles de la reserva, la lista de mis reservas y la función de cancelación.
- `RoomBookingPage` era un componente de unas 300 líneas en el que se entrelazaban los filtros, la lista de salas, la lógica de creación de reservas y la sincronización de los parámetros de la URL.

Mientras leía el código, antes de decidir que «había que mejorarlo», me centré en **clasificar sus características**: qué partes contenían información de dominio, cuáles tenían carácter de utilidad y cuáles pertenecían exclusivamente a la capa de UI.

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

Esta clasificación hizo que empezara a resultar evidente por dónde debía comenzar. Añadí comentarios breves en cada área del código para anotar posibles mejoras. (Me recordó a cuando entré en mi empresa actual y tuve que migrar un proyecto basado en jquery).

Entonces, ¿por dónde debía empezar?


## Definir la estrategia de refactorización

Decidí llevar a cabo la refactorización en el siguiente orden.

1. **Gestión del código de servidor**: separar queries y mutations
2. **Separación de la lógica de dominio**: modelos Equipment, Room y Reservation
3. **Declaración de tipos**: organizar el sistema de tipos a partir de los modelos de dominio
4. **Separación de funciones de utilidad**: formato de fechas, cálculos de la línea temporal, etc.
5. **Separación de la capa de UI**: dividir los componentes en unidades manejables según sus responsabilidades
6. **Abstracción y separación de responsabilidades**: gestión de errores/carga y de query keys

Elegí este orden para avanzar **desde el exterior hacia el interior siguiendo la dirección de las dependencias**. Primero organizaría la infraestructura —código de servidor y utilidades—, después establecería los modelos de dominio y, por último, puliría la UI. Si separaba primero los componentes de UI, podía acabar trasladando entre varios componentes una lógica de dominio y un código de queries que todavía no estaban organizados.

Con la estrategia definida, era hora de ponerla en práctica paso a paso.


## Empezar por el código de servidor y las utilidades

### Separar la utilidad de formato de fecha

Lo primero que modifiqué fue la función `formatDate`, porque estaba definida inline por separado y de forma idéntica en ambas páginas.

```typescript
// utils/formatYYYYMMDD.ts
export function formatYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const date = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}
```

Aunque era un cambio pequeño, tenía un significado importante como primer commit de la refactorización. Era una especie de **calentamiento**: empezar por la parte más independiente y con menos efectos secundarios para comprobar que los tests siguieran pasando.

### Separar los hooks de React Query

A continuación, extraje a archivos independientes las llamadas a `useQuery` y `useMutation` que estaban escritas directamente dentro de los componentes. Utilicé el patrón `queryOptions` para convertir la configuración de las queries en unidades reutilizables.

Durante este proceso también definí de forma explícita los tipos de respuesta de la API que se encontraban en `remotes.ts`. Los tipos que antes se propagaban como `any` pasaron a estar claramente definidos como `GetRoomsResponse`, `GetReservationsResponse`, etc.

Una vez organizada la capa de infraestructura, podía centrarme en los modelos de dominio.


## Separar los modelos de dominio

El punto de inflexión más importante de la refactorización fue **separar los modelos de dominio en un directorio `models/` independiente**.

En el código original, constantes de negocio como `EQUIPMENT_LABELS` y `TIME_SLOTS` estaban declaradas al principio de los archivos de componentes. Los tipos de `Room` y `Reservation` solo existían en el handler del servidor (`_tosslib/server/types.ts`) y, en el código del cliente, se utilizaban prácticamente como `any`.

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

¿Por qué es importante separar los modelos de dominio? Cuando la lógica de negocio depende de un componente de UI, para modificarla también hay que revisar la lógica de renderizado del componente. En cambio, si reside de forma independiente en el directorio `models/`, las reglas de negocio pueden modificarse por separado de la UI. Por supuesto, una separación perfecta es difícil de lograr en la práctica, pero lo esencial es crear, como mínimo, **una estructura que permita predecir que «esta lógica estará aquí»**.

Una vez separados los modelos de dominio, ¿hasta qué punto podía aligerarse la UI?


## Descomponer los componentes

### ReservationStatusPage

Este fue el commit que produjo el cambio más drástico y también el que más tiempo me llevó. Dividí el componente monolítico de 385 líneas de la siguiente manera.

```
ReservationStatusPage/
├── index.tsx                    # 페이지 레벨
└── components/
    ├── DateSelector.tsx         # 날짜 선택 UI
    ├── ReservationTimeline.tsx  # 타임라인
    └── MyReservation.tsx        # 내 예약 목록 + 취소
```

El criterio para separar cada parte fue **«¿tiene este código sentido de manera independiente?»**. Visualizar la línea temporal es una responsabilidad independiente que recibe los datos de las reservas de una fecha y dibuja una cuadrícula. Consultar y cancelar las reservas del usuario también lo es. No había ningún motivo para que estuvieran en el mismo archivo.

Después de la separación, `index.tsx` quedó limitado al papel de **orquestador (orchestrator)**. Se encargaba de gestionar el estado, mostrar mensajes y componer los subcomponentes, mientras que delegaba en ellos el fetching de datos y los detalles de renderizado.

### RoomBookingPage

Dividí la página de reservas siguiendo el mismo principio.

```
RoomBookingPage/
├── index.tsx                    # 페이지 레벨
├── components/
│   ├── BookingFilter.tsx        # 날짜, 시간, 인원, 장비, 층 UI
│   └── AvailableRoomList.tsx    # 예약 가능 방 목록
└── hooks/
    └── useBookingParams.ts      # URL searchParams 기반 상태 관리
```

Durante el proceso tomé una decisión interesante. Al principio intenté introducir `react-hook-form` + `zod` para validar el formulario. Sin embargo, finalmente los eliminé y los sustituí por el hook personalizado `useBookingParams`. Más adelante explicaré esta decisión con mayor detalle.

Llegados a este punto, surge una pregunta de forma natural: ¿hasta dónde debemos abstraer?


## El nivel adecuado de abstracción

Esta fue la parte sobre la que más reflexioné durante el simulacro.

### ¿Hasta qué punto conviene descomponer las condiciones anidadas?

La lógica que determina si una sala se puede reservar combina varias condiciones: si la capacidad es suficiente, si cuenta con el equipamiento necesario, si está en la planta preferida y si existe un solapamiento horario. En el código original, todas ellas estaban escritas inline dentro de un único callback de `filter`.

Al extraer esta lógica a `models/roomFilter.ts`, separé cada condición en **una función con nombre**.

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

La clave está en que **solo separé en funciones aquello que podía recibir un nombre claro**. Nombres como `isEnoughCapacity` y `hasRequiredEquipment` permiten predecir qué hace cada función sin mirar su implementación. Si el nombre tuviera que ser ambiguo, como `processRoomConditions`, la abstracción podría aumentar la carga cognitiva de quien lee el código.

Esto no significa, por supuesto, que sea la única respuesta correcta. Mi criterio fue **«¿se puede predecir el comportamiento con solo leer el nombre de la función?»**. Si es así, merece la pena abstraer; si no, dejarlo inline puede favorecer la legibilidad.

### searchParams frente al estado del formulario

También reflexioné bastante sobre dónde debía residir el estado de los filtros de reserva. En el código original, cada valor se gestionaba mediante `useState` y se sincronizaba con los searchParams de la URL mediante `useEffect`.

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

Primero probé a introducir `react-hook-form` + `zod` para gestionarlos como un formulario. Sin embargo, finalmente los eliminé y los sustituí por el hook `useBookingParams`, que utiliza **los searchParams como única fuente de verdad (Single Source of Truth)**.

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

El principal motivo de esta decisión fue considerar que **«no conviene que estos estados evolucionen por separado»**. Si tanto `useState` como `searchParams` mantienen su propio estado, pueden producirse discrepancias según el momento de la sincronización. En cambio, si solo se utilizan los searchParams como estado, la URL pasa a ser el estado de la aplicación y el problema de sincronización desaparece por completo. Además, si el usuario comparte la URL, se puede reproducir el mismo estado de los filtros.

Encontré reflexiones similares en los artículos de otros participantes: **«unifiqué los searchParams de la URL como única fuente de verdad» y «opté por agrupar las props individuales de los filtros en un único objeto `filter`»**. Aunque las soluciones se expresaban de forma distinta, partían del mismo diagnóstico: **«los estados dispersos deben agruparse bajo un solo concepto»**.


## Estabilidad

### Suspense y ErrorBoundary

Una vez definida la estructura de los componentes, añadí la gestión de errores y estados de carga. El orden es importante porque solo se puede decidir dónde establecer un Boundary después de definir el árbol de componentes.

Utilicé la librería `react-error-boundary` para envolver cada unidad independiente de fetching de datos con `ErrorBoundary` y `Suspense`. Aunque falle la línea temporal, la lista de mis reservas debe seguir mostrándose con normalidad, y viceversa.

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

### Gestión centralizada de las query keys

Al separar los hooks de las queries durante la refactorización, surgió el problema de que las query keys quedaron dispersas en varios archivos. Esto dificultaba saber qué key debía utilizarse para la invalidation dentro del `onSuccess` de una mutation.

Introduje `@lukemorales/query-key-factory` para gestionar las query keys de forma centralizada.

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

Así se pueden utilizar con la forma `useSuspenseQueries({ queries: [roomKeys.list, reservationKeys.list(date)] })`, de modo que la query key y la función de fetching siempre se desplazan juntas. También extraje las rutas como constantes `PATHS` para eliminar strings hardcodeados.


## ¿Cuál era la intención de quienes diseñaron el ejercicio?

Después de terminar la refactorización, tomé cierta distancia y reflexioné: ¿qué pretendía evaluar este simulacro?

Al leer los artículos de otros participantes, descubrí un punto en común interesante. En casi todos aparecía la frase **«el código no se lee, se predice»**. Nuestro cerebro no interpreta el código línea por línea, sino que lo lee anticipándose a partir de los patrones acumulados mediante la experiencia. Cuando esas predicciones fallan, la carga cognitiva aumenta drásticamente.

Desde esta perspectiva, el simulacro no evalúa simplemente la capacidad de programar, sino la capacidad de colaborar: **«¿hasta qué punto puedes hacer que el código que leerán tus compañeros sea predecible?»**. (Tal vez la auténtica habilidad de un ingeniero de software sea leer la mente tanto de quienes diseñan el ejercicio como de sus compañeros).

Al revisar las experiencias de otros participantes, me identifiqué con ideas como **«no es fácil entender el código que ha escrito otra persona» y «es importante diseñar primero la interfaz, pero ese enfoque puede tambalearse ante una gran base de código existente»**. Yo también viví algo parecido. Cuando el código existente ya funciona, surge la tentación de justificar su estructura: «Si ya funciona, ¿para qué cambiarlo?». Sin embargo, el objetivo central del simulacro era superar precisamente esa tentación y evaluar **«con qué rapidez podría entender este código otra persona y si uno es capaz de analizar y resolver el problema con su propio criterio»**.


## Lo que aprendí de la refactorización

**El orden de la refactorización determina el resultado.** Avanzar desde el exterior —la infraestructura— hacia el interior —la UI— fue la ruta más segura para evitar enredos a mitad del proceso. Al dividir los componentes después de organizar las utilidades y los modelos de dominio, las dependencias de cada componente quedaron claras.

**El criterio para abstraer es el «nombre».** Si al extraer algo a una función o variable su nombre puede explicar el comportamiento, merece la pena abstraerlo. Si el nombre será inevitablemente ambiguo, dejarlo inline puede ser una opción mejor.

**La ubicación del estado es la arquitectura.** Los estados que deben evolucionar juntos tienen que residir en el mismo lugar. Desde un punto de vista estructural, es más sano utilizar únicamente los searchParams como fuente de verdad que sincronizar `useState` con `searchParams`.


## Conclusión

Después de terminar el ejercicio, conversé con dos compañeros. Al hablar y desarrollar mis ideas empezaron a surgir aspectos que no había visto mientras examinaba el código en solitario. En cuanto alguien pregunta «¿por qué lo hiciste así?» sobre una decisión estructural que yo había dado por sentada, aparecen lagunas de criterio de las que no era consciente.

Es cierto que la IA está reduciendo drásticamente el tiempo necesario para escribir y revisar código. Aun así, experiencias como esta son la razón por la que sigo considerando importantes las revisiones de código y las reuniones diarias. La IA puede comprobar la coherencia del código, pero señalar **«esta es la perspectiva que has pasado por alto»** sigue siendo responsabilidad de un compañero que comparte el mismo contexto. Descubrir lo que yo no había visto y estabilizar el producto gracias a ese descubrimiento: ¿no es esa la esencia de la colaboración?

No existe una única respuesta correcta al escribir código mientras resolvemos un problema. Otros participantes que hicieron el mismo simulacro eligieron caminos distintos, cada uno con sus propios motivos. Lo importante es **poder explicar «por qué está escrito así»**. Recomiendo a quienes lean este artículo que, al menos una vez, observen su código desde la perspectiva de alguien que lo ve por primera vez. Esa mirada puede convertirse en el criterio más poderoso para determinar la calidad del código.
