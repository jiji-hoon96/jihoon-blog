---
emoji: 🧩
title: "Abstracción"
seoTitle: "Abstracción en frontend — principios de diseño para escribir buen código"
date: "2026-02-01"
categories: 프론트엔드 설계 추상화
description: "Qué es la abstracción en frontend y en qué se diferencian una buena y una mala abstracción. Un repaso, desde el diseño de componentes y funciones de React, por los niveles de abstracción, los nombres que revelan la intención y la composición de piezas."
keywords: "abstracción en frontend, abstracción de componentes React, abstracción en Clean Code, nivel de abstracción, Level of Abstraction, cómo escribir buen código, nombres que revelan la intención, Composed Method, ley de las abstracciones con fugas, diseño de componentes, diseño de hooks personalizados, arquitectura frontend, Kent Beck, Robert C. Martin"
locale: es
translationOf: '260201'
sourceHash: 961247e1971eb4b679afa09b9c66891f16680b46208db88a15e5bb55f86e3e51
---

En este artículo quiero hablar de la abstracción en programación y de cómo escribir buen código desde la perspectiva de la abstracción.

Durante mi trabajo como desarrollador frontend me he preguntado incontables veces: «¿Hasta qué punto debería separar esta lógica?» o «¿En qué unidades debería dividir este componente?». Al principio pensaba que abstraer consistía simplemente en extraer las partes comunes: convertir el código repetido en una función y reunir en una sola pieza los elementos compartidos por componentes similares. Sin embargo, después de ver varias veces cómo el código creado de ese modo se convertía con el tiempo en un monstruo cada vez más difícil de tocar, empecé a replantearme qué significa realmente abstraer.

En este artículo recopilo mis reflexiones sobre la esencia de la abstracción y sobre cómo utilizarla en el desarrollo frontend para crear buen código.


## Lo abstracto y la abstracción

Antes de entrar en materia, conviene aclarar qué significan exactamente en programación las palabras «abstracto» y «abstracción». Aunque parecen similares, su naturaleza es bastante distinta.

**Lo abstracto (Abstract)** es un estado y una propiedad. Cuando decimos que algo «es abstracto», queremos decir que se han omitido los detalles concretos y que **solo permanecen los conceptos esenciales**. Este es precisamente el sentido de las clases o métodos marcados con la palabra clave `abstract` en Java o TypeScript: son planos incompletos en los que aún no se ha incorporado una implementación concreta y solo se ha definido la forma esencial.

**La abstracción (Abstraction)** es un proceso y una acción. Consiste en simplificar un objeto complejo conservando únicamente sus características esenciales y eliminando los detalles innecesarios. Lo importante es que abstraer no significa «agrupar las cosas de cualquier manera», sino **definir con precisión una responsabilidad en cada nivel**.

En la vida cotidiana, «abstracto» suele utilizarse con el matiz de «ambiguo». En programación, sin embargo, la abstracción persigue justo lo contrario. Su objetivo no es generar ambigüedad, sino crear un nuevo nivel de significado que pueda ser absolutamente preciso. La esencia de la abstracción consiste en conservar la información relevante para un contexto dado y olvidar la que no lo es.

En definitiva, la diferencia puede resumirse así: **lo abstracto es «el estado en el que solo queda lo esencial», mientras que la abstracción es «el proceso de dejar solo lo esencial»**. Al diseñar código llevamos a cabo precisamente ese proceso: conservamos únicamente la interfaz esencial de una implementación compleja y ocultamos el resto.

Entonces, ¿por qué necesitamos esta abstracción en programación?


## Por qué necesitamos la abstracción

La razón fundamental por la que necesitamos abstracción en programación es sorprendentemente sencilla: **para construir cosas más complejas**. Cuando intentamos crear algo más complejo, resulta difícil recordar y manejar todos sus numerosos elementos. Por eso los agrupamos y los convertimos en conceptos abstractos más simples.

React, que los desarrolladores frontend utilizamos a diario, es un buen ejemplo. Para renderizar un solo componente tienen lugar internamente procesos complejos como la creación del Virtual DOM, la reconciliación (Reconciliation) y la manipulación del DOM real. Sin embargo, nosotros solo tenemos que escribir JSX sin preocuparnos por nada de eso, porque React ha abstraído todo ese proceso.

Veamos el siguiente código. Al utilizar el componente UserProfile podemos crear y manejar la UI sin conocer procesos internos complejos como la creación del VDOM o el diffing.

