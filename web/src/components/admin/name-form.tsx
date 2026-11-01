"use client";

import { type FormEvent } from "react";

import { inputClass } from "@/components/admin/password-input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** An inline form for one name, e.g. adding or renaming a Delivery Area or Category. */
export function NameForm({
  label,
  initial,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  label: string;
  initial: string;
  submitLabel: string;
  pending: boolean;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(String(new FormData(event.currentTarget).get("name")));
  }

  return (
    <form onSubmit={submit} className="flex w-full flex-wrap items-center gap-2">
      <input
        name="name"
        aria-label={label}
        defaultValue={initial}
        autoFocus
        required
        maxLength={100}
        className={cn(inputClass, "w-auto flex-1")}
      />
      <Button type="submit" size="sm" disabled={pending}>
        {submitLabel}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
        Cancel
      </Button>
    </form>
  );
}
