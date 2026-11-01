/**
 * The status page's timeline: Placed, Confirmed, Out for delivery, Delivered, or the steps reached and then
 * Cancelled. No imports, so `node --test` can run its tests directly.
 */
export type OrderStatus = "new" | "confirmed" | "out_for_delivery" | "delivered" | "cancelled";

export type StatusChange = { status: OrderStatus; at: string };

export type TimelineStep = { label: string; at: string | null; done: boolean; current: boolean };

const PROGRESS: { status: OrderStatus; label: string }[] = [
  { status: "new", label: "Placed" },
  { status: "confirmed", label: "Confirmed" },
  { status: "out_for_delivery", label: "Out for delivery" },
  { status: "delivered", label: "Delivered" },
];

export function timeline(status: OrderStatus, placedAt: string, history: StatusChange[]): TimelineStep[] {
  const reachedAt = (step: OrderStatus) =>
    step === "new" ? placedAt : (history.findLast((change) => change.status === step)?.at ?? null);
  const steps = PROGRESS.map((step) => ({ label: step.label, at: reachedAt(step.status), done: false, current: false }));
  if (status === "cancelled") {
    const reached = steps.filter((step) => step.at !== null).map((step) => ({ ...step, done: true }));
    return [...reached, { label: "Cancelled", at: reachedAt("cancelled"), done: true, current: true }];
  }
  const index = PROGRESS.findIndex((step) => step.status === status);
  return steps.map((step, position) => ({ ...step, done: position <= index, current: position === index }));
}
