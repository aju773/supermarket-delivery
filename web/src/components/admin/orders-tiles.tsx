import { formatRupees } from "@/lib/format";
import type { OrdersSummary } from "@/lib/orders-summary";

/** The four numbers at the top of the Orders page. */
export function OrdersTiles({ summary }: { summary: OrdersSummary }) {
  const tiles = [
    { label: "Today's orders", value: String(summary.orders_today) },
    { label: "Today's sales", value: formatRupees(summary.sales_today_paise) },
    { label: "Waiting to confirm", value: String(summary.new) },
    { label: "Out for delivery", value: String(summary.out_for_delivery) },
  ];
  return (
    <dl aria-label="Today" className="mb-4 grid grid-cols-2 gap-3 md:mb-6 md:grid-cols-4 md:gap-4">
      {tiles.map(({ label, value }) => (
        <div key={label} className="rounded-lg border-hairline border-border bg-card p-4 shadow-sm">
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className="mt-1 text-3xl font-bold tracking-tight tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
