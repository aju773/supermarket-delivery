"use client";

import { useEffect, useState } from "react";

import { POLL_INTERVAL_MS } from "@/lib/live-orders";
import { badgeText, type OrdersSummary } from "@/lib/orders-summary";
import { cn } from "@/lib/utils";

/**
 * How many Orders are New, kept current from any admin page: it starts from the count the server
 * rendered, follows each server refresh (the live Orders list refreshes the page), and polls the
 * summary so the other pages stay current too.
 */
export function useNewOrders(serverCount: number): number {
  const [count, setCount] = useState(serverCount);
  useEffect(() => setCount(serverCount), [serverCount]);

  useEffect(() => {
    let stopped = false;
    let polling = false;
    async function poll() {
      // A slow response must not be overtaken by a newer one and then overwrite it.
      if (polling) return;
      polling = true;
      try {
        const response = await fetch("/api/admin/orders/summary", { credentials: "same-origin", cache: "no-store" });
        if (stopped || !response.ok) return;
        const summary: OrdersSummary = await response.json();
        setCount(summary.new);
      } catch {
        // Offline for a moment: the next poll catches up.
      } finally {
        polling = false;
      }
    }
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, []);

  return count;
}

/** The count in a dark circle, hidden when nothing is new. `className` places it. */
export function NewOrdersBadge({ count, className }: { count: number; className?: string }) {
  const text = badgeText(count);
  if (!text) return null;
  return (
    <span
      className={cn(
        "inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground",
        className,
      )}
    >
      <span aria-hidden>{text}</span>
      <span className="sr-only">{count === 1 ? "1 new order" : `${count} new orders`}</span>
    </span>
  );
}
