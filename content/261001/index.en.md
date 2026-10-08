---
emoji: 🧱
title: 'Layers in a React App'
seoTitle: 'React Layered Architecture with Hooks and Domain Objects'
date: '2026-10-01'
categories: frontend React Architecture
description: 'Split a React payment screen into view, model, and data, following Juntao Qiu. Running the example repo shows a useMemo bypass and a fetch loop.'
keywords: 'React layered architecture, React application architecture, extract custom hook, domain object React, Strategy pattern React, Presentation Domain Data layering, refactoring React components, modularizing React apps'
locale: en
translationOf: '261001'
sourceHash: 04386dc525603086b1a6518b3fc3658aa52bda3e4f74955bd48e7683dad0f199
---

In this post, I want to talk about how to split the code of a React app into the screen, the business rules, and data access. It is written for developers whose component holds fetch, calculation, and render all together, so that every fix means reading the whole thing. By the end you will know which signals tell you to pull out a hook, a pure component, a domain object, a Strategy, and a network client, in what order, and where that structure breaks when you carry it over as is.

The backbone is [Modularizing React Applications with Established UI Patterns](https://martinfowler.com/articles/modularizing-react-apps.html), which Juntao Qiu of Thoughtworks published as a series on martinfowler.com in February 2023. I did not transcribe the original; I retold it in my own words, and every figure in this post comes from that article. On top of it I added the results of cloning the author's [example repository](https://github.com/abruzzi/payment-round-up-refactoring) and running the type check and tests, along with other material that deals with the same problem.

## React is a view library

When you first learn React, the most appealing idea is that UI is a pure function that turns data into DOM. To a degree, that is true. But the moment you send a request to a server or navigate to another page, the component is no longer pure. Add tangled global and local state, and the code gets complicated fast.

The author's answer is to change the point of view. There is no special breed of software called a "React application." React is a library for drawing UI, and where to put calculations or business rules was never its concern to begin with. What sits on top of it is an ordinary JavaScript app. If so, we can reuse the designs we have used since the days of desktop GUIs, in particular the approach of splitting code into three layers: presentation, domain, and data.

A real frontend app has more than views. It has a router, local storage, caches at several levels, network requests, integrations with external services and login, security, logging, and performance tuning. Push all of that into components and hooks, and within one file a line that requests the order status is followed by a line that trims leading whitespace from a string, and then by a line that navigates to another screen. The reader has to keep switching levels of abstraction and jumping back and forth.

The reasons for splitting come down to two. The screen changes more often than the business rules. And once the two are separated, you only have to think about one thing at a time. The second reason is what Martin Fowler names as the biggest benefit of this separation in [PresentationDomainDataLayering](https://martinfowler.com/bliki/PresentationDomainDataLayering.html). You can think about the three topics relatively independently, which narrows what you have to pay attention to.

## Five stages of a growing app

Before getting into the refactoring, the author shows in five figures how the structure changes as an app grows. What matters is the trigger for moving to the next stage. It is not a fixed point in time; the pain that appears at one stage calls for the next. The colors mean the same thing in all five figures. Light green is a container component that holds state, dark green is a presentational component that only draws, purple is a hook, blue is a domain object, and orange is infrastructure such as the network.

At first, a single component owns the network request, state, calculation, and render. For a small app or a one-off project this is enough, and because the code looks like HTML it is actually easy to read. Once code that loops over a list to build items gets mixed with code that configures an external component, and it starts taking time to read what is going on, you move to the next stage.

![A single component owns network requests, state management, domain logic, and rendering, and calls the API directly](1.png?w=720)

As the screen grows, you split components along the shape of the resulting HTML. Components that only draw break off, but the top component still holds the network request, the code that reshapes the response for the screen, and the code that gathers the data to send to the server. None of the three is UI, yet they live inside a component.

![Components that only draw have been split off, but network requests and domain logic remain in the component above them](2.png?w=720)

Next, you move state and its changes into a custom hook. Then what is left inside the hook is pure calculation that is neither a side effect nor state.

![Network requests and domain logic have moved into a hook, but the two are mixed together inside the hook](3.png?w=720)

Move that calculation into an object unrelated to React, and a domain object appears. Data format conversion, null checks, and fallback values go there. As objects multiply, inheritance or polymorphism starts to become necessary.

![The hook keeps only state, while domain logic goes to a Domain object and network requests go to a Fetcher](4.png?w=720)

Finally, when you see objects that belong to no UI and do not care whether data comes from the server or from local storage or a cache, you group them into a separate model layer.

![The middle band is the model layer, with components and hooks above it and infrastructure such as Fetcher and Adaptor below it](5.png?w=720)

The figures alone are abstract. Let's walk through these five stages once with real code. The example the author chose is the payment screen of an online order.

## Starting from a single payment screen

Payment methods come from server configuration and differ by country. If the server returns even one, cash payment is appended at the end and selected by default; if it returns none, nothing is shown.

![A screen with apple, google, and cash payment radio buttons in the payment section below the order details, with cash payment selected](6.png?w=600)

The initial code has the shape you often see in tutorials. Inside `useEffect` it fetches, reshapes the response for the screen, appends cash payment, and draws a list of radio buttons. Below is my shortened version.

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

At this size it is not a problem. But to change this component you have to understand four things together: how the network request starts, how server data is turned into a shape the screen knows, how one payment method is drawn, and how the whole payment section is drawn. As the code grows, the reader has to keep moving between these four.

## Hooks and pure components

The first thing to pull out is state and fetch. The signal is simple. **When code unrelated to render takes up more than half of the component body**, move it into a hook. `usePaymentMethods` takes care of fetching and conversion, and the component just receives the array from the hook and draws it.

The second is the JSX that draws the list. **When you see a block that can be drawn from props alone**, split it into a component. `PaymentMethods` is a pure component that receives only an array of payment methods, so it is easy to test and reuse. Even if an `onSelect` callback that reports the selection is added later, it does not touch outside state, so it stays pure.

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

The author calls both of these moves [Extract Function](https://refactoring.com/catalog/extractFunction.html) from the refactoring catalog, because in React a component is also a function. The important point is that no new concept was brought in; one function was simply split into two.

This may look finished, but two spots remain. Inside the view there is the rule "select cash by default," and inside the hook there is an anonymous function that reshapes the response for the screen. The author calls this kind of business rule seeping into the view and the hook a logic leak.

## Rules gathered in a domain object

The third signal is **when decisions about the same data are scattered across the view and the hook**. Gather the leaked decisions and conversions into a single `PaymentMethod` class. As I covered in [domain models](/260418) on this blog, the idea is to put the rules next to the data.

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

The radio button in the view now asks the object, with `defaultChecked={method.isDefaultMethod}`. The cash payment default is also represented as an instance of the same class. Because what the server provided and what the app appended now have the same shape, the view no longer needs to tell them apart.

![Payment calls usePaymentMethods, the hook creates PaymentMethod objects, and PaymentMethods only draws](7.png?w=720)

The author cites easier testing as a benefit of this structure. The original stops at that statement, but seeing how much easier it gets is faster in code. Below is a test I wrote. No React, no renderer, no fetch mock.

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

To check the same rules in the initial code, you had to render the component, intercept fetch, and wait until the radio buttons were drawn. The moment the rules came out as an object, the test became a single function call.

Another benefit is that when a new requirement arrives, it already has a place to go. At this point the file structure looks like this.

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

Whether the structure really holds up is only known when a new requirement arrives. Here the author adds one more feature.

## A donation feature and the hook as a state machine

The new requirement is to round up the order amount and let the user donate the difference to charity. For a $19.80 order, it asks about a $0.20 donation, and if the user agrees, the button shows $20.

![The payment screen with a checkbox for a $0.2 donation added below the payment methods](8.png?w=600)

The author deliberately puts the agreement state and the calculation inside the payment component at first. With the checkbox markup, the message branching, and the total calculation all arriving at once, the component gets heavy again. The cleanup follows the same order as before. State and calculation go to a `useRoundUp` hook, message assembly goes to a helper function, and the checkbox markup goes to a `DonationCheckbox` component.

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

`toPrecision(10)` is something the original does not explain. When I ran it on Node 24, `20 - 19.8` came out as `0.1999999999999993`. It is a device for scrubbing off floating point error.

The author sees this kind of hook as "a state machine behind the view." When an event comes from the UI, it produces new state, and the new state triggers another render. Hooks were originally created so that several components could share logic, but the author's position is that even with a single user, a hook is worth extracting because it lets the component focus on render. I would add one thing. As React's official docs point out in [Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks), what a custom hook shares is the logic that handles state, not the state itself. This state machine is created separately for each component that calls the hook.

After the cleanup, the payment component calls two hooks and lays out two child components and a button. A feature was added, yet the payment component's role stayed the same.

![Under Payment sit two hooks, useRoundUp and usePaymentMethods, and two child components, PaymentMethods and DonationCheckbox](9.png?w=720)

## Per-country rules and shotgun surgery

The next requirement is to use a different rounding unit per country. Japan rounds to 100 yen, Denmark to 10 kroner. Saying "it seems like an easy fix," the author deliberately shows first the path of taking the country code as a prop and adding branches.

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

The same `countryCode === "JP"` check has landed in three places, one each in the hook, the helper, and the button. Adding Denmark means editing all three places again, and once ternaries become unmanageable, a table that looks up currency signs by country code appears. That table, too, ends up referenced separately from many places. This smell, where one change forces you to edit several modules at once, is called shotgun surgery.

![Colored bars representing per-country rules scattered across several components, hooks, and domain objects](10.png?w=720)

What makes this stage different from the previous three is that the signal comes not from the code but from a **change request**. Looking only at the current code, three branches are not hard to read. The problem only shows when you count how many places you have to edit to add one more country. So where should the scattered branches be gathered?

## Per-country differences gathered in a Strategy

The author's answer is to turn the per-country difference itself into an object. First, using [Extract Class](https://refactoring.com/catalog/extractClass.html) and [Replace Conditional with Polymorphism](https://refactoring.com/catalog/replaceConditionalWithPolymorphism.html), he creates one interface and a per-country implementation.

```ts
interface PaymentStrategy {
  getRoundUpAmount(amount: number): number;
  getTip(amount: number): number;
}

class PaymentStrategyAU implements PaymentStrategy { /* 1달러 단위 */ }
class PaymentStrategyJP implements PaymentStrategy { /* 100엔 단위 */ }
```

Once they are built, it turns out the only things that differ between implementations are the currency sign and the rounding function, and the rest, like `getTip`, is identical. So the author uses [Inline Class](https://refactoring.com/catalog/inlineClass.html) to merge the implementations into a single class that takes only the differing parts through its constructor. The reason you can take the rounding algorithm as a function instead of creating a subclass per country is that functions are values in JavaScript. Below is my shortened version of the result.

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

The hook and the component no longer know about countries. They receive this one object and simply use `strategy.getRoundUpAmount(amount)` and `strategy.currencySign`. Adding a country means creating one more object, and there are no files to edit.

![The component looks only at PaymentStrategy, with three per-country implementations gathered behind it](11.png?w=720)

Going through an interface and then merging back may look like wasted motion. I think this is the most instructive part of the original. Polymorphism was not the goal but a tool for exposing what is common and what differs, and once it became clear that the difference had shrunk to a single function, the class hierarchy was removed. Knowing when to remove a pattern again is a harder judgment than bringing it in.

## Moving fetch out of the hook

The last thing to pull out is the fetch and conversion inside `usePaymentMethods`. A hook is a React concept, so it stays on the view side. Add error handling and retries and the hook quickly bloats, and if you move to another view library, the hook cannot be used. A plain function, on the other hand, can be used anywhere.

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

The author writes that this function acts like an Anti-Corruption Layer or a Gateway. That means even if the structure of the server response changes, the place to fix stays within this one function. The two names are not the same thing, though. Fowler's [Gateway](https://martinfowler.com/articles/gateway-pattern.html) is an object that wraps access to an external system in one place, while Anti-Corruption Layer is a term from Eric Evans's DDD for a boundary that translates an external model with a different semantic system so it does not corrupt your own model. The server response in this example is just `{ name }`, so there is almost no difference in meaning to translate, and I think Gateway is the more accurate name. The same spot becomes an Anti-Corruption Layer when the server is a legacy system owned by another team and the very meaning of a payment method differs.

The final structure looks like this. Render is in components, state in hooks, rules in domain objects, and network requests in functions.

![The final structure, with Payment and its child components, the useRoundUp and usePaymentMethods hooks, the PaymentStrategy and PaymentMethod domain objects, and a Fetcher each in its own box](12.png?w=720)

The author lists five benefits of splitting things this way. It becomes easier to find where a defect is. Code becomes easier to reuse and compose. It becomes easier to read. Adding features does not shake the whole. And because domain logic does not know about the view, you can swap out just the view layer. For the last one, the author himself adds the caveat that it is very rare in most projects. It is also worth remembering that none of the five comes with measurements.

That is the storyline of the original. But when you actually run this code, things show up that were not visible in the article.

## What running the example reveals

I cloned the author's example repository (16 commits, last commit `de186c5`) and ran `tsc --noEmit` and the 7 tests. Both passed, and the helpers whose definitions are missing from the article were in the repository's `src/utils.ts`. But looking into the structure, I found three things you should know before carrying it over.

### A Strategy created anew on every render

The payment component receives a Strategy as a prop and, if none is passed, creates a default with `new`. And `useRoundUp` puts that Strategy in the dependencies of `useMemo`.

```tsx
export const Payment = ({
  amount,
  strategy = new PaymentStrategy("$", roundUpToNearestInteger),
}: { amount: number; strategy?: PaymentStrategy }) => {
  const { total, tip } = useRoundUp(amount, strategy); // 안에서 [agreeToDonate, amount, strategy]
  // ...
};
```

JavaScript default parameters are [evaluated at every call](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Default_parameters). And `useMemo` compares dependencies with `Object.is`. Put the two together, and every render creates a new instance and the memo recomputes every time. When I rendered the same structure four times in React 18, the calculation ran 4 times with the default and once when the same instance was passed. The repository's `App.tsx` passes no Strategy with `<Payment amount={19.9} />`, so the app's execution path is exactly the default case.

The calculation in this example is a few additions, so there is no cost. The problem is the structure. Neither the article nor the repository settles who creates the Strategy and where it is passed from; only the tests create Japan and Denmark instances. If it were me, I would keep the instances as module-level constants and look them up by country code to pass them in.

```ts
const strategies = {
  AU: new CountryPayment("$", (n) => Math.floor(n + 1)),
  JP: new CountryPayment("¥", (n) => Math.floor(n / 100 + 1) * 100),
} as const;

<Payment amount={amount} strategy={strategies[countryCode]} />
```

### The repository's fetch has no dependency array

The `useEffect` in the article's code has `[]`, but `usePaymentMethods` in the repository has no dependency array from the first commit to the last. An effect without an array runs again on every render. When the response arrives, it replaces state with a new array, that triggers a render, and the effect fetches again. Because `convertPaymentMethods` returns a new array every time, it never stops.

When I replaced fetch with a mock that responds immediately and counted calls over 300ms in Jest, four measurements gave 152, 225, 231, and 233 calls. With `[]` it is 1. The repository's tests only check whether text appears on screen, so they do not catch this repetition and all pass. Readers who typed along with the article do not have this problem; it only hits when you take the repository as is.

### The race that appears the moment the country code becomes a prop

The fetch effect in the article's code has no cleanup either. React's official docs, in [Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects), say that when you fetch inside an effect, an earlier response that arrives late can overwrite the latest one, so you should discard earlier responses with an `ignore` flag. The article fetches only once on mount, so there is no problem for now. But the moment you take the `countryCode=AU` in the URL as a prop, a dependency appears and the race opens up. When carrying this structure over, I would write it like this from the start.

```ts
useEffect(() => {
  let ignore = false;
  fetchPaymentMethods(countryCode).then((methods) => {
    if (!ignore) setPaymentMethods(methods);
  });
  return () => { ignore = true; };
}, [countryCode]);
```

One more thing. The rounding in the article is `Math.floor(amount + 1)`, so when the amount is already an integer it rounds up by another 1. A $20 order becomes $21. The article only gives $19.80 and 3312 yen as examples, so there is no telling whether this is intended. If you carry it over into a real service, you first need to decide how it should differ from `Math.ceil`.

## When to use this structure

The author himself says that splitting is not a fixed rule. A small, cohesive component is easier to understand when kept in one file, and what to watch out for is a file growing too large to understand. He notes that a Todo app or a single-form app is fine with everything in the component, and that the example was made complex on purpose to show many patterns. Other sources add caveats in the same direction.

In the same layering article, Fowler says to apply this separation only to relatively small units. Having view, model, and data as top-level folders is fine in a small system, but if any one of them gets too large, split the top level by domain and then split each of those into layers. Carry the `components/`, `hooks/`, and `models/` folders we saw earlier over as the top-level structure of a large app, and you end up with exactly the shape Fowler says to avoid.

Dan Abramov has a similar history. In 2015 he proposed splitting into [presentational and container components](https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0), and in 2019 he added an update at the top saying he no longer recommends splitting that way. The reason was that Hooks do the same job without an arbitrary division, and he added that he had seen it enforced far too often, dogmatically and without need. The hook extraction in the original is close to what this update describes. There is no separate component named container; `Payment`, which calls the hooks, plays that role as well.

On fetch, React's official docs go one step further. [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) says that extracting fetch logic into a custom hook makes it easier to move to a better strategy later, yet as the first choice it recommends a framework's built-in fetching or a client cache like TanStack Query. If you extract fetch into a plain function as in the original's last stage, you can pass that function straight to TanStack Query's `queryFn`, and the library takes over the race and repeated calls from the previous section. I see this as the most practical gain, one the original mentions in just a single sentence. How keys and functions are bound together I covered separately in [queryKey](/260104).

To sum up, here is my judgment. The original's order (hook, pure component, domain object, Strategy, network client) is worth following as is, because at each stage the pain of that stage becomes the reason for the next. But you do not have to go all the way. Look at which stage the pain you feel right now belongs to, and stop there. If there is a lot of code unrelated to render, go as far as hooks; if the same decision is scattered around, as far as domain objects; if one change has you editing several files, as far as Strategy. And if you use Strategy, decide first where the instances are created, and if you keep fetch in an effect, write the cleanup and dependencies first. These two things the original left out were the first places to break when I actually carried it over.

There is no single right answer, but I hope you, the reader, will take a moment to check which stage's pain your own code is going through right now.

:::ref
[docs] [Microsoft Azure Architecture Center, Anti-corruption Layer pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer)
[article] [Juntao Qiu, Headless Component](https://martinfowler.com/articles/headless-component.html)
[article] [Juntao Qiu, Data Fetching Patterns in Single-Page Applications](https://martinfowler.com/articles/data-fetch-spa.html)
:::
