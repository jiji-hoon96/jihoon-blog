---
emoji: 🧠
title: "State Management"
seoTitle: "A Practical Framework for Frontend State Management: Local, Global, Server, Form, URL, External State, and Guards"
date: "2026-05-18"
categories: Frontend State-Management React Architecture
description: "A practical framework for frontend state management across seven categories—Local, Global, Server, Form, URL, External State, and State Guards—with clear principles for Single Source of Truth, impossible states, State Colocation, tool selection, and modeling."
keywords: "frontend state management, React state management, Zustand vs Jotai, TanStack Query, Server State vs Client State, State Colocation, Single Source of Truth, React 19 useOptimistic"
locale: en
translationOf: '260518'
sourceHash: 7d2f8d18c54ae7f00c5922a4cb5cd7237792e4fce04be90a498fcdbaca0e3b41
---

In this post, I want to talk about **State Management**. This is not a library comparison. Rather than deciding which tool is better, the goal is to develop a feel for **how to think about** state and **where to draw its boundaries**.

AI tools such as Claude, ChatGPT, Cursor, Gemini, and Copilot have become deeply embedded in our daily work. Development has accelerated exponentially, but if I am honest, the quality of the services we build does not seem to have kept pace. We are increasingly confronted with as many new bugs as new features, and I often hear people say, "I have no idea why this ended up this way."

As development speeds up, we spend less time examining every line of code in detail. That makes it even more important, in my view, to have the **fundamental skills needed to guide AI in the right direction**. To preserve the quality of the result, we need to recognize problems in AI-generated code and steer it back toward the outcome we want. Those fundamentals may include domain-driven development, abstraction, TDD (Test-Driven Development), effective use of libraries, and building performance advantages.

Yet whenever I ask frontend colleagues—and colleagues in other IT roles—"What is the hardest part of frontend development?" the answer I hear most often is remarkably consistent: **"Managing state flow."**

This article explores why managing state flow is so difficult and what kind of judgment and intuition we need to cultivate to handle it well.


## What Is State?

Before getting into the main discussion, let us begin with the most fundamental question: what exactly do we mean by "state"?

