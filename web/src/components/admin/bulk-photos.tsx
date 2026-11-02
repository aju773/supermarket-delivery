"use client";

import { CheckCircleIcon, ImageSquareIcon } from "@phosphor-icons/react";
import { useRef, useState, type ChangeEvent, type DragEvent } from "react";

import { Button } from "@/components/ui/button";
import { adminUpload, errorDetail } from "@/lib/admin-api";
import {
  batches,
  failedBatch,
  mergeResults,
  percent,
  type PhotoImportResult,
  type PhotoMatch,
  type PhotoMiss,
} from "@/lib/photo-import";
import { cn } from "@/lib/utils";

/** How many matched photos and unmatched files show before "Show all". */
const MATCHED_SHOWN = 8;
const UNMATCHED_SHOWN = 4;

/** The Photos tab of Import: send many image files (or zips) and see which matched a pack option code. */
export function BulkPhotos() {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<PhotoImportResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const [allMatched, setAllMatched] = useState(false);
  const [allUnmatched, setAllUnmatched] = useState(false);
  const busy = progress !== null && progress.done < progress.total;

  async function upload(files: File[]) {
    if (!files.length || busy) return;
    setResult(null);
    setAllMatched(false);
    setAllUnmatched(false);
    setProgress({ done: 0, total: files.length });
    const results: PhotoImportResult[] = [];
    let done = 0;
    for (const group of batches(files)) {
      const response = await adminUpload("/import/photos", { files: group });
      results.push(response.ok ? await response.json() : failedBatch(group, await errorDetail(response)));
      done += group.length;
      setProgress({ done, total: files.length });
      setResult(mergeResults(results));
    }
  }

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ""; // So choosing the same files again (after renaming them) sends them again.
    void upload(files);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    void upload(Array.from(event.dataTransfer.files));
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <input
        ref={input}
        type="file"
        multiple
        accept="image/*,.zip,application/zip"
        hidden
        aria-label="Photo files"
        onChange={onPick}
      />
      <section className="rounded-lg border-hairline border-border bg-card p-4 shadow-sm md:p-6">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex flex-col items-center gap-3 rounded-lg border-emphasis border-dashed border-input px-4 py-10 text-center",
            dragging && "border-brand bg-accent",
          )}
        >
          <ImageSquareIcon aria-hidden className="size-10 text-brand" />
          <p className="font-semibold">Choose photos or a zip file</p>
          <p className="max-w-form text-sm text-muted-foreground">
            Name each file with the pack option code, e.g. 8901725133719.jpg. Photos are resized automatically.
          </p>
          <Button onClick={() => input.current?.click()} disabled={busy}>
            Choose files
          </Button>
        </div>
        {progress && (
          <div className="mt-4 flex flex-col gap-2 border-t-hairline border-border pt-4">
            <div className="flex items-center justify-between gap-3 text-sm" role="status">
              <span className="flex items-center gap-2">
                {!busy && <CheckCircleIcon aria-hidden weight="fill" className="size-4 text-brand" />}
                {busy ? "Uploading" : "Uploaded"} {progress.done} of {progress.total} {progress.total === 1 ? "file" : "files"}
              </span>
              <span className="tabular-nums text-muted-foreground">{percent(progress.done, progress.total)}%</span>
            </div>
            <div
              role="progressbar"
              aria-label="Upload progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent(progress.done, progress.total)}
              className="h-2 overflow-hidden rounded-full bg-muted"
            >
              <div className="h-full bg-brand" style={{ width: `${percent(progress.done, progress.total)}%` }} />
            </div>
          </div>
        )}
      </section>

      {result && (
        <>
          <dl aria-label="Summary" className="grid grid-cols-2 gap-3 md:gap-4">
            <Tile value={result.matched.length} label="photos matched" />
            <Tile
              value={result.unmatched.length}
              label="files weren't saved"
              tone={result.unmatched.length ? "text-error-foreground" : ""}
            />
          </dl>
          {result.matched.length > 0 && (
            <MatchedCard
              matched={allMatched ? result.matched : result.matched.slice(0, MATCHED_SHOWN)}
              total={result.matched.length}
              onShowAll={allMatched ? undefined : () => setAllMatched(true)}
            />
          )}
          {result.unmatched.length > 0 && (
            <UnmatchedCard
              unmatched={allUnmatched ? result.unmatched : result.unmatched.slice(0, UNMATCHED_SHOWN)}
              total={result.unmatched.length}
              onShowAll={allUnmatched ? undefined : () => setAllUnmatched(true)}
            />
          )}
        </>
      )}
    </div>
  );
}

