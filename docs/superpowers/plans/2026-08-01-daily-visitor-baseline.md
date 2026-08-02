# Daily Visitor Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed daily visitor calibration with a deterministic `10~40` baseline that changes at midnight in `Asia/Seoul` and remains identical for every request on the same Korean date.

**Architecture:** Add one pure utility that derives a Korean date key, hashes it deterministically with FNV-1a, and maps it to the inclusive `10~40` range. The existing Google Analytics adapter will add that baseline to real active users and will return the baseline alone when the GA4 client is unavailable or the report fails.

**Tech Stack:** TypeScript, Node.js 24 built-in test runner, Next.js 16, Google Analytics Data API

## Global Constraints

- Use `Asia/Seoul` as the date boundary.
- Return an inclusive integer from `10` through `40`.
- The same Korean date must always produce the same value across requests and server instances.
- Do not add a database, KV store, runtime randomness, or a new package.
- Keep the existing one-hour analytics cache and total-page-view calibration unchanged.
- Stop using `ANALYTICS_DAILY_CALIBRATION`.

---

### Task 1: Deterministic daily visitor baseline

**Files:**
- Create: `src/lib/daily-visitor-baseline.ts`
- Create: `src/lib/daily-visitor-baseline.test.mjs`
- Modify: `src/lib/google-analytics.ts:8-103`
- Modify: `package.json:7-15`

**Interfaces:**
- Consumes: a JavaScript `Date`, defaulting to the current instant.
- Produces: `getSeoulDateKey(date?: Date): string`, `getDailyVisitorBaseline(date?: Date): number`, and `addDailyVisitorBaseline(activeUsers: number, date?: Date): number`.

- [x] **Step 1: Add the failing unit tests and test command**

Add `"test": "node --test src/lib/*.test.mjs"` to `package.json`. Create `src/lib/daily-visitor-baseline.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  addDailyVisitorBaseline,
  getDailyVisitorBaseline,
  getSeoulDateKey,
} from "./daily-visitor-baseline.ts";

test("uses midnight in Asia/Seoul as the date boundary", () => {
  assert.equal(getSeoulDateKey(new Date("2026-08-01T14:59:59Z")), "2026-08-01");
  assert.equal(getSeoulDateKey(new Date("2026-08-01T15:00:00Z")), "2026-08-02");
});

test("returns a stable deterministic baseline for a Korean date", () => {
  const date = new Date("2026-08-01T03:00:00Z");

  assert.equal(getDailyVisitorBaseline(date), 19);
  assert.equal(getDailyVisitorBaseline(date), 19);
  assert.equal(getDailyVisitorBaseline(new Date("2026-08-02T03:00:00Z")), 34);
});

test("keeps daily baselines in the inclusive 10 through 40 range", () => {
  for (let day = 0; day < 366; day += 1) {
    const date = new Date(Date.UTC(2026, 0, 1 + day, 3));
    const baseline = getDailyVisitorBaseline(date);

    assert.ok(baseline >= 10 && baseline <= 40);
    assert.equal(Number.isInteger(baseline), true);
  }
});

test("adds the daily baseline to real visitors and supplies the zero-user fallback", () => {
  const date = new Date("2026-08-01T03:00:00Z");

  assert.equal(addDailyVisitorBaseline(7, date), 26);
  assert.equal(addDailyVisitorBaseline(0, date), 19);
});
```

- [x] **Step 2: Run the test and verify RED**

Run: `pnpm test`

Expected: FAIL because `src/lib/daily-visitor-baseline.ts` does not exist.

- [x] **Step 3: Implement the minimal pure utility**

Create `src/lib/daily-visitor-baseline.ts`:

```ts
const SEOUL_TIME_ZONE = "Asia/Seoul";
const MIN_DAILY_VISITORS = 10;
const DAILY_VISITOR_RANGE = 31;

export function getSeoulDateKey(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return `${values.year}-${values.month}-${values.day}`;
}

export function getDailyVisitorBaseline(date: Date = new Date()): number {
  let hash = 2166136261;

  for (const character of getSeoulDateKey(date)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return MIN_DAILY_VISITORS + ((hash >>> 0) % DAILY_VISITOR_RANGE);
}

export function addDailyVisitorBaseline(
  activeUsers: number,
  date: Date = new Date(),
): number {
  return activeUsers + getDailyVisitorBaseline(date);
}
```

- [x] **Step 4: Run the focused tests and verify GREEN**

Run: `pnpm test`

Expected: four tests PASS with no warnings or errors.

- [x] **Step 5: Integrate the baseline into Google Analytics stats**

In `src/lib/google-analytics.ts`, import `addDailyVisitorBaseline` and remove `dailyCalibration`. Update all three `todayVisitors` return paths:

```ts
import { addDailyVisitorBaseline } from "@/lib/daily-visitor-baseline";

// No configured client
return { totalPageViews: 0, todayVisitors: addDailyVisitorBaseline(0) };

// Successful GA4 response
return {
  totalPageViews: totalPageViews + totalCalibration,
  todayVisitors: addDailyVisitorBaseline(todayVisitors),
};

// Failed GA4 response
return { totalPageViews: 0, todayVisitors: addDailyVisitorBaseline(0) };
```

- [x] **Step 6: Verify tests, changed-file lint, and production build**

Run: `pnpm test`

Expected: four tests PASS.

Run: `pnpm exec eslint src/lib/daily-visitor-baseline.ts src/lib/daily-visitor-baseline.test.mjs src/lib/google-analytics.ts`

Expected: exit code 0 with no lint errors in changed files. The repository-wide `pnpm lint` baseline has 30 pre-existing errors and 4 pre-existing warnings outside this task's files, so it is recorded but not used as this task's pass/fail gate.

Run: `pnpm build`

Expected: exit code 0 and a successful Next.js production build.

- [x] **Step 7: Commit the implementation**

```bash
git add package.json src/lib/daily-visitor-baseline.ts src/lib/daily-visitor-baseline.test.mjs src/lib/google-analytics.ts docs/superpowers/plans/2026-08-01-daily-visitor-baseline.md
git commit -m "feat: randomize daily visitor baseline by date"
```
