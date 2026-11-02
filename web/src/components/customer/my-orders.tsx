"use client";

import { ReceiptIcon, XIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { StatusBadge } from "@/components/admin/order-badges";
import { itemsText } from "@/components/customer/cart-bar";
import { Button } from "@/components/ui/button";
import { addToCart } from "@/lib/cart-store";
import { loadOrderTokens } from "@/lib/customer-store";
import { formatDayAndTime, formatRupees } from "@/lib/format";
import type { OrderStatus } from "@/lib/order-timeline";
import { addedText, type ReorderLookup, skippedText } from "@/lib/reorder";

/** One Order as "My orders" lists it, from the API's `/orders/mine`. */
type OrderSummary = {
  token: string;
  number: number;
  status: OrderStatus;
  placed_at: string;
  item_count: number;
  total_paise: number;
};

const LOAD_FAILED = "Couldn't load your orders. Please try again.";
const REORDER_FAILED = "Couldn't reorder. Please try again or call the shop.";

/** "Today, 10:42 AM" or "24 Oct, 6:15 PM". */
function placedOn(at: string, timeZone: string): string {
  const text = formatDayAndTime(at, timeZone);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The Orders placed from this phone (found through the tokens kept in localStorage), each with View and Reorder. */
export function MyOrders({ timeZone }: { timeZone: string }) {
  // null while loading.
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reordering, setReordering] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ added: string; skipped: string | null } | null>(null);

  useEffect(() => {
    const tokens = loadOrderTokens();
    if (tokens.length === 0) {
      setOrders([]);
      return;
    }
    const controller = new AbortController();
    fetch("/api/orders/mine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokens }),
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((summaries: OrderSummary[]) => setOrders(summaries))
      .catch(() => {
        if (controller.signal.aborted) return;
        setError(LOAD_FAILED);
        setOrders([]);
      });
    return () => controller.abort();
  }, []);

  async function reorder(token: string) {
    setReordering(token);
    setNotice(null);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(token)}/reorder`, { cache: "no-store" });
      if (!response.ok) {
        setError(REORDER_FAILED);
        return;
      }
      const lookup: ReorderLookup = await response.json();
      addToCart(lookup.lines);
      setNotice({ added: addedText(lookup.lines), skipped: skippedText(lookup.skipped) });
    } catch {
      setError(REORDER_FAILED);
    } finally {
      setReordering(null);
    }
  }

  return (
    <>
      {error && (
        <p role="alert" className="rounded-md border-hairline border-error-border bg-error px-3 py-2 text-error-foreground">
          {error}
        </p>
      )}

      {orders === null ? null : orders.length === 0 ? (
        !error && (
          <div className="flex flex-col items-center gap-4 rounded-lg border-hairline border-border bg-card p-8 text-center shadow-sm">
            <ReceiptIcon aria-hidden className="size-12 text-muted-foreground" />
            <p>You haven't placed any orders from this phone yet.</p>
            <Button asChild variant="brand">
              <Link href="/">Start shopping</Link>
            </Button>
          </div>
        )
      ) : (
        <ul className="flex flex-col gap-4">
          {orders.map((order) => (
            <li
              key={order.token}
              className="flex flex-col gap-3 rounded-lg border-hairline border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col">
                  <h2 className="text-lg font-bold">Order #{order.number}</h2>
                  <p className="text-muted-foreground">
                    {placedOn(order.placed_at, timeZone)} · {itemsText(order.item_count)}
                  </p>
                </div>
                <StatusBadge status={order.status} />
              </div>
              <div className="flex items-center gap-2 border-t-hairline border-border pt-3">
                <span className="text-lg font-bold">{formatRupees(order.total_paise)}</span>
                <Button asChild variant="ghost" className="ml-auto">
                  <Link href={`/orders/${order.token}`} aria-label={`View order ${order.number}`}>
                    View
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  aria-label={`Reorder order ${order.number}`}
                  disabled={reordering !== null}
                  onClick={() => reorder(order.token)}
                >
                  {reordering === order.token ? "Adding…" : "Reorder"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div role="status" className="pointer-events-none fixed inset-x-0 bottom-24 z-toast flex justify-center px-4 md:bottom-6">
        {notice && (
          <div className="pointer-events-auto flex w-full max-w-form items-start gap-3 rounded-lg bg-primary px-4 py-3 text-primary-foreground shadow-md">
            <p className="grow">
              {notice.added}
              {notice.skipped && <span className="mt-1 block">{notice.skipped}</span>}
            </p>
            <Link href="/cart" className="shrink-0 font-semibold underline">
              View cart
            </Link>
            <button
              type="button"
              aria-label="Dismiss"
              className="inline-flex shrink-0 items-center justify-center rounded-sm"
              onClick={() => setNotice(null)}
            >
              <XIcon aria-hidden className="size-5" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
