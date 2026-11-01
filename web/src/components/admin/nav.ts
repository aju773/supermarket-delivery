import {
  ArchiveIcon,
  FileArrowUpIcon,
  GearIcon,
  IdentificationBadgeIcon,
  ReceiptIcon,
  ShapesIcon,
  type Icon,
} from "@phosphor-icons/react";

export type NavItem = { href: string; label: string; icon: Icon };

/** Sidebar on wide screens and the phone slide-out menu. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/admin/orders", label: "Orders", icon: ReceiptIcon },
  { href: "/admin/products", label: "Products", icon: ArchiveIcon },
  { href: "/admin/categories", label: "Categories", icon: ShapesIcon },
  { href: "/admin/import", label: "Import", icon: FileArrowUpIcon },
  { href: "/admin/settings", label: "Settings", icon: GearIcon },
  { href: "/admin/staff", label: "Staff", icon: IdentificationBadgeIcon },
];

/** The phone bottom tab bar; "More" opens the slide-out menu. */
export const TAB_ITEMS = NAV_ITEMS.filter((item) =>
  ["/admin/orders", "/admin/products", "/admin/settings"].includes(item.href),
);

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
