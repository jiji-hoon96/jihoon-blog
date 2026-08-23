---
emoji: 🧩
title: "Abstração"
seoTitle: "Abstração no frontend — princípios de design para um bom código"
date: "2026-02-01"
categories: frontend design abstração
description: "O que é abstração no frontend e como diferenciar uma boa abstração de uma ruim. Uma análise, sob a perspectiva do design de componentes React e funções, que abrange níveis de abstração, nomes que revelam intenção e composição de peças."
keywords: "abstração no frontend, abstração de componentes React, abstração no Clean Code, nível de abstração, Level of Abstraction, como escrever um bom código, nomes que revelam intenção, Composed Method, lei das abstrações com vazamento, design de componentes, design de hooks customizados, arquitetura frontend, Kent Beck, Robert C. Martin"
locale: pt-BR
translationOf: '260201'
sourceHash: 961247e1971eb4b679afa09b9c66891f16680b46208db88a15e5bb55f86e3e51
---

Neste post, quero falar sobre abstração na programação e sobre como escrever um bom código a partir dessa perspectiva.

Ao trabalhar com desenvolvimento frontend, já me perguntei inúmeras vezes: "Até que ponto devo separar esta lógica?" e "Em que unidades devo dividir este componente?". No começo, eu achava que abstração era simplesmente extrair as partes em comum: transformar código repetido em uma função e reunir em um só lugar os pontos comuns de componentes semelhantes. Mas, depois de ver algumas vezes o código criado dessa forma se transformar, com o passar do tempo, em um monstro ainda mais difícil de modificar, comecei a repensar o que é abstração.

Neste texto, pretendo organizar as reflexões que venho fazendo sobre a essência da abstração e sobre como usá-la no desenvolvimento frontend para produzir um bom código.


## Abstrato e abstração

Antes de entrar no assunto principal, vale esclarecer o que as palavras "abstrato" e "abstração" significam exatamente na programação. Elas parecem semelhantes, mas têm naturezas bem diferentes.

**Abstrato (Abstract)** é um estado e uma propriedade. Quando dizemos que "isto é abstrato", queremos dizer que os detalhes concretos foram omitidos e que **restaram apenas os conceitos essenciais**. Classes ou métodos marcados com a palavra-chave `abstract` em Java ou TypeScript têm justamente esse sentido. São projetos incompletos nos quais a implementação concreta ainda não foi preenchida e apenas a forma essencial está definida.

**Abstração (Abstraction)** é um processo e uma ação. É o próprio processo de simplificar algo complexo, mantendo apenas suas características essenciais e removendo detalhes desnecessários. O ponto importante é que abstrair não significa "agrupar as coisas de qualquer jeito", mas **definir com precisão o papel de cada nível**.

No cotidiano, a palavra "abstrato" costuma carregar a nuance de "vago". Na programação, porém, a abstração é exatamente o contrário. Seu objetivo não é criar ambiguidade, mas estabelecer um novo nível de significado que possa ser absolutamente preciso. Preservar as informações relevantes em determinado contexto e esquecer as irrelevantes é a essência da abstração.

No fim, podemos distinguir os dois conceitos assim: **o abstrato é "o estado em que só resta o essencial", enquanto a abstração é "o processo de deixar apenas o essencial"**. Ao projetar código, é exatamente essa abstração que realizamos: o processo de conservar apenas a interface essencial de uma implementação complexa e esconder o restante.

Então, por que precisamos desse tipo de abstração na programação?


## Por que a abstração é necessária

A razão fundamental para precisarmos de abstração na programação é surpreendentemente simples: **para construir coisas mais complexas**. Quando queremos criar algo mais complexo, torna-se difícil lembrar e lidar com todos os seus muitos elementos. Por isso, agrupamos esses elementos e os transformamos em conceitos abstratos simplificados.

O próprio React, usado diariamente por desenvolvedores frontend, é um exemplo. Para renderizar um único componente, ocorrem internamente processos complexos como a criação do Virtual DOM, a reconciliação (Reconciliation) e a manipulação do DOM real. Ainda assim, basta escrevermos JSX sem nos preocuparmos com nada disso, porque o React abstraiu esse processo complexo para nós.

