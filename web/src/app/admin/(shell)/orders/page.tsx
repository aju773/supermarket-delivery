import { FunnelIcon, ReceiptIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { EmptyState } from "@/components/admin/empty-state";
import { AfterHoursTag, CallToConfirmTag, OrderBadges, StatusBadge } from "@/components/admin/order-badges";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { ORDERS_PAGE_SIZE, STATUS_LABELS, isOrderStatus, type OrderSummary } from "@/lib/admin-orders";
import { adminGet } from "@/lib/admin-session";
import { formatDayAndTime, formatRupees } from "@/lib/format";
import type { OrderStatus } from "@/lib/order-timeline";
import { getShopInfo } from "@/lib/shop";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status: rawStatus = "", page: rawPage = "1" } = await searchParams;
  const status = isOrderStatus(rawStatus) ? rawStatus : null;
  const page = Math.max(1, Number.parseInt(rawPage, 10) || 1);
  const query = new URLSearchParams({ page: String(page) });
  if (status) query.set("status", status);
  const [orders, shop] = await Promise.all([
    adminGet<{ items: OrderSummary[]; count: number }>(`/orders?${query}`),
    getShopInfo(),
  ]);
  const first = (page - 1) * ORDERS_PAGE_SIZE + 1;
  const last = first + orders.items.length - 1;
  const when = (order: OrderSummary) => formatDayAndTime(order.placed_at, shop.timezone);

  function link(to: { status?: OrderStatus | null; page?: number }) {
    const params = new URLSearchParams();
    const linkStatus = to.status === undefined ? status : to.status;
    if (linkStatus) params.set("status", linkStatus);
    if (to.page && to.page > 1) params.set("page", String(to.page));
    return params.size ? `/admin/orders?${params}` : "/admin/orders";
  }

  return (
    <>
      <PageHeader title="Orders" />
      <nav aria-label="Filter by status" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        {([null, ...Object.keys(STATUS_LABELS)] as (OrderStatus | null)[]).map((each) => (
          <Button
            key={each ?? "all"}
            asChild
            size="sm"
            variant={each === status ? "default" : "outline"}
            className="rounded-full"
          >
            <Link href={link({ status: each })} aria-current={each === status ? "page" : undefined}>
              {each ? STATUS_LABELS[each] : "All"}
            </Link>
          </Button>
        ))}
      </nav>

      {orders.items.length === 0 ? (
        status ? (
          <EmptyState
            icon={FunnelIcon}
            text={`No ${STATUS_LABELS[status].toLowerCase()} orders.`}
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/orders">Show all orders</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={ReceiptIcon}
            text="No orders yet. New orders from the website will show here."
            action={
              <Button asChild variant="outline" size="sm">
                <a href="/" target="_blank" rel="noreferrer">
                  View the shop website
                </a>
              </Button>
            }
          />
        )
      ) : (
        <>
          <ul aria-label="Orders" className="flex flex-col gap-3 md:hidden">
            {orders.items.map((order) => (
              <li key={order.number}>
                <Link
                  href={`/admin/orders/${order.number}`}
                  className="flex flex-col gap-2 rounded-lg border-hairline border-border bg-card p-4 shadow-sm hover:bg-accent"
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-semibold">#{order.number}</span>
                    <StatusBadge status={order.status} />
                  </span>
                  <span className="flex items-start justify-between gap-2">
                    <span className="flex min-w-0 flex-col">
                      <span className="font-medium">{order.customer_name}</span>
                      <span className="text-sm text-muted-foreground">{order.area}</span>
                    </span>
                    <span className="flex flex-col items-end">
                      <span className="font-semibold">{formatRupees(order.total_paise)}</span>
                      <span className="text-sm text-muted-foreground">{when(order)}</span>
                    </span>
                  </span>
                  {(order.call_to_confirm || order.is_after_hours) && (
                    <span className="flex flex-wrap gap-1">
                      {order.call_to_confirm && <CallToConfirmTag />}
                      {order.is_after_hours && <AfterHoursTag />}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          <section
            aria-label="Orders"
            className="hidden overflow-hidden rounded-lg border-hairline border-border bg-card shadow-sm md:block"
          >
            <table className="w-full text-left">
              <thead className="bg-muted text-xs font-semibold text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Area</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.items.map((order) => (
                  <tr key={order.number} className="border-t-hairline border-border hover:bg-accent">
                    <td className="px-4 py-3 font-semibold">
                      <Link href={`/admin/orders/${order.number}`} className="underline-offset-4 hover:underline">
                        #{order.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{order.customer_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{order.area}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatRupees(order.total_paise)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{when(order)}</td>
                    <td className="px-4 py-3">
                      <OrderBadges order={order} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <nav aria-label="Pages" className="mt-4 flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Showing {first}–{last} of {orders.count}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Button variant="outline" asChild>
                  <Link href={link({ page: page - 1 })}>Previous</Link>
                </Button>
              )}
              {last < orders.count && (
                <Button variant="outline" asChild>
                  <Link href={link({ page: page + 1 })}>Next</Link>
                </Button>
              )}
            </div>
          </nav>
        </>
      )}
    </>
  );
}
