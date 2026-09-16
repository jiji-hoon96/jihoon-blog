---
emoji: 📅
title: 'Kalyx'
seoTitle: 'Kalyx: DatePicker headless React sin errores de zona horaria'
date: '2026-06-17'
updatedAt: '2026-09-16'
categories: bibliotecas React DatePicker código-abierto
description: 'Por qué creé Kalyx, DatePicker headless para React, y en qué difiere de Ark UI, React Aria y react-day-picker: valores ISO UTC, DST con Intl y tests IANA.'
keywords: 'Kalyx, React DatePicker, DatePicker headless, DatePicker React zona horaria, ISO 8601 UTC, fecha con un día de diferencia, bug horario de verano JavaScript, tests de propiedades fast-check, alternativa a react-day-picker'
locale: es
translationOf: '260617'
sourceHash: 15dcfd39502cf19fbd1b9cae7edec991beacef87ce2bdfc38fe25aa497a6ad87
---

En este artículo quiero hablar de **Kalyx**, la biblioteca headless de DatePicker para React que he creado.

Este texto es una reescritura de una retrospectiva que escribí en junio de 2026. La idea que encabezaba el artículo original, "siete pickers con una sola API, más pequeños que un único calendario de una biblioteca competidora", resultó, al volver a comprobarla, medio falsa y medio irrelevante como diferenciador. Por eso lo reorganizo en este orden: por qué lo construí, en qué se diferencia de las opciones existentes y cuál es su definición técnica.