```tsx
<UserProfile name="jihoon" />
```

Antes era habitual que un desarrollador frontend configurase Webpack a mano, pero hoy frameworks como Next.js o Vite han abstraído la configuración del bundling. Gracias a ello podemos desarrollar aplicaciones sin conocer el funcionamiento interno del bundler y dedicar ese tiempo a **problemas de mayor nivel, como la lógica de negocio o la experiencia de usuario**. (Por eso considero que el concepto de abstracción es especialmente importante en el trabajo de un desarrollador frontend).

Ese es, en última instancia, el valor esencial de la abstracción: ocultar la complejidad para que algo parezca sencillo y permitir que cada persona se concentre únicamente en su ámbito. Gracias a ello podemos crear software cada vez más grande y complejo sin que una sola persona tenga que comprenderlo todo.

Pero si la abstracción es tan útil, ¿cuanta más haya, mejor? Pensemos con qué propósito deberíamos abstraer.


## Reducir el contexto

Muchos desarrolladores entienden la abstracción como «extraer las partes comunes». No es una definición incorrecta, pero describe solo una de las técnicas para abstraer, no la esencia de la abstracción.

Para mí, la esencia de la abstracción consiste en **«reducir al nivel adecuado el contexto que necesita conocer quien lee el código»**.

Veamos un ejemplo sencillo.

```typescript
interface Order {
  id: string;
  status: "pending" | "completed";
  amount: number;
}

let total = 0;

const orders: Order[] = [
  { id: "a", status: "pending", amount: 10000 },
  { id: "b", status: "completed", amount: 5000 },
  { id: "c", status: "completed", amount: 8000 },
];

for (let i = 0; i < orders.length; i++) {
  if (orders[i].status === "completed") {
    total += orders[i].amount;
  }
}
```

Quien lee este código debe entender la inicialización, la condición y el incremento del bucle; el acceso a cada elemento mediante un índice; la bifurcación tras comprobar una condición; y hasta cómo se actualiza la variable acumuladora externa. Sin embargo, lo que el código pretende hacer se resume en una sola frase: **«calcular el total de los pedidos completados»**. Para comprender esa frase hay que mantener a la vez cuatro contextos distintos en la cabeza.

```typescript
const total = orders
  .filter((order) => order.status === "completed")
  .reduce((sum, order) => sum + order.amount, 0);
```

Gracias a las abstracciones `filter` y `reduce`, el desarrollador solo necesita seguir dos intenciones: «seleccionar únicamente los pedidos completados» y «acumular los importes». El contexto de gestionar índices y declarar y actualizar una variable acumuladora ha desaparecido de la superficie del código.

Podemos ir un paso más allá.

```typescript
const total = sumCompletedOrders(orders);
```

Ahora quien lee el código ni siquiera necesita saber que el cálculo se realiza recorriendo un array. Solo queda la intención de negocio: «calcular el importe total de los pedidos completados». Podemos centrarnos no en **cómo (How) se calcula**, sino en **qué (What) se calcula**.

Desde esta perspectiva, también podemos ver que el código React que escribimos a diario es una combinación de innumerables abstracciones.

```tsx
import { css } from "@emotion/css";
import { format } from "date-fns";

const TodayHeader = () => {
  const now = new Date(); // Date 객체 생성이라는 복잡한 과정을 추상화
  const formatted = format(now, "yyyy-MM-dd"); // 날짜 포맷팅 로직을 추상화

  return (
    <h1
      className={css`
        font-size: 1.8rem;
      `}
    >
      {/* CSS-in-JS 처리 과정을 추상화 */}
      Today is {formatted}
    </h1> // React.createElement를 추상화
  );
};

// 그리고 위 모든 것을 다시 추상화
<TodayHeader />;
```

¿Qué ocurriría si todo el código interno de `emotion`, `date-fns` y `react` estuviera desplegado dentro de este archivo de componente? Sería difícil saber por dónde empezar a leer o distinguir qué parte corresponde a la lógica de negocio y cuál al código de una biblioteca. Como la abstracción oculta de manera adecuada el contexto de cada ámbito, podemos concentrarnos únicamente en la esencia: «mostrar la fecha de hoy».

Entonces, al diseñar código real, ¿en qué dirección deberíamos abordar la abstracción?


## Qué significa que el nivel de abstracción sea alto o bajo

