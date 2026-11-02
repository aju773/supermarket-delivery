// What the bulk photo upload API reports, and the helpers for sending many files in small batches.

export type PhotoMatch = { filename: string; code: string; product: string; pack_label: string; thumbnail_url: string };
export type PhotoMiss = { filename: string; reason: string };
export type PhotoImportResult = { matched: PhotoMatch[]; unmatched: PhotoMiss[] };

/** Files per request: small enough to keep each upload quick on a phone connection, so the progress bar moves. */
export const BATCH_SIZE = 20;

export function batches<T>(items: T[], size = BATCH_SIZE): T[][] {
  const result: T[][] = [];
  for (let start = 0; start < items.length; start += size) result.push(items.slice(start, start + size));
  return result;
}

export function mergeResults(results: PhotoImportResult[]): PhotoImportResult {
  return {
    matched: results.flatMap((each) => each.matched),
    unmatched: results.flatMap((each) => each.unmatched),
  };
}

/** A whole number from 0 to 100; an empty upload counts as done. */
export function percent(done: number, total: number): number {
  return total === 0 ? 100 : Math.round((done / total) * 100);
}

/** A batch that never reached the server: every file in it is listed as not uploaded. */
export function failedBatch(files: { name: string }[], reason: string): PhotoImportResult {
  return { matched: [], unmatched: files.map((file) => ({ filename: file.name, reason })) };
}
