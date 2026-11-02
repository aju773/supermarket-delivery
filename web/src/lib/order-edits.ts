/** Staff edits to an Order's lines: what changed from the Original Request, and a preview of the new subtotal. No imports, so `node --test` can run its tests directly. */

/** A line as the API sends it (the Original Request has no totals). */
export type EditableLine = {
  pack_option_id: number;
  product_name: string;
  pack_label: string;
  unit_price_paise: number;
  quantity: number;
};

/** One sentence per difference between the Original Request and the current lines, in Original Request order then additions. */
export function originalRequestChanges(
  original: EditableLine[],
  current: EditableLine[],
): string[] {
  const now = new Map(current.map((line) => [line.pack_option_id, line]));
  const was = new Set(original.map((line) => line.pack_option_id));
  const changes: string[] = [];
  for (const line of original) {
    const name = `${line.product_name} ${line.pack_label} × ${line.quantity}`;
    const kept = now.get(line.pack_option_id);
    if (!kept) changes.push(`${name} → removed`);
    else if (kept.quantity !== line.quantity)
      changes.push(`${name} → changed to × ${kept.quantity}`);
  }
  for (const line of current) {
    if (!was.has(line.pack_option_id))
      changes.push(
        `${line.product_name} ${line.pack_label} × ${line.quantity} → added`,
      );
  }
  return changes;
}

/** The subtotal of lines being edited, before the server recalculates it. */
export function editedSubtotal(lines: EditableLine[]): number {
  return lines.reduce(
    (sum, line) => sum + line.unit_price_paise * line.quantity,
    0,
  );
}
