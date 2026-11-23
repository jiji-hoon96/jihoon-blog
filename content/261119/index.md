---
emoji: '🛠️'
title: 'Chrome DevTools 시리즈 목차'
seoTitle: 'Chrome DevTools 시리즈 목차와 32편의 질문'
date: '2026-11-19'
categories: 프론트엔드 DevTools
description: 'Chrome DevTools 시리즈에서 Network, Elements, Sources 등 패널을 독자가 여는 질문으로 나누어 살펴본다. 32편의 목차와 읽는 순서, 공개 화면의 관찰 범위와 측정 방식, 로컬 코드로 재현하는 항목을 소개한다.'
keywords: 'Chrome DevTools, DevTools 시리즈, Network 패널, Elements 패널, Performance 패널, 브라우저 개발자 도구, 프론트엔드'
---

Network 패널을 열어 화면 성능을 살피는 독자는 이 시리즈에서 DevTools 의 다른 패널과 세부 기능을 질문별로 찾아볼 수 있다. 글마다 질문 하나를 정하고, 답을 찾는 데 쓰는 기능을 다룬다.

필자는 회사에서 화면 성능을 다룰 때 Network 패널을 매일 연다. 브라우저 개발자 도구를 쓰다 보면 늘 쓰던 기능만 쓰게 된다. 그래서 Elements, Sources, Console, Network, Performance, Memory, Application, Security, Lighthouse, Recorder 를 하나씩 깊게 다루는 시리즈를 쓴다. 공식 문서와 전문 자료를 바탕으로 설명하고, 실제 브라우저 화면 캡처도 넣는다.

## 질문으로 나눈 32편

이 시리즈의 목차는 탭 이름이 아니라 독자가 탭을 여는 질문으로 나뉜다. 기능을 나열한 글은 마지막 절이 앞 절들을 결정 하나로 묶지 못해 기능 카탈로그가 된다. 글마다 질문 하나를 정하고, 그 질문에 답하는 데 쓰는 기능만 모았다. 한 탭에서 다루지 못한 기능은 같은 탭의 다음 글에서 다른 질문으로 다룬다.

각 글은 앞 글을 읽지 않아도 읽을 수 있다. 패널 하나가 질문 하나로 끝나지 않으면 하위 시리즈로 나눈다. 공식 문서와 실제 Chrome 화면을 대조해 패널 안의 요소를 모두 적고, 각 요소를 다룰 글을 정했다. 목차는 32편이다.

### Network

- **첫 화면은 무엇을 얼마나 받는가**: 요청 목록, 필터, 열, Size, Initiator. [Network 패널로 따라간 42 MB](/261120)
- **요청 하나의 시간은 어디에 쓰이는가**: Waterfall, Timing 단계, Priority, Protocol, Connection ID
- **요청과 응답 안에는 무엇이 오가는가**: 상세 탭, 쿠키, preflight, WebSocket, EventStream
- **조건을 바꿔 원인을 좁히는 법**: throttling, Request conditions, Overrides, Copy as, HAR

### Elements

- **화면의 이 요소는 DOM 어디에 있는가**: 트리, 배지, 검색, 편집, Break on
- **이 스타일은 어디서 왔는가**: Styles, Computed, cascade layer, 편집기들
- **레이아웃과 접근성은 무엇으로 확인하는가**: Layout, Accessibility, Properties, Event Listeners

### Console

- **콘솔 메시지를 어떻게 걸러 읽는가**: 레벨, 필터, 설정, 스택 트레이스
- **콘솔에서 페이지를 어떻게 조사하는가**: Utilities, Live expressions, 객체 보기

### Sources

- **압축된 번들을 어떻게 읽는가**: 파일 트리, pretty print, 소스맵, ignore list
- **언제 멈출지 어떻게 정하는가**: 브레이크포인트 11종
- **멈춘 뒤 무엇을 보는가**: Scope, Watch, Call Stack, 실행 제어, Threads
- **DevTools 에서 고친 코드를 어떻게 남기는가**: Snippets, Workspace, Overrides, Changes

### Performance