While studying frontend development, I often read articles by [hoseung.me](https://blog.hoseung.me/2021-12-05-state-management). There, state is described as **"any data that can affect the UI."** A like count, the contents of a shopping cart, whether a modal is open, an input value, information about the signed-in user, the currently selected tab, search results, and whether something is loading—all of these are state.

The official React documentation defines it more formally. The page is titled ["State: A Component's Memory"](https://react.dev/learn/state-a-components-memory), which can be understood as **"the mechanism by which a component retains data between renders and tells React to trigger a re-render when that data is updated."** In other words, it is data that persists over time, changes in response to events, and causes the UI to be redrawn when it changes. One more important point: state is **isolated to each component instance.** Even if the same component appears ten times on a page, each instance has its own independent state. This fact connects directly to the later discussion of where state should live.

Both definitions point to the same idea: state is **"a value that changes over time and affects rendering."** A constant that never changes is not state. Primitive design tokens fixed at build time are not state, but a dark mode setting that the user can toggle is. (Strictly speaking, the values themselves resolve according to the dark or light theme state. The "theme selection" is the state, while the tokens are more accurately understood as a mirror reflecting that state.)

There is one important caveat: **not all state lives in components.** Some state lives in cookies; some in localStorage, sessionStorage, or IndexedDB; and some in the URL. When server-resident data is brought to the client and cached, that cache also becomes a form of state. Even browser-managed values such as scroll position and the history stack sometimes need to be treated as state because they determine how our application behaves.


## Why Is It So Difficult?

At first, handling state sounds simple enough. Create the state you need, pass it where it is needed, and correctly handle updates and resets. What could be so difficult about that?

Keep that question in mind and open a page from the service you are currently working on.

How many components does that page contain? Even a simple page may consist of dozens of components, while a complex one may contain hundreds arranged in a tree. Each component may hold its own state, share state with a sibling, or receive state from a parent. State can also carry across pages. Some state must survive a refresh, while other state should disappear when the tab closes.

This is the real reason state is difficult to manage: **we cannot see at a glance where countless pieces of state are declared, how they are updated, or when they cease to exist.** As the number of components with similar roles grows, both naming state and tracing the code that changes it become increasingly difficult.

An invisible web begins to form. A click in component A invalidates B's data; invalidating B closes C's UI; and closing C discards the form input. If that chain is not explicit anywhere in the code, we have to reconstruct the web in our heads whenever we debug a bug.

How, then, should we untangle this web? I believe the first step is recognizing that **"state comes in different kinds."**


## Not All State Is the Same

[Kent C. Dodds](https://kentcdodds.com/blog/application-state-management-with-react) divides state into **Server Cache** (information that exists on the server and is held by the client for fast access) and **UI State** (information that exists only in the UI to control interface behavior). We often make mistakes when we lump the two together.

The [official TanStack Query documentation](https://tanstack.com/query/latest/docs/framework/react/guides/does-this-replace-client-state) defines TanStack Query as a server-state library that manages asynchronous work between the server and the client, while tools such as Redux, MobX, and Zustand are client-state libraries. (They can store asynchronous data, but doing so is inefficient.)

The central point is clear: **Server State and Client State are different problems.** Server State is asynchronous, can be changed by other users, and becomes stale over time. Client State is synchronous, under our control, and disappears on refresh. (More precisely, when the page unloads, **the JavaScript runtime restarts, and the component tree and its state in heap memory are reclaimed together.** When the component mounts again, it starts over from the initial value of `useState`.) If we try to handle both with the same tool, we must implement patterns such as cache invalidation, background refetching, and optimistic updates ourselves.

I take this one step further and divide frontend state into **seven categories**. To be clear, these seven categories do not separate neatly along a single axis. They mix storage location, source, lifecycle, and role, so a single piece of state may belong to several categories at once. Rather than treating this as a perfect taxonomy, think of the categories as **questions to ask when deciding how state should be managed**.

- **Local State** — State used only within one component or a narrow subtree
- **Global State** — State that must be shared across the application
- **Server State** — State whose source of truth is the server and whose client-side copy is a cache
- **Form State** — Temporary state that exists while the user is entering data
- **URL State** — Shareable state that lives in the address bar and survives refreshes
- **External State** — State outside React, such as cookies, localStorage, sessionStorage, and IndexedDB
- **State Guard** — Logic that blocks, allows, or validates access and actions based on combinations of state, rather than state itself

Beyond these categories, there is workflow state that may need to be modeled as a state machine and real-time collaborative state built on WebSocket or CRDTs.

Let us examine why each category calls for different tools and what kind of judgment we should apply to it.


## Local State

This is the simplest kind of state. It is used only within a single component, and the outside world neither needs nor is entitled to know about it. Examples include whether a modal is open, whether a toggle button is on or off, hover state, and a search term currently being entered.

```tsx
function SearchBox() {
  const [query, setQuery] = useState("");
  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

This much is probably familiar. The genuinely difficult question with Local State is deciding **"where should this state live?"**

In [Kent C. Dodds's article on State Colocation](https://kentcdodds.com/blog/state-colocation-will-make-your-react-app-faster), he explains that **people are accustomed to "lifting up" state, but when the code changes, they rarely move that state back to where it belongs by "colocating" it.**

Lifting state is the natural thing to do when sibling components need to share it. Because both siblings need to see the same data, we move the state to their common parent and pass it down through props.

The problem arises when those siblings no longer need the state. We are much less likely to **move it back down** into a child. As a result, parent components accumulate state that has little to do with them, and every parent re-render causes the entire child tree to re-render as well.

The first principle for Local State, then, is this: **to make the code faster and simpler, keep state as close as possible to the code that uses it.** If state is used by only one child of a component, there is no reason for the parent to own it. Move it into that child. The parent becomes lighter as a result.


## Global State

Global State must be accessible from anywhere in the application. Authentication information, theme, language, and notifications such as toasts are common candidates.

The difference between Local State and Global State is not simply where they live. They make different **contracts about how they may be referenced**. Local State promises that **"this has meaning only inside this component,"** while Global State publishes a codebase-wide promise that **"this value can be referenced by this name from anywhere in the application."** The cost of that promise is the essence of Global State.

Creating a piece of Global State is, in effect, adding another **implicit dependency across the entire application**.


## Server State

We put data returned by an API into Client State and manage loading and error states ourselves with booleans—until we finally ask, **"Why am I writing the same boilerplate every time?"**

Tanner Linsley, the lead maintainer of TanStack, puts it this way: **"Client State is synchronous and predictable. Server State is asynchronous, shared across multiple components, and requires careful handling of caching, background refetching, and error states."** Server State is therefore **fundamentally a different species** from Client State. It should not be handled with the same tool.

What makes Server State difficult is not the tooling but **the nature of the data itself**.

The data the client displays belongs to the server. What the client holds is merely **a snapshot from a particular moment in time**. As time passes, this data becomes stale. It is also asynchronous, can fail, and moves through states such as pending, error, and success.

The most important fact is that **responses are not guaranteed to arrive in the order requests were sent**. Imagine typing "react" quickly into a search box. Requests for r → re → rea → reac → react are sent in that order, but if the response for "react" arrives first and the response for "rea" arrives afterward, the UI will display the results for "rea". Preventing this requires accounting for **concurrency hazards (race conditions)** that would otherwise force us to implement AbortController logic or request ID tracking by hand every time.


## Form State

Forms are a peculiar kind of state. Their values change intensely while the user is typing, but usually disappear once the form is submitted. They are not shared elsewhere, and in most cases there is nowhere else they need to be stored.

The problem is that this **intense rate of change** can be expensive. If every keystroke causes a React re-render, input lag can become noticeable in a large form. And a form does more than simply hold values. **Validation, dirty checks, submission status, error messages, and multistep flows** all bring several kinds of state to life within a single form at once.

A multistep form such as a three-step checkout flow is often **expected to preserve progress even if the page is refreshed midway through**. If its values live only in useState, a refresh wipes them all out. It is more natural to store them in **sessionStorage** (temporary, tab-scoped storage) or the **URL** (for shareable steps). In other words, depending on its lifecycle requirements, Form State combines with **External State** or **URL State**.


## URL State

Imagine a search page where users can filter by category, sort order, and page number. If we keep these values in useState, three problems arise at once.

- Refreshing the page resets every filter
- Sharing the URL with a friend shows them the unfiltered page
- Pressing the Back button does not restore the previous filters

A natural solution is to **put the state in the URL.** The URL is effectively a free persistent store with built-in support for refreshes, sharing, and navigation history.

```
/products?category=shoes&sort=price-desc&page=2
```

That single URL contains the complete state: **"page 2 of the shoes category, sorted by price in descending order."** There is no need to keep a separate copy in useState.

When is the URL the right place for state? **A URL is a public interface.** Passwords, authentication tokens, and temporary notes that users would not want others to see must not go into it. Nor should values that change too frequently—such as a search term updated on every keystroke—be written directly to the URL, because they will fill the history stack with noise. In those cases, apply the change after a debounce or avoid polluting history by using `push` only when appropriate and choosing `replace` for updates that should not add an entry.

Values in a URL are **always strings**. Numbers, booleans, arrays, and objects must be serialized and deserialized. URLs must also follow the rules of [percent encoding](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams), which gives characters such as `&`, `=`, Korean text, and spaces special handling. Implementing all of this by hand every time quickly becomes a breeding ground for bugs.

```tsx
const params = new URLSearchParams(location.search);
const page = Number(params.get("page") ?? "1");
params.set("page", String(page + 1));
navigate(`?${params.toString()}`);

const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
```

Libraries such as [nuqs](https://nuqs.dev/) solve both problems through the concept of a *parser*. Parsers such as `parseAsInteger`, `parseAsBoolean`, and `parseAsJson` handle serialization, deserialization, and types together. The library supports most common environments, including both the App Router and Pages Router in Next.js, React Router v6/v7, TanStack Router, and Remix.


Does that mean we can put unlimited amounts of state into a URL? Separate from serialization and typing concerns, one final constraint remains. [RFC 7230](https://datatracker.ietf.org/doc/html/rfc7230) does not set an exact limit, but recommends that servers support at least 8,000 octets (an octet is the term used in networking and data communications to refer unambiguously to a group of eight bits, or one byte). Browser limits also vary. Modern browsers generally permit anything from 8 KB to tens of thousands of characters, but **search engines, social media Open Graph and sharing pipelines, and some gateways may truncate URLs at around 2 KB**. So do not treat the URL as boundless storage. Keep only the **essential, shareable filters** there, and leave the rest to sessionStorage or server-side storage.


## External State

React knows only about state within its own world. Our applications, however, constantly communicate with the world outside React. State that lives there can persist and change independently of React's lifecycle. Here, External State includes **Cookie, localStorage, sessionStorage, and IndexedDB**.

How should we choose among these storage mechanisms? I usually evaluate them along four dimensions: **lifetime, capacity, synchronicity, and security**.

For **authentication tokens**, the [OWASP recommendation](https://owasp.org/www-community/HttpOnly) is to prefer **HttpOnly + Secure cookies**. Because JavaScript can access localStorage, **an XSS compromise can expose the token directly**. Some security guides recommend a hybrid pattern: keep the **access token in memory and the refresh token in an HttpOnly cookie**. Use localStorage for persistent, non-sensitive data that changes infrequently, and sessionStorage for data that should disappear with the tab. IndexedDB is commonly used for offline caches, large datasets, and files.

Cookies and Web Storage (local/session) store **strings only**. Storing an object therefore requires `JSON.stringify`/`JSON.parse`. JSON, however, has limitations.

```ts
JSON.stringify({ when: new Date() });
// → { "when": "2026-05-19T..." } — Date becomes a string

JSON.stringify({ map: new Map([["a", 1]]) });
// → { "map": {} } — Map is lost entirely

JSON.stringify({ value: undefined });
// → "{}" — the undefined field is omitted
```

`Date` becomes a string during a JSON round trip, while `Map`, `Set`, and `undefined` can lose data. With the default behavior, `BigInt` makes `JSON.stringify` throw a `TypeError`, so serialization fails entirely. Whenever you put an object into external storage, remain conscious of **which types may be lost, transformed, or cause serialization to fail**, and introduce a serialization adapter when necessary.

The real difficulty of External State is that **React does not detect its changes automatically**. Writing a value to localStorage does not cause a React component to re-render. There are generally three patterns for solving this.

- **Wrap it in a custom hook (useLocalStorage) that synchronizes External State with React state.** This is lightweight, but a hand-rolled implementation must handle edge cases such as multiple tabs, SSR, and tearing.
- Use the `useSyncExternalStore` hook introduced in React 18 to **"synchronize with state outside React."** This **ensures that tearing does not occur during concurrent rendering.** It is the standard tool for connecting React to localStorage, browser APIs, and external stores.
- Use the first-class external storage integrations provided by state libraries, such as Zustand's `persist` middleware or Jotai's `atomWithStorage`.

Here is one more important principle: **the moment we bring External State into React, synchronization becomes our responsibility.** What happens when another tab updates it? What if the server changes a cookie? What if a user edits localStorage directly through the browser's developer tools? These scenarios often become some of the richest sources of bugs.


## State Guard

The final category is somewhat different. It is not state itself, but **logic that uses a combination of state to block, allow, or validate a particular flow**.

The most common example is an **Auth Guard**.

```tsx
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <Spinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}
```

Here, the `isAuthenticated` state controls the routing flow. That is guard logic. There are many kinds of guards: Auth Guards (authenticated or not), permission guards (specific roles or permissions), flow guards (entry-point branching), and validation guards (enabling a step), among others.

Guard logic tends to accumulate in one place. It is common for a single component to contain every condition: **"if the user is not signed in, go to the login page; if they lack permission, show a 403; if the cart is empty, go to the product page; if the user is suspended, show the suspension notice."** As a guard grows, it becomes harder to debug which condition blocked the flow and where.

A good guard **checks only one thing.** Combine guards through Composition.

```tsx
<AuthGuard>
  <RoleGuard role="admin">
    <FlowGuard require={["cartHasItems"]}>
      <CheckoutPage />
    </FlowGuard>
  </RoleGuard>
</AuthGuard>
```

Each guard makes only one decision, while the tree structure handles composition. Adding a new guard does not require changing any existing guard.

When designing guards, what happens next—**where the user is sent and how the flow continues**—deserves even more thought than the act of blocking access itself. A guard that blocks without a fallback ends in a blank screen or an infinite spinner.

One of the most common bugs occurs when **protected content briefly flashes before the guard's asynchronous check finishes**. Validating an authentication token and fetching permissions are usually asynchronous. During that interval, `isAuthenticated` may temporarily be `undefined` or `false`. **Unless the loading state is handled explicitly, protected content may be exposed during that gap, or the user may be redirected to the login page incorrectly.**

```tsx
// Ignores loading and handles only missing data => incorrect
if (!user) return <Navigate to="/login" />;

// Treat loading as a first-class state (early return) => correct
if (isLoading) return <Spinner />;
if (!user) return <Navigate to="/login" replace />;
return children;
```

Two models are commonly used when implementing permission guards.

- **RBAC(Role-Based Access Control)** : Grants permissions by role—for example, "an admin can view all user information." It is simple and fast, but the number of roles can explode as permissions become more granular
- **ABAC(Attribute-Based Access Control)** : Determines permissions from combinations of attributes—for example, "the user is the author of the post, belongs to the same team, or is an admin." It is highly expressive but more difficult to implement and debug

Patterns such as the [TanStack Router RBAC guide](https://tanstack.com/router/v1/docs/framework/react/how-to/setup-rbac), which places guards in `beforeLoad` at the router level, are recommended. The key is that **permission checks should be expressed as data—a list of roles and permissions—rather than scattered throughout the code**. That way, changing an authorization policy remains a *data change*.


## Conclusion

Let us sum up. State Management is difficult not because the libraries are difficult, but because **we often forget that state comes in different kinds** and overlook the fact that each kind requires different tools and a different way of thinking.

Keep Local State as close as possible; question whether Global State truly needs to be global; treat Server State as a cache; separate forms from the domain; use the URL more actively; understand the responsibility that comes with external storage; and compose small, focused guards. These are the fundamentals of working with the seven categories.

The judgment that ties them together can ultimately be reduced to four questions.

- Where is the Single Source of Truth for this data?
- Is this a value that can be derived, or does it truly need to be stored?
- Are any combinations of this state impossible?
- Does this state really belong in this location?

I believe the surest way to develop sound judgment and intuition is to ask these questions whenever we build a new screen, review a PR, or receive code generated by AI.

As I said at the beginning, AI will remain beside us for a long time. We will spend less and less time inspecting every line. Yet that will only make the ability to answer small questions such as **"Where should this state live?"** more valuable. Asking AI to "add another useState here" is easy. Knowing what new strand that single line adds to the web of our application depends entirely on the judgment of the person reading the code.

There is no single right answer. But there is a clear difference between **"creating state without understanding what state is"** and **"creating state with deliberate awareness of its category and location."** Before readers write their next line of `useState`, I hope they will pause for a moment and ask, "Which category of state is this?"


### References

:::ref
- [docs] [React, Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure)
- [docs] [React, You Probably Don't Need Derived State](https://legacy.reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html)
- [docs] [XState](https://xstate.js.org/)
- [article] [Top 5 React State Management Tools in 2026](https://www.syncfusion.com/blogs/post/react-state-management-libraries)
:::
