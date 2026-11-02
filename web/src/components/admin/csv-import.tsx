"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { FileArrowUpIcon, FileCsvIcon } from "@phosphor-icons/react";
import { useRef, useState, type ChangeEvent, type ReactNode } from "react";

import { EmptyState } from "@/components/admin/empty-state";
import { FormError } from "@/components/admin/form-error";
import { useToast } from "@/components/admin/toast";
import { Button } from "@/components/ui/button";
import { adminUpload, errorDetail } from "@/lib/admin-api";
import { applyMessage, importedMessage, type ImportChange, type ImportPreview, type ImportResult } from "@/lib/csv-import";
import { formatRupees } from "@/lib/format";
import { cn } from "@/lib/utils";

/** How many rejected rows and changes show before "Show all". */
const ERRORS_SHOWN = 5;
const CHANGES_SHOWN = 50;

/** The Import page: choose a CSV, read the preview, then apply it. Nothing is saved until Apply. */
export function CsvImport() {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [allErrors, setAllErrors] = useState(false);
  const [allChanges, setAllChanges] = useState(false);

  function reset() {
    setFile(null);
    setPreview(null);
    setError(null);
    setAllErrors(false);
    setAllChanges(false);
  }

  async function onPick(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    event.target.value = ""; // So choosing the same file again (after fixing it) reads it again.
    if (!picked) return;
    reset();
    setBusy(true);
    const response = await adminUpload("/import/preview", { file: picked });
    setBusy(false);
    if (!response.ok) {
      setError(await errorDetail(response));
      return;
    }
    setFile(picked);
    setPreview(await response.json());
  }

  async function apply() {
    if (!file) return;
    setBusy(true);
    setApplyError(null);
    const response = await adminUpload("/import/apply", { file });
    setBusy(false);
    if (!response.ok) {
      setApplyError(await errorDetail(response));
      return;
    }
    const result: ImportResult = await response.json();
    setConfirming(false);
    reset();
    toast(importedMessage(result));
  }

  const chooseButton = (
    <Button onClick={() => input.current?.click()} disabled={busy}>
      <FileArrowUpIcon aria-hidden className="size-4" />
      Choose CSV file
    </Button>
  );

  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground md:mb-6">
        Upload the product export from the billing software. You see what changes before anything is saved.
      </p>
      <input ref={input} type="file" accept=".csv,text/csv" hidden aria-label="CSV file" onChange={onPick} />
      <FormError message={error} />
      {!preview || !file ? (
        <EmptyState
          icon={FileCsvIcon}
          text={busy ? "Reading the file…" : "Columns: code, name, category, pack_label and price, plus optional group and in_stock."}
          action={chooseButton}
        />
      ) : (
        <div className="flex flex-col gap-4 pb-24 md:gap-6 md:pb-0">
          <section
            aria-label="Chosen file"
            className="flex items-center gap-3 rounded-lg border-hairline border-border bg-card p-4 shadow-sm"
          >
            <FileCsvIcon aria-hidden className="size-8 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{file.name}</p>
              <p className="text-sm text-muted-foreground">{preview.total_rows.toLocaleString("en-IN")} rows</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => input.current?.click()} disabled={busy}>
              Choose another file
            </Button>
          </section>

          <Tiles preview={preview} />

          {preview.errors.length > 0 && (
            <section aria-label="Rejected rows" className="rounded-lg border-hairline border-border bg-card shadow-sm">
              <h2 className="px-4 pt-4 text-lg font-semibold md:px-6">Rejected rows</h2>
              <Table
                head={["Row", "Code", "Product", "Problem"]}
                rows={(allErrors ? preview.errors : preview.errors.slice(0, ERRORS_SHOWN)).map((each) => [
                  <span key="row" className="tabular-nums">{each.row}</span>,
                  <span key="code" className="font-mono text-sm">{each.code || "—"}</span>,
                  each.name || "—",
                  <span key="problem" className="text-error-foreground">{each.message}</span>,
                ])}
              />
              {!allErrors && preview.errors.length > ERRORS_SHOWN && (
                <div className="px-4 pb-4 md:px-6">
                  <Button variant="ghost" size="sm" onClick={() => setAllErrors(true)}>
                    Show all {preview.errors.length}
                  </Button>
                </div>
              )}
            </section>
          )}

          {preview.changes.length > 0 && (
            <section aria-label="Preview of changes" className="rounded-lg border-hairline border-border bg-card shadow-sm">
              <h2 className="px-4 pt-4 text-lg font-semibold md:px-6">Preview of changes</h2>
              <Table
                head={["Code", "Product", "Pack", "Old price", "New price", "Action"]}
                rows={(allChanges ? preview.changes : preview.changes.slice(0, CHANGES_SHOWN)).map(changeCells)}
              />
              {!allChanges && preview.changes.length > CHANGES_SHOWN && (
                <div className="px-4 pb-4 md:px-6">
                  <Button variant="ghost" size="sm" onClick={() => setAllChanges(true)}>
                    Show all {preview.changes.length}
                  </Button>
                </div>
              )}
            </section>
          )}

          <div className="sticky bottom-tabbar z-tabbar -mx-4 flex flex-wrap items-center justify-between gap-3 border-t-hairline border-border bg-card px-4 py-3 md:static md:mx-0 md:border-t-0 md:bg-transparent md:px-0">
            <p className="text-sm text-muted-foreground">
              {preview.errors.length > 0
                ? "Fix the rejected rows in the file and choose it again. Nothing is saved while any row is rejected."
                : "Nothing is saved until you apply."}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={reset}>
                Cancel
              </Button>
              <Button
                disabled={busy || preview.errors.length > 0 || preview.changes.length === 0}
                onClick={() => {
                  setApplyError(null);
                  setConfirming(true);
                }}
              >
                Apply import
              </Button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <ApplyDialog
          open={confirming}
          onOpenChange={setConfirming}
          description={applyMessage(preview)}
          busy={busy}
          error={applyError}
          onConfirm={apply}
        />
      )}
    </>
  );
}