Cuando hablamos de abstracción, hay un concepto imprescindible: el **nivel de abstracción (Level of Abstraction)**. ¿Qué significa exactamente que el nivel de abstracción de un código sea «alto» o «bajo»?

El **código con un nivel de abstracción bajo** se aproxima a los procedimientos concretos que ejecuta el ordenador: parsear directamente una cadena, recorrer un array mediante índices o manipular bytes. Expone sin disimulo **cómo (How)** funciona.

```tsx
// 추상화 수준이 낮은 코드
const response = await fetch('/api/users');
const users = await response.json();
const filteredUsers = users.filter(user => user.status === 'active');

filteredUsers.forEach(user => {
  const element = document.getElementById(`user-${user.id}`);
  if (element) element.style.display = 'block';
});
```

El **código con un nivel de abstracción alto** se expresa en el lenguaje del dominio de negocio o del espacio del problema. Algunos ejemplos son `processPayment(order)`, `sendNotification(user, message)` o `validateUserInput(formData)`. El código con un nivel de abstracción alto muestra **qué (What)** hace y oculta cómo lo hace.

En *Clean Code*, Robert C. Martin condensó esta idea en el principio **«un solo nivel de abstracción por función (One Level of Abstraction per Function)»**. Si dentro de una función se mezclan código de alto y de bajo nivel, quien la lee tiene que decidir en cada línea: «¿Esto forma parte de la lógica esencial o es un detalle de implementación?».

El problema se vuelve evidente al verlo en código real.

```typescript
// 추상화 수준이 뒤섞인 함수
async function registerUser(name: string, email: string, password: string) {
  // ✅ 높은 수준: 비즈니스 규칙 검증
  validateUserInput({ name, email, password });
  await ensureEmailNotDuplicated(email);

  // ❌ 낮은 수준: 비밀번호 해싱 직접 구현
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashedPassword = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // ✅ 높은 수준: 사용자 저장
  const user = await userRepository.save({ name, email, password: hashedPassword });

  // ❌ 낮은 수준: 이메일 전송 직접 구현
  const verifyToken = crypto.randomBytes(32).toString("hex");
  await db.execute(
    "INSERT INTO email_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
    [user.id, verifyToken, new Date(Date.now() + 86_400_000)]
  );
  await transporter.sendMail({
    from: "noreply@example.com",
    to: user.email,
    subject: "Welcome! Please verify your email",
    html: `<a href="/verify?token=${verifyToken}">Verify your account</a>`,
  });

  // ✅ 높은 수준: 환영 이메일 발송
  await sendWelcomeEmail(user);
}
```

Quien lee esta función comienza siguiendo el contexto de alto nivel basado en reglas de negocio del «flujo de registro de usuarios», pero de repente se ve arrastrado a contextos de bajo nivel como la manipulación de buffers de hash, una consulta SQL y la cadena de una plantilla de correo electrónico. Después vuelve a saltar al alto nivel de `sendWelcomeEmail`. Cuando el nivel de abstracción sube y baja así, la mente de quien lee también tiene que subir y bajar con él.

Si reescribimos la misma función manteniendo un nivel de abstracción uniforme, el resultado es este.

```typescript
// 추상화 수준이 일관된 함수
async function registerUser(name: string, email: string, password: string) {
  validateUserInput({ name, email, password });
  await ensureEmailNotDuplicated(email);

  const hashedPassword = await hashPassword(password);
  const user = await userRepository.save({ name, email, password: hashedPassword });

  await sendVerificationEmail(user);
  await sendWelcomeEmail(user);
}
```

Todas las instrucciones hablan desde el mismo nivel de abstracción. Cada función de nivel inferior se responsabiliza de cómo se implementa el envío del correo o de qué algoritmo se utiliza para hashear la contraseña. Quien lee esta función solo tiene que concentrarse en un único contexto: «el flujo completo del registro de usuarios».

Martin también denominó esto **«la regla descendente (The Stepdown Rule)»**. Al leer el código de arriba abajo, la visión general debería aparecer arriba y los detalles deberían revelarse conforme descendemos, como en un artículo periodístico.

Kent Beck presentó el mismo principio en *Smalltalk Best Practice Patterns* mediante el patrón **Composed Method**. Un método debe componerse únicamente de operaciones situadas en el mismo nivel de abstracción, y cada paso debe expresarse como una llamada a un método de una sola línea.

