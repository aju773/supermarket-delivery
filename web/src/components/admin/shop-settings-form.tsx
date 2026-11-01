"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

import { FormError } from "@/components/admin/form-error";
import { PageHeader } from "@/components/admin/page-header";
import { inputClass } from "@/components/admin/password-input";
import { SettingsCard } from "@/components/admin/settings-card";
import { useToast } from "@/components/admin/toast";
import { Button } from "@/components/ui/button";
import { adminSend, errorBody, type FieldErrors } from "@/lib/admin-api";
import { paiseToRupees, rupeesToPaise } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Shop Settings as the admin API returns them. Money is whole paise; times are "HH:MM". */
export type ShopSettings = {
  minimum_order_paise: number;
  delivery_charge_paise: number;
  opening_time: string;
  closing_time: string;
  phone: string;
  orders_per_hour_limit: number;
};

const NOT_AN_AMOUNT = "Enter an amount in rupees, like 200 or 38.50.";

/** The page header with its Save button, and the Shop and Orders and delivery cards. */
export function ShopSettingsForm({ settings }: { settings: ShopSettings }) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const minimumOrder = rupeesToPaise(String(form.get("minimum_order")));
    const deliveryCharge = rupeesToPaise(String(form.get("delivery_charge")));
    const localErrors: FieldErrors = {};
    if (Number.isNaN(minimumOrder)) localErrors.minimum_order_paise = NOT_AN_AMOUNT;
    if (Number.isNaN(deliveryCharge)) localErrors.delivery_charge_paise = NOT_AN_AMOUNT;
    if (!form.get("opening_time")) localErrors.opening_time = "Enter the opening time.";
    if (!form.get("closing_time")) localErrors.closing_time = "Enter the closing time.";
    if (!/^\d+$/.test(String(form.get("orders_per_hour_limit")).trim()))
      localErrors.orders_per_hour_limit = "Enter a whole number, like 3.";
    if (Object.keys(localErrors).length) {
      setFieldErrors(localErrors);
      setError("Please fix the errors below.");
      return;
    }

    setPending(true);
    setError(null);
    setFieldErrors({});
    const response = await adminSend("PUT", "/settings", {
      minimum_order_paise: minimumOrder,
      delivery_charge_paise: deliveryCharge,
      opening_time: form.get("opening_time"),
      closing_time: form.get("closing_time"),
      phone: form.get("phone"),
      orders_per_hour_limit: Number(form.get("orders_per_hour_limit")),
    });
    setPending(false);
    if (!response.ok) {
      const body = await errorBody(response);
      setError(body.detail);
      setFieldErrors(body.errors);
      return;
    }
    toast("Settings saved");
    router.refresh();
  }

  return (
    <form id="shop-settings" onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        action={
          <Button type="submit" disabled={pending}>
            Save
          </Button>
        }
      />
      <FormError message={error} />

      <SettingsCard title="Shop">
        <Field id="phone" label="Shop phone number" note="(shown to customers)" error={fieldErrors.phone}>
          {(props) => (
            <input {...props} type="tel" autoComplete="tel" defaultValue={settings.phone} className={inputClass} />
          )}
        </Field>
      </SettingsCard>

      <SettingsCard title="Orders and delivery">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="minimum_order" label="Minimum order amount (₹)" error={fieldErrors.minimum_order_paise}>
            {(props) => <RupeeInput {...props} defaultValue={paiseToRupees(settings.minimum_order_paise)} />}
          </Field>
          <Field id="delivery_charge" label="Delivery charge (₹)" error={fieldErrors.delivery_charge_paise}>
            {(props) => <RupeeInput {...props} defaultValue={paiseToRupees(settings.delivery_charge_paise)} />}
          </Field>
        </div>
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 font-medium">Delivery hours</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="opening_time" label="Opening time" small error={fieldErrors.opening_time}>
              {(props) => <input {...props} type="time" required defaultValue={settings.opening_time} className={inputClass} />}
            </Field>
            <Field id="closing_time" label="Closing time" small error={fieldErrors.closing_time}>
              {(props) => <input {...props} type="time" required defaultValue={settings.closing_time} className={inputClass} />}
            </Field>
          </div>
        </fieldset>
        <Field
          id="orders_per_hour_limit"
          label="Orders per phone number per hour"
          hint="Limits prank orders."
          error={fieldErrors.orders_per_hour_limit}
        >
          {(props) => (
            <input
              {...props}
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              defaultValue={settings.orders_per_hour_limit}
              className={cn(inputClass, "sm:max-w-form")}
            />
          )}
        </Field>
      </SettingsCard>
    </form>
  );
}

type FieldProps = { id: string; name: string; "aria-invalid"?: true; "aria-describedby"?: string };

function Field({
  id,
  label,
  note,
  hint,
  small,
  error,
  children,
}: {
  id: string;
  label: string;
  note?: string;
  hint?: string;
  small?: boolean;
  error?: string;
  children: (props: FieldProps) => ReactNode;
}) {
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ");
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={small ? "text-xs text-muted-foreground" : "font-medium"}>
        {label} {note && <span className="text-xs font-normal text-muted-foreground">{note}</span>}
      </label>
      {children({
        id,
        name: id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy || undefined,
      })}
      {error && (
        <p id={`${id}-error`} className="text-error-foreground">
          {error}
        </p>
      )}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

function RupeeInput(props: FieldProps & { defaultValue: string }) {
  return (
    <div className="relative">
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
        ₹
      </span>
      <input {...props} type="text" inputMode="decimal" className={cn(inputClass, "pl-8")} />
    </div>
  );
}
