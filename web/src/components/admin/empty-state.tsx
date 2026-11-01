import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

/** A card for a list with nothing in it yet: an icon, one line of text and an action. */
export function EmptyState({ icon: Icon, text, action }: { icon: Icon; text: string; action: ReactNode }) {
  return (
    <section className="flex flex-col items-center gap-3 rounded-lg border-hairline border-border bg-card px-4 py-12 text-center shadow-sm">
      <Icon aria-hidden className="size-10 text-muted-foreground" />
      <p className="text-muted-foreground">{text}</p>
      {action}
    </section>
  );
}
