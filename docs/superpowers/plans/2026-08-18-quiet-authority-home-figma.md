# Quiet Authority Homepage Figma Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reviewable light-theme Figma direction containing foundations, reusable editorial components, and one polished 1440px homepage.

**Architecture:** The Figma document is split into three pages: `01 Foundations`, `02 Components`, and `03 Homepage`. Local styles hold shared color and typography decisions, component masters hold repeated editorial patterns, and the homepage composes those patterns into a single lead-story-plus-stream layout.

**Tech Stack:** Figma Desktop, ClaudeTalkToFigma MCP, Wanted Sans Variable, IBM Plex Mono

**Spec:** `docs/superpowers/specs/2026-08-18-quiet-authority-home-design.md`

## Global Constraints

- Do not modify blog code.
- Produce a light-theme desktop direction only in this phase.
- Use a 1440px homepage artboard, a centered 1200px site shell, a 960px editorial stream, and a 740px future article measure.
- Do not use rounded editorial cards, emoji headings, gradients, decorative illustrations, or separate pinned/popular/recent modules.
- Use realistic Korean blog content and let typography, rules, and whitespace establish hierarchy.

---

### Task 1: Foundations Page

**Figma deliverables:**
- Create: page `01 Foundations`
- Create: frame `Foundations / Light`
- Create: local paint styles under `Color/*`
- Create: local text styles under `Type/*`

**Interfaces:**
- Consumes: approved tokens and measurements from the design spec
- Produces: named paint and text styles plus a visual reference board used by Tasks 2 and 3

- [ ] **Step 1: Create the page and 1440px foundations frame**

Call `create_page` with `{"name":"01 Foundations"}`, then call `create_frame` on the returned page ID with a 1440×1400 Warm White canvas named `Foundations / Light`.

- [ ] **Step 2: Create seven local paint styles**

Create `Color/Warm White`, `Color/Near Black`, `Color/Stone Gray`, `Color/Mineral`, `Color/Kelp Olive`, `Color/Tide Blue`, and `Color/Persimmon` using the exact hex values in the spec.

- [ ] **Step 3: Create the core type styles**

Create these Wanted Sans Variable styles: `Type/Display` 48/58 Semibold, `Type/Heading 1` 36/46 Semibold, `Type/Heading 2` 24/34 Semibold, `Type/Body Large` 18/30 Regular, `Type/Body` 16/27 Regular, and `Type/Navigation` 14/20 Medium. Create IBM Plex Mono styles `Type/Meta` 12/18 Regular and `Type/Meta Emphasis` 12/18 Medium.

- [ ] **Step 4: Lay out the visual reference board**

Place a title, design principle, seven labeled 160×120 color swatches, typography specimens, spacing samples for 8/16/24/32/48/64/96, and measurements for 1200/960/740 widths. Keep all labels descriptive and avoid decorative copy.

- [ ] **Step 5: Verify foundation structure**

Run `get_node_info` on `Foundations / Light` with depth 3. Confirm all token sections exist, the exact color values are represented, and no item uses a gradient, shadow, or radius above 4px.

### Task 2: Editorial Components Page

**Figma deliverables:**
- Create: page `02 Components`
- Create: frame `Components / Light`
- Create: component masters `Navigation/Header`, `Editorial/Meta`, `Editorial/Lead Story`, `Editorial/Article Row`, and `Navigation/Footer`

**Interfaces:**
- Consumes: color/type styles and measurements from Task 1
- Produces: reusable master components used to compose the homepage in Task 3

- [ ] **Step 1: Create the page and component showcase frame**

Create `02 Components`, then create a 1440×1800 Warm White frame named `Components / Light` with labeled component sections separated by Mineral rules.

- [ ] **Step 2: Build the header master**

Create a 1200×88 frame. Place `이지훈` and `Frontend Engineer` on the left. Place `Writing`, `About`, `Search`, `KO`, and a restrained theme control on the right. Use no filled navigation pills.

- [ ] **Step 3: Build metadata and article masters**

Build `Editorial/Meta` from IBM Plex Mono labels. Build `Editorial/Lead Story` as a 960px-wide typographic block with category/date, title, excerpt, and reading time. Build `Editorial/Article Row` as a 960px-wide row with a 128px metadata column and flexible title/excerpt column, bounded only by a top Mineral rule.

- [ ] **Step 4: Build the footer master**

Create a 1200px-wide footer with copyright, GitHub, LinkedIn, and RSS links. Use a single top rule and no promotional panel.

- [ ] **Step 5: Convert masters into components and verify**

Use `create_component_from_node` for each master. Run `get_node_info` on `Components / Light` with depth 4 and confirm component names, dimensions, typography roles, and absence of card containers.

### Task 3: Desktop Homepage Composition

**Figma deliverables:**
- Create: page `03 Homepage`
- Create: frame `Homepage / Desktop / Light`

**Interfaces:**
- Consumes: component masters from Task 2 and token decisions from Task 1
- Produces: the first reviewable 1440px homepage direction

- [ ] **Step 1: Create and grid the homepage artboard**

Create a 1440×2200 Warm White frame. Center a 1200px site shell with 120px outer margins and apply a 12-column grid with 24px gutters.

- [ ] **Step 2: Compose the global header**

Place the header at y=0 with an 88px height. Add a full-shell Mineral rule below it. The author identity remains compact and does not become a hero block.

- [ ] **Step 3: Compose the lead story**

At approximately y=176, place one 960px lead article using `React Fiber 완전 정복` as the title and a concise excerpt describing how React schedules and renders updates. Give the title strong typographic emphasis without an image, badge, rounded container, or promotional label.

- [ ] **Step 4: Compose the chronological stream**

Below the lead story, add rows for `공유 언어`, `관측`, `Harness(Systems) Engineering`, `AI 프론트엔드 엔지니어`, `에러 핸들링`, and `Biome이 ESLint와 Prettier를 대체할 수 있을까?`. Use Engineering for four rows and Reflection for two rows so engineering remains dominant. Preserve consistent metadata columns, dividers, and vertical rhythm.

- [ ] **Step 5: Close with the footer and verify the document tree**

Place the compact footer after the stream. Run `get_node_info` on the homepage at depth 5 and confirm the expected hierarchy, 1440px artboard, 1200px shell, 960px stream, and a single uninterrupted post sequence.

### Task 4: Visual QA and Review Export

**Figma deliverables:**
- Verify: `Foundations / Light`, `Components / Light`, and `Homepage / Desktop / Light`
- Export: homepage review PNG

**Interfaces:**
- Consumes: all outputs from Tasks 1–3
- Produces: a visual review artifact and a concise list of intentionally deferred work

- [ ] **Step 1: Export the homepage at 1× PNG**

Call `export_node_as_image` with the exact homepage frame ID returned by Task 3, `format` set to `PNG`, and `scale` set to `1`; then inspect the returned image.

- [ ] **Step 2: Check hierarchy and rhythm visually**

Confirm the first viewport starts with writing, the lead story is distinct without card chrome, metadata remains secondary, rules align, and the palette reads as Warm White/Near Black with restrained olive and blue.

- [ ] **Step 3: Correct visible issues and re-export**

Use `move_node`, `resize_node`, typography setters, and color setters only where visual inspection reveals a concrete mismatch. Re-export until the frame satisfies the review criteria.

- [ ] **Step 4: Report the review scope**

Present the completed Figma pages and homepage preview. Explicitly defer article detail, archive, mobile, component variants, and dark theme until the user reviews this direction.
