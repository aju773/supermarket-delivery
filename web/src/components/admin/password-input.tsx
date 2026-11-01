"use client";

import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { useState, type ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** A password field with a show/hide button, for typing on a phone keyboard. */
export function PasswordInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className={cn(inputClass, "pr-12", className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 inline-flex min-w-tap items-center justify-center rounded-md text-muted-foreground"
      >
        {visible ? <EyeSlashIcon aria-hidden className="size-5" /> : <EyeIcon aria-hidden className="size-5" />}
      </button>
    </div>
  );
}

export const inputClass =
  "block min-h-tap w-full rounded-md border-hairline border-input bg-background px-3 aria-invalid:border-destructive";
