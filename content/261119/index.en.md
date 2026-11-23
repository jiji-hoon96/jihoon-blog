---
emoji: '🛠️'
title: 'Chrome DevTools Series Table of Contents'
seoTitle: 'Chrome DevTools Series: 32 Articles and Questions'
date: '2026-11-19'
categories: frontend DevTools
description: 'Explore Chrome DevTools panels through reader questions, from Network and Elements to Sources. See the 32-article index, reading order, scope, and methods.'
keywords: 'Chrome DevTools series, Chrome DevTools tutorials, Network panel, Elements panel, Performance panel, browser developer tools, frontend debugging'
locale: en
translationOf: '261119'
sourceHash: 702bba9ed249e486a86c7ef8f342eb15e8e15bf31740c2ac62f44abae34eb97d
---

Readers who open the Network panel to examine page performance can use this series to find other DevTools panels and features by question. Each article focuses on one question and covers the features used to answer it.

I open the Network panel every day when working on page performance at my company. When using browser developer tools, it is easy to keep using only the features you already know. So I’m writing a series that takes an in-depth look at Elements, Sources, Console, Network, Performance, Memory, Application, Security, Lighthouse, and Recorder, one by one. I explain them based on official documentation and specialist resources, and include screenshots from an actual browser.

## 32 Articles Organized Around Questions

The index for this series is organized around the questions readers ask when they open a tab, rather than tab names. An article that lists features becomes a catalog because its final section cannot tie the earlier sections together with a single decision. Each article focuses on one question and brings together only the features needed to answer it. Features that do not fit in one article for a tab are covered in the next article for that tab, through a different question.

You can read each article without reading the one before it. If a panel’s questions cannot be covered in one article, I split them into a subseries. I compared the official documentation with actual Chrome screens, listed every element in each panel, and decided which article would cover each one. The index has 32 articles.

### Network

- **What does the first screen receive, and how much?**: Request list, filters, columns, Size, Initiator. [Following 42 MB through the Network panel](/261120)
- **Where does the time for a request go?**: Waterfall, Timing phases, Priority, Protocol, Connection ID
- **What goes back and forth in a request and response?**: Detail tabs, cookies, preflight, WebSocket, EventStream
- **How can you narrow down the cause by changing conditions?**: throttling, Request conditions, Overrides, Copy as, HAR

### Elements

- **Where in the DOM is this element on the screen?**: Tree, badges, search, editing, Break on
- **Where did this style come from?**: Styles, Computed, cascade layer, editors
- **How can you inspect layout and accessibility?**: Layout, Accessibility, Properties, Event Listeners

### Console

- **How do you filter and read console messages?**: Levels, filters, settings, stack traces
- **How do you investigate a page in the console?**: Utilities, Live expressions, viewing objects

### Sources

- **How do you read a minified bundle?**: File tree, pretty print, source maps, ignore list
- **How do you decide when to pause?**: 11 types of breakpoints
- **What do you look at after pausing?**: Scope, Watch, Call Stack, execution controls, Threads
- **How do you keep code edited in DevTools?**: Snippets, Workspace, Overrides, Changes

### Performance

- **What should you look at before recording?**: Local metrics, Field metrics, Environment settings
- **How do you read the tracks in a recording?**: Overview, Main flame chart, Network, Frames, Interactions, Layout shifts
- **How do you narrow down the cause of a slowdown?**: Summary, Bottom-up, Call tree, Event log, Insights
- **How do you measure in greater depth?**: Capture settings, Layers, Selector stats, Annotations, extension API

### Memory

- **What is holding on to memory?**: Four heap snapshot views, retainers
- **When does memory grow?**: Allocations on timeline, sampling, Detached elements, Performance monitor

### Application

- **What does Toss store in the browser?**: cookies, storage, IndexedDB, Cache storage, Storage buckets
- **What keeps running after the page closes?**: Service worker, Manifest, Background services
- **What makes going back and loading the next page faster?**: bfcache, Speculative loads, Frames

### Security, Issues

- **Where can you read the warnings the browser sends?**: Security, Issues

### Lighthouse

- **What can you learn beyond the score?**: Three modes, throttling methods, results

### Recorder

- **Turn user flows into recorded tests**: Recorder

### Coverage

- **How much of the code received was actually executed?**: Coverage

### Rendering

- **See where the screen is repainted, and simulate media queries**: Rendering

### Layers, Animations

- **Compositing layers and animations**: Layers, Animations

### Performance monitor

- **Inspect a long-running page with real-time metrics**: Performance monitor

### Device mode, Sensors

- **Simulating a mobile environment and its limits**: Device mode, Sensors

### Agents, AI

- **Opening DevTools to AI agents**: DevTools for agents, AI assistance

### Working faster

- **How do you use DevTools faster?**: Command menu, Search, Quick source, keyboard shortcuts, Settings

## What I Don’t Cover

- I do not cover the Media, WebAudio, WebAuthn, or Autofill panels, or CSS overview, which is still in preview.
- I cover Memory inspector in the Memory article, and Developer resources in one paragraph in the first Sources article.

After this series, I’ll write a separate mobile article for native development.

## Observation Scope and Measurement Methods

The observations focus on public screens from Toss Bank and Toss Securities. I inspect them in a fresh profile without logging in, and do not capture login screens or account data. I cannot know why the services made those choices, so I do not judge them. I cover the numbers shown by the panels and how those numbers arise.

Actual service screens can change with deployments, even on the same day. So I include the measurement date and Chrome version with every figure, and use only figures and screenshots measured consecutively in one session for each article. Articles about breakpoints and heap snapshots use local code so readers can follow along. Service bundles are minified, so readers cannot reproduce the process of pausing on a line and seeing a particular value. For articles where it is useful, I also build and measure a small demo that reproduces the same structure.

## Reading Order

I’ll write the four Network articles first. Once you know how to read Network, it is easier to examine the Network track in Performance and the Application panel. After that, I’ll write Elements, Console, the first Sources article, and then Performance. The remaining three Sources articles, which require local code, and the two Memory articles will come next. I have not set an order for the remaining panels.

I’ll add links to this index as each article comes out. Readers who want to check which panels and features each article covers can follow the items above.

:::ref
- [docs] [Chrome for Developers, Chrome DevTools](https://developer.chrome.com/docs/devtools)
:::