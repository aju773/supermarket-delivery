"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { PlusIcon } from "@phosphor-icons/react";
import { useState, type FormEvent, type ReactNode } from "react";

import { FormError } from "@/components/admin/form-error";
import { PageHeader } from "@/components/admin/page-header";
import { inputClass, PasswordInput } from "@/components/admin/password-input";
import { useToast } from "@/components/admin/toast";
import { Button } from "@/components/ui/button";
import { adminPost, errorBody, type FieldErrors } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

export type Member = { id: number; username: string; is_active: boolean; is_you: boolean };

/** The dialog that is open, if any. */
type Action = { kind: "add" } | { kind: "reset" | "deactivate"; member: Member };

/** The Staff page: add Staff Members, reset their passwords, deactivate and reactivate them. */
export function StaffList({ members: initialMembers }: { members: Member[] }) {
  const toast = useToast();
  const [members, setMembers] = useState(initialMembers);
  const [action, setAction] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);

  function open(next: Action | null) {
    setAction(next);
    setError(null);
    setFieldErrors({});
  }

  /** Sends one change; returns the response, or null after showing the error. */
  async function send(path: string, body?: unknown) {
    setPending(true);
    setError(null);
    setFieldErrors({});
    const response = await adminPost(path, body);
    setPending(false);
    if (!response.ok) {
      const { detail, errors } = await errorBody(response);
      setError(detail);
      setFieldErrors(errors);
      return null;
    }
    return response;
  }

  /** Deactivated accounts sit below the active ones, like the server lists them. */
  function activeFirst(list: Member[]) {
    return [...list].sort((a, b) => Number(b.is_active) - Number(a.is_active));
  }

  async function add(form: FormData) {
    const response = await send("/staff", { username: form.get("username"), password: form.get("password") });
    if (!response) return;
    const member: Member = await response.json();
    setMembers((current) => activeFirst([...current, member]));
    open(null);
    toast("Staff member added");
  }

  async function resetPassword(member: Member, form: FormData) {
    if (!(await send(`/staff/${member.id}/password`, { new_password: form.get("password") }))) return;
    open(null);
    toast("Password reset");
  }

  async function setActive(member: Member, active: boolean) {
    const response = await send(`/staff/${member.id}/${active ? "reactivate" : "deactivate"}`);
    if (!response) return;
    const updated: Member = await response.json();
    setMembers((current) => activeFirst(current.map((member) => (member.id === updated.id ? updated : member))));
    open(null);
    toast(active ? "Staff member reactivated" : "Staff member deactivated");
  }

  return (
    <>
      <PageHeader
        title="Staff"
        action={
          <Button onClick={() => open({ kind: "add" })}>
            <PlusIcon aria-hidden className="size-4" />
            Add staff
          </Button>
        }
      />
      <section aria-label="Staff" className="rounded-lg border-hairline border-border bg-card px-4 py-2 shadow-sm md:px-6">
        {/* An error from reactivating shows here; the dialogs show their own. */}
        {action === null && <FormError message={error} />}
        <ul className="flex flex-col">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex min-h-tap flex-wrap items-center gap-x-4 gap-y-2 border-border py-3 not-first:border-t-hairline"
            >
              <span className={cn("flex min-w-0 flex-1 items-center gap-2", !member.is_active && "text-muted-foreground")}>
                <span className="truncate font-semibold">{member.username}</span>
                {member.is_you && <span className="text-muted-foreground">(you)</span>}
                <span
                  className={cn(
                    "shrink-0 rounded-sm px-2 text-xs font-semibold",
                    member.is_active
                      ? "bg-status-delivered text-status-delivered-foreground"
                      : "bg-status-cancelled text-status-cancelled-foreground",
                  )}
                >
                  {member.is_active ? "Active" : "Deactivated"}
                </span>
              </span>
              <span className="flex items-center gap-2">
                {member.is_active && !member.is_you && (
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={`Reset password for ${member.username}`}
                    onClick={() => open({ kind: "reset", member })}
                  >
                    Reset password
                  </Button>
                )}
                {member.is_active && !member.is_you && (
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={`Deactivate ${member.username}`}
                    className="text-destructive"
                    onClick={() => open({ kind: "deactivate", member })}
                  >
                    Deactivate
                  </Button>
                )}
                {!member.is_active && (
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={`Reactivate ${member.username}`}
                    disabled={pending}
                    onClick={() => setActive(member, true)}
                  >
                    Reactivate
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {action?.kind === "add" && (
        <StaffDialog title="Add staff" description="They can log in with this username and password." onClose={() => open(null)}>
          <StaffForm submitLabel="Add" pending={pending} error={error} onSubmit={add}>
            <Field label="Username" name="username" error={fieldErrors.username}>
              <input id="username" name="username" autoComplete="off" autoCapitalize="none" required maxLength={150} className={inputClass} />
            </Field>
            <Field label="Password" name="password" error={fieldErrors.password} hint="At least 8 characters.">
              <PasswordInput id="password" name="password" autoComplete="new-password" required />
            </Field>
          </StaffForm>
        </StaffDialog>
      )}
      {action?.kind === "reset" && (
        <StaffDialog
          title={`Reset password for ${action.member.username}`}
          description="Their other sessions are logged out."
          onClose={() => open(null)}
        >
          <StaffForm
            submitLabel="Reset password"
            pending={pending}
            error={error}
            onSubmit={(form) => resetPassword(action.member, form)}
          >
            <Field label="New password" name="password" hint="At least 8 characters.">
              <PasswordInput id="password" name="password" autoComplete="new-password" required />
            </Field>
          </StaffForm>
        </StaffDialog>
      )}
      {action?.kind === "deactivate" && (
        <StaffDialog
          title={`Deactivate ${action.member.username}?`}
          description={`${action.member.username} won't be able to log in. Their name stays on past orders.`}
          onClose={() => open(null)}
        >
          <FormError message={error} />
          <div className="flex justify-end gap-3">
            <Dialog.Close asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Dialog.Close>
            <Button type="button" variant="destructive" disabled={pending} onClick={() => setActive(action.member, false)}>
              {pending ? "Deactivating…" : "Deactivate"}
            </Button>
          </div>
        </StaffDialog>
      )}
    </>
  );
}

function StaffDialog({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-dialog bg-overlay" />
        <Dialog.Content className="fixed inset-x-4 top-1/2 z-dialog mx-auto flex max-h-dvh w-auto max-w-form -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-lg bg-card p-6 shadow-md">
          <Dialog.Title className="text-xl font-semibold">{title}</Dialog.Title>
          <Dialog.Description className="text-muted-foreground">{description}</Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function StaffForm({
  submitLabel,
  pending,
  error,
  onSubmit,
  children,
}: {
  submitLabel: string;
  pending: boolean;
  error: string | null;
  onSubmit: (form: FormData) => void;
  children: ReactNode;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(new FormData(event.currentTarget));
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {children}
      <FormError message={error} />
      <div className="flex justify-end gap-3">
        <Dialog.Close asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </Dialog.Close>
        <Button type="submit" disabled={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  hint,
  error,
  children,
}: {
  label: string;
  name: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="font-medium">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-muted-foreground">{hint}</p>}
      {error && <p className="text-error-foreground">{error}</p>}
    </div>
  );
}