Observe o código abaixo. Ao usar o componente UserProfile, conseguimos criar e manipular a UI sem conhecer processos complexos que ocorrem internamente, como a criação do VDOM e o diffing.

```tsx
<UserProfile name="jihoon" />
```

Antigamente, configurar o Webpack manualmente fazia parte da rotina de um desenvolvedor frontend, mas hoje frameworks como Next.js e Vite abstraem as configurações de bundling. Graças a isso, podemos desenvolver aplicações sem conhecer o funcionamento interno do bundler e usar esse tempo para **nos concentrar em problemas de nível mais alto, como a lógica de negócio e a experiência do usuário**. (É por isso que considero o conceito de abstração extremamente importante para o papel do desenvolvedor frontend.)

No fim das contas, este é o valor central da abstração: esconder a complexidade para que algo pareça simples e permitir que cada pessoa se concentre apenas em sua própria área. Graças a ela, conseguimos construir softwares cada vez maiores e mais complexos sem que uma única pessoa precise compreender tudo.

Se a abstração é tão boa assim, será que quanto mais abstrairmos, melhor? Vamos pensar com que objetivo devemos abstrair.


## Reduzir o contexto

Muitos desenvolvedores entendem abstração como "extrair as partes em comum". Isso não está errado, mas é apenas uma das técnicas usadas para abstrair, não uma explicação de sua essência.

Para mim, a essência da abstração é **"reduzir, ao nível adequado, o contexto que uma pessoa precisa conhecer para ler o código"**.

Vejamos um exemplo simples.

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

Para ler esse código, um desenvolvedor precisa compreender a inicialização, a condição e o incremento do loop, o acesso aos elementos por índice, a ramificação condicionada e até a forma como a variável acumuladora externa é atualizada. O que o código realmente pretende fazer cabe em uma única frase — **"calcular a soma dos pedidos concluídos"** —, mas, para entendê-la, é preciso manter quatro contextos diferentes na cabeça ao mesmo tempo.

```typescript
const total = orders
  .filter((order) => order.status === "completed")
  .reduce((sum, order) => sum + order.amount, 0);
```

Graças às abstrações `filter` e `reduce`, o desenvolvedor só precisa acompanhar duas intenções: "selecionar apenas os pedidos concluídos" e "acumular os valores". O contexto do gerenciamento de índices e da declaração e atualização da variável acumuladora desapareceu da superfície do código.

Podemos avançar mais um passo.

```typescript
const total = sumCompletedOrders(orders);
```

Agora, quem lê o código nem sequer precisa saber que esse cálculo percorre um vetor. Resta apenas a intenção de negócio de "calcular o valor total dos pedidos concluídos". Passamos a nos concentrar não em **como (How) o cálculo é feito**, mas em **o que (What) é calculado**.

Sob essa perspectiva, percebemos que o código React que escrevemos todos os dias também é uma combinação de inúmeras abstrações.

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

E se todo o código interno de `emotion`, `date-fns` e `react` estivesse aberto dentro deste arquivo de componente? Seria difícil saber por onde começar a leitura e distinguir a lógica de negócio do código das bibliotecas. Como a abstração esconde adequadamente o contexto de cada área, podemos nos concentrar apenas na essência: "mostrar a data de hoje".

Então, ao projetar código na prática, em que direção devemos abordar a abstração?


## O que significa um nível de abstração alto ou baixo

Quando falamos de abstração, não podemos deixar de abordar o conceito de **nível de abstração (Level of Abstraction)**. Afinal, o que significa dizer que o nível de abstração de um código é "alto" ou "baixo"?

Um **código com baixo nível de abstração** está próximo dos procedimentos concretos executados pelo computador: fazer o parsing de uma string diretamente, percorrer um vetor por índices ou manipular bytes. Ele expõe claramente **como (How)** funciona.

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

