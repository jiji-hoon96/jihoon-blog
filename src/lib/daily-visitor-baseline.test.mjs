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
