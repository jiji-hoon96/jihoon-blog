import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { formatHomepageDate, getHomepagePosts } from "./homepage-index.ts";
import { siteMetadata } from "./site-metadata.ts";

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

test("returns the five newest posts in the supplied order", () => {
  assert.deepEqual(
    getHomepagePosts(posts).map((post) => post.slug),
    ["/latest", "/fiber", "/second", "/third", "/fourth"],
  );
});

test("handles short and empty collections without padding", () => {
  assert.deepEqual(getHomepagePosts(posts.slice(0, 2)), posts.slice(0, 2));
  assert.deepEqual(getHomepagePosts([]), []);
});

test("formats a content date without shifting it to the previous day", () => {
  assert.equal(
    formatHomepageDate("2025-05-20T00:00:00.000Z", "ko"),
    "2025. 05. 20.",
  );
});

test("uses the approved typographic brand", () => {
  assert.equal(siteMetadata.brand, "훈지");
});

test("keeps the global chrome minimal", () => {
  const headerSource = readFileSync(
    new URL("../components/Header.tsx", import.meta.url),
    "utf8",
  );
  const footerSource = readFileSync(
    new URL("../components/Footer.tsx", import.meta.url),
    "utf8",
  );

  assert.match(headerSource, /siteMetadata\.brand/);
  assert.doesNotMatch(headerSource, /navigation\.about/);
  assert.doesNotMatch(headerSource, /Frontend Engineer/);
  assert.doesNotMatch(footerSource, /new Date\(\)/);
  assert.doesNotMatch(footerSource, /mailto:/);
});