Um **código com alto nível de abstração** é expresso na linguagem do domínio de negócio ou da área do problema. Alguns exemplos são `processPayment(order)`, `sendNotification(user, message)` e `validateUserInput(formData)`. Um código com alto nível de abstração revela **o que (What)** faz e esconde como faz.

Em *Clean Code*, Robert C. Martin organizou esse conceito no princípio de **"um nível de abstração por função (One Level of Abstraction per Function)"**. Quando uma mesma função mistura código de alto e baixo nível, quem a lê precisa decidir a cada linha: "Isto é a lógica principal ou um detalhe de implementação?".

O problema fica claro quando observado em código real.

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

Quem lê essa função começa acompanhando o contexto de alto nível das regras de negócio do "fluxo de cadastro do usuário", mas de repente é arrastado para o contexto de baixo nível da manipulação de buffers de hash, consultas SQL e strings de templates de e-mail. Em seguida, salta outra vez para o alto nível de `sendWelcomeEmail`. Quando o nível de abstração sobe e desce dessa forma, a mente de quem lê também precisa subir e descer junto.

Se reescrevermos a mesma função mantendo um nível de abstração uniforme, o resultado será este.

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

Todas as instruções falam no mesmo nível de abstração. Cada função de nível inferior fica responsável por como o envio de e-mails é implementado ou qual algoritmo é usado para gerar o hash da senha. Quem lê essa função só precisa se concentrar em um único contexto: "o fluxo completo de cadastro do usuário".

Martin também chama isso de **"regra descendente (The Stepdown Rule)"**. Ao ler o código de cima para baixo, como em uma matéria de jornal, devemos ver o panorama geral no topo e encontrar cada vez mais detalhes conforme descemos.

Kent Beck apresentou o mesmo princípio em *Smalltalk Best Practice Patterns* por meio do padrão **Composed Method**. Um método deve ser composto apenas de operações no mesmo nível de abstração, e cada etapa deve ser expressa por uma chamada de método em uma única linha.

No fim, todas essas ideias chegam à mesma conclusão: **uma função deve falar em apenas um nível de abstração.** Só esse cuidado já muda visivelmente a legibilidade do código.

Mas em que direção devemos conduzir a abstração? Devemos partir do concreto ou do abstrato?


## Pensar em composição de peças, não em extração de pontos comuns

Na OOP, é comum ouvir a diretriz "extraia os pontos comuns das coisas concretas para definir algo abstrato". Essa abordagem não está errada por si só, mas acredito que se prender demais a ela traz o risco de criar um design limitado aos requisitos atuais.

Vejamos um exemplo. Suponha que os requisitos incluam os botões A, B e C, todos azuis e arredondados, com diferença apenas no texto do rótulo. Se projetarmos extraindo apenas os pontos comuns, podemos representá-los assim.

```tsx
const BlueRoundButton = ({ label }: { label: string }) => {
  return <button className="blue round">{label}</button>;
};
```

Os requisitos atuais são atendidos perfeitamente. Alguns dias depois, porém, a pessoa responsável pelo produto diz:

> "Permita alterar a cor do botão B."

Nesse instante, o próprio nome `BlueRoundButton` se torna estranho. Até seria possível adicionar uma prop de cor, mas o design já era vulnerável a mudanças porque partira da característica concreta comum de ser "um botão azul e arredondado". (E este ainda é um caso simples. No mundo real, chegam inúmeros requisitos sobre o formato, o tamanho e muitos outros aspectos do botão.)

Quando situações como essa se repetem, percebemos naturalmente uma coisa: **uma abordagem que extrai pontos comuns de requisitos concretos tende a fazer com que até o resultado abstraído reflita apenas os requisitos atuais**.

Por isso, prefiro seguir na direção oposta. Em vez de extrair o abstrato a partir do concreto, gosto de **pensar primeiro em peças abstratas e compô-las para criar algo concreto**.

Imagine que estamos criando um componente de notificação toast. O requisito inicial é simples: "Quando o salvamento for concluído, mostre uma breve mensagem de orientação na parte inferior." Pela abordagem de extração de pontos comuns, teríamos isto.

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

