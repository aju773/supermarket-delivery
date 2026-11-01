import assert from "node:assert/strict";
import { test } from "node:test";

import { findViolations } from "./check-tokens.mjs";

const rulesFound = (source) => findViolations(source).map((v) => v.rule);

test("raw hex colours are rejected", () => {
  assert.deepEqual(rulesFound('const c = "#16A34A";'), ["hex colour"]);
  assert.deepEqual(rulesFound("color: #fff;"), ["hex colour"]);
});

test("colour functions are rejected", () => {
  assert.deepEqual(rulesFound("color: rgb(0 0 0);"), ["colour function"]);
  assert.deepEqual(rulesFound("background: hsla(0, 0%, 0%, 0.5);"), ["colour function"]);
  assert.deepEqual(rulesFound("color: oklch(0.5 0.1 120);"), ["colour function"]);
});

test("pixel values are rejected", () => {
  assert.deepEqual(rulesFound("padding: 12px;"), ["pixel value"]);
  assert.deepEqual(rulesFound("width: 0.5px;"), ["pixel value"]);
});

test("square-bracket Tailwind values are rejected", () => {
  assert.deepEqual(rulesFound('<div className="w-[37rem]" />'), ["square-bracket Tailwind value"]);
  assert.deepEqual(rulesFound('<div className="[&_svg]:size-4" />'), ["square-bracket Tailwind value"]);
  assert.deepEqual(rulesFound('<div className="[mask-type:luminance]" />'), ["square-bracket Tailwind value"]);
});

test("token-based code passes", () => {
  const source = `
    <a href="#main" className="bg-brand text-brand-foreground p-4 rounded-lg" />
    const first = items[0];
    type Lookup = { [key: string]: number };
    .x { color: var(--color-foreground); min-height: var(--spacing-tap); }
  `;
  assert.deepEqual(findViolations(source), []);
});

test("violations report their line number", () => {
  const [violation] = findViolations("ok\nok\nmargin: 4px;");
  assert.equal(violation.line, 3);
  assert.equal(violation.match, "4px");
});
