"use client";

import { BasketIcon, MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { StatusBadge } from "@/components/admin/order-badges";
import {
  SEARCH_DELAY_MS,
  isSearchable,
  resultRows,
  type OrderResult,
  type ProductResult,
  type ResultRow,
  type SearchResults,
} from "@/lib/admin-search";
import { formatPhone, formatRupees } from "@/lib/format";
import { cn } from "@/lib/utils";

/** The answer to one query; no results means the request failed. */
type Answer = { query: string; results: SearchResults | null };

const heading = "px-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase";
const rowClass = "flex min-h-tap cursor-pointer items-center gap-3 rounded-sm px-3 py-1";

/**
 * The top bar's "Search products or orders" box. On wide screens it sits in the bar; on phones it is a
 * field that covers the bar while `searchOpen`. Results appear as you type, grouped under Products and Orders.
 */
export function AdminSearch({ searchOpen, onSearchClose }: { searchOpen: boolean; onSearchClose: () => void }) {
  const router = useRouter();
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const trimmed = query.trim();

  useEffect(() => {
    if (searchOpen) input.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!isSearchable(trimmed)) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/admin/search?q=${encodeURIComponent(trimmed)}`, {
          credentials: "same-origin",
          signal: controller.signal,
        });
        setAnswer({ query: trimmed, results: response.ok ? await response.json() : null });
      } catch {
        // A newer query replaced this one, or the server can't be reached.
        if (!controller.signal.aborted) setAnswer({ query: trimmed, results: null });
      }
    }, SEARCH_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  // Only an answer to what is typed now is shown or opened; an older one may be about something else.
  const current = isSearchable(trimmed) && answer?.query === trimmed ? answer : null;
  const rows = current?.results ? resultRows(current.results) : [];
  const activeRow = rows[Math.min(active, rows.length - 1)];
  const showPanel = open && current !== null;

  function close() {
    setOpen(false);
    onSearchClose();
  }

  function openRow(row: ResultRow) {
    router.push(row.href);
    setQuery("");
    setAnswer(null);
    close();
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      close();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((index) => (rows.length ? (Math.min(index, rows.length - 1) + step + rows.length) % rows.length : 0));
    } else if (event.key === "Enter" && showPanel && activeRow) {
      event.preventDefault();
      openRow(activeRow);
    }
  }

  return (
    <div
      role="search"
      className={cn(
        "relative min-w-0 md:mx-auto md:block md:w-full md:max-w-xl md:flex-1",
        searchOpen
          ? "max-md:absolute max-md:inset-0 max-md:flex max-md:items-center max-md:gap-1 max-md:bg-topbar max-md:px-2"
          : "max-md:hidden",
      )}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <div className="relative min-w-0 flex-1">
        <MagnifyingGlassIcon
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-topbar-field-foreground"
        />
        <input
          ref={input}
          type="search"
          role="combobox"
          aria-label="Search products or orders"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-activedescendant={showPanel && activeRow ? `${listId}-${activeRow.key}` : undefined}
          autoComplete="off"
          placeholder="Search products or orders"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="block min-h-tap w-full rounded-md border-hairline border-topbar-field-border bg-topbar-field pr-3 pl-10 text-base text-topbar-field-foreground placeholder:text-topbar-field-foreground/70 focus-visible:outline-topbar-ring"
        />
      </div>
      {searchOpen && (
        <button
          type="button"
          aria-label="Close search"
          onClick={close}
          className="inline-flex min-h-tap min-w-tap items-center justify-center rounded-md focus-visible:outline-topbar-ring md:hidden"
        >
          <XIcon aria-hidden className="size-6" />
        </button>
      )}

      {showPanel && (
        <div
          id={listId}
          role="listbox"
          aria-label="Search results"
          // Keeps focus in the field while a result is tapped, so the panel isn't closed before the tap lands.
          onMouseDown={(event) => event.preventDefault()}
          className="absolute inset-x-0 top-full z-menu mt-1 max-h-96 overflow-y-auto rounded-md border-hairline border-border bg-popover p-1 text-sm text-popover-foreground shadow-md"
        >
          {current.results === null ? (
            <p className="px-3 py-2 text-muted-foreground">Search isn&apos;t working. Check the connection.</p>
          ) : rows.length === 0 ? (
            <p className="px-3 py-2 text-muted-foreground">No products or orders found.</p>
          ) : (
            <Groups rows={rows} listId={listId} active={activeRow} onPick={openRow} onHover={setActive} />
          )}
        </div>
      )}
    </div>
  );
}

function Groups({
  rows,
  listId,
  active,
  onPick,
  onHover,
}: {
  rows: ResultRow[];
  listId: string;
  active: ResultRow | undefined;
  onPick: (row: ResultRow) => void;
  onHover: (index: number) => void;
}) {
  const groups = [
    { title: "Products", rows: rows.filter((row) => row.kind === "product") },
    { title: "Orders", rows: rows.filter((row) => row.kind === "order") },
  ].filter((group) => group.rows.length > 0);
  return (
    <>
      {groups.map((group) => (
        <div key={group.title} role="group" aria-label={group.title}>
          <p aria-hidden className={heading}>
            {group.title}
          </p>
          {group.rows.map((row) => (
            <div
              key={row.key}
              id={`${listId}-${row.key}`}
              role="option"
              aria-selected={row === active}
              onClick={() => onPick(row)}
              onMouseMove={() => onHover(rows.indexOf(row))}
              className={cn(rowClass, row === active && "bg-accent")}
            >
              {row.kind === "product" ? <ProductRow product={row.product} /> : <OrderRow order={row.order} />}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

function ProductRow({ product }: { product: ProductResult }) {
  return (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-sm border-hairline border-border bg-muted">
        {product.thumbnail_url ? (
          <img src={product.thumbnail_url} alt="" className="size-full object-cover" />
        ) : (
          <BasketIcon aria-hidden className="size-4 text-muted-foreground" />
        )}
      </span>
      <span className="min-w-0 truncate font-semibold">{product.name}</span>
      <span className="ml-auto shrink-0 text-muted-foreground">{product.category}</span>
    </>
  );
}

function OrderRow({ order }: { order: OrderResult }) {
  return (
    <>
      <span className="flex min-w-0 flex-wrap items-center gap-x-2">
        <span className="font-semibold">#{order.number}</span>
        <span className="truncate">{order.customer_name}</span>
        <span className="text-muted-foreground">{formatPhone(order.phone)}</span>
        <span className="text-muted-foreground">{formatRupees(order.total_paise)}</span>
      </span>
      <span className="ml-auto">
        <StatusBadge status={order.status} />
      </span>
    </>
  );
}
