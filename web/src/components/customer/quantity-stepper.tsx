"use client";

import { MinusIcon, PlusIcon } from "@phosphor-icons/react/ssr";

const stepButton = "inline-flex min-h-tap min-w-tap items-center justify-center rounded-md hover:bg-brand/90";

/** The green − 1 + counter. Going below 1 is left to the caller (it removes the line). */
export function QuantityStepper({
  quantity,
  label,
  onChange,
}: {
  quantity: number;
  label: string;
  onChange: (quantity: number) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-md bg-brand text-brand-foreground" role="group" aria-label={label}>
      <button type="button" aria-label={`Remove one ${label}`} className={stepButton} onClick={() => onChange(quantity - 1)}>
        <MinusIcon aria-hidden weight="bold" className="size-4" />
      </button>
      <span aria-live="polite" className="min-w-6 text-center font-semibold">
        {quantity}
      </span>
      <button type="button" aria-label={`Add one more ${label}`} className={stepButton} onClick={() => onChange(quantity + 1)}>
        <PlusIcon aria-hidden weight="bold" className="size-4" />
      </button>
    </div>
  );
}
