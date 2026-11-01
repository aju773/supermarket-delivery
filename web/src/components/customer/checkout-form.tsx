"use client";

import { ArrowLeftIcon, ClockIcon, ShoppingCartIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useState } from "react";

import { FinalAmountNote } from "@/components/customer/final-amount-note";
import { Button } from "@/components/ui/button";
import { type ShopTerms, summarise } from "@/lib/cart";
import { clearCart, useCart, useCartLoaded } from "@/lib/cart-store";
import type { CustomerDetails, PaymentMethod } from "@/lib/customer";
import { loadCustomerDetails, rememberOrder } from "@/lib/customer-store";
import { formatRupees } from "@/lib/format";
import { cn } from "@/lib/utils";

type Area = { id: number; name: string };
type FieldErrors = Partial<Record<string, string>>;

const inputClass =
  "block min-h-tap w-full rounded-md border-hairline border-input bg-background px-3 py-2 text-input aria-invalid:border-destructive";

const EMPTY_DETAILS: CustomerDetails = {
  name: "",
  phone: "",
  deliveryAreaId: null,
  address: "",
  landmark: "",
  paymentMethod: "cash",
};

/** The checkout page: customer details, payment choice, a short summary and the sticky Place order button. */
export function CheckoutForm({ shop, areas, closedNotice }: { shop: ShopTerms; areas: Area[]; closedNotice: string | null }) {
  const cart = useCart();
  const loaded = useCartLoaded();
  return (
    <div className="mx-auto flex w-full max-w-form flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link href="/cart" aria-label="Back to cart" className="inline-flex min-h-tap min-w-tap items-center justify-center rounded-md">
          <ArrowLeftIcon aria-hidden className="size-6" />
        </Link>
        <h1 className="text-2xl font-bold">Checkout</h1>
      </div>
      {!loaded ? null : cart.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border-hairline border-border bg-card p-8 text-center shadow-sm">
          <ShoppingCartIcon aria-hidden className="size-12 text-muted-foreground" />
          <p>Your cart is empty.</p>
          <Button asChild variant="brand">
            <Link href="/">Browse products</Link>
          </Button>
        </div>
      ) : (
        // Mounted only in the browser, so the saved details can fill the form from the start.
        <DetailsForm shop={shop} areas={areas} closedNotice={closedNotice} />
      )}
    </div>
  );
}

