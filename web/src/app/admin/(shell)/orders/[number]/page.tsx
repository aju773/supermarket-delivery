import { ArrowLeftIcon, InfoIcon, PhoneIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { OrderActions } from "@/components/admin/order-actions";
import { OrderLines } from "@/components/admin/order-lines";
import { OrderBadges } from "@/components/admin/order-badges";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import {
  HISTORY_LABELS,
  PAYMENT_LABELS,
  type AdminOrder,
} from "@/lib/admin-orders";
import { adminGet } from "@/lib/admin-session";
import { originalRequestChanges } from "@/lib/order-edits";
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

  const changes = originalRequestChanges(order.original_request, order.lines);

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
            <OrderLines order={order} />
          </section>

          {changes.length > 0 && (
            <section
              aria-labelledby="original-heading"
              className={`${card} md:col-span-2`}
            >
              <h2 id="original-heading" className="mb-3 text-lg font-semibold">
                Original request
              </h2>
              <ul className="mb-3 flex flex-col">
                {order.original_request.map((line) => (
                  <li
                    key={line.pack_option_id}
                    className="flex justify-between gap-4 border-border py-2 text-muted-foreground not-first:border-t-hairline"
                  >
                    <span>
                      {line.product_name} · {line.pack_label} · {line.quantity}{" "}
                      × {formatRupees(line.unit_price_paise)}
                    </span>
                    <span>
                      {formatRupees(line.unit_price_paise * line.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
              <h3 className="mb-2 font-semibold">What changed</h3>
              <ul className="flex flex-col gap-2">
                {changes.map((change) => (
                  <li
                    key={change}
                    className="flex items-start gap-2 rounded-md border-hairline border-status-new-foreground bg-status-new px-3 py-2 text-status-new-foreground"
                  >
                    <InfoIcon aria-hidden className="mt-1 size-5 shrink-0" />
                    {change}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section
            aria-labelledby="customer-heading"
            className={`${card} md:col-start-3 md:row-start-1`}
          >
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
