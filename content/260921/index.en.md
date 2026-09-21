---
emoji: 🪟
title: 'overlay-kit'
seoTitle: 'overlay-kit: Declarative React Modals and openAsync'
date: '2026-09-21'
categories: ignore frontend React library
description: "Swapping a global isOpen flag for one await: what I gained, what I lost, and how overlay-kit's events, reducer, and openAsync core really work."
keywords: 'overlay-kit, React modal state management, declarative interface, openAsync, useOverlay, promise based modal, React overlay, nice-modal-react'
locale: en
translationOf: '260921'
sourceHash: aee64a559fb8a6b52010dd747b1aae985c694053425332601b135523a67ada12
---

In this post, I want to talk about interfaces that treat overlays declaratively.

I like declarative code. When it comes to opening an overlay, closing it, and doing asynchronous work inside it, I think the overlay itself should manage that sequence. When the calling side holds `isOpen` and flips it on and off, the code that handles the state ends up in a different place from the component that renders it.

The modals on the screens I owned at work were exactly the opposite. Whether a modal was open lived in a global store, the call site opened it, and the call site closed it. The call site was also writing the code that closed the modal and the callbacks that received its result. So I spent a long time working out how to move this in a declarative direction, and in the end I rewrote it.

While doing that work I looked at [overlay-kit](https://github.com/toss/overlay-kit). It was close to the interface I was aiming for. This post is a record of overlay-kit's declarative interface and of how I designed our internal modal system.

## The modal I was holding in state

In my post on [state management](/260518), I used a modal's open flag as the simplest example of local state. I wrote that it is state used inside a single component, state that the outside has no need and no right to know about. I still think that is true. But once you have dozens of modal types, they stack on top of one another, and they have to return a value to the call site, that state does not stay inside the component.

The code I inherited kept the list of open modals in a global store. Since it is company code, the example below keeps the structure and changes the identifiers.

```tsx
const [openPopup, closePopup] = useModalStore(
  useShallow((state) => [state.openPopup, state.closePopup]),
);

const handleAddNote = useCallback(() => {
  openPopup(PopupType.ADD_NOTE, {
    itemId,
    onClose: () => closePopup(PopupType.ADD_NOTE),
    onSubmit: (note) => {
      closePopup(PopupType.ADD_NOTE);
      saveNote(note);
    },
  });
}, [closePopup, openPopup, itemId]);
```

Three things about this code bothered me.

**First, the opening function has to come out of a hook.** `openPopup` and `closePopup` are values you select from the store, so you can only obtain them inside a component. That means the code that opens a modal cannot leave the component. To open a modal somewhere you cannot use hooks, such as an API response interceptor or a router guard, you have to pass that function down as an argument.

**Second, the result comes back through callbacks.** Whether the note was saved or the user simply closed the dialog arrives through two separate branches, `onSubmit` and `onClose`. Anything you want to do after opening the modal goes inside a callback. If you have to open two modals in a row, you get a callback inside a callback.

**Third, closing is the call site's responsibility.** The call site is the one that calls `closePopup(PopupType.ADD_NOTE)`. The modal does not close itself; the side that opened it remembers which kind of modal it was and closes it. That is why the same constant appears three times in one function.

What the three have in common is that opening a single modal requires the call site to write three kinds of code: the code that opens it, the callback that receives the result, and the code that closes it.

If deciding what to show is the call site's job, then here the call site was carrying everything after that as well. In particular, `closePopup(PopupType.ADD_NOTE)` names its target with a string constant. Writing another modal's constant still passes type checking because it belongs to the same enum, and the wrong modal closes.

## An interface that waits for a result

So which of those three can be removed? The answer I arrived at was to make opening a modal a function call, and to have that function return a Promise carrying the result.

```tsx
const result = await openModalAsync('ADD_NOTE', { itemId });
if (result.reason !== 'confirmed') return;

await saveNote(result.value);
```

Three things changed. The opening function became a module function rather than a hook, so it can be called outside a component. The result became a return value rather than a callback argument, so the follow-up work stayed inside the flow of the calling function. And closing became the modal component's own job.

Because the return type is `Promise<ModalResult<V>>`, the end of a modal collapsed into a single value.

A Promise settles only once. Resolving an already settled Promise does nothing, so every reason a modal can end has to fit into that one value. That is why I split `reason` into five cases: the user confirmed, the user explicitly cancelled, it closed without a value, it was replaced by a new modal of the same kind, or it was force-closed by a full teardown. With a single boolean, "cancelled" and "the whole screen was torn down" become the same value, and flows that need cleanup have to tell those two apart.

In the other direction, if you never settle it, the call site waits forever. Nothing happens when a callback is not called, but an `await` simply never returns. So every time a new path for removing a modal from the screen appeared, I had to check whether that path also settled the Promise. Replacement and force-close each got a `reason` of their own for that reason.

## overlay-kit's call site

The call site in toss's overlay-kit looks like this.

```tsx
const confirmed = await overlay.openAsync<boolean>(({ isOpen, close }) => (
  <ConfirmDialog
    open={isOpen}
    onConfirm={() => close(true)}
    onCancel={() => close(false)}
  />
));
```

Three points struck me as a good interface.

**What opens is visible at the call site.** My version passes a string key, `'ADD_NOTE'`. Which component that key refers to is known to a registry file: a file containing one object that pairs each string key with the `import()` function that loads that modal.

```tsx
export const modalImporters = {
  ADD_NOTE: () => import('.../add-note-modal'),
  CONFIRM: () => import('.../confirm-modal'),
  // 모달 종류만큼 이어진다
} as const;
```

overlay-kit writes the JSX right there. Anyone reading the code knows what will appear without navigating to that file.

**The result type is decided at the call site.** The type argument of `openAsync<boolean>` is both the argument type of `close` and the result type of the `await`. You do not have to declare a result type per modal and register it in a table.

**Closing and removing are separate.** The controller receives four props: `overlayId`, `isOpen`, `close`, and `unmount`. `close` sets `isOpen` to `false` and leaves the component in place. `unmount` is what actually removes it. [The official guide to opening and closing overlays](https://overlay-kit.slash.page/ko/docs/guides/introduction) explains it this way.

> The reason for this difference is that when you use `close`, the overlay is kept in memory so that its closing animation can play.

My version has no such distinction. Closing removes it from the list immediately. That means I was leaving closing animations to the component library, and that I was only dealing with screens where that was possible.

## From overlay.open to render

Once you like an interface, the next question is what is inside it. For a single module function to render a component inside the React tree, something has to bridge the two.

### Events and the reducer

`overlay.open` does not change state. It emits one event.

```ts
// packages/src/event.ts
const open = (controller: OverlayControllerComponent, options?: OpenOverlayOptions) => {
  const overlayId = options?.overlayId ?? randomId();
  const componentKey = randomId();
  const dispatchOpenEvent = createEvent('open');

  dispatchOpenEvent({ controller, overlayId, componentKey });
  return overlayId;
};
```

The receiving side is `OverlayProvider`. The provider holds a `useReducer`, subscribes to the event, and feeds `ADD` into the reducer. The thing to watch here is that `isOpen` goes in as `false`.

```tsx
// packages/src/context/provider/index.tsx
const [overlayState, overlayDispatch] = useReducer(overlayReducer, {
  current: null,
  overlayOrderList: [],
  overlayData: {},
});

const open: OverlayEvent['open'] = useCallback(({ controller, overlayId, componentKey }) => {
  overlayDispatch({
    type: 'ADD',
    overlay: { id: overlayId, componentKey, isOpen: false, isMounted: false, controller },
  });
}, []);
```

Then, on the frame after the controller mounts, it dispatches `OPEN` to turn `isOpen` into `true`.

```tsx
// packages/src/context/provider/content-overlay-controller.tsx
useEffect(() => {
  requestAnimationFrame(() => {
    overlayDispatch({ type: 'OPEN', overlayId });
  });
}, [overlayDispatch, overlayId]);
```

One part here was not what I expected.

**The state does not live outside React.** Because the API opens overlays through a module function, I assumed the store would sit at module level too, but it is actually a `useReducer` inside the provider. The only thing outside React is the event bus, and that holds no state. Overlays render as siblings next to the provider's `children`. It does not use `createPortal`, and it does not import `react-dom`.

One more thing stands out. From the call site it is one line, `overlay.open()`, but inside it is a fixed procedure: emit an event, feed `ADD` into the reducer, wait a frame, and feed `OPEN` in again. A declarative interface does not remove imperative code; it moves it to the other side of a boundary.

### The opening side and the closing side

The `requestAnimationFrame` above and the split between `close` and `unmount` from the previous section look unrelated at first. In fact they are two devices blocking the two ends of the same constraint.

That constraint is that a CSS transition only runs when **both the start state and the end state are actually rendered**. [MDN's CSS transitions guide](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_transitions/Using_CSS_transitions) warns about elements just added to the DOM.

> This is treated as if the initial state had never occurred and the element was always in its final state.

The failure shows up in two shapes. On opening, there is no start state, so nothing runs. On closing, the element disappears before the end state is painted, so nothing runs.

| | Opening | Closing |
|---|---|---|
| Problem | There is no start state | It disappears before the end state is painted |
| Solution | Mount it closed first, then open it on the next frame | Keep it mounted, flip only `isOpen`, remove it later |
| Mechanism | `ADD(isOpen: false)`, rAF, `OPEN` | `CLOSE`, animation, `REMOVE` |
| Who knows the timing | The library | The user |

The last row explains why the closing side is left to the user. On the opening side, the library knows the constant: one frame is enough. On the closing side, the library cannot know whether the animation is 200 or 400 milliseconds.

**So one side is automatic and the other is handed over as a function called `unmount`.**

The reducer is what makes the closing side work. `CLOSE` only flips, inside `overlayData`, the `isOpen` value, and leaves `overlayOrderList` alone. The provider renders by walking that list, so the component stays alive as long as it remains in the list. It only unmounts once `REMOVE` takes it out.

**That said, rAF is not always necessary.** react-transition-group [does not run the enter transition on first mount by default](https://reactcommunity.org/react-transition-group/transition). It skips it even when `in` is already `true`, and you have to turn on `appear`. overlay-kit's rAF changes `isOpen` from `false` to `true` after mount, which covers that case.

### Twenty lines wrapped in a Promise

`openAsync` is not a separate implementation. It is a thin layer around `open`.

```ts
// packages/src/event.ts
const openAsync = async <T>(controller: OverlayAsyncControllerComponent<T>, options?: OpenOverlayOptions) => {
  return new Promise<T>((_resolve, _reject) => {
    open((overlayProps, ...deprecatedLegacyContext) => {
      const close = (param: T) => {
        _resolve(param);
        overlayProps.close();
      };
      const reject = (reason?: unknown) => {
        _reject(reason);
        overlayProps.close();
      };
      const props: OverlayAsyncControllerProps<T> = { ...overlayProps, close, reject };
      return controller(props, ...deprecatedLegacyContext);
    }, options);
  });
};
```

All it does is swap the `close` that goes to the controller. The original `close` takes no arguments; this one takes an argument, resolves the Promise with it, and then calls the original `close`. This is also why the result type is decided at the call site. `T` is both the argument type of `close` and the type of the Promise.

There is one hole in this structure, though. Resolution only happens when `close` is called. So if you remove an overlay with `unmount` alone, the Promise stays pending forever. It is filed as [issue #169](https://github.com/toss/overlay-kit/issues/169), and I think it needs fixing, but the issue is still open.

The fact that resolution happens at `close` carries another implication. It is the moment the closing starts, not the moment the closing animation ends. That is fine for a flow that takes a confirmation and then calls an API, but in a flow that takes a confirmation and then opens the next modal, the second modal rises while the first is still disappearing.

### Where the design came full circle

I followed the commit history to explore how the design got here, and found that the structure was not like this from the start. 1.0 used the same event and reducer combination as today. 1.2.0 moved the state into a module-level external store read through `useSyncExternalStore`, and then 1.8.0 moved it back to a reducer.

The reason for reverting is written in [issue #148](https://github.com/toss/overlay-kit/issues/148).

> `useSyncExternalStore` resolves tearing issues, but it doesn't work well with suspense.

When fetching data inside an overlay caused it to suspend, React warned that a component had suspended while responding to synchronous input. The original goal of moving to an external store was to let overlay state be read without a hook, and the PR at the time says outright that the goal was not achieved the intended way. In the end the goal was solved with a hook, and only the storage mechanism returned to where it started.

What I took from this record is not a conclusion but a criterion. Putting state outside React frees up where you can call things, at the cost of opening room to fall out of step with React's scheduling. overlay-kit put only the call site outside and kept the state inside.

## Reopening with the same id

Something caught my eye while reading the reducer. At the very top of `ADD` there is this branch.

```ts
// packages/src/context/reducer.ts
case 'ADD': {
  if (state.overlayData[action.overlay.id] != null && state.overlayData[action.overlay.id].isOpen === false) {
    const overlay = state.overlayData[action.overlay.id];
    if (overlay == null || overlay.isOpen) {
      return state;
    }
    return {
      ...state,
      current: action.overlay.id,
      overlayData: { ...state.overlayData, [action.overlay.id]: { ...overlay, isOpen: true } },
    };
  }
  // ...
```

If you open an overlay with an explicit `overlayId`, `close` it, and then open it again with the same id, you land in this branch. But the return value reuses the **existing `overlay` object**.

Nothing ever uses the incoming `action.overlay` and its `controller`.

Reading alone did not convince me, so I cloned the library's repository and attached a test myself. I prepared two components that render different content and opened them in order under the same id.

```tsx
const ControllerA = ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="b">AAA</div> : null);
const ControllerB = ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="b">BBB</div> : null);

overlay.open(ControllerA, { overlayId: 'id-close' });
overlay.close('id-close');
overlay.open(ControllerB, { overlayId: 'id-close' });
```

The results were as follows, run with vitest on the main branch at overlay-kit 1.9.0.

| Procedure | What rendered |
|---|---|
| Open A, `close`, reopen with B | `AAA`. B is discarded |
| Open A, `unmount`, reopen with B | `BBB`. Replaced correctly |
| Increment a counter to 1, `close`, reopen | `1`. Component state is preserved |

The third row is behavior the docs describe as a feature, so it was as expected. The problem is the first row.

**If you only call `close` and then reopen with the same id, the new JSX carrying the changed content is ignored and the previous screen appears as it was.**

I checked one more thing here. Further down in the same reducer there is this comment.

```ts
/**
 * @description Brings the overlay to the front when reopened after closing without unmounting.
 */
overlayOrderList: [...state.overlayOrderList.filter((item) => item !== action.overlay.id), action.overlay.id],
```

It says that reopening after closing brings the overlay to the front. But because the earlier branch hits `return` first, this line does not run in that situation. I stacked two overlays, ran `close` on the one underneath, reopened it, and the DOM order did not change.

**What the comment describes and what actually happens are different.**

I did not confirm whether this shows up as a visible problem on screen, though. The test only looked at DOM order, and since most dialog libraries use their own z-index or portals, DOM order is not the same as visual order.

My version exposes the same situation as an option. When the same kind of modal is opened again, the call site chooses whether to keep the existing one or replace it with new props. Choosing replacement settles the existing Promise as `replaced`. This is one of the reasons I split the result type into five branches earlier.

**This is where the two designs diverge.** My approach treats modals as data. Because the string key and the props live in a store, they can be replaced or updated later. overlay-kit treats modals as functions. The controller is a closure, so once it is stored there is no way to change its contents from outside.

## The price of JSX at the call site

So is writing JSX at the call site always better than using a string key? I do not think so. There are three prices to pay.

**Code splitting drops out of the default.** Writing JSX at the call site means the call site imports that component. If the modal is a heavy editor screen and only a few users press that button, its weight goes into the bundle of the list screen.

`React.lazy` does work inside a controller. I measured it the same way as the earlier test: the module was not loaded before `open`, and when opened, the `Suspense` fallback appeared first and then the body rendered.

```tsx
const Heavy = React.lazy(() => import('./HeavyModal'));

overlay.open(({ isOpen, close }) => isOpen ? (
  <Suspense fallback={<Spinner />}><Heavy onClose={close} /></Suspense>
) : null);
```

So the difference is not whether it is possible but what the default is.

In my version every value in the registry file is an `import()` function, so code splitting is structurally enforced. With overlay-kit you have to write it by hand at each call site.

**The user has to decide where to call `unmount`.** If you only call `close` and stop there, the overlay's information stays in memory. The official docs warn about this and give separate guidance for where to hook `unmount` in each design system. MUI and Mantine have a callback for when the transition ends, so you can hook it there, but for libraries without such a callback the docs tell you to set a timer matching the animation length. The fact that the guidance is split per library is itself the cost of this decision.

**Overlays render where the provider is.** Because it does not use portals, the same code runs on React Native, which is an advantage. Conversely, context provided below `OverlayProvider` is not visible inside an overlay. When opening a modal that relies on a router or form context, check this point first.

## How far the word declarative reaches

Having written this far, one thing nags at me. I started this post calling this interface declarative, yet `overlay.openAsync(...)` is a function call by any measure.

Let us start from the definition. [The React documentation](https://react.dev/learn/reacting-to-input-with-state) draws the line this way.

> In React, you don't directly manipulate the UI--meaning you don't enable, disable, show, or hide components directly. Instead, you **declare what you want to show,** and React figures out how to update the UI.

The analogy in the same document is sharper. Imperative is calling out every turn to the person driving the car; declarative is getting into a taxi and naming your destination.

**A declarative interface does not remove the imperative procedure. It moves it to the other side of a boundary and gives that boundary a name.** The inside of overlay-kit we saw earlier is exactly that. The call site is one line, while inside, a procedure emits an event and dispatches twice.

So let us look at where each project applies the word. overlay-kit's docs call the previous approach imperative. What they point to is code that holds the open flag with `useState` and flips it in an event handler. What they call declarative is the side that treats an overlay as an action rather than as state. The toss tech blog's [article on declarative code](https://toss.tech/article/frontend-declarative-code) defines the word more broadly: declarative code is code at a higher level of abstraction, and a hook that abstracts the act of showing an overlay is one example.

So I decided to narrow the word this way. **The call site does not write the closing code.** When to close, and what remains on screen while it closes, are decided by the overlay; the call site writes only what to show and what it expects to receive back.

By this criterion, code written with `useState` that holds `isOpen`, and code that keeps a list of open modals in a global store while the call site closes them, are on the same side. Only the storage location differs; in both, the call site writes the closing statement.

## Closing thoughts

What I fixed in our company's code was not, in the end, where the state was stored. It was who writes the closing code.

Even when we used a global store, the state was already outside the component, but the statements that opened and closed it were still at the call site. Only after switching to a single `await` did those statements move inside the modal.

overlay-kit reached the same place and then went one step further: it also puts what to show at the call site. I think that interface reads well. And while writing this, I learned what that one step costs.

**It was the difference between treating a modal as a function and treating it as data.** Writing JSX at the call site makes the controller a closure, and a closure's contents cannot be changed from outside once it is stored. That structure is where the ignored JSX on reopening with the same id comes from. Treating it with a string key makes the modal a value in a store that you can replace, update, and code split, but the call site only ever learns a name.

I think the feeling that you like a library's interface is a fairly reliable signal. Still, you should put into words at least once what exactly that feeling points at. Without doing that, you cannot tell whether what you liked was the interface or the reputation of the people using the library. I would encourage readers to do that exercise once for a library they are using right now.

:::ref
[docs] [overlay-kit official documentation](https://overlay-kit.slash.page/)
[repo] [desko27/react-call](https://github.com/desko27/react-call)
:::
