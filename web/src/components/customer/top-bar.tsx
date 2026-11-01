import { PhoneIcon, StorefrontIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

const topBarLink =
  "inline-flex min-h-tap min-w-tap items-center justify-center rounded-md focus-visible:outline-topbar-ring";

export function CustomerTopBar({ shopName, phone }: { shopName: string; phone: string }) {
  return (
    <header className="sticky top-0 z-topbar bg-topbar text-topbar-foreground">
      <div className="mx-auto flex w-full max-w-content items-center gap-2 px-4 py-2">
        <Link href="/" className={`${topBarLink} gap-2 text-lg font-bold tracking-tight`}>
          <StorefrontIcon aria-hidden className="size-6" />
          {shopName}
        </Link>
        <nav aria-label="Shop" className="ml-auto flex items-center gap-2">
          {phone && (
            <a href={`tel:${phone}`} aria-label="Call the shop" className={topBarLink}>
              <PhoneIcon aria-hidden className="size-6" />
            </a>
          )}
          <Link href="/orders" className={`${topBarLink} px-2`}>
            My orders
          </Link>
        </nav>
      </div>
    </header>
  );
}
