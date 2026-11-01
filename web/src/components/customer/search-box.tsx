import { MagnifyingGlassIcon } from "@phosphor-icons/react/ssr";

/** A plain GET form to the search page, so it works before any JavaScript loads. */
export function SearchBox({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form action="/search" role="search" className="relative">
      <MagnifyingGlassIcon
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Search products"
        aria-label="Search products"
        className="min-h-tap w-full rounded-lg border-hairline border-border bg-card py-3 pr-4 pl-12 text-input shadow-sm"
      />
    </form>
  );
}
