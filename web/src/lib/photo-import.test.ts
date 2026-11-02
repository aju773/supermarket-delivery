import assert from "node:assert/strict";
import { test } from "node:test";

import { batches, failedBatch, mergeResults, percent } from "./photo-import.ts";

test("batches splits files into groups of the given size", () => {
  assert.deepEqual(batches([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(batches([], 2), []);
});

test("mergeResults joins the matched and unmatched files of every batch in order", () => {
  const match = (filename: string) => ({ filename, code: filename, product: "P", pack_label: "1 kg", thumbnail_url: "/t" });
  const merged = mergeResults([
    { matched: [match("a")], unmatched: [{ filename: "x", reason: "r" }] },
    { matched: [match("b")], unmatched: [] },
  ]);
  assert.deepEqual(merged.matched.map((each) => each.filename), ["a", "b"]);
  assert.deepEqual(merged.unmatched, [{ filename: "x", reason: "r" }]);
});

test("percent rounds, and an empty upload is complete", () => {
  assert.equal(percent(1, 3), 33);
  assert.equal(percent(248, 248), 100);
  assert.equal(percent(0, 0), 100);
});

test("failedBatch lists every file with the reason", () => {
  assert.deepEqual(failedBatch([{ name: "a.jpg" }, { name: "b.jpg" }], "offline"), {
    matched: [],
    unmatched: [
      { filename: "a.jpg", reason: "offline" },
      { filename: "b.jpg", reason: "offline" },
    ],
  });
});
