import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(".next/prerender-manifest.json", "utf8"));

assert.equal(
  manifest.routes["/"],
  undefined,
  "The homepage must be dynamically rendered so its daily visitor baseline is not captured by ISR.",
);
