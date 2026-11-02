// What the CSV import API reports, and the wording for the confirmation popup and the toast.

export type ImportRowError = { row: number; code: string; name: string; message: string };

export type ImportChange = {
  row: number;
  code: string;
  product: string;
  pack_label: string;
  old_price_paise: number | null;
  new_price_paise: number;
  action: "create" | "update";
};

export type ImportPreview = {
  total_rows: number;
  products_created: number;
  pack_options_created: number;
  pack_options_updated: number;
  categories_created: string[];
  errors: ImportRowError[];
  changes: ImportChange[];
};

export type ImportResult = {
  products_created: number;
  pack_options_created: number;
  pack_options_updated: number;
  categories_created: number;
};

function count(n: number, noun: string, plural = `${noun}s`) {
  return `${n} ${n === 1 ? noun : plural}`;
}

/** "3 products and 4 pack options created, 5 pack options updated"; `verb` is "will be" before applying. */
function describe(result: ImportResult, verb: string): string {
  const created = [
    result.products_created && count(result.products_created, "product"),
    result.pack_options_created && count(result.pack_options_created, "pack option"),
  ].filter(Boolean);
  const updated = result.pack_options_updated && count(result.pack_options_updated, "pack option");
  const was = verb ? `${verb} ` : "";
  if (!created.length) return updated ? `${updated} ${was}updated` : "";
  const first = `${created.join(" and ")} ${was}created`;
  return updated ? `${first}, ${updated} updated` : first;
}

/** The sentence in the "Apply this import?" popup. */
export function applyMessage(preview: ImportPreview): string {
  const sentences = [describe({ ...preview, categories_created: 0 }, "will be")];
  const categories = preview.categories_created.length;
  if (categories) sentences.push(`${count(categories, "category", "categories")} will be created`);
  return sentences.filter(Boolean).join(". ") + ".";
}

/** The toast after applying. */
export function importedMessage(result: ImportResult): string {
  return `Import applied: ${describe(result, "")}`;
}
