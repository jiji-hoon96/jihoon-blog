---
emoji: 🧱
title: 'Las layers de una app React'
seoTitle: 'Arquitectura en capas en React con hooks y Strategy'
date: '2026-10-01'
categories: frontend React arquitectura
description: 'Dividimos una pantalla de pago React en view, model y data siguiendo a Juntao Qiu. El repositorio de ejemplo revela un useMemo inútil y un fetch en bucle.'
keywords: 'separar layers en React, arquitectura React, extraer custom hook, domain object, patrón Strategy en React, Presentation Domain Data layering, refactorización React, modularizar aplicaciones React'
locale: es
translationOf: '261001'
sourceHash: 04386dc525603086b1a6518b3fc3658aa52bda3e4f74955bd48e7683dad0f199
---

En este artículo quiero hablar de cómo dividir el código de una app React en pantalla, reglas de negocio y acceso a datos. Está escrito para quien tiene un solo component con fetch, cálculos y render juntos, y tiene que leerlo entero cada vez que cambia algo. Si llegas al final, sabrás qué señales mirar y en qué orden extraer hooks, pure components, domain objects, Strategy y un network client, y dónde se rompe esa estructura cuando la copias tal cual.

El esqueleto es [Modularizing React Applications with Established UI Patterns](https://martinfowler.com/articles/modularizing-react-apps.html), la serie que Juntao Qiu, de Thoughtworks, publicó en martinfowler.com en febrero de 2023. No traduzco el original tal cual, sino que lo vuelvo a contar con mis palabras, y todas las figuras del artículo vienen de ese texto. Encima añado los resultados de descargar el [repositorio de ejemplo](https://github.com/abruzzi/payment-round-up-refactoring) del autor y ejecutar la comprobación de tipos y los tests, además de otros materiales que tratan el mismo problema.

## React es una view library

Cuando uno aprende React, la idea más atractiva es que la UI es una función pura que convierte datos en DOM. Hasta cierto punto es cierto. Pero en el momento en que envías una petición al servidor o navegas a otra página, el component deja de ser puro. Si a eso se le suman state global y state local enredados, el código se complica enseguida.

La respuesta del autor es cambiar de perspectiva. No existe un tipo de software aparte llamado "aplicación React". React es una library para dibujar UI, y dónde poner los cálculos o las reglas de negocio nunca fue asunto suyo. Lo que hay encima es una app de JavaScript normal y corriente. Entonces se puede usar tal cual el diseño que se viene usando desde la época de las GUI de escritorio, en particular la división del código en tres layers: presentation, domain y data.

Una app frontend real tiene, además de la view, router, local storage, varios niveles de caché, peticiones de red, integración con servicios externos e inicio de sesión, seguridad, logging y ajustes de rendimiento. Si todo eso se mete en components y hooks, en un mismo archivo la línea que pide el estado del pedido va seguida de una línea que recorta los espacios iniciales de un string, y después viene una línea que navega a otra pantalla. Quien lee tiene que ir y volver cambiando de nivel de abstracción todo el tiempo.

Las razones para dividir se resumen en dos. La pantalla cambia más a menudo que las reglas de negocio. Y si separas ambas, solo tienes que pensar en una cosa a la vez. La segunda razón es la que Martin Fowler da en [PresentationDomainDataLayering](https://martinfowler.com/bliki/PresentationDomainDataLayering.html) como la mayor ventaja de esta separación: como se puede pensar en los tres temas de forma relativamente independiente, se reduce el alcance al que hay que prestar atención.

## Cinco etapas en el crecimiento de una app

Antes de entrar en la refactorización, el autor muestra con cinco figuras cómo cambia la estructura a medida que crece la app. Lo importante es qué provoca el paso a la etapa siguiente. No es un momento fijo, sino que la incomodidad que aparece en una etapa llama a la siguiente. Los colores significan lo mismo en las cinco figuras. Verde claro es un container component con state, verde oscuro es un presentational component que solo dibuja, morado es un hook, azul es un domain object y naranja es infraestructura como la red.

Al principio, un solo component tiene la petición de red, el state, los cálculos y el render. En una app pequeña o en un proyecto de un solo uso esto basta, y como el código se parece al HTML, hasta es fácil de leer. Cuando el código que recorre una lista para crear elementos se mezcla con el que configura components externos y empieza a costar tiempo leer qué está pasando, se pasa a la etapa siguiente.

![Un solo component tiene la petición de red, la gestión del state, la domain logic y el render, y llama directamente a la API](1.png?w=720)

Cuando la pantalla crece, se dividen los components siguiendo la forma del HTML resultante. Se separan components que solo dibujan, pero en el component superior siguen quedando la petición de red, el código que transforma la respuesta a la forma que necesita la pantalla y el código que reúne los datos que se envían al servidor. Ninguno de los tres es UI y, sin embargo, están dentro del component.

![Se separaron los components que solo dibujan, pero la petición de red y la domain logic siguen en el component superior](2.png?w=720)

Después se extraen el state y sus cambios a un custom hook. Entonces queda dentro del hook un cálculo puro que no es ni side effect ni state.

![La petición de red y la domain logic se movieron al hook, pero dentro del hook siguen mezcladas](3.png?w=720)

Si ese cálculo se saca a un objeto que no tiene nada que ver con React, aparece un domain object. Aquí van la conversión de formatos de datos, las comprobaciones de null y los valores por defecto. Cuando los objetos se multiplican, empiezan a hacer falta la herencia o el polimorfismo.

![En el hook solo queda el state, la domain logic se va a un objeto Domain y la petición de red a un Fetcher](4.png?w=720)

Por último, cuando aparecen objetos que no pertenecen a la UI y a los que tampoco les importa si los datos vienen del servidor, del local storage o de una caché, se agrupan aparte en una model layer.

![La franja central es la model layer, con los components y hooks arriba y la infraestructura como Fetcher y Adaptor abajo](5.png?w=720)

Viendo solo las figuras, resulta abstracto. Recorramos estas cinco etapas una vez con código real. El ejemplo que eligió el autor es la pantalla de pago de un pedido en línea.

## Partir de una sola pantalla de pago

Los métodos de pago vienen de la configuración del servidor y cambian según el país. Si el servidor devuelve al menos uno, se añade al final el pago en efectivo y se deja seleccionado por defecto; si no devuelve ninguno, no se muestra nada.

![Pantalla con radios de apple, google y pago en efectivo en la zona de pago bajo el detalle del pedido, con el pago en efectivo seleccionado](6.png?w=600)

El código inicial tiene la forma que se ve a menudo en los tutoriales. Hace fetch dentro de `useEffect`, transforma la respuesta a la forma que necesita la pantalla, añade el pago en efectivo y dibuja la lista de radios. Lo de abajo es mi versión resumida.

```tsx
export const Payment = ({ amount }: { amount: number }) => {
  const [paymentMethods, setPaymentMethods] = useState<LocalPaymentMethod[]>([]);

  useEffect(() => {
    fetch(url)
      .then((res) => res.json())
      .then((methods: RemotePaymentMethod[]) => {
        if (methods.length === 0) return setPaymentMethods([]);
        const extended = methods.map((m) => ({ provider: m.name, label: `Pay with ${m.name}` }));
        extended.push({ provider: "cash", label: "Pay in cash" });
        setPaymentMethods(extended);
      });
  }, []);

  return (
    <div>
      {paymentMethods.map((method) => (
        <label key={method.provider}>
          <input type="radio" defaultChecked={method.provider === "cash"} />
          {method.label}
        </label>
      ))}
      <button>${amount}</button>
    </div>
  );
};
```

A este tamaño no es un problema. Pero para modificar este component hay que entender cuatro cosas a la vez: cómo se inicia la petición de red, cómo se transforman los datos del servidor a la forma que conoce la pantalla, cómo se dibuja un método de pago y cómo se dibuja toda la zona de pago. Cuando el código crece, quien lo lee tiene que ir y venir entre esas cuatro sin parar.

## Hooks y pure components

Lo primero que se extrae es el state y el fetch. La señal para decidir es simple. **Cuando el código que no tiene que ver con el render supera la mitad del cuerpo del component**, se saca a un hook. `usePaymentMethods` se encarga del fetch y la transformación, y el component solo dibuja el array que le da el hook.

Lo segundo es el JSX que dibuja la lista. **Cuando ves un bloque que se puede dibujar recibiendo solo props**, lo separas en un component. `PaymentMethods` es un pure component que recibe un único array de métodos de pago, así que es fácil de testear y reutilizar. Aunque más adelante se le añada un callback `onSelect` para avisar de la selección, sigue siendo pure porque no toca el state de fuera.

```tsx
const usePaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState<LocalPaymentMethod[]>([]);
  useEffect(() => { /* 위의 fetch와 변환 */ }, []);
  return { paymentMethods };
};

export const Payment = ({ amount }: { amount: number }) => {
  const { paymentMethods } = usePaymentMethods();
  return (
    <div>
      <PaymentMethods paymentMethods={paymentMethods} />
      <button>${amount}</button>
    </div>
  );
};
```

El autor llama a ambas operaciones [Extract Function](https://refactoring.com/catalog/extractFunction.html), del catálogo de refactorizaciones, porque en React un component también es una función. Lo importante es que no se introdujo ningún concepto nuevo: solo se dividió una función en dos.

Con esto parece que ya está, pero todavía quedan dos sitios. Dentro de la view está la decisión "si es efectivo, se selecciona por defecto", y dentro del hook hay una función anónima que transforma la respuesta a la forma de la pantalla. El autor llama logic leak a estas reglas de negocio que se escapan hacia la view y el hook.

## Reglas reunidas en un domain object

La tercera señal es **cuando las decisiones sobre los mismos datos están repartidas entre la view y el hook**. Las decisiones y transformaciones que se escaparon se reúnen en una sola class, `PaymentMethod`. Como conté en [el modelo de dominio](/260418) de este blog, se trata de poner las reglas junto a los datos.

```ts
class PaymentMethod {
  constructor(private remote: RemotePaymentMethod) {}
  get provider() { return this.remote.name; }
  get label() { return this.provider === "cash" ? "Pay in cash" : `Pay with ${this.provider}`; }
  get isDefaultMethod() { return this.provider === "cash"; }
}

const convertPaymentMethods = (methods: RemotePaymentMethod[]) =>
  methods.length === 0
    ? []
    : [...methods.map((m) => new PaymentMethod(m)), new PaymentMethod({ name: "cash" })];
```

Ahora el radio de la view le pregunta al objeto con `defaultChecked={method.isDefaultMethod}`. El pago en efectivo por defecto también se expresa como una instancia más de la misma class. Como lo que da el servidor y lo que añade la app tienen la misma forma, la view no necesita distinguirlos.

![Payment llama a usePaymentMethods, el hook crea PaymentMethod y PaymentMethods solo dibuja](7.png?w=720)

El autor señala como ventaja de esta estructura que los tests se vuelven más fáciles. El original se queda en esa frase, pero es más rápido ver con código cuánto más fáciles. Lo de abajo es un test que escribí yo. No hay React, ni renderer, ni mock de fetch.

```ts
test("서버가 준 결제 수단 끝에 현금 결제를 기본값으로 붙인다", () => {
  const methods = convertPaymentMethods([{ name: "apple" }, { name: "google" }]);

  expect(methods.map((m) => m.label)).toEqual(["Pay with apple", "Pay with google", "Pay in cash"]);
  expect(methods.filter((m) => m.isDefaultMethod).map((m) => m.provider)).toEqual(["cash"]);
});

test("서버가 아무것도 주지 않으면 현금 결제도 보여 주지 않는다", () => {
  expect(convertPaymentMethods([])).toEqual([]);
});
```

Para comprobar la misma regla en el código inicial había que hacer render del component, interceptar el fetch y esperar a que se dibujaran los radios. En cuanto la regla sale a un objeto, el test se convierte en una línea con una llamada a función.

Otra ventaja es que, cuando llega un requisito nuevo, ya está decidido adónde va. En este punto la estructura de archivos es esta.

```text
src
├── components
│   ├── Payment.tsx
│   └── PaymentMethods.tsx
├── hooks
│   └── usePaymentMethods.ts
└── models
    └── PaymentMethod.ts
```

Si la estructura aguanta de verdad solo se sabe cuando llega un requisito nuevo. Aquí el autor añade una funcionalidad más.

## La función de donación y el hook como state machine

El nuevo requisito es redondear hacia arriba el importe del pedido y donar la diferencia a una organización benéfica. Si el pedido es de 19,80 dólares, se pregunta si se quiere donar 0,20 dólares y, si se acepta, el botón muestra 20 dólares.

![Pantalla de pago con una casilla de donación de 0,2 dólares añadida debajo de los métodos de pago](8.png?w=600)

El autor, a propósito, mete al principio el state de aceptación y el cálculo dentro del component de pago. Al entrar de golpe el marcado de la casilla, la bifurcación del texto y el cálculo del total, el component vuelve a pesar. El orden para ordenarlo es el mismo que vimos antes. El state y el cálculo van al hook `useRoundUp`, el armado del texto a una función helper y el marcado de la casilla al component `DonationCheckbox`.

```ts
export const useRoundUp = (amount: number) => {
  const [agreeToDonate, setAgreeToDonate] = useState(false);

  const { total, tip } = useMemo(() => ({
    total: agreeToDonate ? Math.floor(amount + 1) : amount,
    tip: parseFloat((Math.floor(amount + 1) - amount).toPrecision(10)),
  }), [amount, agreeToDonate]);

  const updateAgreeToDonate = () => setAgreeToDonate((v) => !v);
  return { total, tip, agreeToDonate, updateAgreeToDonate };
};
```

`toPrecision(10)` es una parte cuyo motivo el original no explica. Lo ejecuté en Node 24 y `20 - 19.8` dio `0.1999999999999993`. Es un mecanismo para quitar el error de coma flotante.

El autor ve este tipo de hook como "una state machine detrás de la view". Cuando llega un evento desde la UI, crea un state nuevo, y el state nuevo vuelve a provocar un render. Los hooks se crearon en origen para que varios components compartieran logic, pero la postura del autor es que, aunque solo se usen en un sitio, vale la pena extraerlos porque dejan al component concentrado en el render. Añado una cosa: como señala la documentación oficial de React en [Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks), lo que comparte un custom hook es la logic que maneja el state, no el state en sí. Esta state machine se crea por separado, una por cada component que llama al hook.

Cuando se termina de ordenar, el component de pago llama a dos hooks y coloca dos components hijos y un botón. Se añadió una funcionalidad, pero el papel del component de pago no cambió.

![Debajo de Payment están los dos hooks useRoundUp y usePaymentMethods y los dos components hijos PaymentMethods y DonationCheckbox](9.png?w=720)

## Reglas por país y shotgun surgery

El siguiente requisito es que la unidad de redondeo cambie según el país. En Japón es de 100 yenes y en Dinamarca de 10 coronas. El autor, diciendo que "parece un arreglo fácil", muestra primero a propósito el camino de recibir el código de país como prop y meter bifurcaciones.

```tsx
// useRoundUp 안
total: agreeToDonate
  ? countryCode === "JP" ? Math.floor(amount / 100 + 1) * 100 : Math.floor(amount + 1)
  : amount,

// 체크박스 문구 helper 안
const currencySign = countryCode === "JP" ? "¥" : "$";

// 버튼 JSX 안
<button>{countryCode === "JP" ? "¥" : "$"}{total}</button>
```

La misma comprobación `countryCode === "JP"` entró en tres sitios, uno en el hook, otro en el helper y otro en el botón. Al añadir Dinamarca hay que volver a tocar los tres, y cuando el operador ternario ya no da abasto aparece una tabla que busca el símbolo de moneda por código de país. Esa tabla también acaba referenciándose por separado en varios sitios. Este olor, en el que un solo cambio obliga a modificar varios módulos a la vez, se llama shotgun surgery.

![Barras de color que representan las reglas por país repartidas entre varios components, hooks y domain objects](10.png?w=720)

Lo que distingue esta etapa de las tres anteriores es que la señal para decidir no viene del código, sino de las **peticiones de cambio**. Si solo miras el código actual, tres bifurcaciones no son difíciles de leer. El problema se ve cuando cuentas cuántos sitios hay que tocar para añadir un país más. Entonces, ¿adónde hay que reunir las bifurcaciones dispersas?

## Las diferencias por país reunidas con Strategy

La respuesta del autor es convertir en objeto la propia diferencia entre países. Primero, con [Extract Class](https://refactoring.com/catalog/extractClass.html) y [Replace Conditional with Polymorphism](https://refactoring.com/catalog/replaceConditionalWithPolymorphism.html), crea una interface y una implementación por país.

```ts
interface PaymentStrategy {
  getRoundUpAmount(amount: number): number;
  getTip(amount: number): number;
}

class PaymentStrategyAU implements PaymentStrategy { /* 1달러 단위 */ }
class PaymentStrategyJP implements PaymentStrategy { /* 100엔 단위 */ }
```

Una vez hechas, lo único que cambia entre implementaciones es el símbolo de moneda y la función de redondeo; el resto, como `getTip`, es idéntico. Así que el autor fusiona las implementaciones en una sola class con [Inline Class](https://refactoring.com/catalog/inlineClass.html) y recibe solo lo que cambia por el constructor. Se puede recibir el algoritmo de redondeo como función, sin crear una subclass por país, porque en JavaScript las funciones son valores. Lo de abajo es mi versión resumida del resultado.

```ts
class CountryPayment {
  constructor(readonly currencySign: string, private roundUp: (n: number) => number) {}
  getRoundUpAmount(n: number) { return this.roundUp(n); }
  getTip(n: number) { return parseFloat((this.getRoundUpAmount(n) - n).toPrecision(10)); }
}

const japan = new CountryPayment("¥", (n) => Math.floor(n / 100 + 1) * 100);
japan.getRoundUpAmount(3312); // 3400
japan.getTip(3312);           // 88
```

Ahora el hook y el component no saben nada del país. Reciben este único objeto y se limitan a usar `strategy.getRoundUpAmount(amount)` y `strategy.currencySign`. Para añadir un país basta con crear un objeto más, y no hay que tocar ningún archivo.

![El component mira solo a PaymentStrategy, y las tres implementaciones por país se reúnen detrás](11.png?w=720)

Pasar por una interface y luego volver a fusionar puede parecer un rodeo innecesario. Yo creo que es la parte del original de la que más se puede aprender. El polimorfismo no era el objetivo, sino una herramienta para hacer visibles lo común y lo diferente, y en cuanto se vio que la diferencia se reducía a una función, se quitó la jerarquía de classes. Más difícil que introducir un patrón es decidir cuándo volver a quitarlo.

## Sacar el fetch del hook

Lo último que se extrae es el fetch y la transformación dentro de `usePaymentMethods`. Un hook es un concepto de React, así que se queda del lado de la view. Si le añades error handling y retry, el hook se hincha enseguida, y si te mudas a otra view library, el hook no sirve. En cambio, una función normal se puede usar en cualquier sitio.

```ts
const fetchPaymentMethods = async () => {
  const response = await fetch(`${API}/payment-methods?countryCode=AU`);
  return convertPaymentMethods(await response.json());
};

export const usePaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  useEffect(() => {
    fetchPaymentMethods().then(setPaymentMethods);
  }, []);
  return { paymentMethods };
};
```

El autor escribe que esta función funciona como una Anti-Corruption Layer o un Gateway. Quiere decir que, aunque cambie la estructura de la respuesta del servidor, lo que hay que tocar se queda en esta única función. Pero los dos nombres no son lo mismo. El [Gateway](https://martinfowler.com/articles/gateway-pattern.html) de Fowler es un objeto que envuelve en un solo lugar el acceso a un sistema externo, mientras que Anti-Corruption Layer es un término que viene del DDD de Eric Evans y designa la frontera que traduce un modelo externo con otro sistema de significados para que no contamine el tuyo. Como la respuesta del servidor en este ejemplo es solo `{ name }` y casi no hay diferencias de significado que traducir, creo que Gateway es el nombre más preciso. Ese mismo lugar se convierte en una Anti-Corruption Layer cuando el servidor es un sistema legacy de otro equipo y el propio significado de "método de pago" es distinto.

La estructura final es esta. El render está en los components, el state en los hooks, las reglas en los domain objects y las peticiones de red en funciones.

![Payment y sus components hijos, los hooks useRoundUp y usePaymentMethods, los domain objects PaymentStrategy y PaymentMethod y el Fetcher, cada uno en su casilla en la estructura final](12.png?w=720)

El autor señala cinco ventajas de dividir así. Es más fácil encontrar dónde está un defecto. Es más fácil reutilizar y combinar código. Es más fácil de leer. Añadir funcionalidades no hace tambalear el conjunto. Y como la domain logic no conoce la view, se puede cambiar solo la view layer. Sobre la última, el propio autor advierte que en la mayoría de los proyectos es algo muy raro. Vale la pena recordar también que ninguna de las cinco viene con mediciones.

Hasta aquí llega el argumento del original. Pero cuando ejecutas este código de verdad, aparecen cosas que en el artículo no se veían.

## Lo que se ve al ejecutar el ejemplo

Descargué el repositorio de ejemplo del autor (16 commits, último commit `de186c5`) y ejecuté `tsc --noEmit` y los 7 tests. Ambos pasaron, y los helpers cuya definición falta en el original estaban en `src/utils.ts` del repositorio. Pero al mirar la estructura de cerca encontré tres cosas que conviene saber antes de copiarla.

### Una Strategy que se crea de nuevo en cada render

El component de pago recibe la Strategy como prop y, si no se le pasa, crea el valor por defecto con `new`. Y `useRoundUp` mete esa Strategy en la dependency de `useMemo`.

```tsx
export const Payment = ({
  amount,
  strategy = new PaymentStrategy("$", roundUpToNearestInteger),
}: { amount: number; strategy?: PaymentStrategy }) => {
  const { total, tip } = useRoundUp(amount, strategy); // 안에서 [agreeToDonate, amount, strategy]
  // ...
};
```

En JavaScript, los default parameters [se evalúan en cada llamada](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Default_parameters). Y `useMemo` compara las dependencies con `Object.is`. Cuando se juntan las dos cosas, se crea una instancia nueva en cada render y el memo recalcula cada vez. Hice render de la misma estructura cuatro veces en React 18: con el valor por defecto el cálculo se ejecutó 4 veces, y pasando la misma instancia, 1 vez. El `App.tsx` del repositorio no pasa Strategy (`<Payment amount={19.9} />`), así que la ruta de ejecución de la app es exactamente la del valor por defecto.

El cálculo de este ejemplo son unas pocas sumas, así que no tiene coste. El problema es la estructura. Ni el artículo ni el repositorio definen quién crea la Strategy ni dónde se pasa, y solo los tests crean instancias de Japón y Dinamarca. Yo dejaría las instancias como constantes a nivel de module y las sacaría por código de país para pasarlas.

```ts
const strategies = {
  AU: new CountryPayment("$", (n) => Math.floor(n + 1)),
  JP: new CountryPayment("¥", (n) => Math.floor(n / 100 + 1) * 100),
} as const;

<Payment amount={amount} strategy={strategies[countryCode]} />
```

### El fetch del repositorio no tiene dependency array

El `useEffect` del código del original tiene `[]`, pero el `usePaymentMethods` del repositorio no tiene dependency array desde el primer commit hasta el último. Un effect sin array se vuelve a ejecutar en cada render. Cuando llega la respuesta, cambia el state con un array nuevo, eso provoca un render y el effect vuelve a hacer fetch. Como `convertPaymentMethods` devuelve un array nuevo cada vez, no se detiene.

Cambiando fetch por un mock que responde de inmediato y contando las llamadas durante 300 ms en Jest, en cuatro mediciones salieron 152, 225, 231 y 233. Con `[]` es 1. Los tests del repositorio solo comprueban que el texto aparece en pantalla, así que no detectan esta repetición y pasan todos. A quien escribió el código siguiendo el original no le pasa; solo afecta a quien usa el repositorio tal cual.

### La race que aparece en cuanto el código de país llega como prop

El fetch effect del código del original tampoco tiene cleanup. [Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects), de la documentación oficial de React, dice que si haces fetch dentro de un effect, una respuesta anterior que llega tarde puede pisar la más reciente, así que hay que descartar las respuestas anteriores con un flag `ignore`. El original solo hace fetch una vez al hacer mount, así que de momento no hay problema. Pero en cuanto el `countryCode=AU` de la URL se recibe como prop, aparece una dependency y se abre la race. Si yo copiara esta estructura, la escribiría así desde el principio.

```ts
useEffect(() => {
  let ignore = false;
  fetchPaymentMethods(countryCode).then((methods) => {
    if (!ignore) setPaymentMethods(methods);
  });
  return () => { ignore = true; };
}, [countryCode]);
```

Una cosa más: el redondeo del original es `Math.floor(amount + 1)`, así que si el importe ya es entero sube 1 más. Un pedido de 20 dólares pasa a 21. El original solo pone como ejemplo 19,80 dólares y 3312 yenes, así que no se puede saber si es intencionado. Si lo llevas a un servicio real, primero hay que decidir en qué se diferencia de `Math.ceil`.

## Cuándo usar esta estructura

El propio autor dice que dividir no es una regla fija. Un component pequeño y cohesionado se entiende mejor en un solo archivo, y lo que hay que vigilar es que el archivo crezca hasta no poder entenderse. Una app de Todo o una app de un solo formulario puede meterlo todo en components sin problema, y aclara que hizo el ejemplo complicado a propósito para mostrar muchos patrones. Otros materiales ponen salvedades en la misma dirección.

En el mismo artículo sobre layering, Fowler dice que esta separación solo se use en unidades relativamente pequeñas. Tener view, model y data como carpetas de primer nivel está bien en un sistema pequeño, pero si alguna crece demasiado, hay que dividir el primer nivel por dominio y dentro de él por layer. Si copias tal cual las carpetas `components/`, `hooks/` y `models/` que vimos antes como estructura de primer nivel de una app grande, acabas con la forma que Fowler dice que hay que evitar.

Dan Abramov tiene una trayectoria parecida. En 2015 propuso dividir en [presentational y container components](https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0), y en 2019 añadió al principio del artículo una actualización diciendo que ya no recomendaba dividirlos así. La razón era que los Hooks hacen lo mismo sin una división arbitraria, y añadió que había visto demasiadas veces cómo se imponía de forma dogmática sin necesidad. La extracción de hooks del original se parece a lo que dice esa actualización. No hay un component aparte llamado container: `Payment`, que llama a los hooks, cumple también ese papel.

Sobre el fetch, la documentación oficial de React va un paso más allá. [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) dice que extraer la fetch logic a un custom hook facilita migrar después a una estrategia mejor, pero como primera opción recomienda el fetching integrado del framework o una client cache como TanStack Query. Si sacas el fetch a una función normal como en la última etapa del original, puedes pasar esa función tal cual como `queryFn` de TanStack Query, y la race y las llamadas repetidas de la sección anterior quedan a cargo de la library. Creo que esta es la ventaja más práctica, y el original la menciona en una sola frase. Cómo agrupar claves y funciones lo traté aparte en [queryKey](/260104).

En resumen, mi juicio es este. El orden del original (hook, pure component, domain object, Strategy, network client) vale la pena seguirlo tal cual, porque en cada etapa la incomodidad de esa etapa se convierte en el motivo de la siguiente. Pero no hace falta llegar hasta el final: basta con ver de qué etapa es la incomodidad que tienes ahora y pararte ahí. Si hay mucho código que no tiene que ver con el render, hasta el hook; si la misma decisión está dispersa, hasta el domain object; si un solo cambio te obliga a tocar varios archivos, hasta Strategy. Y si usas Strategy, decide primero dónde se crean las instancias, y si dejas el fetch en un effect, escribe primero el cleanup y las dependencies. Estas dos cosas que el original omite fueron lo primero que se rompió cuando lo copié de verdad.

No hay una respuesta correcta, pero espero que tú también te pares a pensar de qué etapa es la incomodidad que está sufriendo tu código ahora mismo.

:::ref
[docs] [Microsoft Azure Architecture Center, patrón Anti-corruption Layer](https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer)
[article] [Juntao Qiu, Headless Component](https://martinfowler.com/articles/headless-component.html)
[article] [Juntao Qiu, Data Fetching Patterns in Single-Page Applications](https://martinfowler.com/articles/data-fetch-spa.html)
:::
