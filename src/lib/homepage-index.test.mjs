import assert from "node:assert/strict";
import test from "node:test";

import { buildHomepageIndex, formatHomepageDate } from "./homepage-index.ts";

const posts = [
  { slug: "/latest", title: "Latest", translationKey: "latest" },
  { slug: "/fiber", title: "React Fiber 완전 정복", translationKey: "250520" },
  { slug: "/second", title: "Second", translationKey: "second" },
  { slug: "/third", title: "Third", translationKey: "third" },
  { slug: "/fourth", title: "Fourth", translationKey: "fourth" },
  { slug: "/fifth", title: "Fifth", translationKey: "fifth" },
  { slug: "/sixth", title: "Sixth", translationKey: "sixth" },
  { slug: "/seventh", title: "Seventh", translationKey: "seventh" },
];

test("builds one featured story and a non-duplicated chronological stream", () => {
  const result = buildHomepageIndex(posts, "250520");

  assert.equal(result.featured?.slug, "/fiber");
  assert.deepEqual(
    result.expanded.map((post) => post.slug),
    ["/latest", "/second"],
  );
  assert.deepEqual(
    result.compact.map((post) => post.slug),
    ["/third", "/fourth", "/fifth", "/sixth"],
  );
  assert.equal(
    [...result.expanded, ...result.compact].some(
      (post) => post.slug === result.featured?.slug,
    ),
    false,
  );
});

test("falls back to the first post and handles short collections", () => {
  const shortPosts = posts.slice(0, 3);
  const result = buildHomepageIndex(shortPosts, "missing");

  assert.equal(result.featured?.slug, "/latest");
  assert.deepEqual(
    result.expanded.map((post) => post.slug),
    ["/fiber", "/second"],
  );
  assert.deepEqual(result.compact, []);
});

test("returns an empty model when there are no posts", () => {
  assert.deepEqual(buildHomepageIndex([], "250520"), {
    featured: undefined,
    expanded: [],
    compact: [],
  });
});

test("formats a content date without shifting it to the previous day", () => {
  assert.equal(
    formatHomepageDate("2025-05-20T00:00:00.000Z", "ko"),
    "2025. 05. 20.",
  );
});