O requisito atual é atendido perfeitamente. Alguns dias depois, porém, a pessoa responsável pelo produto pede: "Adicione um ícone à esquerda de acordo com o estado de sucesso ou alerta". Surgem `hasIcon` e `iconName`. Logo chega outro pedido: "Também precisamos de um toast com uma barra de progresso de upload". Mais uma prop, `progress`, é adicionada. Depois de repetir esse processo algumas vezes, `Toast` passa a ter mais de dez props e ainda exige que se decorem regras ocultas sobre **quais combinações são permitidas e quais não são**. (E, na maioria das vezes, essas regras nem sequer ficam registradas em comentários.)

O design era vulnerável a mudanças porque havia partido da **imagem concreta, no momento atual, de "como um toast deve ser"**.

Quando abordamos o problema pela composição de peças, a história muda.

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

A essência imutável — "um toast é um contêiner simples que apenas envolve conteúdo" — foi separada dos detalhes concretos mais sujeitos a mudanças — "o que ele abriga". Agora podemos adicionar quantas peças novas quisermos ou organizar as existentes em novas combinações sem tocar no interior de `Toast`. As regras de validade para combinações de props também desaparecem. Basta **colocar ali o que queremos**.

É claro que um desenvolvedor experiente poderia perguntar: "Não basta projetar desde o início com IoC (inversão de controle)?". É verdade. Mas esse julgamento só é possível porque, depois de incontáveis tentativas e erros no passado, foi desenvolvida uma intuição sobre "quais partes tendem a mudar".

Quando ainda não temos essa intuição, partir da pergunta "De quais peças esta funcionalidade é composta e como cada uma deve ser combinada?" facilita muito a criação de um design aberto a mudanças.

Depois de ler até aqui, surge naturalmente uma pergunta: com base em que critérios devemos separar as peças e como devemos expô-las externamente?


## Três pontos para uma boa abstração

### Pensar na expressividade

A virtude mais importante de um módulo abstraído é permitir que seu comportamento seja deduzido sem que seja necessário abrir o código-fonte. Kent Beck chamou isso de padrão **"nome que revela intenção (Intention-Revealing Name)"** e afirmou que, se não for possível encontrar um nome conciso, a própria abstração precisa ser repensada.

Temos duas grandes ferramentas para isso: **nomes** e **tipos**.

```typescript
// 도대체 뭘 하는 건지 알 수 없는 함수
function calculate(price: number, rate: number): number;

// 이름과 타입만으로 동작을 유추할 수 있는 함수
function calculateDiscountedPrice(originalPrice: number, discountRate: number): number;
```

Só pelo nome de `calculateDiscountedPrice`, sabemos que a função recebe o preço original e a taxa de desconto para calcular o preço com desconto, enquanto a informação de tipo confirma que ela recebe `number` e retorna `number`. Não precisamos conhecer a lógica de cálculo aplicada internamente.

Já `calculate(price: number, rate: number): number` não informa o que está sendo calculado, portanto não nos permite prever o resultado. No fim, só conseguimos usá-la depois de abrir o código-fonte, perdendo a vantagem da abstração.

Nesse ponto, vale observar que a própria forma de nomear reflete o nível de abstração. Na programação, nomes de funções costumam ser compostos pela combinação **verbo + substantivo**, e o verbo escolhido revela em que nível de abstração a função opera.

> No entanto, o verbo sozinho não determina o nível de abstração. O substantivo que o acompanha — isto é, o contexto do domínio — determina o nível final

Existem verbos frequentemente usados em níveis de abstração **baixos**, como `parse`, `encode`, `decode`, `serialize`, `read`, `write`, `push`, `pop`, `convert` e `transform`. Essas palavras sugerem uma transformação física dos dados ou uma manipulação direta da estrutura de dados.

No nível intermediário, aparecem verbos como `get`, `save`, `load` e `validate`. São operações técnicas, mas seu propósito já se revela até certo ponto.