function DetailsForm({ shop, areas, closedNotice }: { shop: ShopTerms; areas: Area[]; closedNotice: string | null }) {
  const router = useRouter();
  const cart = useCart();
  const summary = summarise(cart, shop);
  const [saved] = useState(() => {
    const details = loadCustomerDetails() ?? EMPTY_DETAILS;
    // A saved area that's no longer active isn't offered.
    return areas.some((area) => area.id === details.deliveryAreaId) ? details : { ...details, deliveryAreaId: null };
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(saved.paymentMethod);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "");
    const areaId = Number(text("delivery_area_id")) || null;
    setPlacing(true);
    setError(null);
    try {
      const response = await fetch("/api/orders/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: text("name"),
          phone: text("phone"),
          delivery_area_id: areaId,
          address: text("address"),
          landmark: text("landmark"),
          note: text("note"),
          payment_method: paymentMethod,
          lines: cart.map((line) => ({
            pack_option_id: line.packOptionId,
            quantity: line.quantity,
            price_paise: line.pricePaise,
          })),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (response.status === 201) {
        rememberOrder(
          {
            name: text("name").trim(),
            phone: text("phone").trim(),
            deliveryAreaId: areaId,
            address: text("address").trim(),
            landmark: text("landmark").trim(),
            paymentMethod,
          },
          body.token,
        );
        clearCart();
        router.push(`/orders/${body.token}?placed=1`);
        return;
      }
      setErrors(body.errors ?? {});
      setError(body.detail ?? "Something went wrong. Please try again.");
    } catch {
      setError("Couldn't reach the shop. Check your connection and try again.");
    }
    setPlacing(false);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {closedNotice && (
        <p role="status" className="flex items-start gap-2 rounded-md border-hairline border-border bg-card px-3 py-2">
          <ClockIcon aria-hidden className="mt-1 size-5 shrink-0" />
          {closedNotice}
        </p>
      )}

      <section className="flex flex-col gap-4 rounded-lg border-hairline border-border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Your details</h2>
        <Field id="name" label="Name" error={errors.name}>
          {(props) => <input {...props} autoComplete="name" defaultValue={saved.name} className={inputClass} />}
        </Field>
        <Field id="phone" label="Phone" error={errors.phone}>
          {(props) => (
            <input
              {...props}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="10-digit mobile number"
              defaultValue={saved.phone}
              className={inputClass}
            />
          )}
        </Field>
        <Field id="delivery_area_id" label="Area" error={errors.delivery_area_id}>
          {(props) => (
            <select {...props} defaultValue={saved.deliveryAreaId ?? ""} className={inputClass}>
              <option value="" disabled>
                Choose your area
              </option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field id="address" label="Address" error={errors.address}>
          {(props) => (
            <textarea {...props} rows={3} autoComplete="street-address" defaultValue={saved.address} className={inputClass} />
          )}
        </Field>
        <Field id="landmark" label="Landmark" note="(optional)" error={errors.landmark}>
          {(props) => <input {...props} defaultValue={saved.landmark} className={inputClass} />}
        </Field>
        <Field id="note" label="Note for the shop" note="(optional)" error={errors.note}>
          {(props) => <textarea {...props} rows={2} className={inputClass} />}
        </Field>
      </section>

      <fieldset
        aria-describedby={errors.payment_method ? "payment_method-error" : undefined}
        className="flex flex-col gap-3 rounded-lg border-hairline border-border bg-card p-4 shadow-sm"
      >
        <legend className="float-left mb-1 text-lg font-semibold">Payment at delivery</legend>
        <div className="grid grid-cols-2 gap-3">
          {(["cash", "upi"] as const).map((method) => (
            <label
              key={method}
              className={cn(
                "flex min-h-tap cursor-pointer items-center justify-center gap-2 rounded-md border-hairline px-3 font-medium",
                paymentMethod === method ? "border-primary bg-accent" : "border-input",
              )}
            >
              <input
                type="radio"
                name="payment_method"
                value={method}
                checked={paymentMethod === method}
                onChange={() => setPaymentMethod(method)}
                className="accent-primary"
              />
              {method === "cash" ? "Cash" : "UPI"}
            </label>
          ))}
        </div>
        {errors.payment_method && (
          <p id="payment_method-error" className="text-error-foreground">
            {errors.payment_method}
          </p>
        )}
      </fieldset>

      <section aria-labelledby="summary-heading" className="flex flex-col gap-2 rounded-lg border-hairline border-border bg-card p-4 shadow-sm">
        <h2 id="summary-heading" className="text-lg font-semibold">
          Order summary
        </h2>
        <dl className="flex flex-col gap-2">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              Items ({summary.itemCount})
            </dt>
            <dd>{formatRupees(summary.subtotalPaise)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Delivery charge</dt>
            <dd>{formatRupees(summary.deliveryChargePaise)}</dd>
          </div>
          <div className="flex justify-between border-t-hairline border-border pt-3 text-lg font-bold">
            <dt>Total</dt>
            <dd>{formatRupees(summary.totalPaise)}</dd>
          </div>
        </dl>
      </section>

      <FinalAmountNote />

      <div className="sticky bottom-0 z-cartbar -mx-4 flex flex-col gap-2 bg-page px-4 py-3">
        <div role="alert">
          {error && (
            <p className="rounded-md border-hairline border-error-border bg-error px-3 py-2 text-error-foreground">{error}</p>
          )}
        </div>
        <Button type="submit" variant="brand" disabled={placing} className="w-full">
          {placing ? "Placing order…" : `Place order · ${formatRupees(summary.totalPaise)}`}
        </Button>
      </div>
    </form>
  );
}

type FieldProps = { id: string; name: string; "aria-invalid"?: true; "aria-describedby"?: string };

function Field({
  id,
  label,
  note,
  error,
  children,
}: {
  id: string;
  label: string;
  note?: string;
  error?: string;
  children: (props: FieldProps) => ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium">
        {label} {note && <span className="text-sm font-normal text-muted-foreground">{note}</span>}
      </label>
      {children({
        id,
        name: id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error ? `${id}-error` : undefined,
      })}
      {error && (
        <p id={`${id}-error`} className="text-error-foreground">
          {error}
        </p>
      )}
    </div>
  );
}
