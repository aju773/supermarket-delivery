"use client";

import { useState, type FormEvent } from "react";

import { FormError } from "@/components/admin/form-error";
import { PasswordInput } from "@/components/admin/password-input";
import { useToast } from "@/components/admin/toast";
import { Button } from "@/components/ui/button";
import { adminPost, errorDetail } from "@/lib/admin-api";

export function ChangePasswordForm() {
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    if (form.get("new_password") !== form.get("confirm_password")) {
      setError("New passwords don't match.");
      return;
    }
    setPending(true);
    setError(null);
    const response = await adminPost("/auth/password", {
      current_password: form.get("current_password"),
      new_password: form.get("new_password"),
    });
    setPending(false);
    if (!response.ok) {
      setError(await errorDetail(response));
      return;
    }
    formElement.reset();
    toast("Password changed");
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field id="current_password" label="Current password" autoComplete="current-password" />
      <Field id="new_password" label="New password" autoComplete="new-password" hint="At least 8 characters." />
      <Field id="confirm_password" label="Confirm new password" autoComplete="new-password" />
      <FormError message={error} />
      <Button type="submit" disabled={pending}>
        Update password
      </Button>
    </form>
  );
}

function Field({ id, label, autoComplete, hint }: { id: string; label: string; autoComplete: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      <PasswordInput
        id={id}
        name={id}
        autoComplete={autoComplete}
        required
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