Em níveis de abstração **altos**, são usados verbos como `register`, `refund`, `confirm`, `cancel` e `submit`. Essas palavras pertencem à linguagem do domínio de negócio. Elas não revelam nenhum dos procedimentos técnicos internos, expressando apenas **as ações do usuário ou os processos de negócio**.

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

Em *Clean Code*, Robert C. Martin afirmou que **"um nome longo e descritivo é melhor que um nome curto e enigmático"**. Ele também apresentou o princípio **"use uma palavra por conceito"**, pois, se misturarmos `fetch`, `retrieve` e `get` para operações no mesmo contexto, quem lê ficará em dúvida: "Essas três operações são diferentes?".

O mesmo princípio se aplica diretamente à nomenclatura de componentes e hooks do React.

```tsx
<Button />           
<SearchInput />      
<SubmitOrderButton />
```

A especificidade do nome de um componente varia de acordo com seu nível de abstração. Button é usado em um nível baixo como um primitivo genérico de UI, enquanto SubmitOrderButton revela claramente a intenção de negócio em um nível alto.

```tsx
const handleSubmit = async(data: FormData) => { 
  await registerUser(data);
};

<Form onSubmit={handleSubmit} />           
```

`on*` é o nome da prop que o componente expõe externamente. Quem usa o componente declara "a qual evento reagir". `handle*` é o nome da função de implementação efetivamente passada para essa prop.

```tsx
const user = useAuth();                  
const [items, setItems] = useCartItems();
const { isOpen, toggle } = useModal();   
```

Hooks customizados usam o prefixo `use` para seguir as regras do React e permitem que componentes utilizem o estado ou as operações fornecidas pelo hook.

