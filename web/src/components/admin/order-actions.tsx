"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { DotsThreeIcon, XCircleIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { FormError } from "@/components/admin/form-error";
import { useToast } from "@/components/admin/toast";
import { Button } from "@/components/ui/button";
import { CancelOrderDialog } from "@/components/ui/cancel-order-dialog";
import { adminPost, errorDetail } from "@/lib/admin-api";
import {
  nextStep,
  staffCanCancel,
  type OrderStatus,
} from "@/lib/order-timeline";

/**
 * The staff's status buttons. Phones: the next step is a sticky button above the tab bar and Cancel sits in
 * a ⋯ menu. Wide screens: both in the page, above the order (`children`).
 */
export function OrderActions({
  number,
  status,
  children,
}: {
  number: number;
  status: OrderStatus;
  children: ReactNode;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const next = nextStep(status);
  const canCancel = staffCanCancel(status);
  if (!next && !canCancel) return children;

  async function move(to: OrderStatus): Promise<string | null> {
    setBusy(true);
    const response = await adminPost(`/orders/${number}/status`, {
      status: to,
    });
    setBusy(false);
    if (!response.ok) {
      // Someone else may have moved it meanwhile: show their change along with the message.
      router.refresh();
      return errorDetail(response);
    }
    router.refresh();
    return null;
  }

  async function advance() {
    if (!next) return;
    setError(null);
    const problem = await move(next.status);
    if (problem) setError(problem);
    else toast(next.done);
  }

  async function cancel() {
    setCancelError(null);
    const problem = await move("cancelled");
    if (problem) return setCancelError(problem);
    setCancelling(false);
    toast("Order cancelled");
  }

  function openCancel() {
    setCancelError(null);
    setCancelling(true);
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 md:mb-6">
        <FormError message={error} />
        <div className="flex items-center gap-3">
          {next && (
            <Button
              type="button"
              disabled={busy}
              onClick={advance}
              className="max-md:hidden"
            >
              {next.action}
            </Button>
          )}
          {canCancel && (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={openCancel}
              className="max-md:hidden"
            >
              <XCircleIcon aria-hidden className="size-5" />
              Cancel order
            </Button>
          )}
          {canCancel && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="More actions"
                  className="ml-auto md:hidden"
                >
                  <DotsThreeIcon aria-hidden weight="bold" className="size-6" />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  className="z-menu mt-1 min-w-48 rounded-md border-hairline border-border bg-popover p-1 text-popover-foreground shadow-md"
                >
                  <DropdownMenu.Item
                    onSelect={openCancel}
                    className="flex min-h-tap cursor-pointer items-center gap-3 rounded-sm px-3 text-destructive outline-none data-highlighted:bg-accent"
                  >
                    <XCircleIcon aria-hidden className="size-5" />
                    Cancel order
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}
        </div>
      </div>

      {children}

      {next && (
        // Sits just above the bottom tab bar; the page's bottom padding leaves room for both.
        <div className="sticky bottom-tabbar z-tabbar -mx-4 mt-4 border-t-hairline border-border bg-card px-4 py-3 md:hidden">
          <Button
            type="button"
            disabled={busy}
            onClick={advance}
            className="w-full"
          >
            {next.action}
          </Button>
        </div>
      )}

      <CancelOrderDialog
        open={cancelling}
        onOpenChange={setCancelling}
        description={`Order #${number} will be cancelled. The customer will see this on their status page.`}
        busy={busy}
        error={cancelError}
        onConfirm={cancel}
      />
    </>
  );
}
