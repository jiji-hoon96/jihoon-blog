---
emoji: 📅
title: 'Kalyx'
seoTitle: 'Kalyx: 4 decisiones para un DatePicker headless en React'
date: '2026-06-17'
categories: ignore bibliotecas React DatePicker código-abierto
description: 'Cómo Kalyx resuelve los compromisos de otros DatePicker con 7 primitivas, un bundle de 16 KB, API ISO, adaptadores y 4 decisiones de diseño.'
keywords: 'Kalyx, React DatePicker, DatePicker headless, react-day-picker, react-datepicker, biblioteca headless, tamaño del bundle, ISO-8601 timezone, Composition pattern, patrón adapter, Radix dot notation, Ark UI, MUI X DatePicker'
locale: es
translationOf: '260617'
sourceHash: 7ced7d6aab4ab2812c3b1665328a8e5693781ef894c6a997732d5ef3d273e831
---

En este artículo quiero hablar de **Kalyx**, la biblioteca headless de DatePicker para React que he creado y publicado recientemente en su versión 1.0.

Como desarrollador frontend, suelo trabajar en proyectos con formularios SaaS. En ellos, casi todas las páginas acaban necesitando algún tipo de entrada de fecha: una fecha concreta, un intervalo, una hora, saltos por mes o año y, además, timezone. Sin embargo, durante el último año me topé con el mismo muro cada vez que empezaba un proyecto nuevo. (Mi experiencia sincera es que ni una sola vez pude resolverlo todo limpiamente con una única biblioteca.)

Un día, mientras unía por tercera vez un TimePicker hecho por mí y un Popover prestado de algún sitio sobre `react-day-picker`, empecé a dibujar en una libreta la API que realmente quería. Aquellas notas acabaron convirtiéndose en la API pública de Kalyx 1.0. Este texto registra, desde la perspectiva de quien lo creó, un año de decisiones: por qué lo construí, qué trade-offs implicaron las cuatro decisiones principales y en qué invertí el tiempo después del lanzamiento de 1.0, cuando prácticamente no había usuarios.

---

## Por qué es difícil un DatePicker para React

Primero conviene repasar brevemente el mercado. Esto demuestra que el muro con el que me encontré no era un problema de elección de biblioteca, sino un **problema inherente de trade-offs**.

Reuní en una tabla las opciones de DatePicker más utilizadas en el ecosistema React en junio de 2026. (Las descargas de npm corresponden a cifras semanales de junio de 2026.)

| Biblioteca | Descargas semanales | Lo que hace bien | Lo que impone |
| --- | --- | --- | --- |
| **react-day-picker** | aprox. 42 M | Calendar headless limpio | Solo Calendar grid. Incluso en v10, Input y TimePicker no tienen soporte oficial |
| **react-datepicker** | aprox. 4,7 M | Todas las primitive en un solo bundle | Importación CSS obligatoria. El value es un `Date` nativo. Más de 100 props |
| **Ark UI** | cuota en crecimiento | Composition + headless | No hay TimePicker standalone. La hora solo existe dentro de DatePicker |
| **MUI X** | cuota alta | Integración + funciones empresariales | aprox. 58 KB gzip. RangePicker requiere una licencia Pro de pago |
| **React Aria** | aprox. 5,9 M | Accesibilidad al nivel de la spec | Obliga a usar `@internationalized/date`. Incompatible con bases de código date-fns |
| **Headless UI** | junto con Tailwind | Pionera del patrón headless | Se niega a crearlo porque «el coste de mantenimiento es demasiado alto» |

Si se examina cada función por separado, es fácil elegir un ganador. Pero una unidad de trabajo real no consta de una sola función. En un formulario SaaS que necesita a la vez una fecha única, un filtro por intervalo, selección de hora y saltos por mes o año, **no había una biblioteca que lo cubriera todo**.

