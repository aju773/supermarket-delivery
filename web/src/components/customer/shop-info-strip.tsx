import { formatClockTime, formatNextOpening, formatRupees } from "@/lib/format";
import type { ShopInfo } from "@/lib/shop";

export function ShopInfoStrip({ shop }: { shop: ShopInfo }) {
  const hours = `${formatClockTime(shop.opening_time)} – ${formatClockTime(shop.closing_time)}`;
  return (
    <section aria-label="Shop info" className="rounded-lg border-hairline border-border bg-card px-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b-hairline border-border py-3">
        <p className="flex items-center gap-2 font-semibold">
          <span aria-hidden className={`size-2.5 rounded-full ${shop.is_open ? "bg-brand" : "bg-muted-foreground"}`} />
          {shop.is_open ? "Open now" : "Closed now"}
          {!shop.is_open && shop.next_opening_at && (
            <span className="font-normal text-muted-foreground">
              · {formatNextOpening(shop.next_opening_at, shop.timezone)}
            </span>
          )}
        </p>
        <p className="text-muted-foreground">Delivery {hours}</p>
      </div>
      <p className="py-3 text-muted-foreground">Min. order {formatRupees(shop.minimum_order_paise)}</p>
    </section>
  );
}