Al final, todas estas ideas convergen en una sola: **una función debe hablar desde un único nivel de abstracción**. Solo con respetar esta regla, la legibilidad del código mejora de forma notable.

Entonces, ¿cómo debemos orientar la abstracción? ¿Deberíamos partir de lo concreto o de lo abstracto?


## Pensar en la composición de piezas, no en extraer elementos comunes

En OOP se suele recomendar «extraer lo común de los elementos concretos para definir algo abstracto». Este enfoque no es incorrecto en sí mismo, pero creo que, si nos aferramos demasiado a él, corremos el riesgo de crear un diseño prisionero de los requisitos actuales.

Veamos un ejemplo. Supongamos que los requisitos incluyen tres botones, A, B y C, todos azules y redondeados, cuya única diferencia es el texto de la etiqueta. Si diseñamos extrayendo solo lo común, podríamos expresarlo así.

```tsx
const BlueRoundButton = ({ label }: { label: string }) => {
  return <button className="blue round">{label}</button>;
};
```

Los requisitos actuales se cumplen a la perfección. Pero unos días después, la persona responsable del producto dice:

> «Quiero poder cambiar el color del botón B».

En ese momento, hasta el nombre `BlueRoundButton` empieza a resultar extraño. Podríamos añadir una prop para el color, pero el diseño era vulnerable a los cambios desde el principio porque partía de una coincidencia concreta: «botones azules y redondeados». (Y este es un caso leve; en la vida real llegan innumerables requisitos sobre la forma, el tamaño y muchos otros aspectos de los botones).

Cuando esta situación se repite, uno acaba entendiendo algo de manera natural: **si extraemos elementos comunes de requisitos concretos, es fácil que incluso el resultado abstraído refleje únicamente los requisitos actuales**.

Por eso prefiero el enfoque inverso. En lugar de extraer una abstracción de lo concreto, consiste en **pensar primero en piezas abstractas y componerlas para crear algo concreto**.

Imaginemos que estamos creando un componente de notificaciones toast. El requisito inicial es sencillo: «Cuando termine de guardarse, muestra un breve mensaje informativo en la parte inferior». Si lo abordamos extrayendo elementos comunes, obtendremos algo así.

```tsx
// 현재 요구사항의 공통 특성에서 출발한 설계
type ToastProps = {
  message: string;
  hasAction?: boolean;
  actionLabel?: string;
  onAction?: () => void;
};

const Toast = ({ message, hasAction, actionLabel, onAction }: ToastProps) => (
  <div className="toast">
    <span>{message}</span>
    {hasAction && <button onClick={onAction}>{actionLabel}</button>}
  </div>
);
```

El requisito actual queda cubierto a la perfección. Pero unos días después se pide «añadir un icono a la izquierda según se trate de un éxito o una advertencia». Se agregan `hasIcon` e `iconName`. Poco después llega otro requisito: «También necesitamos un toast con una barra de progreso de subida». Se suma otra prop, `progress`. Tras repetir varias veces este proceso, `Toast` termina siendo un componente con más de diez props y reglas ocultas que hay que memorizar sobre **qué combinaciones son válidas y cuáles no**. (Y, por lo general, esas reglas ni siquiera quedan documentadas en comentarios).

El diseño era vulnerable a los cambios porque desde el principio partía de **una imagen concreta de cómo «debe ser un toast» en ese momento**.

La historia cambia cuando abordamos el problema mediante la composición de piezas.

```tsx
// 부품을 조립하는 설계
const Toast = ({ children }: PropsWithChildren) => (
  <div className="toast">{children}</div>
);

Toast.Icon = ({ name }: { name: "check" | "warn" | "info" }) => {
  /* ... */
};

Toast.Message = ({ children }: PropsWithChildren) => <span>{children}</span>;

Toast.Action = ({
  children,
  onClick,
}: PropsWithChildren<{ onClick: () => void }>) => (
  <button onClick={onClick}>{children}</button>
);

Toast.Progress = ({ value }: { value: number }) => {
  /* ... */
};

// 필요한 부품만 골라 조립한다
<Toast>
  <Toast.Message>저장되었습니다</Toast.Message>
</Toast>;

<Toast>
  <Toast.Icon name="check" />
  <Toast.Message>업로드 완료</Toast.Message>
  <Toast.Action onClick={undo}>실행 취소</Toast.Action>
</Toast>;

<Toast>
  <Toast.Progress value={0.4} />
  <Toast.Message>파일 전송 중...</Toast.Message>
</Toast>;
```