> Jeff Atwood, responsável pelo [Coding Horror](https://blog.codinghorror.com/), já apontou o problema do sufixo `Manager`. O nome `UrlManager` não revela se sua função é manter um pool de URLs, validá-las ou criá-las. Nomes como `UrlBuilder`, `UrlValidator` e `UrlPool`, que revelam papéis específicos, são muito melhores. Um nome vago pode ser um sinal de que a própria responsabilidade do módulo é vaga.

No fim das contas, um bom nome é **aquele que informa imediatamente a quem lê em que nível de abstração o código opera**.


### Projetar intencionalmente o grau de liberdade das entradas

Ao projetar um módulo abstraído, há uma dúvida recorrente: "Até que ponto devemos deixar a funcionalidade aberta?". Essa decisão muda bastante a experiência dos desenvolvedores que usam o módulo.

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

O primeiro botão aceita apenas `children`. Não é possível configurar `onClick`, `type` nem `disabled`. Em compensação, quem o usa não precisa tomar nenhuma decisão.

O segundo botão aceita todos os atributos do elemento `button`. Ele oferece muita liberdade, mas quem o utiliza precisa decidir quais, entre dezenas de props, deve usar. Eu descrevo essa situação dizendo que **"o componente obriga o desenvolvedor a pensar"**.

Não há uma resposta certa. Precisamos encontrar o nível adequado de acordo com o propósito e os usuários do módulo. Para o botão básico de um design system, pode ser melhor preservar a consistência com Props limitadas; para um componente utilitário genérico, pode ser melhor oferecer flexibilidade.

```tsx
// 지나치게 닫힌 인터페이스 — 다양한 상황에 대응 불가
<Button onClick={handleSubmit}>제출</Button>
// onClick 외의 이벤트, className, disabled 등을 전달할 방법이 없다

// 지나치게 열린 인터페이스 — 의도가 사라짐
<Button {...anyProps} />
// 무엇을 전달해야 하는지 사용자가 직접 파악해야 한다
```

A amplitude da abstração deve ser determinada por quem é seu usuário. Para quem precisa compreender e controlar em detalhes a implementação interna, uma interface de baixo nível é adequada. Por outro lado, oferecer uma interface excessivamente aberta a quem não precisa conhecer os detalhes só aumenta a confusão. Da mesma forma, limitar demais as entradas de quem precisa lidar com diversas situações acaba inviabilizando os próprios casos de uso.


### Manter a unidade de abstração no tamanho adequado

A unidade de abstração — isto é, "até onde agrupar em um único módulo" — também é uma questão importante.

Um antipadrão comum no frontend é a extração excessiva de Custom Hooks.

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

Quando separamos desnecessariamente em um hook uma lógica usada por um único componente, quem lê precisa alternar entre dois arquivos para compreender o contexto. Em vez de reduzi-lo, a abstração acabou aumentando-o.

O contrário — colocar coisas demais em um único hook — também é um problema.

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

Um "God Hook" como esse é difícil de testar, e a alteração de uma única coisa pode afetar partes sem relação com ela.

O critério para determinar a unidade adequada de abstração é **"esta separação realmente reduz o contexto de quem lê o código?"** Se o resultado da separação dispersar o contexto e dificultar sua compreensão, ainda não chegou a hora dessa abstração.


## Cuidado com abstrações prematuras

Depois de ler até aqui, pode restar a pergunta: "Então, quando devo abstrair?". Minha opinião é esta: **a premissa básica deve ser não abstrair prematuramente.**

Enquanto não houver um sinal claro de abstração, deixar o código como está oferece um resultado mínimo melhor do que criar uma abstração errada e precisar desfazê-la mais tarde. O processo pelo qual uma abstração ruim costuma surgir é mais ou menos este.

1. Surge um padrão semelhante no código A e no código B.
2. Pensamos: "É o princípio DRY, então vou extrair uma função comum!" e criamos uma abstração.
3. Um padrão parecido aparece no código C; usamos a mesma função, mas adicionamos um parâmetro para obter um comportamento um pouco diferente.
4. Quando os códigos D e E também passam a usá-la, as condicionais e os parâmetros continuam aumentando.
5. Agora a função é usada em toda parte, mas todos têm medo de modificá-la.

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

Se chegamos a essa situação, a solução é clara: colocar o código abstraído novamente inline em cada caso de uso, remover de cada um o que for desnecessário e, quando o verdadeiro ponto em comum se revelar no código já limpo, abstrair outra vez. **"O avanço mais rápido é voltar atrás."**

Então, quando devemos abstrair? Os **sinais de abstração** que percebo são mais ou menos estes.

- **A consistência está se perdendo.** Embora a lógica seja a mesma, em alguns componentes ela fica inline e, em outros, é separada em uma função. A mesma lógica de cálculo está espalhada por toda parte.
- **A estrutura interna está desnecessariamente exposta ao exterior.** O chamador precisa lidar, um por um, com detalhes de implementação que não deveria conhecer.
- **O procedimento interno continua exposto.** O módulo não consegue ocultar seus próprios procedimentos, e quem o utiliza precisa segui-los diretamente.

O problema é que, embora detectar esses sinais costume ser simples, **na prática é fácil ignorá-los e se concentrar em atender a requisitos mais "importantes"**. Quando estamos sob pressão de prazos ou concentrados em implementar funcionalidades, pensamos: "Por enquanto funciona; organizo depois" — e esse depois raramente chega.

Outro ponto importante é **manter critérios de abstração consistentes**. Se o mesmo tipo de lógica fica inline em um lugar da codebase, separado em uma função em outro e extraído para um hook customizado em outro, quem começa a ler o código se pergunta: "Existe alguma intenção nessa diferença?". Abstraindo ou não, a equipe precisa adotar critérios consistentes.

Também vale lembrar, nesse contexto, a **"lei das abstrações com vazamento (The Law of Leaky Abstractions)"**, apresentada por Joel Spolsky em 2002. Essa lei diz que, embora uma abstração tente esconder uma implementação complexa, os detalhes dessa implementação acabam vazando (leak) para fora. Em outras palavras, uma abstração é projetada para que seus usuários não precisem conhecer a implementação interna, mas surgem situações em que só é possível usá-la corretamente conhecendo-a.

O TCP abstrai uma rede instável como se fosse uma conexão confiável, mas, quando um cabo é desconectado, essa abstração se rompe. O React abstrai as atualizações de UI de forma declarativa, mas, para otimizar novas renderizações, acabamos precisando compreender seu funcionamento interno. Como não existe abstração perfeita, ao criar uma também precisamos pensar: **"O usuário conseguirá reagir quando esta abstração se romper?"**

No fim, **"a abstração economiza nosso tempo de trabalho, mas não economiza nosso tempo de aprendizado."**


## A abstração é algo que se internaliza

Certa vez, conversei com um colega sobre abstração, e uma observação feita naquele momento me marcou: detectar sinais de abstração e separar o código no nível adequado, na hora certa, é, no fim das contas, uma questão de **intuição**.

É claro que os princípios discutidos anteriormente — manter o mesmo nível de abstração, dar bons nomes e projetar o grau de liberdade das entradas — são importantes. Porém, tentar lembrar cada um deles enquanto escrevemos código e ponderar conscientemente "Devo separar isto ou não?" pode acabar interrompendo nosso fluxo. Assim como pensar no ângulo do cotovelo ao lançar um jab durante uma luta pode fazer alguém perder o momento certo, ao programar a abstração também deve surgir de uma intuição natural, não de um julgamento consciente.

Há momentos em que estamos escrevendo código e de repente sentimos certa rejeição: "Parece que esta lógica não deveria estar aqui" ou "Parece que este componente sabe coisas demais". Essa sensação é justamente um sinal de abstração, e internalização é a capacidade de detectá-lo e reagir a ele naturalmente.

Mas essa intuição não surge da noite para o dia. Só depois de estudar inúmeros padrões, ler códigos variados e passar pessoalmente por muitas tentativas e erros é que a sensação de **"acho que isto precisa ser separado"** começa a aparecer com naturalidade. Se, mais tarde, um colega perguntar "Por que você separou isto?" e conseguirmos explicar naturalmente "Eu separei porque se trata de X", significa que esse conhecimento foi internalizado.

Acho que o mesmo vale para qualquer área. Quando tentamos fazer algo bem apenas decorando regras, tomar decisões se torna ainda mais difícil. No fim, precisamos preservar o fluxo geral e deixar que os detalhes sejam preenchidos naturalmente. E essa naturalidade nasce da variedade de padrões e experiências que acumulamos no dia a dia.


## Conclusão

Na programação, abstrair é esconder a complexidade para fazê-la parecer simples e permitir que quem lê o código se concentre apenas no contexto necessário.

Retomando os pontos que devemos lembrar para criar uma boa abstração:

- Como premissa básica, não devemos abstrair prematuramente; devemos separar apenas quando surgirem sinais claros.
- Uma função deve falar em apenas **um nível de abstração**.
- Devemos **expressar** o comportamento suficientemente por meio de nomes e tipos, para que o código possa ser usado sem que seja necessário abrir seu código-fonte.
- Devemos **projetar intencionalmente** o grau de liberdade das entradas de acordo com o propósito e os usuários do módulo.
- Em vez de acrescentar coisas sobre uma abstração errada, devemos ter **a coragem de desfazê-la e recomeçar**.
- E devemos **internalizar padrões variados** até que tudo isso surja naturalmente, sem esforço consciente.

É claro que o que apresentei neste texto não é a única resposta correta. O nível adequado de abstração pode variar de acordo com o contexto de negócio, a composição da equipe e a natureza do projeto. Ainda assim, se existe uma coisa que não muda, é que o objetivo final da abstração consiste em **criar um código fácil para as pessoas compreenderem**.

Espero que quem leu este texto também se pergunte, em sua própria codebase: "Esta abstração está realmente reduzindo o contexto?". Acredito que só essa pergunta já pode mudar um pouco a forma de enxergar o código.


## Referências

Este texto recebeu muita inspiração de diversas documentações oficiais e artigos anteriores. Deixo abaixo as fontes dos trechos citados diretamente e os textos que me ajudaram a estruturar estas ideias.

:::ref
- [article] [Evan Moon, 추상, 그리고 추상화](https://evan-moon.github.io/2023/01/15/what-is-abstract/)
- [docs] [React, Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
:::
