import assert from "node:assert/strict";
import { test } from "node:test";

import { applyMessage, importedMessage, type ImportPreview, type ImportResult } from "./csv-import.ts";

const preview: ImportPreview = {
  total_rows: 10,
  products_created: 3,
  pack_options_created: 4,
  pack_options_updated: 5,
  categories_created: ["Oils"],
  errors: [],
  changes: [],
};

test("the confirmation says what applying creates and updates", () => {
  assert.equal(
    applyMessage(preview),
    "3 products and 4 pack options will be created, 5 pack options updated. 1 category will be created.",
  );
});

test("the confirmation leaves out what the file doesn't do and uses singular words", () => {
  assert.equal(
    applyMessage({ ...preview, products_created: 1, pack_options_created: 1, pack_options_updated: 0, categories_created: [] }),
    "1 product and 1 pack option will be created.",
  );
  assert.equal(
    applyMessage({ ...preview, products_created: 0, pack_options_created: 0, pack_options_updated: 2, categories_created: ["A", "B"] }),
    "2 pack options will be updated. 2 categories will be created.",
  );
});

test("the toast gives the counts of what was saved", () => {
  const result: ImportResult = { products_created: 2, pack_options_created: 3, pack_options_updated: 1, categories_created: 0 };
  assert.equal(importedMessage(result), "Import applied: 2 products and 3 pack options created, 1 pack option updated");
  assert.equal(
    importedMessage({ ...result, products_created: 0, pack_options_created: 0, pack_options_updated: 4 }),
    "Import applied: 4 pack options updated",
  );
});