Se han separado la esencia inmutable —«un toast es un contenedor ligero para alojar algo»— y el aspecto concreto y propenso a cambiar —«qué contiene»—. Ahora podemos añadir tantas piezas nuevas como queramos o disponer las existentes en combinaciones nuevas sin tocar el interior de `Toast`. También desaparecen las reglas de validez entre combinaciones de props. Basta con **introducir lo que queramos introducir**.

Un desarrollador con experiencia podría decir: «¿No bastaría con diseñarlo desde el principio aplicando IoC (inversión de control)?». Es cierto. Pero podemos tomar esa decisión porque, después de innumerables tropiezos en el pasado, hemos desarrollado una intuición sobre «qué partes son más propensas a cambiar».

Si todavía no contamos con esa intuición, partir de la pregunta «¿De qué piezas se compone esta funcionalidad y cómo deberían ensamblarse?» facilita mucho la creación de un diseño abierto al cambio.

Llegados a este punto, surge de forma natural otra pregunta: ¿con qué criterio debemos dividir las piezas y cómo debemos presentarlas al exterior?


## Tres claves para una buena abstracción

### Pensar en la forma de expresarla

La virtud más importante de un módulo abstraído es que su comportamiento pueda deducirse sin abrir el código fuente. Kent Beck llamó a esto el patrón **«nombre que revela la intención (Intention-Revealing Name)»** y señaló que, si no podemos asignarle un nombre conciso, deberíamos reconsiderar la propia abstracción.

Disponemos principalmente de dos herramientas para conseguirlo: **los nombres** y **los tipos**.

```typescript
// 도대체 뭘 하는 건지 알 수 없는 함수
function calculate(price: number, rate: number): number;

// 이름과 타입만으로 동작을 유추할 수 있는 함수
function calculateDiscountedPrice(originalPrice: number, discountRate: number): number;
```

Con solo ver el nombre `calculateDiscountedPrice`, sabemos que recibe el precio original y la tasa de descuento y calcula el precio rebajado; la información de tipos, que indica que recibe valores `number` y devuelve un `number`, respalda esa interpretación. No necesitamos conocer la lógica de cálculo aplicada internamente.

En cambio, `calculate(price: number, rate: number): number` no aporta información sobre qué calcula, así que no podemos prever el resultado. Al final tenemos que abrir el código fuente para poder utilizarla y se pierde la ventaja de la abstracción.

Conviene observar que la propia manera de nombrar refleja el nivel de abstracción. En programación, los nombres de las funciones suelen combinar **verbo + sustantivo**, y el verbo elegido revela en qué nivel de abstracción opera la función.

> Sin embargo, el verbo por sí solo no determina el nivel de abstracción. El sustantivo que lo acompaña —el contexto de dominio— es lo que determina el nivel final.

Hay verbos frecuentes en los niveles de abstracción **bajos**, como `parse`, `encode`, `decode`, `serialize`, `read`, `write`, `push`, `pop`, `convert` o `transform`. Estas palabras sugieren transformaciones físicas de los datos o manipulaciones directas de estructuras de datos.

En un nivel intermedio aparecen verbos como `get`, `save`, `load` o `validate`. Son operaciones técnicas, pero su intención ya resulta visible hasta cierto punto.

En los niveles de abstracción **altos** se utilizan verbos como `register`, `refund`, `confirm`, `cancel` o `submit`. Son palabras propias del dominio de negocio. No revelan en absoluto qué procedimiento técnico ocurre en el interior; solo expresan **la acción del usuario o el proceso de negocio**.

```typescript
// 낮은 수준: 기술적 동작이 드러남
function parseJSON(text: string): object;
function encodeBase64(data: Uint8Array): string;

// 중간 수준: 의도가 드러나되 기술적 맥락이 남아있음
function getUserById(id: string): Promise<User>;
function validateEmail(email: string): boolean;

// 높은 수준: 비즈니스 의도만 드러남
function registerUser(form: RegistrationForm): Promise<User>;
function refundPayment(orderId: OrderId, amount: Money): Promise<Refund>;
```

En *Clean Code*, Robert C. Martin afirmó al respecto que **«es mejor un nombre largo y descriptivo que uno corto y enigmático»**. También propuso el principio **«usa una palabra por concepto»**, porque si mezclamos `fetch`, `retrieve` y `get` para operaciones del mismo contexto, quien lea el código se preguntará: «¿Son tres operaciones distintas?».

