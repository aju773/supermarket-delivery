"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { WarningCircleIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";

/** Asks before cancelling an Order, for staff and customers alike. Shows the error if cancelling failed. */
export function CancelOrderDialog({
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
          <Dialog.Title className="text-xl font-semibold">
            Cancel this order?
          </Dialog.Title>
          <Dialog.Description className="text-muted-foreground">
            {description}
          </Dialog.Description>
          <div role="alert">
            {error && (
              <p className="flex items-center gap-2 rounded-md border-hairline border-error-border bg-error px-3 py-2 text-error-foreground">
                <WarningCircleIcon aria-hidden className="size-5 shrink-0" />
                {error}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={onConfirm}
              className="w-full"
            >
              {busy ? "Cancelling…" : "Yes, cancel order"}
            </Button>
            <Dialog.Close asChild>
              <Button type="button" variant="outline" className="w-full">
                Keep order
              </Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
