import { CheckCircleIcon, ClockIcon, PhoneIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FinalAmountNote } from "@/components/customer/final-amount-note";
import { OrderTimeline } from "@/components/customer/order-timeline";
import { StatusLink } from "@/components/customer/status-link";
import { Button } from "@/components/ui/button";
import { formatOpeningTime, formatPlacedAt, formatRupees } from "@/lib/format";
import { getOrder } from "@/lib/orders";
import { getShopInfo } from "@/lib/shop";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

const PAYMENT_LABELS = { cash: "Cash", upi: "UPI" };

/** The Status Link's page; right after checkout (`?placed=1`) it opens with the order confirmation. */
export default async function OrderStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const [{ token }, { placed }] = await Promise.all([params, searchParams]);
  const [order, shop] = await Promise.all([getOrder(token), getShopInfo()]);
  if (!order) notFound();
  const payment = PAYMENT_LABELS[order.payment_method];

  return (
    <div className="mx-auto flex w-full max-w-form flex-col gap-4">
      {placed && (
        <section
          aria-labelledby="placed-heading"
          className="flex flex-col items-center gap-2 rounded-lg border-hairline border-border bg-card p-6 text-center shadow-sm"
        >
          <CheckCircleIcon aria-hidden weight="fill" className="size-12 text-brand" />
          <h2 id="placed-heading" className="text-xl font-bold">
            Order placed
          </h2>
          <p className="text-muted-foreground">
            Your order number is <strong className="text-foreground">#{order.number}</strong>. Pay{" "}
            {formatRupees(order.total_paise)} by {payment} at delivery.
          </p>
          <StatusLink token={token} />
        </section>
      )}

      <div>
        <h1 className="text-2xl font-bold">Order #{order.number}</h1>
        <p className="text-muted-foreground">{formatPlacedAt(order.placed_at, shop.timezone)}</p>
      </div>

      {order.delivery_from && order.status !== "cancelled" && order.status !== "delivered" && (
        <p role="status" className="flex items-start gap-2 rounded-md border-hairline border-border bg-card px-3 py-2">
          <ClockIcon aria-hidden className="mt-1 size-5 shrink-0" />
          Placed outside delivery hours. Delivery starts from {formatOpeningTime(order.delivery_from, shop.timezone)}.
        </p>
      )}

      <OrderTimeline order={order} timeZone={shop.timezone} />

      <section aria-labelledby="items-heading" className="flex flex-col rounded-lg border-hairline border-border bg-card p-4 shadow-sm">
        <h2 id="items-heading" className="pb-2 text-lg font-semibold">
          Items
        </h2>
        <dl className="flex flex-col">
          {order.lines.map((line, index) => (
            <div key={index} className="flex justify-between gap-4 border-b-hairline border-border py-3">
              <dt>
                {line.product_name} · {line.pack_label} × {line.quantity}
              </dt>
              <dd>{formatRupees(line.line_total_paise)}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-4 border-b-hairline border-border py-3">
            <dt className="text-muted-foreground">Delivery charge</dt>
            <dd>{formatRupees(order.delivery_charge_paise)}</dd>
          </div>
          <div className="flex justify-between gap-4 pt-3 text-lg font-bold">
            <dt>Total</dt>
            <dd>{formatRupees(order.total_paise)}</dd>
          </div>
        </dl>
      </section>

      <p className="text-center text-sm text-muted-foreground">Payment at delivery: {payment}</p>
      <FinalAmountNote />

      {order.shop_phone && (
        <Button asChild variant="outline" className="w-full">
          <a href={`tel:${order.shop_phone.replace(/\s/g, "")}`}>
            <PhoneIcon aria-hidden className="size-5" />
            Call the shop
          </a>
        </Button>
      )}
    </div>
  );
}
