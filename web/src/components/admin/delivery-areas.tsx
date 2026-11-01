"use client";

import { ArrowDownIcon, ArrowUpIcon, PlusIcon } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";

import { FormError } from "@/components/admin/form-error";
import { inputClass } from "@/components/admin/password-input";
import { SettingsCard } from "@/components/admin/settings-card";
import { useToast } from "@/components/admin/toast";
import { Button } from "@/components/ui/button";
import { adminSend, errorBody } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

export type DeliveryArea = { id: number; name: string; is_active: boolean };

/** Add, rename, reorder and disable Delivery Areas. Each change saves straight away. */
export function DeliveryAreas({ areas: initialAreas }: { areas: DeliveryArea[] }) {
  const toast = useToast();
  const [areas, setAreas] = useState(initialAreas);
  const [adding, setAdding] = useState(false);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  /** Sends one change; returns the response body, or null after showing the error. */
  async function send(method: "POST" | "PUT" | "PATCH", path: string, body: unknown) {
    setPending(true);
    setError(null);
    const response = await adminSend(method, path, body);
    setPending(false);
    if (!response.ok) {
      const { detail, errors } = await errorBody(response);
      setError(errors.name ?? detail);
      return null;
    }
    return response.json();
  }

  async function add(name: string) {
    const area: DeliveryArea | null = await send("POST", "/delivery-areas", { name });
    if (!area) return;
    setAreas((current) => [...current, area]);
    setAdding(false);
    toast("Area added");
  }

  async function change(id: number, change: Partial<Omit<DeliveryArea, "id">>, message: string) {
    const area: DeliveryArea | null = await send("PATCH", `/delivery-areas/${id}`, change);
    if (!area) return;
    setAreas((current) => current.map((each) => (each.id === id ? area : each)));
    setRenamingId(null);
    toast(message);
  }

  async function move(index: number, by: -1 | 1) {
    const ids = areas.map((area) => area.id);
    [ids[index], ids[index + by]] = [ids[index + by], ids[index]];
    const reordered: DeliveryArea[] | null = await send("PUT", "/delivery-areas/order", { ids });
    if (reordered) setAreas(reordered);
  }

  return (
    <SettingsCard
      title="Delivery areas"
      action={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setAdding(true);
            setRenamingId(null);
            setError(null);
          }}
        >
          <PlusIcon aria-hidden className="size-4" />
          Add area
        </Button>
      }
    >
      <FormError message={error} />
      {areas.length === 0 && !adding && (
        <p className="text-muted-foreground">No delivery areas yet. Add the areas you deliver to.</p>
      )}
      <ul className="flex flex-col">
        {areas.map((area, index) => (
          <li
            key={area.id}
            className="flex min-h-tap items-center gap-1 border-t-hairline border-border py-2"
          >
            {renamingId === area.id ? (
              <NameForm
                label={`New name for ${area.name}`}
                initial={area.name}
                submitLabel="Save"
                pending={pending}
                onSubmit={(name) => change(area.id, { name }, "Area renamed")}
                onCancel={() => setRenamingId(null)}
              />
            ) : (
              <>
                <span
                  className={cn("flex min-w-0 flex-1 items-center gap-2", !area.is_active && "text-muted-foreground")}
                >
                  <span className="truncate">{area.name}</span>
                  {!area.is_active && (
                    <span className="shrink-0 rounded-sm border-hairline border-border bg-muted px-2 text-xs">Disabled</span>
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move ${area.name} up`}
                  disabled={pending || index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUpIcon aria-hidden className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move ${area.name} down`}
                  disabled={pending || index === areas.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDownIcon aria-hidden className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Rename ${area.name}`}
                  onClick={() => {
                    setRenamingId(area.id);
                    setAdding(false);
                    setError(null);
                  }}
                >
                  Rename
                </Button>
                <Switch
                  label={`Deliver to ${area.name}`}
                  checked={area.is_active}
                  disabled={pending}
                  onChange={(isActive) =>
                    change(area.id, { is_active: isActive }, isActive ? "Area enabled" : "Area disabled")
                  }
                />
              </>
            )}
          </li>
        ))}
        {adding && (
          <li className="flex flex-wrap items-center gap-2 border-t-hairline border-border py-2">
            <NameForm
              label="New area name"
              initial=""
              submitLabel="Add"
              pending={pending}
              onSubmit={add}
              onCancel={() => setAdding(false)}
            />
          </li>
        )}
      </ul>
    </SettingsCard>
  );
}

function NameForm({
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

function Switch({
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
