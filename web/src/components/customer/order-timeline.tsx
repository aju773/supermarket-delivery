import { CheckIcon } from "@phosphor-icons/react/ssr";

import { formatTimeOfDay } from "@/lib/format";
import { timeline } from "@/lib/order-timeline";
import type { PublicOrder } from "@/lib/orders";
import { cn } from "@/lib/utils";

/** Placed, Confirmed, Out for delivery, Delivered (or Cancelled), with the time each step was reached. */
export function OrderTimeline({ order, timeZone }: { order: PublicOrder; timeZone: string }) {
  const steps = timeline(order.status, order.placed_at, order.timeline);
  return (
    <section aria-label="Order progress" className="rounded-lg border-hairline border-border bg-card p-4 shadow-sm">
      <ol className="flex flex-col">
        {steps.map((step, index) => (
          <li key={step.label} aria-current={step.current ? "step" : undefined} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border-2",
                  step.done ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card",
                  step.current && "ring-4 ring-muted",
                )}
              >
                {step.done && <CheckIcon aria-hidden weight="bold" className="size-4" />}
              </span>
              {index < steps.length - 1 && (
                <span aria-hidden className={cn("w-0.5 grow", steps[index + 1].done ? "bg-primary" : "bg-border")} />
              )}
            </div>
            <div className={cn("flex flex-col pb-6", index === steps.length - 1 && "pb-0")}>
              <span className={cn("flex items-center gap-2", step.done ? "font-semibold" : "text-muted-foreground")}>
                {step.label}
                {step.current && (
                  <span className="rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground">Now</span>
                )}
              </span>
              {step.at && <span className="text-sm text-muted-foreground">{formatTimeOfDay(step.at, timeZone)}</span>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