Este principio se aplica igualmente a los nombres de componentes y hooks de React.

```tsx
<Button />           
<SearchInput />      
<SubmitOrderButton />
```

La especificidad del nombre de un componente varía según su nivel de abstracción. Button se utiliza como un primitivo de UI genérico de bajo nivel, mientras que SubmitOrderButton expresa con claridad una intención de negocio de alto nivel.

```tsx
const handleSubmit = async(data: FormData) => { 
  await registerUser(data);
};

<Form onSubmit={handleSubmit} />           
```

`on*` es el nombre de la prop que el componente expone al exterior. Desde el código que utiliza el componente se declara «a qué evento reaccionar». `handle*` es el nombre de la función de implementación que se pasa realmente a esa prop.

```tsx
const user = useAuth();                  
const [items, setItems] = useCartItems();
const { isOpen, toggle } = useModal();   
```

Los hooks personalizados utilizan el prefijo `use` para cumplir las reglas de React y permiten que el componente use el estado o las operaciones que ofrece el hook.

> Jeff Atwood, creador de [Coding Horror](https://blog.codinghorror.com/), señaló en una ocasión el problema del sufijo `Manager`. Un nombre como `UrlManager` no permite saber en absoluto si mantiene un pool de URL, las valida o las crea. Nombres como `UrlBuilder`, `UrlValidator` o `UrlPool`, que revelan una responsabilidad concreta, son mucho mejores. Un nombre ambiguo puede ser una señal de que la propia responsabilidad del módulo también lo es.

En definitiva, un buen nombre es **aquel que indica de inmediato a quien lee en qué nivel de abstracción opera el código**.


### Diseñar deliberadamente la libertad de las entradas

Al diseñar un módulo abstraído aparece con frecuencia una pregunta: «¿Hasta qué punto debemos dejar abierta la funcionalidad?». Esta decisión cambia considerablemente la experiencia de los desarrolladores que utilizan el módulo.

```tsx
// 기능이 닫힌 컴포넌트
const Button = ({ children }: {children?: React.ReactNode}) => {
  return <button>{children}</button>;
};

// 기능이 완전히 열린 컴포넌트
const Button = (props: ComponentProps<"button">) => {
  return <button {...props} />;
};
```

El primer botón solo acepta `children`. No permite configurar `onClick`, `type` ni `disabled`. A cambio, quien lo utiliza no tiene nada que decidir.

El segundo botón acepta todos los atributos del elemento `button`. Ofrece mucha libertad, pero obliga a quien lo utiliza a decidir cuál de las decenas de props disponibles debe usar. Describo estas situaciones diciendo que **«el componente obliga al desarrollador a pensar»**.

No hay una respuesta única. Debemos encontrar el nivel adecuado según el propósito del módulo y sus usuarios. En el botón base de un sistema de diseño puede ser preferible restringir las Props para mantener la coherencia; en un componente utilitario genérico puede convenir abrirlas para ofrecer flexibilidad.

```tsx
// 지나치게 닫힌 인터페이스 — 다양한 상황에 대응 불가
<Button onClick={handleSubmit}>제출</Button>
// onClick 외의 이벤트, className, disabled 등을 전달할 방법이 없다

// 지나치게 열린 인터페이스 — 의도가 사라짐
<Button {...anyProps} />
// 무엇을 전달해야 하는지 사용자가 직접 파악해야 한다
```

La amplitud de una abstracción debe decidirse en función de quién la utiliza. Para un usuario que necesita comprender la implementación interna y ejercer un control preciso, es adecuada una interfaz de bajo nivel. En cambio, ofrecer una interfaz demasiado abierta a quien no necesita conocer los detalles solo añade confusión. Y, a la inversa, si restringimos en exceso las entradas de alguien que debe responder a situaciones variadas, impediremos los propios casos de uso.


### Mantener una unidad de abstracción adecuada

La unidad de abstracción —es decir, «hasta dónde agrupar en un solo módulo»— también es una decisión importante.

Un antipatrón frecuente en frontend es la extracción excesiva de Custom Hooks.

```tsx
// 이 훅은 단 하나의 컴포넌트에서만 사용된다
const useUserProfileData = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  return { user, loading };
};
```

Si separamos innecesariamente en un hook una lógica que solo utiliza un componente, obligamos a quien lee el código a saltar entre dos archivos para comprender el contexto. En lugar de reducirlo, la abstracción lo ha aumentado.

El extremo contrario —incluir demasiadas cosas en un solo hook— también supone un problema.

```tsx
// 관련 없는 관심사가 하나의 훅에 뒤섞여 있다
const useEverything = () => {
  const auth = useAuth();
  const theme = useTheme();
  const analytics = useAnalytics();
  const toast = useToast();

  return { auth, theme, analytics, toast };
};
```

Este tipo de «God Hook» es difícil de probar, y modificar un elemento puede afectar a partes que no guardan relación con él.

El criterio para determinar una unidad de abstracción adecuada es **«¿Esta separación reduce realmente el contexto de quien lee el código?»**. Si, como resultado de la separación, el contexto queda disperso y cuesta más comprenderlo, todavía no ha llegado el momento de esa abstracción.


## Cuidado con las abstracciones prematuras

Después de leer hasta aquí puede quedar una pregunta: «Entonces, ¿cuándo debemos abstraer?». Mi opinión es la siguiente: **la premisa básica debe ser no abstraer de forma prematura**.

Mientras no aparezca una señal clara para abstraer, dejar el código tal como está suele ofrecer un resultado mínimo mejor que crear una abstracción incorrecta y tener que deshacerla después. El proceso por el que surge una mala abstracción suele parecerse a este:

1. Aparece un patrón similar en el código A y el código B.
2. Pensamos: «¡El principio DRY dice que debo extraerlo a una función común!» y lo abstraemos.
3. Encontramos un patrón parecido en el código C y usamos la misma función, pero añadimos un parámetro para introducir un comportamiento ligeramente distinto.
4. Al empezar a utilizarla también en el código D y E, siguen aumentando las condiciones y los parámetros.
5. La función ya se utiliza en todas partes, pero se ha convertido en un código que nadie se atreve a tocar.

```typescript
// 처음에는 단순했던 함수가...
const formatUserName = (user: User) => `${user.firstName} ${user.lastName}`;

// 요구사항이 추가될 때마다 매개변수가 늘어나고...
const formatUserName = (
  user: User,
  includeMiddleName?: boolean,
  format?: "full" | "short" | "initials",
  locale?: string,
  honorific?: boolean,
) => {
  if (format === "initials") {
    /* ... */
  }
  if (includeMiddleName && user.middleName) {
    /* ... */
  }
  if (honorific && locale === "ko") {
    /* ... */
  }
  // ...끝없는 분기
};
```

Si hemos caído en esta situación, la solución está clara: volver a poner inline el código abstraído en cada lugar donde se utiliza, eliminar en cada caso el código innecesario y, cuando el estado quede limpio, abstraer de nuevo si entonces aparece una coincidencia real. **«La forma más rápida de avanzar es volver atrás»**.

Entonces, ¿cuándo debemos abstraer? Estas son, a grandes rasgos, las **señales de abstracción** que percibo:

- **Se está perdiendo la coherencia.** Aunque se trata de la misma lógica, en algunos componentes aparece inline y en otros se ha separado en una función. La misma lógica de cálculo está dispersa por todas partes.
- **La estructura interna se expone innecesariamente al exterior.** Quien llama al módulo tiene que manejar uno por uno detalles de implementación que no necesita conocer.
- **El procedimiento interno sigue quedando expuesto.** El módulo no logra ocultar su propio procedimiento y quien lo utiliza debe seguirlo tal cual.

El problema es que detectar estas señales suele ser bastante sencillo, pero **en la práctica es fácil ignorarlas y centrarse en satisfacer requisitos más «importantes»**. Cuando nos presionan los plazos o estamos absortos en implementar una funcionalidad, pensamos: «Ya funciona; lo ordenaré más adelante». Y ese momento rara vez llega.

Hay otra cuestión importante: **mantener criterios de abstracción coherentes**. Si dentro del mismo código base una misma clase de lógica aparece inline en un lugar, como función en otro y como hook personalizado en un tercero, quien lea ese código por primera vez se preguntará: «¿Hay una intención detrás de esta diferencia?». Tanto si se abstrae como si no, el equipo debe aplicar criterios coherentes.

También merece la pena recordar en este contexto **«la ley de las abstracciones con fugas (The Law of Leaky Abstractions)»**, formulada por Joel Spolsky en 2002. Esta ley sostiene que, aunque una abstracción intenta ocultar una implementación compleja, sus detalles terminan filtrándose al exterior (leak). Es decir: algo se diseña para que el usuario de la abstracción no necesite conocer la implementación interna, pero en la práctica surgen situaciones en las que solo puede utilizarla correctamente si la conoce.

TCP abstrae una red inestable para hacerla parecer una conexión fiable, pero la abstracción se rompe si se desconecta el cable. React abstrae de forma declarativa las actualizaciones de la UI, pero para optimizar los rerenderizados acabamos necesitando comprender su funcionamiento interno. Como no existen abstracciones perfectas, al abstraer debemos plantearnos incluso **«¿Puede el usuario responder cuando esta abstracción se rompa?»**.

En definitiva, **«la abstracción nos ahorra tiempo de trabajo, pero no tiempo de aprendizaje»**.


## La abstracción se interioriza con la práctica

En una ocasión hablé con un compañero sobre la abstracción y hubo una idea que me resultó especialmente memorable: detectar las señales de abstracción y separar algo en el nivel adecuado y en el momento oportuno pertenece, en última instancia, al **terreno de la intuición**.

Por supuesto, los principios mencionados antes —mantener el nivel de abstracción, elegir buenos nombres y diseñar la libertad de las entradas— son importantes. Sin embargo, intentar recordar cada uno mientras escribimos código y preguntarnos constantemente «¿Debería separar esto o no?» puede llegar a romper el flujo. Igual que, si durante un combate somos demasiado conscientes del ángulo del codo al lanzar un jab, podemos perder el momento preciso, al programar la abstracción debe surgir de una intuición natural y no de un juicio consciente.

Hay momentos en los que estamos escribiendo código y, de pronto, algo nos produce rechazo. Sentimos: «Esta lógica no debería estar aquí» o «Este componente parece saber demasiado». Esa sensación es precisamente una señal de abstracción; interiorizarla significa poder detectarla y responder a ella de forma natural.

Pero esta intuición no se desarrolla de la noche a la mañana. Solo después de aprender multitud de patrones, leer código diverso y sufrir nuestros propios tropiezos empieza a surgir con naturalidad la sensación de **«creo que esto debería separarse»**. Si más tarde un compañero pregunta «¿Por qué lo separaste?» y podemos explicar con naturalidad «Lo separé porque es X», entonces lo hemos interiorizado.

Creo que ocurre lo mismo en cualquier disciplina. Intentar hacerlo bien a base de memorizar puede dificultar aún más las decisiones. Al final, hay que conservar el flujo general y dejar que los detalles se completen de forma natural. Y esa naturalidad nace de la variedad de patrones y experiencias acumulados en el día a día.


## Conclusión

En programación, abstraer es ocultar la complejidad para que algo parezca sencillo y permitir que quien lee el código se concentre únicamente en el contexto que necesita.

Recapitulemos lo que conviene recordar para construir buenas abstracciones:

- Como principio básico, evitemos abstraer de forma prematura y separemos solo cuando aparezca una señal clara.
- Hagamos que una función hable desde **un único nivel de abstracción**.
- **Expresemos** suficientemente el comportamiento mediante nombres y tipos para que pueda utilizarse sin abrir el código fuente.
- **Diseñemos deliberadamente** la libertad de las entradas según el propósito del módulo y sus usuarios.
- En vez de seguir añadiendo capas sobre una abstracción incorrecta, tengamos **el valor de deshacerla y empezar de nuevo**.
- E **interioricemos distintos patrones** hasta que todo esto surja de forma natural, sin necesidad de pensarlo conscientemente.

Por supuesto, lo que he expuesto en este artículo no es la única respuesta correcta. El nivel adecuado de abstracción puede variar según la situación del negocio, la composición del equipo y la naturaleza del proyecto. Sin embargo, hay algo que no cambia: el objetivo último de la abstracción es **crear código que las personas puedan comprender con facilidad**.

Espero que quienes lean este artículo se planteen también en sus propios códigos base la pregunta: «¿Esta abstracción está reduciendo realmente el contexto?». Creo que esa sola pregunta puede cambiar, aunque sea un poco, la forma de mirar el código.


## Referencias

Este artículo se inspira en gran medida en distintos documentos oficiales y artículos anteriores. Dejo también las fuentes de las citas directas y los textos que me ayudaron a estructurar estas ideas.

:::ref
- [article] [Evan Moon, 추상, 그리고 추상화](https://evan-moon.github.io/2023/01/15/what-is-abstract/)
- [docs] [React, Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
:::
