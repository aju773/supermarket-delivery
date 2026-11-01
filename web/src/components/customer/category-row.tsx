import Link from "next/link";

import type { CatalogCategory } from "@/lib/catalog";
import { cn } from "@/lib/utils";

/** Category buttons in one line that scrolls sideways on phones. */
export function CategoryRow({ categories, currentId }: { categories: CatalogCategory[]; currentId: number }) {
  return (
    <nav aria-label="Categories" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex w-max gap-2">
        {categories.map((category) => {
          const current = category.id === currentId;
          return (
            <li key={category.id}>
              <Link
                href={`/categories/${category.id}`}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-tap items-center rounded-full border-hairline px-4 whitespace-nowrap",
                  current ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
                )}
              >
                {category.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
