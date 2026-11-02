"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/import", label: "Products CSV" },
  { href: "/admin/import/photos", label: "Photos" },
];

/** Switches between the import pages: the products CSV and the bulk photo upload. */
export function ImportTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Import" className="mb-4 flex gap-2 border-b-hairline border-border md:mb-6">
      {TABS.map(({ href, label }) => {
        const current = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "inline-flex min-h-tap items-center border-b-emphasis px-3 text-sm font-medium",
              current ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