function Tiles({ preview }: { preview: ImportPreview }) {
  const tiles = [
    { label: "new products to create", value: preview.products_created, tone: "" },
    { label: "pack options to update", value: preview.pack_options_updated, tone: "" },
    { label: "rows rejected", value: preview.errors.length, tone: preview.errors.length ? "text-error-foreground" : "" },
  ];
  return (
    <dl aria-label="Summary" className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
      {tiles.map(({ label, value, tone }) => (
        <div key={label} className="rounded-lg border-hairline border-border bg-card p-4 shadow-sm">
          <dd className={cn("text-3xl font-bold tracking-tight tabular-nums", tone)}>{value.toLocaleString("en-IN")}</dd>
          <dt className="text-sm text-muted-foreground">{label}</dt>
        </div>
      ))}
    </dl>
  );
}

function changeCells(change: ImportChange) {
  const create = change.action === "create";
  return [
    <span key="code" className="font-mono text-sm">{change.code}</span>,
    <span key="product" className="font-semibold">{change.product}</span>,
    change.pack_label,
    change.old_price_paise === null ? "—" : formatRupees(change.old_price_paise),
    <span key="price" className="font-semibold">{formatRupees(change.new_price_paise)}</span>,
    <span
      key="action"
      className={cn(
        "rounded-sm px-2 py-1 text-xs font-medium",
        create ? "bg-status-delivered text-status-delivered-foreground" : "bg-status-confirmed text-status-confirmed-foreground",
      )}
    >
      {create ? "Create" : "Update"}
    </span>,
  ];
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto px-4 pb-2 md:px-6">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground uppercase">
            {head.map((name) => (
              <th key={name} scope="col" className="py-3 pr-4 font-medium">
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, index) => (
            <tr key={index} className="border-t-hairline border-border">
              {cells.map((cell, column) => (
                <td key={column} className="min-h-tap py-3 pr-4 align-middle">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Asks before applying an import, which can't be undone in one step. */
function ApplyDialog({
  open,
  onOpenChange,
  description,
  busy,
  error,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description: string;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-dialog bg-overlay" />
        <Dialog.Content className="fixed inset-x-4 top-1/2 z-dialog mx-auto flex max-h-dvh w-auto max-w-form -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-lg bg-card p-6 shadow-md">
          <Dialog.Title className="text-xl font-semibold">Apply this import?</Dialog.Title>
          <Dialog.Description className="text-muted-foreground">{description}</Dialog.Description>
          <FormError message={error} />
          <div className="flex flex-col gap-3 md:flex-row-reverse">
            <Button type="button" disabled={busy} onClick={onConfirm} className="w-full md:w-auto">
              {busy ? "Applying…" : "Apply import"}
            </Button>
            <Dialog.Close asChild>
              <Button type="button" variant="outline" className="w-full md:w-auto">
                Cancel
              </Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
