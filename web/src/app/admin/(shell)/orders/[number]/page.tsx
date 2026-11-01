import { ArrowLeftIcon, PhoneIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { OrderActions } from "@/components/admin/order-actions";
import { OrderBadges } from "@/components/admin/order-badges";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import {
  HISTORY_LABELS,
  PAYMENT_LABELS,
  type AdminOrder,
} from "@/lib/admin-orders";
import { adminGet } from "@/lib/admin-session";
import { formatDayAndTime, formatPlacedAt, formatRupees } from "@/lib/format";
import { getShopInfo } from "@/lib/shop";

const card =
  "rounded-lg border-hairline border-border bg-card p-4 shadow-sm md:p-6";

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  if (!/^\d+$/.test(number)) notFound();
  const [order, shop] = await Promise.all([
    adminGet<AdminOrder>(`/orders/${number}`),
    getShopInfo(),
  ]);

  return (
    <>
      <Link
        href="/admin/orders"
        className="mb-2 inline-flex min-h-tap items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon aria-hidden className="size-4" />
        Orders
      </Link>
      <PageHeader
        title={`Order #${order.number}`}
        description={formatPlacedAt(order.placed_at, shop.timezone)}
      />
      <div className="mb-4 -mt-2 md:-mt-4 md:mb-6">
        <OrderBadges order={order} />
      </div>

      <OrderActions number={order.number} status={order.status}>
        <div className="grid gap-4 md:grid-cols-3 md:items-start md:gap-6">
          <section
            aria-labelledby="lines-heading"
            className={`${card} md:col-span-2`}
          >
            <h2 id="lines-heading" className="mb-3 text-lg font-semibold">
              Items
            </h2>
            <ul className="flex flex-col">
              {order.lines.map((line, index) => (
                <li
                  key={index}
                  className="flex items-start justify-between gap-4 border-border py-3 not-first:border-t-hairline"
                >
                  <span className="flex flex-col">
                    <span className="font-medium">{line.product_name}</span>
                    <span className="text-sm text-muted-foreground">
                      {line.pack_label} · {line.quantity} ×{" "}
                      {formatRupees(line.unit_price_paise)}
                    </span>
                  </span>
                  <span className="font-semibold">
                    {formatRupees(line.line_total_paise)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-2 flex flex-col gap-1 border-t-hairline border-border pt-3">
              <div className="flex justify-between text-muted-foreground">
                <dt>Subtotal</dt>
                <dd>{formatRupees(order.subtotal_paise)}</dd>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <dt>Delivery charge</dt>
                <dd>{formatRupees(order.delivery_charge_paise)}</dd>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <dt>Total</dt>
                <dd>{formatRupees(order.total_paise)}</dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="customer-heading" className={card}>
            <h2 id="customer-heading" className="mb-3 text-lg font-semibold">
              Customer
            </h2>
            <dl className="flex flex-col gap-3">
              <Detail label="Name">{order.customer_name}</Detail>
              <Detail label="Phone">
                <Button asChild variant="outline" size="sm" className="mt-1">
                  <a href={`tel:+91${order.phone}`}>
                    <PhoneIcon aria-hidden className="size-4" />
                    {order.phone.slice(0, 5)} {order.phone.slice(5)}
                  </a>
                </Button>
              </Detail>
              <Detail label="Area">{order.area}</Detail>
              <Detail label="Address">
                <span className="whitespace-pre-line">{order.address}</span>
              </Detail>
              {order.landmark && (
                <Detail label="Landmark">{order.landmark}</Detail>
              )}
              {order.note && (
                <Detail label="Note">
                  <span className="whitespace-pre-line">{order.note}</span>
                </Detail>
              )}
              <Detail label="Payment">
                {PAYMENT_LABELS[order.payment_method]} at delivery
              </Detail>
            </dl>
          </section>

          <section
            aria-labelledby="history-heading"
            className={`${card} md:col-span-3`}
          >
            <h2 id="history-heading" className="mb-3 text-lg font-semibold">
              Status history
            </h2>
            <ol className="flex flex-col gap-2">
              {order.history.map((entry, index) => (
                <li key={index} className="flex flex-wrap items-center gap-x-2">
                  <span
                    aria-hidden
                    className="size-2 rounded-full bg-primary"
                  />
                  <span className="font-medium">
                    {HISTORY_LABELS[entry.status]} by {entry.by}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatDayAndTime(entry.at, shop.timezone)}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </OrderActions>
    </>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
