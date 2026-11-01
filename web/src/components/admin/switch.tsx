"use client";

import { cn } from "@/lib/utils";

/** An on/off switch with a 44 px tap target. */
export function Switch({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex min-h-tap min-w-tap items-center justify-center disabled:opacity-50"
    >
      <span
        aria-hidden
        className={cn(
          "flex h-6 w-11 items-center rounded-full p-0.5 transition-colors",
          checked ? "bg-brand" : "bg-input",
        )}
      >
        <span
          className={cn(
            "size-5 rounded-full bg-card shadow-sm transition-transform",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </span>
    </button>
  );
}
