import { MoonIcon, PhoneIcon } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";

import { STATUS_LABELS } from "@/lib/admin-orders";
import type { OrderStatus } from "@/lib/order-timeline";
import { cn } from "@/lib/utils";

const STATUS_COLOURS: Record<OrderStatus, string> = {
  new: "bg-status-new text-status-new-foreground",
  confirmed: "bg-status-confirmed text-status-confirmed-foreground",
  out_for_delivery: "bg-status-out text-status-out-foreground",
  delivered: "bg-status-delivered text-status-delivered-foreground",
  cancelled: "bg-status-cancelled text-status-cancelled-foreground",
};

const pill = "inline-flex shrink-0 items-center gap-1 rounded-full px-2 text-xs font-semibold whitespace-nowrap";

/** The status name on its colour, so status is never shown by colour alone. */
export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={cn(pill, STATUS_COLOURS[status])}>{STATUS_LABELS[status]}</span>;
}

function Tag({ icon, children }: { icon: ReactNode; children: string }) {
  return (
    <span className={cn(pill, "bg-tag text-tag-foreground")}>
      {icon}
      {children}
    </span>
  );
}

export function AfterHoursTag() {
  return <Tag icon={<MoonIcon aria-hidden className="size-3" />}>After hours</Tag>;
}

export function CallToConfirmTag() {
  return <Tag icon={<PhoneIcon aria-hidden className="size-3" />}>Call to confirm</Tag>;
}

/** The badge and whichever tags apply to an Order. */
export function OrderBadges({
  order,
}: {
  order: { status: OrderStatus; is_after_hours: boolean; call_to_confirm: boolean };
}) {
  return (
    <span className="flex flex-wrap items-center gap-1">
      <StatusBadge status={order.status} />
      {order.call_to_confirm && <CallToConfirmTag />}
      {order.is_after_hours && <AfterHoursTag />}
    </span>
  );
}
