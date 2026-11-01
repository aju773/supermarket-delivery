"use client";

import { XCircleIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CancelOrderDialog } from "@/components/ui/cancel-order-dialog";

const FAILED = "Couldn't cancel the order. Please try again or call the shop.";

/** The customer's Cancel button on the status page, shown while the Order is New or Confirmed. */
export function CancelOrder({ token }: { token: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/orders/${encodeURIComponent(token)}/cancel`,
        { method: "POST" },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(typeof body.detail === "string" ? body.detail : FAILED);
        router.refresh();
        return;
      }
      setOpen(false);
      setCancelled(true);
      router.refresh();
    } catch {
      setError(FAILED);
    } finally {
      setBusy(false);
    }
  }

  if (cancelled) {
    return (
      <p role="status" className="rounded-md border-hairline border-border bg-card px-3 py-2 text-center font-medium">
        Order cancelled
      </p>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="w-full text-destructive"
      >
        <XCircleIcon aria-hidden className="size-5" />
        Cancel order
      </Button>
      <CancelOrderDialog
        open={open}
        onOpenChange={setOpen}
        description="The shop will not deliver this order. You can place a new order any time."
        busy={busy}
        error={error}
        onConfirm={cancel}
      />
    </>
  );
}