function Tile({ value, label, tone = "" }: { value: number; label: string; tone?: string }) {
  return (
    <div className="rounded-lg border-hairline border-border bg-card p-4 shadow-sm">
      <dd className={cn("text-3xl font-bold tracking-tight tabular-nums", tone)}>{value.toLocaleString("en-IN")}</dd>
      <dt className="text-sm text-muted-foreground">{label}</dt>
    </div>
  );
}

function ShowAll({ total, onShowAll }: { total: number; onShowAll?: () => void }) {
  if (!onShowAll) return null;
  return (
    <div className="border-t-hairline border-border px-4 py-2 md:px-6">
      <Button variant="ghost" size="sm" onClick={onShowAll}>
        Show all {total}
      </Button>
    </div>
  );
}

function Count({ value, tone }: { value: number; tone: string }) {
  return <span className={cn("rounded-full px-2 py-1 text-xs font-semibold tabular-nums", tone)}>{value}</span>;
}

function MatchedCard({ matched, total, onShowAll }: { matched: PhotoMatch[]; total: number; onShowAll?: () => void }) {
  return (
    <section aria-label="Matched photos" className="rounded-lg border-hairline border-border bg-card shadow-sm">
      <h2 className="flex items-center gap-2 p-4 text-lg font-semibold md:px-6">
        Matched <Count value={total} tone="bg-status-delivered text-status-delivered-foreground" />
      </h2>
      <ul className="grid grid-cols-2 gap-3 border-t-hairline border-border p-4 md:grid-cols-4 md:gap-4 md:p-6">
        {matched.map((each, index) => (
          <li key={`${each.filename}-${index}`} className="overflow-hidden rounded-lg border-hairline border-border">
            <div className="aspect-4/3 bg-muted">
              <img src={each.thumbnail_url} alt="" className="size-full object-cover" />
            </div>
            <div className="p-3">
              <p className="truncate text-sm font-semibold">
                {each.product} {each.pack_label}
              </p>
              <p className="truncate font-mono text-xs text-muted-foreground">{each.code}</p>
            </div>
          </li>
        ))}
      </ul>
      <ShowAll total={total} onShowAll={onShowAll} />
    </section>
  );
}

function UnmatchedCard({ unmatched, total, onShowAll }: { unmatched: PhotoMiss[]; total: number; onShowAll?: () => void }) {
  return (
    <section aria-label="Files that weren't saved" className="rounded-lg border-hairline border-border bg-card shadow-sm">
      <div className="p-4 md:px-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          Not saved <Count value={total} tone="bg-error text-error-foreground" />
        </h2>
        <p className="text-sm text-muted-foreground">Rename these files to the right pack option code, or fix the problem shown, and upload them again.</p>
      </div>
      <ul>
        {unmatched.map((each, index) => (
          <li
            key={`${each.filename}-${index}`}
            className="flex flex-col gap-1 border-t-hairline border-border px-4 py-3 md:flex-row md:items-center md:justify-between md:gap-4 md:px-6"
          >
            <span className="font-mono text-sm break-all">{each.filename}</span>
            <span className="text-sm text-error-foreground">{each.reason}</span>
          </li>
        ))}
      </ul>
      <ShowAll total={total} onShowAll={onShowAll} />
    </section>
  );
}
