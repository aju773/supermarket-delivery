"use client";

import {
  MagnifyingGlassIcon,
  MinusIcon,
  PlusIcon,
  SwapIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { FormError } from "@/components/admin/form-error";
import { inputClass } from "@/components/admin/password-input";
import { useToast } from "@/components/admin/toast";
import { Button } from "@/components/ui/button";
import { adminSend, errorDetail } from "@/lib/admin-api";
import type { AdminOrder } from "@/lib/admin-orders";
import { editedSubtotal, type EditableLine } from "@/lib/order-edits";
import { formatRupees } from "@/lib/format";
import type { PackOption, Product } from "@/lib/products";

const SEARCH_DEBOUNCE_MS = 300;

/**
 * The Items card: the lines and totals, and while the Order is New or Confirmed an Edit mode to change
 * quantities, remove lines, add a Pack Option or swap one line for another. Saving sends all the lines at once.
 */
export function OrderLines({ order }: { order: AdminOrder }) {
  const router = useRouter();
  const toast = useToast();
  const [draft, setDraft] = useState<EditableLine[] | null>(null);
  // The line being swapped, or "add" while adding; null when the search is closed.
  const [picking, setPicking] = useState<number | "add" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editable = order.status === "new" || order.status === "confirmed";
  const editing = draft !== null;
  const lines: (EditableLine & { line_total_paise: number })[] = (
    draft ?? order.lines
  ).map((line) => ({
    ...line,
    line_total_paise: line.unit_price_paise * line.quantity,
  }));
  const subtotal = editing ? editedSubtotal(draft) : order.subtotal_paise;

  function startEditing() {
    setError(null);
    setDraft(order.lines.map(({ line_total_paise: _total, ...line }) => line));
  }

  function stopEditing() {
    setDraft(null);
    setPicking(null);
    setError(null);
  }

  function update(change: (lines: EditableLine[]) => EditableLine[]) {
    setDraft((current) => (current ? change(current) : current));
  }

  function setQuantity(index: number, quantity: number) {
    update((current) =>
      current.map((line, i) =>
        i === index ? { ...line, quantity: Math.max(1, quantity) } : line,
      ),
    );
  }

  function remove(index: number) {
    update((current) => current.filter((_, i) => i !== index));
  }

  function choose(product: Product, option: PackOption) {
    const line: EditableLine = {
      pack_option_id: option.id,
      product_name: product.name,
      pack_label: option.label,
      unit_price_paise: option.price_paise,
      quantity: 1,
    };
    update((current) => {
      const existing = current.findIndex(
        (each) => each.pack_option_id === option.id,
      );
      if (picking === "add") {
        return existing >= 0
          ? current.map((each, i) =>
              i === existing ? { ...each, quantity: each.quantity + 1 } : each,
            )
          : [...current, line];
      }
      if (picking === null) return current;
      // A swap keeps the quantity; swapping to a Pack Option that is already on the Order merges into that line.
      const swapped = current[picking];
      if (existing >= 0 && existing !== picking) {
        return current
          .map((each, i) =>
            i === existing
              ? { ...each, quantity: each.quantity + swapped.quantity }
              : each,
          )
          .filter((_, i) => i !== picking);
      }
      return current.map((each, i) =>
        i === picking ? { ...line, quantity: swapped.quantity } : each,
      );
    });
    setPicking(null);
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    const response = await adminSend("PUT", `/orders/${order.number}/lines`, {
      lines: draft.map(({ pack_option_id, quantity }) => ({
        pack_option_id,
        quantity,
      })),
    });
    setBusy(false);
    if (!response.ok) {
      setError(await errorDetail(response));
      // The Order moved on meanwhile: leave Edit mode, keeping the message, and show its current state.
      if (response.status === 409) {
        setDraft(null);
        setPicking(null);
        router.refresh();
      }
      return;
    }
    stopEditing();
    router.refresh();
    toast("Order items saved");
  }

  const total = subtotal + order.delivery_charge_paise;

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 id="lines-heading" className="text-lg font-semibold">
          Items
        </h2>
        {editable && !editing && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={startEditing}
          >
            Edit
          </Button>
        )}
      </div>

      <ul className="flex flex-col">
        {lines.map((line, index) => (
          <li
            key={line.pack_option_id}
            className="flex flex-col gap-2 border-border py-3 not-first:border-t-hairline"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="flex flex-col">
                <span className="font-medium">{line.product_name}</span>
                <span className="text-sm text-muted-foreground">
                  {line.pack_label} · {line.quantity} ×{" "}
                  {formatRupees(line.unit_price_paise)}
                </span>
              </span>
              <span className="font-semibold">
                {formatRupees(line.line_total_paise)}
              </span>
            </div>
            {editing && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={`Decrease ${line.product_name} ${line.pack_label}`}
                  disabled={line.quantity <= 1}
                  onClick={() => setQuantity(index, line.quantity - 1)}
                >
                  <MinusIcon aria-hidden className="size-4" />
                </Button>
                <span
                  aria-live="polite"
                  className="min-w-tap text-center font-semibold"
                >
                  {line.quantity}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={`Increase ${line.product_name} ${line.pack_label}`}
                  onClick={() => setQuantity(index, line.quantity + 1)}
                >
                  <PlusIcon aria-hidden className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={`Swap ${line.product_name} ${line.pack_label}`}
                  onClick={() => setPicking(index)}
                  className="ml-auto"
                >
                  <SwapIcon aria-hidden className="size-5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={`Remove ${line.product_name} ${line.pack_label}`}
                  onClick={() => remove(index)}
                >
                  <TrashIcon aria-hidden className="size-5" />
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {editing && lines.length === 0 && (
        <p className="py-3 text-muted-foreground">
          No items left. Add one, or cancel the order instead.
        </p>
      )}

      {editing && picking === null && (
        <Button
          type="button"
          variant="outline"
          className="mt-2 w-full"
          onClick={() => setPicking("add")}
        >
          <PlusIcon aria-hidden className="size-4" />
          Add item
        </Button>
      )}
      {editing && picking !== null && (
        <PackOptionSearch onChoose={choose} onClose={() => setPicking(null)} />
      )}

      <dl className="mt-2 flex flex-col gap-1 border-t-hairline border-border pt-3">
        <div className="flex justify-between text-muted-foreground">
          <dt>Subtotal</dt>
          <dd>{formatRupees(subtotal)}</dd>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <dt>Delivery charge</dt>
          <dd>{formatRupees(order.delivery_charge_paise)}</dd>
        </div>
        <div className="flex justify-between text-lg font-bold">
          <dt>Total</dt>
          <dd>{formatRupees(editing ? total : order.total_paise)}</dd>
        </div>
      </dl>

      {(editing || error) && (
        <div className="mt-4 flex flex-col gap-3">
          <FormError message={error} />
          {editing && (
            <div className="flex gap-3">
              <Button
                type="button"
                disabled={busy || lines.length === 0}
                onClick={save}
              >
                Save changes
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={stopEditing}
              >
                Discard
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** Finds Pack Options by product name or exact code, using the same admin search as the Products page. */
function PackOptionSearch({
  onChoose,
  onClose,
}: {
  onChoose: (product: Product, option: PackOption) => void;
  onClose: () => void;
}) {
  const id = useId();
  const [term, setTerm] = useState("");
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The latest term typed, so a slow answer to an older search is ignored.
  const latest = useRef("");

  useEffect(() => () => clearTimeout(timer.current ?? undefined), []);

  function type(value: string) {
    setTerm(value);
    latest.current = value.trim();
    clearTimeout(timer.current ?? undefined);
    if (!latest.current) {
      setProducts(null);
      return;
    }
    timer.current = setTimeout(
      () => search(latest.current),
      SEARCH_DEBOUNCE_MS,
    );
  }

  async function search(q: string) {
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/products?${new URLSearchParams({ q })}`,
        { credentials: "same-origin" },
      );
      if (!response.ok) throw new Error();
      const found = (await response.json()).items;
      if (q === latest.current) setProducts(found);
    } catch {
      setError("Couldn't search. Check the connection and try again.");
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-3 rounded-md border-hairline border-border bg-page p-3">
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="sr-only">
          Search by name or code
        </label>
        <div className="relative flex-1">
          <MagnifyingGlassIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            id={id}
            type="search"
            autoFocus
            value={term}
            onChange={(event) => type(event.target.value)}
            placeholder="Search by name or code"
            className={`${inputClass} pl-10`}
          />
        </div>
        <Button type="button" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
      <FormError message={error} />
      {products?.length === 0 && (
        <p className="text-muted-foreground">No products found.</p>
      )}
      <ul className="flex flex-col">
        {products?.flatMap((product) =>
          product.pack_options.map((option) => (
            <li
              key={option.id}
              className="border-border not-first:border-t-hairline"
            >
              <button
                type="button"
                onClick={() => onChoose(product, option)}
                className="flex min-h-tap w-full items-center justify-between gap-4 py-2 text-left hover:bg-accent"
              >
                <span className="flex flex-col">
                  <span className="font-medium">{product.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {option.label} · {option.code}
                    {option.in_stock ? "" : " · Out of stock"}
                  </span>
                </span>
                <span className="font-semibold">
                  {formatRupees(option.price_paise)}
                </span>
              </button>
            </li>
          )),
        )}
      </ul>
    </div>
  );
}