Adelanto la conclusión: lo que distingue a Kalyx no es el número de componentes, sino su **modelo de valor**. La versión de referencia es `@kalyx/react` 1.4.7 (MIT, solo React 19), y los fragmentos de código proceden del [repositorio de GitHub](https://github.com/jiji-hoon96/kalyx) en `main` a fecha de 2026-09-11.

---

## Quería usar las bibliotecas de fechas de forma declarativa

Tenía dos motivos para construirlo. Quería usar bibliotecas de fechas complejas y difíciles de manejar de una manera más declarativa y sencilla, y quería aprender cómo se construye por dentro una biblioteca así. "Difícil de manejar" es algo vago, así que señalo los puntos donde me atasqué a través de las definiciones de tipos de cada biblioteca.

### Una API que activa modos con props

react-datepicker activa la selección de hora con `showTimeSelect`, la de mes con `showMonthYearPicker`, la de año con `showYearPicker` y la de rango con `selectsRange`. Es una estructura en la que un mismo componente se convierte en otra cosa según la combinación de props. El coste se ve en los tipos. En las definiciones de tipos de la 9.1.0, según el valor de `selectsRange`, la firma de `onChange` se bifurca.

```ts
// react-datepicker/dist/index.d.ts (발췌)
    selectsRange?: true;
    selectsMultiple?: false | undefined;
    formatMultipleDates?: never;
    onChange?: (date: [Date | null, Date | null], event?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => void;
```

Es una union bien hecha, pero las ramas se multiplican a medida que crecen los modos, y quien la usa tiene que deducir qué combinación está activa solo por los nombres de las props. (Tiene la misma forma que "una abstracción que agrupa mal aumenta el acoplamiento", de lo que hablé en el artículo sobre [abstracción](/260201).) Yo quería que "un campo de entrada, un popover y un calendario" se leyeran en la propia estructura del JSX.

### Dónde se filtran los tipos de valor y la zona horaria

react-datepicker y react-day-picker intercambian objetos `Date` nativos. Como un `Date` se interpreta en la zona horaria local del entorno de ejecución, en Seúl `new Date(2026, 3, 15)` pasado por `toISOString()` da `2026-04-14T15:00:00.000Z`. Eliges el 15 de abril y el servidor ve el 14. La issue ["Date Selected is One Day Off"](https://github.com/Hacker0x01/react-datepicker/issues/1018) de react-datepicker se abrió en septiembre de 2017 y se cerró en diciembre de 2025.

En el otro extremo, Ark UI y React Aria usan objetos `@internationalized/date` como `CalendarDate` y `ZonedDateTime`. La semántica es precisa, pero en una app donde el estado de los formularios y las respuestas del servidor son todo cadenas, aparece código de conversión en cada frontera.

El soporte de zonas horarias también puede quedar atado a la biblioteca de fechas que elijas. En el código de los adaptadores de MUI X Date Pickers 9.13.0, los adaptadores de dayjs, Luxon y Moment tienen `isTimezoneCompatible = true`, y la familia date-fns tiene `false`. Una app que usa date-fns tiene que incorporar otra biblioteca de fechas para poder usar la prop `timezone`.

En resumen, los modos estaban repartidos en combinaciones de props, los valores en objetos atados a la zona horaria local y el soporte de zonas horarias en la elección de la biblioteca de fechas, así que **era difícil expresar la intención en una sola declaración.**

### Aprender construyendo

Un selector de fechas parece pequeño, pero contiene aritmética de calendario, locales, zonas horarias y horario de verano (DST), navegación por teclado y SSR. Leerlo en la documentación no es lo mismo que trazar tú mismo las fronteras y protegerlas con tests. Por eso me puse como objetivo que, desde el lado de quien lo usa, se entendiera qué se está construyendo con solo mirar el JSX, y que, desde el lado de quien lo construye, el código fuera lo bastante acotado como para poder explicar dónde se convierten los valores.

Entonces, ¿de verdad no había ninguna biblioteca que ya resolviera estas necesidades?

---

## En qué se diferencia de las opciones existentes

La respuesta corta es que sí la había. En el artículo original escribí como si "no existiera ninguna biblioteca headless con varios pickers", pero al investigar de nuevo esa premisa resultó falsa.

### El modelo de valor que eligió cada opción

Lo siguiente se comprobó el 2026-09-16 instalando la última versión de npm y revisando las definiciones de tipos y la documentación oficial. La columna de tamaño se midió con el mismo método que explico más abajo.

| Biblioteca | Headless | Tipo de valor | Entrada de hora | Selección solo de mes o año | gzip |
| --- | --- | --- | --- | --- | --- |
| react-day-picker 10.0.1 | No (incluye CSS) | `Date` | No | No | 20.0KB |
| react-datepicker 9.1.0 | No (import de CSS) | `Date` | `showTimeSelect` | Con props | 45.4KB |
| MUI X 9.13.0 | No (Material) | Objeto del adaptador | TimePicker | `views` | 113.1KB |
| Ark UI 5.39.2 | Sí | `@internationalized/date` | Entrada por segmentos | `minView` | 42.7KB |
| React Aria Components 1.21.1 | Sí | `@internationalized/date` | Segmentos de `TimeField` | No | 78.8KB |
| Kalyx 1.4.7 | Sí | Cadena ISO 8601 UTC | HourList y MinuteList en lista | MonthPicker, YearPicker | 18.9KB (DatePicker), 25.7KB (todo) |

react-day-picker indica en su [guía oficial](https://daypicker.dev/guides/timepicker) que "DayPicker does not include a built-in time picker". La selección de rangos de MUI X no está en el paquete Community, sino en Pro. El tamaño de MUI incluye `@mui/material` y emotion, así que si tu app ya usa MUI, el aumento real es mucho menor.

### Ya existen opciones headless completas

Las filas importantes de la tabla son Ark UI y React Aria. [Ark UI](https://ark-ui.com/docs/components/date-picker) ofrece selección simple, múltiple y de rango, además de selección por mes y año, con una API de composición en dot notation como `DatePicker.Root`. [React Aria](https://react-aria.adobe.com/DatePicker) es la implementación de Adobe centrada en la accesibilidad. Así que el hueco de Kalyx es más estrecho de lo que pensaba al principio.

> Ya existen opciones headless completas. Sin embargo, Ark UI y React Aria intercambian valores como objetos `@internationalized/date` y ofrecen la entrada de hora como campos segmentados. Kalyx fija los valores como cadenas de instante UTC que viajan tal cual en JSON, y reúne en la misma API de composición un TimePicker basado en listas y pickers de mes, año y semana.

Aun así, "los valores son cadenas, y eso está bien" es un argumento débil. Un `CalendarDate` también se convierte en cadena con un solo `toString()`. El diferenciador no es el formato, sino **el contrato de que esa cadena siempre es un instante y los tests que lo hacen cumplir**. La dot notation tampoco es un diferenciador, porque Ark UI también la usa.

### Volví a medir el tamaño del bundle con un mismo método

La comparación de bundles del artículo original medía cantidades distintas. Los aproximadamente 19.5KB del badge del README corresponden a un único archivo de `@kalyx/react` en `dist`, y ese archivo deja `@kalyx/core`, `@kalyx/adapter-date-fns` y `@floating-ui/react` como imports externos. Había puesto esa cifra junto a las cifras de otras bibliotecas que incluían sus dependencias.

Así que lo volví a medir todo con esta pregunta: "¿cuánto crece el bundle cuando una app consumidora añade una línea de import?"

```bash
echo "import { DatePicker } from '@kalyx/react'; export default DatePicker;" > entry.jsx
npx esbuild entry.jsx --bundle --minify --format=esm --platform=browser \
  --external:react --external:react-dom --external:react/jsx-runtime | gzip -6 | wc -c
```

Medido el 2026-09-16 con esbuild 0.28.2. En react-datepicker excluí el CSS, y en React Aria Components importé de una vez los 14 exports necesarios para montar un picker (`DatePicker`, `DateRangePicker`, `Calendar`, `TimeField`, `Popover`, `Dialog`, etc.).

![Con las mismas condiciones de esbuild, el tamaño crece en este orden: Kalyx DatePicker 18.9KB, react-day-picker 20.0KB, Kalyx completo 25.7KB, Ark UI 42.7KB, react-datepicker 45.4KB, React Aria Components 78.8KB, MUI X 113.1KB.](1.png?w=720)

El "los siete, más pequeños que el único calendario de react-day-picker" del artículo original era falso. Los siete juntos (25.7KB) pesan más que `DayPicker` (20.0KB). La afirmación verdadera llega solo hasta "un DatePicker tiene un tamaño parecido al de un DayPicker". (E incluso así, DayPicker es solo el calendario, mientras que Kalyx DatePicker incluye también el campo de entrada y el popover.) El tamaño es sensible a la combinación de imports y al nivel de gzip, así que conviene leerlo como orden de magnitud, y no cambia la conclusión de que el tamaño no es la razón principal para elegir Kalyx.

¿Cuál es, entonces, la razón principal?

---

## Una definición técnica de Kalyx

> Kalyx es un selector de fechas headless para React que fija todas las entradas y salidas como cadenas de instante UTC, confina la conversión entre coordenadas de calendario e instantes a dos funciones y garantiza con tests ese viaje de ida y vuelta en todas las zonas horarias IANA.

Esta es la API del lado del consumidor. `value` y `onChange` usan `string | null`, y `displayTimezone` decide en el calendario de qué zona se muestra.

```tsx
<DatePicker value={iso} onChange={setIso} displayTimezone="America/New_York">
  <DatePicker.Input />
  <DatePicker.Popover>
    <DatePicker.Calendar />
  </DatePicker.Popover>
</DatePicker>
```

### Los valores son instantes y las celdas del calendario son coordenadas

Por Kalyx circulan dos tipos de cadenas ISO con el mismo formato. Una **coordenada** es una celda de la cuadrícula del calendario; se escribe como `YYYY-MM-DDT00:00:00.000Z`, pero no tiene noción de zona horaria. El cálculo de la cuadrícula se hace solo en UTC, así que no depende del entorno de ejecución. Un **instante** es el valor que sale por `onChange`: el momento real que corresponde a la medianoche de ese día en `displayTimezone`. El mismo 15 de enero es `2026-01-15T05:00:00.000Z` en Nueva York y `2026-01-14T15:00:00.000Z` en Seúl.

![La coordenada de calendario 2026-01-15T00:00:00.000Z se convierte en los instantes de Nueva York y Seúl mediante civilMidnightFromUtcDay, y vuelve a ser coordenada mediante calendarDayFromInstant.](2.png?w=720)

Solo dos funciones de `@kalyx/core` unen ambos mundos: `civilMidnightFromUtcDay`, que convierte una coordenada en instante, y su inversa, `calendarDayFromInstant`. Esta última lee "qué día es ese instante en esta zona" y lo vuelve a escribir como coordenada de medianoche UTC.

```ts
// packages/core/src/utils/timezone.ts:187-190
export function calendarDayFromInstant(iso: ISODateString, timeZone: string): ISODateString {
  const p = partsInTimezone(new Date(iso), timeZone);
  return new Date(Date.UTC(p.year, p.month - 1, p.day)).toISOString();
}
```

La regla es de dirección. Al elegir una celda y confirmar el valor, la coordenada pasa a instante; al decidir a partir del valor guardado qué mes mostrar y dónde poner el foco, el instante pasa a coordenada. El `selectDate` del Root de DatePicker convierte, valida las restricciones con el instante convertido y, si pasa, confirma.

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

No es el único punto de llamada. Si buscas en `packages/react/src`, las dos funciones aparecen repartidas por el Root y el Calendar de DatePicker, RangePicker y DateTimePicker, por Presets, por las utilidades de navegación con teclado y por seis hooks headless. Aun así no existe una tercera función de conversión, y todo camino que confirma un valor o decide la vista pasa por una de las dos.

Este contrato se protege con tests basados en propiedades (property-based tests). Para toda coordenada `c` y toda zona `z`, debe cumplirse `calendarDayFromInstant(civilMidnightFromUtcDay(c, z), z) === c`.

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

[fast-check](https://fast-check.dev/) genera fechas aleatorias entre 2020 y 2045 y las combina con 14 zonas representativas, como Kathmandu (+5:45), Kiritimati (+14) y Niue (-11), durante 300 ejecuciones. El test inmediatamente siguiente comprueba el mismo viaje de ida y vuelta 12 veces por zona para todas las zonas que devuelve `Intl.supportedValuesOf('timeZone')`. En mi Node 24.16 local, esa lista tiene 418 zonas.

Entonces, ¿por qué no hacer que la biblioteca normalice por sí sola a instante un `"2026-01-15T00:00:00.000Z"` que pase el usuario? Ese camino está cerrado, porque con la cadena sola no se puede saber si es una coordenada o un instante. Si al valor de Seúl `2026-01-14T15:00:00.000Z`, que ya es un instante, se le vuelve a aplicar `civilMidnightFromUtcDay`, se obtiene `2026-01-13T15:00:00.000Z`, y si se aplica en cada render la fecha sigue retrocediendo un día cada vez. Cambiarlo por `startOfDayInTimezone`, que da el mismo resultado por muchas veces que se aplique, elimina el desplazamiento, pero ya no cumple su función original de convertir coordenadas en instantes.

Así que renuncié a normalizar y fijé el contrato en la documentación. Quien usa el picker debe devolverle tal cual el valor que este emitió. Siendo sincero, es un coste que traslado a los consumidores, y como `ISODateString` es un alias de `string`, el compilador tampoco lo impide. (Todavía no he evaluado separar ambos con branded types.)

### Resolver el DST solo con Intl

Para convertir una coordenada en instante hay que saber cuándo es, en UTC, "las 00:00 de ese día en esa zona", pero el offset solo se puede obtener si ya conoces el instante. Además, en los días de cambio de horario la hora local puede no existir (spring forward) o existir dos veces (fall back).

Kalyx lo resuelve sin una biblioteca como `date-fns-tz`. Pregunta a `Intl.DateTimeFormat(...).formatToParts` "qué hora es este momento UTC en esa zona" para medir el offset, y sondea dos veces.

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

`civilEpoch` es la hora local deseada leída como si fuera UTC. Con el offset en ese punto crea un candidato, con el offset en el punto candidato crea otro, y si ambos coinciden, termina. La cuadrícula del calendario llama a esta función 42 veces, una por celda, así que esta vía rápida es la que determina el coste.

Si difieren, estamos en el hueco del spring forward. En ese caso vuelve a leer ambos candidatos en esa zona y elige el que coincide con la hora pedida (`timezone.ts:266-283`). Este es el resultado de ejecutarlo de verdad.

| Petición (America/New_York) | Situación | Resultado |
| --- | --- | --- |
| 2026-03-08 02:30 | Hora inexistente | `2026-03-08T07:30:00.000Z` (03:30 EDT, hacia adelante) |
| 2026-11-01 01:30 | Hora que ocurre dos veces | `2026-11-01T05:30:00.000Z` (01:30 EDT, la más temprana) |

"Los huecos avanzan y la ambigüedad toma la más temprana" coincide con el valor por defecto de `disambiguation`, `"compatible"`, que describe la [documentación de Temporal.ZonedDateTime en MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime). (El comentario del código de Kalyx dice que equivale a `'earlier'`, pero el `'earlier'` de Temporal retrocede en un hueco, así que en rigor es `'compatible'`. Es un error de comentario que encontré mientras escribía este artículo.)

### La frontera del adaptador son 21 métodos de cadenas

Si core calcula las zonas horarias, ¿de qué se encargan date-fns o dayjs? De la aritmética de fechas y el parsing. Esa frontera, `DateAdapter`, tiene 21 métodos, y todos los argumentos de fecha y valores de retorno son cadenas ISO.

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

Los métodos que reciben zona horaria son cuatro, `format`, `isSameDay`, `startOfDay` y `today`, e incluso esos cuatro delegan el cálculo en core. El `format` del adaptador de date-fns, si recibe `timezone`, llama directamente a `formatInTimezone` de core (`packages/adapter-date-fns/src/index.ts:112-115`). Por eso, uses el adaptador que uses, las respuestas sobre zonas horarias salen del mismo código, y los tres adaptadores (date-fns, dayjs, luxon) toman de `@kalyx/core/test-helpers` la función `runAdapterConformanceTests` y la ejecutan cada uno para comprobar que dan las mismas respuestas.

Los dos entry points también se separan sobre esta frontera. El entry por defecto, `@kalyx/react`, llama a `setDefaultAdapter(DateFnsAdapter)` al cargarse el módulo, así que funciona nada más instalarlo (`packages/react/src/index.ts:9-11`). `@kalyx/react/headless` no hace esa llamada y, con `splitting: false` de tsup, los bundles quedan físicamente separados, así que no entra código de date-fns. "Cero dependencias de bibliotecas de fechas" solo es cierto para este entry y para `@kalyx/core`.

La forma de esta frontera tuvo un precio. En junio de 2026 abandoné un adaptador de Temporal. El valor de Temporal está en que **los tipos llevan consigo el significado**, como `PlainDate` y `ZonedDateTime`, pero si la frontera es una cadena, ese significado no puede atravesarla. Envolverlo solo lo aplanaría en una cadena y volvería al código Intl de core, así que concluí que no aportaba ganancia de corrección. Visto ahora, el problema de la sección anterior, "coordenadas e instantes son el mismo `string`", es justo el que Temporal resuelve en el sistema de tipos con `PlainDate` e `Instant`. La frontera de cadenas facilitó cambiar de adaptador, pero a cambio cerró el camino de resolverlo con tipos.

### Siete pickers que combinan tres contextos

Kalyx tiene siete pickers: DatePicker, RangePicker, TimePicker, DateTimePicker, MonthPicker, YearPicker y WeekPicker. Lo importante no es el número, sino **que los siete no son implementaciones independientes**. Solo hay tres contextos: `DatePickerContext`, `RangePickerContext` y `TimePickerContext`.

| Picker | Root que tiene el estado | Contexto | Dónde está la diferencia |
| --- | --- | --- | --- |
| DatePicker | `DatePickerRoot` | Date | |
| MonthPicker, YearPicker | La implementación del Root de DatePicker | Date | `selectionGranularity` |
| RangePicker | `RangePickerRoot` | Range | |
| WeekPicker | `RangePickerRoot` tal cual | Range | `selectionMode="week"` en Calendar |
| TimePicker | `TimePickerRoot` | Time | |
| DateTimePicker | Root propio | Date y Time anidados | Superpone dos Providers |

El Root de MonthPicker se limita a cambiar el formato de visualización por defecto a `yyyy-MM` y a pasar `selectionGranularity="month"` a la implementación del Root de DatePicker (`MonthPicker/Root.tsx:11-20`). El `selectDate` de DatePicker, cuando la granularity es `month`, pliega la coordenada al día 1 de ese mes y después pasa por la misma conversión y validación de restricciones que vimos antes. DateTimePicker proporciona los dos contextos superpuestos.

```tsx
// packages/react/src/components/DateTimePicker/Root.tsx:401-402
<DatePickerContext.Provider value={dateContext}>
  <TimePickerContext.Provider value={timeContext}>{children}</TimePickerContext.Provider>
```

Por eso `DateTimePicker.Calendar` es el mismo componente que `DatePicker.Calendar` y no sabe dentro de qué picker está. Una corrección en un sitio llega a todos los pickers que usan ese componente, y un defecto en un sitio también. Esta base compartida es además la razón de que un solo DatePicker supusiera el 74% del total en el gráfico anterior. (En el artículo original escribí que la CI verifica el SSR con un build de Next.js App Router, pero el `ssr-check` real de la CI solo importa en Node el CJS y el ESM compilados, así que también eliminé esa frase.)

¿Qué ha protegido realmente este contrato?

---

## Los defectos que atrapó el contrato de corrección y el techo del bundle

En los tres meses desde la 1.0 dediqué más tiempo a verificar este contrato que a nuevas funcionalidades, y aparecieron dos defectos que los tests basados en ejemplos habrían dejado pasar. El primero lo encontró un test de propiedades y el segundo una revisión cruzada del código, y como resultado se amplió el alcance de los tests de propiedades.

### Una hora del 1 de octubre en Sydney

El primero fue que la propiedad "leer en esa zona el resultado de `startOfDayInTimezone` da 00:00:00" se rompió en Australia/Sydney. La implementación de entonces medía el offset una sola vez. Sydney pasa de +10 a +11 a las 02:00 del 1 de octubre de 2034, y las 00:00 de ese día todavía son +10, así que la respuesta correcta es `2034-09-30T14:00:00.000Z`. Pero "el punto en que las 00:00 del 1 de octubre se leen como UTC" cae después del cambio, así que devolvía +11, y el resultado eran las 23:00 del día anterior. Ahora pasa por el doble sondeo, y este contraejemplo sigue ahí como test de regresión (`timezone.property.test.ts:276`).

### Un test que solo pasaba en Seúl

El segundo salió de una revisión cruzada el 3 de agosto de 2026. El código que decide qué celda del calendario marcar como seleccionada convertía dos veces. La celda ya era una coordenada, pero convertía a fecha de esa zona tanto la celda como el valor guardado. Esto fue lo que produjo elegir "15 de enero".

| Zona | Valor guardado | Celda marcada como seleccionada |
| --- | --- | --- |
| `Asia/Seoul` (+9) | `2026-01-14T15:00:00.000Z` | Día 15 (correcto) |
| `America/New_York` (-5) | `2026-01-15T05:00:00.000Z` | Día 16 (incorrecto) |

En las zonas con offset positivo los dos desplazamientos se compensaban y por casualidad acertaba, y los tests existentes solo cubrían Seúl. En la misma revisión apareció también una infracción en la dirección contraria. Al decidir qué mes mostrar, se aplicaba `startOfMonth` directamente a un instante, así que si en Seúl se pasaba el 1 de enero como valor, se abría el calendario de diciembre. Los mecanismos son distintos, pero la regla incumplida es una sola: convertir una única vez por dirección, con la función que corresponde a esa dirección.

Este incidente amplió los tests de propiedades de ida y vuelta de core de "unas cuantas zonas representativas" a "todas las zonas que conoce el runtime". (Los tests de componentes del lado de React siguen usando zonas representativas como `America/New_York`.) **Los defectos que solo aparecen donde cambia el signo no se atrapan con muestras.** El hecho de que las llamadas de conversión estuvieran repartidas por varios caminos también cobró sentido en ese momento. La corrección no se escapaba por una función, sino por cada camino por separado.

### De 17KB a 20KB

Estas correcciones costaron código. Kalyx fija en la CI un techo para el bundle del entry por defecto, y un PR que lo supera falla un check obligatorio. Ese techo empezó en 12KB y subía 1KB cada vez que entraba una funcionalidad, y en agosto de 2026, al rehacer por completo la corrección de zonas horarias y restricciones, lo subí de 17KB a 20KB de una vez.

El tamaño era un argumento de venta que aparecía en el badge del README. Aun así, no dudé. Un selector de fechas que se desplaza un día en zonas con offset negativo no sirve, sea pequeño o grande. **Si tengo que elegir entre pequeño y correcto, elijo correcto.**

Ahora el techo va justo. Según el documento del mapa de bytes del bundle del repositorio con fecha 2026-09-11, `dist/index.cjs` medido con el gzip por defecto de Node ocupa 20,259B frente a un techo de 20,480B, con un margen de 221B. (Es el tamaño del propio archivo con las dependencias como externas, así que es una cantidad distinta de la del gráfico anterior.) La próxima funcionalidad tendrá que recuperar bytes antes de poder entrar.

---

## Para cerrar

Lo que yo quería era usar bibliotecas de fechas complejas de forma declarativa. Al construirlo, descubrí que ya existían APIs de composición declarativas y opciones headless completas. La diferencia que quedaba estaba más adentro. **Fijar el valor como un único instante, reducir la conversión entre coordenadas e instantes a dos funciones y proteger ese viaje de ida y vuelta con tests en todas las zonas horarias.** El manejo del DST basado en Intl, la frontera de adaptador con cadenas y los siete pickers construidos con tres contextos son consecuencias de esa decisión.

Desde el objetivo de aprender, lo más importante que aprendí fue cómo afirmar que algo es "correcto". La comparación de bundles del artículo original medía cantidades distintas, y el test que pasaba en Seúl fallaba en Nueva York. Ambos tenían números y tests, y aun así estaban mal. Si no se anota también qué se midió y con qué muestra se comprobó, los números se convierten fácilmente en presunción.

Los límites también están claros. Soy el único maintainer, solo soporta React 19, y las descargas de npm de `@kalyx/react` entre el 5 y el 11 de septiembre de 2026 fueron 200, de las cuales 156 se concentraron en el día en que se publicó la 1.4.7. El problema de no poder separar coordenadas e instantes con tipos solo se contiene con documentación, y tampoco he decidido si garantizar como API pública los puntos de contacto para estilos, `classNames` y los atributos `data-*`.

Por eso, si tu app ya usa MUI, conviene mirar primero MUI X; si lo prioritario es la entrada por segmentos y una accesibilidad probada, React Aria; y si solo necesitas un calendario, react-day-picker. Si alguna vez has sufrido fechas que se desplazan un día en formularios donde los valores viajan como JSON, me alegraría que entonces le echaras un vistazo a Kalyx, y si conoces una solución mejor, te agradecería que me lo contaras en una GitHub Issue.

```bash
pnpm add @kalyx/react
```

En el [Playground](https://kalyx-docs-site.vercel.app/playground) del sitio de documentación puedes probar los siete pickers y cambiar tú mismo la configuración de locale y timezone.

:::ref

[docs] [Sitio de documentación oficial de Kalyx](https://kalyx-docs-site.vercel.app/)

[docs] [MUI, Date and Time Pickers Timezone](https://mui.com/x/react-date-pickers/timezone/)

[docs] [Documentación oficial de Floating UI](https://floating-ui.com/)

:::