- **기록 전에 무엇을 보는가**: Local metrics, Field metrics, Environment settings
- **녹화 결과의 트랙을 어떻게 읽는가**: 개요, Main flame chart, Network, Frames, Interactions, Layout shifts
- **느린 원인을 어떻게 좁히는가**: Summary, Bottom-up, Call tree, Event log, Insights
- **더 깊이 재는 법**: Capture settings, Layers, Selector stats, Annotations, 확장 API

### Memory

- **무엇이 메모리를 잡고 있는가**: heap snapshot 보기 4종, retainers
- **메모리가 언제 늘어나는가**: Allocations on timeline, sampling, Detached elements, Performance monitor

### Application

- **토스는 브라우저에 무엇을 저장하는가**: 쿠키, storage, IndexedDB, Cache storage, Storage buckets
- **페이지가 닫혀도 도는 것**: Service worker, Manifest, Background services
- **뒤로 가기와 다음 페이지를 빠르게 하는 장치**: bfcache, Speculative loads, Frames

### Security, Issues

- **브라우저가 보내는 경고를 어디서 읽는가**: Security, Issues

### Lighthouse

- **점수 말고 무엇을 읽는가**: 모드 3개, throttling 방식, 결과

### Recorder

- **사용자 흐름을 녹화해 테스트로 바꾸기**: Recorder

### Coverage

- **받은 코드 중 실제로 실행된 것은 얼마인가**: Coverage

### Rendering

- **화면이 다시 그려지는 곳을 눈으로 보기, 미디어 쿼리 흉내**: Rendering

### Layers, Animations

- **합성 레이어와 애니메이션**: Layers, Animations

### Performance monitor

- **실시간 지표로 오래 켜 둔 화면 보기**: Performance monitor

### Device mode, Sensors

- **모바일 환경 흉내와 그 한계**: Device mode, Sensors

### 에이전트, AI

- **DevTools 를 AI 에이전트에 열어 주기**: DevTools for agents, AI assistance

### 빨리 다루기

- **DevTools 를 어떻게 빨리 다루는가**: Command menu, Search, Quick source, 단축키, Settings

## 다루지 않는 것

- Media, WebAudio, WebAuthn, Autofill 패널과 미리보기 단계인 CSS overview 는 다루지 않는다
- Memory inspector 는 Memory 글에서, Developer resources 는 Sources 첫 글에서 한 문단으로 다룬다

이 시리즈가 끝나면 네이티브 개발을 위한 모바일 편을 따로 쓴다.

## 관찰 범위와 실측 방식

관찰 대상은 토스뱅크와 토스증권의 공개 화면이다. 로그인하지 않고 새 프로필로 열어 살펴보며, 로그인 화면과 계정 데이터는 캡처하지 않는다. 서비스가 왜 그렇게 만들었는지는 필자가 알 수 없으므로 판단하지 않는다. 패널이 보여 주는 숫자와 그 숫자가 생기는 원리를 다룬다.

실제 서비스 화면은 배포에 따라, 같은 날에도 바뀐다. 그래서 모든 수치에 측정 날짜와 Chrome 버전을 붙이고, 한 글에 쓰는 수치와 캡처는 한 번에 연달아 잰 것만 쓴다. 브레이크포인트와 heap snapshot 을 다루는 글은 독자가 따라 할 수 있도록 로컬 코드로 쓴다. 서비스 번들은 압축돼 있어 이 줄에서 멈추면 이 값이 보인다는 과정을 독자가 따라 할 수 없기 때문이다. 필요한 글에서는 같은 구조를 재현한 작은 데모도 만들어 함께 잰다.

## 읽는 순서

Network 네 편을 먼저 쓴다. Network 를 읽을 줄 알면 Performance 의 Network 트랙과 Application 을 살펴보기 쉽다. 그다음에는 Elements, Console, Sources 첫 글, Performance 순서로 쓴다. 로컬 코드가 필요한 Sources 의 나머지 세 편과 Memory 두 편은 그 뒤에 쓴다. 나머지 패널의 순서는 정하지 않았다.

글이 나올 때마다 이 목차에 링크를 더한다. 각 글에서 다루는 패널과 기능을 확인하고 싶은 독자는 위 항목을 따라가면 된다.

:::ref
- [docs] [Chrome for Developers, Chrome DevTools](https://developer.chrome.com/docs/devtools)
:::