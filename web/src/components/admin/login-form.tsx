"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { FormError } from "@/components/admin/form-error";
import { inputClass, PasswordInput } from "@/components/admin/password-input";
import { Button } from "@/components/ui/button";
import { adminPost, errorDetail } from "@/lib/admin-api";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const response = await adminPost("/auth/login", {
      username: form.get("username"),
      password: form.get("password"),
    });
    if (response.ok) {
      router.replace("/admin/orders");
      router.refresh();
      return;
    }
    setError(await errorDetail(response));
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="username" className="font-medium">
          Username
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          required
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="font-medium">
          Password
        </label>
        <PasswordInput id="password" name="password" autoComplete="current-password" required />
      </div>
      <FormError message={error} />
      <Button type="submit" disabled={pending}>
        Log in
      </Button>
    </form>
  );
}