Resulta especialmente interesante la postura del equipo de mantenimiento de Headless UI. Tailwind Labs lleva años dejando en suspenso, en la práctica, la solicitud de un DatePicker en [GitHub Discussion #289](https://github.com/tailwindlabs/headlessui/discussions/289). El hilo se abrió en 2021 y, cinco años después, sigue abierto sin respuesta del equipo; en el árbol de código de `@headlessui-react` no existe un solo componente relacionado con fechas. A los usuarios de Tailwind se los acaba dirigiendo a React Aria. Si pensamos que locale, timezone, DST, distintos sistemas de calendario, accesibilidad y navegación por teclado chocan todos a la vez en un DatePicker, esa cautela es un diagnóstico totalmente comprensible. (Yo tampoco entendí la magnitud de la carga hasta que lo construí.)

El caso de Ark UI transmite la misma señal. Ark UI, creado por el equipo de Chakra UI, **no tiene un componente TimePicker standalone**. La selección de hora solo se gestiona dentro de DatePicker a través de `@internationalized/date`, mediante su `CalendarDateTime`. Es decir, no es una primitive independiente que alguien que usa Tailwind pueda combinar por separado «solo para la hora». (Al principio lo interpreté de forma demasiado tajante como que «Ark había abandonado TimePicker», pero, tras releer la documentación, lo exacto es decir que «nunca lo separó como componente independiente». Lo importante es que incluso un equipo de referencia entre las bibliotecas headless trató con cautela la separación de TimePicker como primitive propia.)

Llegados aquí surge una pregunta natural: «Entonces, ¿de verdad no hay forma de resolver estos trade-offs dentro de una sola biblioteca?».

---

## El lugar de Kalyx

Kalyx es mi respuesta a esa pregunta. En una frase, es **«un DatePicker headless para React que funciona nada más instalarlo, sin importar CSS, y que puede personalizarse libremente con cualquier sistema de estilos»**.

Esto es lo que incluía la versión 1.0.

- **7 componentes primitive**: `DatePicker`, `RangePicker`, `TimePicker`, `DateTimePicker`, `MonthPicker`, `YearPicker`, `WeekPicker`
- **3 Headless Hook**: `useDatePicker`, `useRangePicker`, `useTimePicker` (puntos de entrada para descartar por completo la UI de la biblioteca y crear una propia)
- **Una única Composition API**: las 7 primitive usan el mismo Context y el mismo patrón dot notation
- **aprox. 16 KB gzip (ESM)**: terminado dentro de un techo de 17 KB
- **0 importaciones CSS**: libertad para usar Tailwind, CSS Modules, CSS puro o cualquier otra opción

La API tiene este aspecto.

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

El mismo patrón se repite en las 7 primitive. No hay ni una sola prop bomba de tipo boolean como `showTimeSelect` o `showMonthDropdown`.

Su posicionamiento puede representarse así.

![Diagrama de posicionamiento que muestra qué partes de las bibliotecas existentes reúne Kalyx](1.png?w=620)

Es la unión de las mejores partes de las bibliotecas existentes, con una decisión adicional: **integrar también TimePicker, que no existe como standalone en Ark UI, como primitive independiente dentro de la misma Composition.**

---

## Cuatro decisiones fundamentales

De todas las decisiones de diseño, estas son las cuatro más pesadas y difíciles de revertir. Ahora que la API 1.0 está freeze, puede decirse que estas cuatro forzaron todas las demás.

### Composition over Props

El primer borrador tenía la forma `<DatePicker showTime showMonthGrid presets={[...]} renderHeader={(props) => ...} />`. Era, en esencia, el patrón básico de `react-datepicker`. Tras intentar durante una semana expresar limpiamente en tipos las interacciones entre props, acabé eliminándolo.

La razón era clara: **el coste real de la explosión de props es la pérdida de type safety.** Solo cuando `showTimeSelect` es `true` cobra sentido `timeFormat`, pero el sistema de tipos no puede expresar directamente esa dependencia condicional. Si se intenta resolver con una discriminated union, la interfaz de props explota en grupos de 50 y cada nueva prop obliga a volver a comprobar todas las combinaciones. (Es exactamente el mismo contexto que describí en mi artículo sobre [abstracción](/260201): «una abstracción equivocada aumenta el acoplamiento».)

Radix UI y shadcn/ui resolvieron este problema con especial elegancia mediante el patrón dot notation: las restricciones quedan explícitas en el callsite.

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

El coste es evidente: un `<DatePicker>` de una línea se convierte en un bloque JSX de seis. Pero las ventajas también lo son.

- Claridad que sigue siendo legible un año después
- Tipos sin leak entre combinaciones de props
- Una superficie de estilos infinitamente extensible, porque cada subcomponent posee su propio mapa de slots `classNames`

La implementación se agrupa de forma sencilla con el patrón `Object.assign`.

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

Es compatible con tree shaking, se agrupa en un único `index.ts` por componente y no produce colisiones de namespacing. (La primera vez que vi Radix UI no entendí por qué se hablaba de este patrón como un estándar. Solo después de crear una biblioteca comprendí por qué se convirtió tan rápido en un estándar del sector.)

### Entrada y salida como cadenas ISO-8601

El `value` de Kalyx es `string | null`: una cadena en formato UTC ISO-8601. `onChange` devuelve el mismo tipo de cadena. El objeto `Date` nativo no aparece en ninguna parte de la API pública.

La alternativa «obvia» es un objeto `Date`. También es el origen de incidencias que llevan años abiertas en todos los DatePicker que usan Date nativo: el desfase de timezone no coincide, se rompe el round-trip de `JSON.stringify` y SSR genera valores diferentes en servidor y cliente. La conocida incidencia de timezone [#1018](https://github.com/Hacker0x01/react-datepicker/issues/1018) de `react-datepicker` se abrió en 2017, se prolongó durante ocho años y no se cerró hasta 2025 con la conclusión de que «no es un bug, sino el comportamiento esperado de `Date` en JavaScript». Se cerró añadiendo documentación, sin cambiar el código fuente. Mientras una biblioteca utilice `Date` nativo como tipo de value, este tipo de fricción no puede desaparecer estructuralmente.

Forzar cadenas ISO-8601 ofrece tres garantías.

- **wire-safe**: tras `JSON.stringify` y recuperar el dato, la cadena sigue siendo idéntica byte por byte
- **Seguro para SSR**: servidor y cliente hacen hydrate con la misma cadena
- **Obliga a explicitar el timezone**: el consumer debe declarar en qué zona horaria mostrar el valor, por ejemplo `displayTimezone="Asia/Seoul"`

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

Así se expresa naturalmente el escenario de mostrar el mismo valor ISO en diferentes timezone.

```tsx
const iso = "2026-01-15T15:00:00.000Z";

<DatePicker value={iso} displayTimezone="Asia/Seoul" />       // 2026-01-16 00:00
<DatePicker value={iso} displayTimezone="America/New_York" /> // 2026-01-15 10:00
```

El coste existe. El código downstream que necesite un objeto `Date` debe llamar directamente a `new Date(iso)`. Aun así, decidí que era mucho mejor concentrar ese boundary en un punto del código del consumer que dejar fluir objetos `Date` por toda la biblioteca. (Una lección que aprendí en varios proyectos es que, en cuanto se empieza a recibir un objeto, resulta imposible seguir hasta dónde acaba llegando.)

Los límites como DST los gestionan las utilidades de timezone basadas en Intl de `@kalyx/core`. No están en la interfaz del adapter, sino reunidas en core como funciones `civilMidnightFromUtcDay`, `setTimeInTimezone` y `startOfDayInTimezone`, todas basadas en `Intl.DateTimeFormat`. Al convertir a UTC la medianoche civil del timezone correspondiente, calculan correctamente los límites de DST; el usuario solo tiene que pasar una cadena de timezone IANA y la biblioteca se ocupa del resto. (Es importante que esta lógica de timezone viva en core y no en el adapter. Tanto si se usa date-fns como dayjs, la exactitud del timezone queda garantizada por el mismo código de core.)

### Patrón adapter

`@kalyx/core` no tiene ninguna dependencia de date-fns. La misma interfaz `DateAdapter` de 21 métodos se implementa en `@kalyx/adapter-date-fns`, separado como paquete propio, y `@kalyx/react` recibe el adapter mediante Context. Lo interesante es que el adapter en sí es un shim fino de unas 200 líneas. De los 21 métodos de la interfaz, solo cuatro reciben un timezone (`format`, `isSameDay`, `startOfDay`, `today`), e incluso esos cuatro delegan todo el cálculo real de timezone en las utilidades Intl de core. El adapter se limita a mapear la aritmética y el parsing de fechas a la sintaxis de una biblioteca concreta; no es el responsable de la exactitud.

El resultado de separar los paquetes puede resumirse así.

```
@kalyx/core               # 플랫폼 독립 로직 + Intl 기반 timezone, date-lib 의존 0
@kalyx/adapter-date-fns   # default adapter (별도 패키지)
@kalyx/react              # 컴포넌트 (default로 adapter-date-fns 자동 wire)
@kalyx/react/headless     # zero date-lib entry, 자기 adapter 들고 옴
```

Durante el diseño consideré tres opciones.

| Opción | Ventaja | Desventaja |
| --- | --- | --- |
| A. integrar date-fns en core | Implementación sencilla y onboarding fácil para principiantes | No se puede sustituir sin un major bump |
| B. core solo BYO | Adaptable al futuro | Los principiantes deben configurar manualmente el adapter cada vez |
| C. híbrida (default + sustituible) | Comodidad para principiantes + escape para usuarios avanzados | Separar 2 paquetes + mantener 2 entry |

Elegí C. En la época 0.x había empezado con A, pero justo antes de hacer freeze de la API para v1 stable comprendí algo: **una biblioteca de fechas integrada no puede extraerse sin un major bump.** Extraer entonces el adapter fue la decisión más importante antes de graduar la versión 1.0.

Los adapters que se publiquen después respetarán el mismo contrato de 21 métodos; solo cambiará la implementación.

- `@kalyx/adapter-dayjs`: aproximadamente la mitad de los usuarios de React usa dayjs según las estadísticas, por lo que tiene prioridad 1 (Mantine incluso fija dayjs como peer obligatorio)
- `@kalyx/adapter-luxon`: para empresas y casos avanzados de timezone
- Temporal: tras la extracción concluí que la compatibilidad con la API Temporal de TC39 debe resolverse en core, no mediante un adapter. Como la interfaz del adapter usa cadenas ISO como entrada y salida, no puede transportar intactas las capacidades propias de Temporal. (Retomo esta decisión en la sección «Estado actual».)

### Techo de 17 KB

En el lanzamiento 1.0, el bundle ocupaba aprox. 15,8 KB ESM / 15,9 KB CJS gzip. Al principio fijé el techo en 16 KB y lo subí un escalón, a 17 KB, en v1.1 (más adelante explico por qué). CI impone ese techo. Cada PR ejecuta `pnpm check-bundle`; si lo supera, el build falla.

La cifra no es arbitraria. Se eligió teniendo en cuenta la referencia del mercado.

- `react-day-picker`: aprox. 22 KB solo para Calendar
- `react-datepicker`: aprox. 40–60 KB por todas las primitive
- `MUI X`: aprox. 58 KB (y Range es Pro de pago)
- `Kalyx`: 7 primitive en menos espacio que el Calendar de `react-day-picker`

También registré la evolución del bundle en cada fase RC.

| Fase | Cambio | Techo |
| --- | --- | --- |
| rc.0 | Primera versión completa de 7 primitive | 12 → 13 KB |
| rc.3 | Navegación por teclado en grid (Arrow/Page/Home/End) | 13 → 14 KB |
| rc.4 | prop de mes/año disabled en MonthPicker/YearPicker | 14 → 15 KB |
| rc.8 | callback programático `filterTime` de TimePicker | 15 → 16 KB |
| 1.0.0 | Estabilización final (2026-06-08) | ESM 15,8 KB / CJS 15,9 KB |
| 1.1 | Paridad de región live a11y con `announce()` | 16 → 17 KB |

Cada aumento explica «por qué creció». Así no se filtra 1 KB poco a poco, sino que se convierte en una decisión intencionada. También dejé claras las funciones rechazadas: modo RTL, plugin de festivos y grid virtualizado de años/meses quedaron fuera a propósito. Con el techo de 17 KB, el working headroom real es de unos 126 bytes en CJS y 221 bytes en ESM (el CJS, más ajustado, es el criterio vinculante). Para añadir la siguiente función en runtime solo hay dos posibilidades: (a) adelgazar el código existente y encajarla dentro, o (b) subir de nuevo el techo deliberadamente y anunciarlo. (En cambio, los tests, los paquetes de adapters separados y un entry como `/headless`, que no entran en el grafo del bundle predeterminado, no consumen ese presupuesto.)

Cambiar el techo exige sincronizar varios archivos: `scripts/check-bundle-size.js` y su `TARGET_KB`, `tsup.config.ts` y los workflows de CI. Lo hice incómodo adrede. (Si bastara con modificar un solo sitio, sería demasiado fácil subirlo sin decir nada; el diseño hace que mover el techo sea una decisión pesada.)

Estas son las cuatro decisiones incrustadas en el código de la biblioteca. ¿Qué ocurrió durante el proceso de build real?

---

## El proceso de build de 1.0

### Catorce etapas RC de 0.x a 1.0

Etiqueté rc.0, que ya incluía las 7 primitive, el 27 de mayo de 2026. Después hubo 14 iteraciones RC antes de graduarse como 1.0.0 stable el 8 de junio: unos 12 días. (No creo que esa velocidad fuese correcta. Lo ortodoxo habría sido avanzar más despacio y pulir una sola cosa cada vez, pero, como único maintainer, tenía que terminar rápido una vez que entraba en modo build.)

Estos fueron los trabajos más importantes de ese periodo.

- **Corrección de seguridad**: vulnerabilidad Critical GHSA-5xrq-8626-4rwp (actualización a vitest 4)
- **Extracción neutral del adapter**: dependencia de date-fns reducida a 0 en `@kalyx/core`
- **Separación de `@kalyx/adapter-date-fns` como paquete propio**
- **Nuevo entry `@kalyx/react/headless`**: para usuarios con zero date-lib

También fijé el listón de tests como requisito para graduar 1.0: 497/497 unit test, 14/14 pruebas de accesibilidad axe y 31 escenarios e2e.

### Integración visual Aurora

El feedback más memorable tras lanzar 1.0 fue un mensaje de una sola línea enviado por un usuario: **«Es feo de narices, sucio y horroroso»**. Incluía tres capturas de HeroDemo. (Entonces aprendí que, por bueno que sea el código de una biblioteca, una demo mala genera cero clics.)

Los síntomas eran claros: aparecían líneas de cuadrícula en el Calendar grid, las celdas de MonthPicker se estiraban horizontalmente y DateTimePicker se veía demasiado estrecho. El diagnóstico reveló que dos sistemas CSS habían evolucionado por separado. `.kx-live-*` y `:global([role='grid'])` dentro de HeroDemo no compartían los fixes aplicados al otro.

La solución no fue rediseñar, sino **unificar y aplicar una única ronda de polish**. Tras siete iteraciones visuales (v1 → v7), cerré el sistema de tokens Aurora. El single source of truth pasó a ser un único archivo, `apps/docs-site/src/css/custom.css`, y obligué a todos los picker a compartir los mismos tokens.

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

Comparto tres trampas que quedaron documentadas durante el proceso. Es muy probable encontrar exactamente los mismos problemas al integrar componentes headless en otro entorno, en especial en un sitio de documentación como Docusaurus.

Primero, **la regla `table th, td` de Infima en Docusaurus se filtra en todas las etiquetas `<table>`**. Por eso aparecían líneas de cuadrícula en el Calendar grid. Hay que aislarlo con módulos CSS o aplicar un reset explícito.

Segundo, **en `<table role="grid">` no se puede aplicar `display: grid`**. `<thead>/<tbody>/<tr>` se convierten en grid item y las siete column no llegan a los `<td>`. Al final hay que resolverlo combinando `display: table`, `table-layout: fixed` y un width explícito.

Tercero, **la visualización de Range requiere redondeo asimétrico**: start solo a la izquierda, end solo a la derecha y middle sin esquinas redondeadas. Si se uniforma, las celdas parecen «flotar» por separado y se pierde la agrupación visual intuitiva.

### En qué invertí el tiempo con cero usuarios

Vale la pena mostrar con franqueza los datos de la primera semana tras lanzar 1.0.

- 5 stars en GitHub, 0 forks y 0 watchers
- 480 descargas semanales en npm (supuestamente, en su mayoría, bots espejo de CI)
- 0 paquetes con dependencia directa

Había dos caminos posibles para invertir el tiempo: (a) reforzar funciones nuevas; (b) expandirse a otra vía, como un adapter para React Native. Pero ambos tenían un ROI bajo. Sin usuarios externos, no se podían validar las funciones nuevas, y tenía más sentido abrir nuevas vías después de conseguir usuarios.

Así que decidí dedicar el tiempo a la **primera impresión de 30 segundos**: el intervalo en el que alguien entra por primera vez en el repositorio de GitHub o en la documentación y decide en 30 segundos si vale la pena probar la biblioteca. Lo organicé en cinco PR.

| PR | Contenido |
| --- | --- |
| A1 | Grabador WebP animado de la cabecera + componente `<HeroDemo>` + ruta `/recorder` |
| A2 | Rediseño de la página de inicio. 6 secciones (Hero/FeatureGrid/SameJsxBlock/PickerGrid/WhyKalyx/GetStarted) |
| B | Infraestructura de sandbox. `<StackBlitzEmbed>` + 7 proyectos `examples/*` |
| C | `/playground` interactivo. Selector de picker + editor de classNames + controles de locale/timezone |
| D | Página `/docs/comparison` + gráfico comparativo del bundle en SVG integrado |

Aprendí algo durante ese proceso: **la puntuación Lighthouse en localhost puede diferir más de 10 puntos respecto al despliegue real en Vercel.** En la incidencia #103, una medición en modo simulate de localhost parecía mostrar una regresión de 72 → 61, es decir, −11 puntos. Tras desplegar el mismo cambio en Vercel, la medición real dio 73–74, una mejora de +1–2 puntos. El propio entorno de medición de localhost simulate producía el artifact. (Aprendí que depender solo de cifras de localhost al buscar una regresión de rendimiento puede llevar a decisiones equivocadas.)

Sinceramente, esa inversión en los «primeros 30 segundos» no produjo grandes resultados. Pulir la demo y la landing sin usuarios externos se parecía a limpiar una tienda para clientes que no entraban. Después cambié de dirección: para un único maintainer, crear **activos verificables que demostrasen la exactitud de core** ofrecía más ROI que pulir la superficie promocional. (Los resultados concretos aparecen en la sección «Estado actual».)

---

## Un vistazo a la arquitectura técnica

A partir de aquí presento un breve recorrido para quienes quieran crear su propia biblioteca o sientan curiosidad por su funcionamiento interno. (Si solo se desea usarla, esta sección puede omitirse.)

### Implementación de Context + Dot Notation

En cada primitive, el componente Root crea un Context Provider y todos los subcomponent consumen el mismo Context.

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

La clave del patrón es que los componentes que comparten el mismo Context están dentro de un único grupo `Object.assign`. El consumer los invoca con naturalidad como `<DatePicker.Input>` y el tree shaker elimina automáticamente los subcomponent que no se usan.

### Headless Hook

Para ignorar todos los componentes de la biblioteca y crear una UI completamente propia, se usa directamente el Hook.

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

La máquina de estados es exactamente la misma que utilizan los componentes. El código del Hook anterior y el JSX de `<DatePicker>` funcionan sobre la misma lógica central. (Gracias a esta arquitectura no es necesario mantener la API de la biblioteca en dos vías.)

### Seguridad en SSR

Desde el principio impuse patrones que pudieran sobrevivir en Next.js App Router.

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

Para el posicionamiento uso Floating UI. Es el sucesor de Popper.js, seguro para SSR y una biblioteca ligera de unos 3 KB. En cada ejecución de CI se comprueba con un build de Next.js App Router que no haya errores de `renderToString`.

### Accesibilidad

Los roles WAI-ARIA siguen la spec.

- Calendar grid → `role="grid"`, celda → `role="gridcell"`
- Input + Popover → `role="combobox"` + `aria-expanded`
- HourList / MinuteList → `role="listbox"`

El mapeo de navegación por teclado también se acerca a la spec: Arrow keys para moverse entre celdas, PageUp/Down para cambiar de mes, Shift+PageUp/Down para cambiar de año, Home/End para ir al principio o al final de la semana, Enter para seleccionar y Escape para cerrar el Popover.

Las 14 comprobaciones automatizadas de accesibilidad con axe pasan. Las etiquetas ARIA también pueden personalizarse para varios idiomas.

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

`@kalyx/core` ofrece etiquetas predeterminadas para varios locale, entre ellos `ko-KR`.

---

## Estado actual y limitaciones reconocidas

### Lo que se publicó realmente después de 1.0 (a fecha de v1.1)

La primera parte del artículo mira retrospectivamente al lanzamiento 1.0, pero, mientras termino de escribirlo, la biblioteca ya ha pasado a v1.1. Para que la retrospectiva no se quede solo en «planes», dejo constancia exacta de lo que se publicó y de lo que cambió de dirección.

Parte de la expansión de adapters prevista para el siguiente milestone inmediato se hizo realidad.

- **Publicación completada de `@kalyx/adapter-dayjs`**: según las estadísticas, dayjs tiene una cuota cercana a la mitad entre usuarios de React, y hay ecosistemas como Mantine que lo fijan como peer obligatorio. El adapter de prioridad 1 se publicó como paquete independiente.
- **Conformance suite en `@kalyx/core/test-helpers`**: modularicé la comprobación automática del mismo contrato de 21 métodos cada vez que se añade un adapter. Con una sola línea, `runAdapterConformanceTests(adapter, { describe, it, expect })`, se valida cualquier adapter con el mismo estándar de exactitud. Fue el trabajo vertebral que convirtió un «contrato» del adapter en una «capacidad verificada».
- **`@kalyx/adapter-luxon`**: siguiente candidato para empresas y casos avanzados de timezone, con un coste de incorporación bajo gracias a la conformance suite.

También quiero dejar constancia con franqueza de lo que **eliminé del plan**.

- **Decidí no crear `@kalyx/adapter-temporal` como adapter.** La interfaz del adapter utiliza cadenas ISO-8601 como entrada y salida, así que no puede transportar intactas las capacidades de Temporal, como sus modelos temporales type-safe `PlainDate` y `ZonedDateTime`. Envolverlas en un adapter solo las aplanaría de nuevo en cadenas ISO y delegaría en el código Intl de core, sin ganar exactitud. Concluí que el soporte de Temporal debe conservarse como estrategia a nivel de core, no como adapter.

Los elementos que se están considerando a partir de señales de usuarios están agrupados aparte.

- **Headless hook que faltan**: ahora solo existen los tres Hook de Date/Range/Time. Planeo añadir Hook para Month/Year/Week/DateTime exclusivamente en el entry `/headless`, para no tocar el techo del bundle predeterminado.
- **Tests de propiedades con fast-check**: para funciones puras como los cálculos de fechas, los tests basados en propiedades crean un foso más profundo que los tests basados en ejemplos. Han pasado a ser la máxima prioridad para reforzar la exactitud de core.
- **Recetas de integración**: guías para React Hook Form, Zod y otras bibliotecas de formularios.
- **Modo RTL / plugin de festivos**: cuando lo permita el margen del bundle o surja una demanda clara.

También indico las vías pospuestas. El adapter para React Native sigue en el roadmap, pero primero deben llegar los usuarios web. Los calendarios no gregorianos (persa, budista, islámico y hebreo) se abordarán cuando haya suficientes incidencias en GitHub o aparezca un patrocinador empresarial.

### Limitaciones que reconozco con franqueza

Termino con una declaración honesta para quienes estén considerando la biblioteca. (Creo que añadir marketing exagerado a una biblioteca nueva acaba destruyendo la confianza.)

- **Un solo maintainer**: ritmo posible de un minor al mes. Las prioridades se ajustan cuando hay demanda.
- **Biblioteca nueva**: al tener una base de usuarios pequeña, es bastante posible convertirse en la primera persona que descubra un edge case. La cobertura de tests también es desigual entre picker; WeekPicker, por ejemplo, es el más ligero.
- **Solo React 19+**: depende de puntos de leverage de React 19 como RSC, `useId`, la ausencia de advertencias de `useLayoutEffect` y la integración de form-action en `<Input>`. No habrá back-port a 18.
- **No se afirma que esté «battle-tested»**: no uso esa expresión para una biblioteca nueva. Lo que sí tiene son cientos de unit test por primitive, todas las comprobaciones de axe superadas, verificación SSR en CI con Next.js App Router y una conformance suite para adapters.

Si hoy se necesita estabilidad de nivel productivo para 100 000 usuarios, sinceramente, `react-datepicker` es la opción segura. Kalyx se parece más a una **apuesta** por un futuro más pequeño y más headless. Estoy esperando a quien quiera convertirse en la primera persona en hacer esa apuesta.

---

## Conclusión

Este artículo se parece más a una retrospectiva de un año de decisiones que a una promoción de la biblioteca. Mi experiencia me ha enseñado que dejar constancia de lo que se publicó, lo que se rechazó y dónde pesaron más las decisiones se convierte en el activo más valioso al crear la siguiente biblioteca o evaluar otra.

Composition over Props, cadenas ISO obligatorias, patrón adapter y techo del bundle. Las cuatro decisiones renuncian a parte de la comodidad a corto plazo para comprar adaptabilidad a largo plazo. Solo dentro de un año podré evaluar si fueron correctas. (Lo único que puedo afirmar ahora es que, sin ellas, la biblioteca no habría llegado a 1.0.)

Si alguna vez te has topado con un muro parecido por culpa de un DatePicker en un proyecto React, me encantaría que echaras un vistazo a Kalyx. Y si has resuelto el mismo problema de una forma mejor, agradecería mucho que compartieras tu experiencia en una GitHub Issue. Al final, una biblioteca no es algo que pule una sola persona, sino algo que mejoran conjuntamente quienes la usan.

La instalación ocupa una línea.

```bash
pnpm add @kalyx/react
```

En el [Playground](https://kalyx-docs-site.vercel.app/playground) de la documentación se pueden probar directamente los siete picker. Es posible alternar locale y timezone, editar classNames y aplicar los propios tokens de diseño.

:::ref

[repo] [jiji-hoon96/kalyx](https://github.com/jiji-hoon96/kalyx)

[docs] [Sitio oficial de documentación de Kalyx](https://kalyx-docs-site.vercel.app/)


[docs] [Documentación de DatePicker de Ark UI](https://ark-ui.com/docs/components/date-picker)

[docs] [Patrón Composition de Radix UI](https://www.radix-ui.com/primitives/docs/overview/introduction)

[docs] [Guía de componentes headless de React Aria](https://react-spectrum.adobe.com/react-aria/)

[docs] [Documentación oficial de Floating UI](https://floating-ui.com/)

:::
