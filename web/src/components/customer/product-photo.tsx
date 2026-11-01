import { BasketIcon } from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";

/** A square product photo, or the grey placeholder with a basket icon. */
export function ProductPhoto({ src, dimmed = false }: { src: string | null; dimmed?: boolean }) {
  return (
    <span
      className={cn(
        "flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-muted",
        dimmed && "opacity-50",
      )}
    >
      {src ? (
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <BasketIcon aria-hidden className="size-10 text-muted-foreground" />
      )}
    </span>
  );
}
