"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { DotsThreeIcon, KeyIcon, ListIcon, MagnifyingGlassIcon, SignOutIcon, StorefrontIcon, XIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { AccountMenu } from "@/components/admin/account-menu";
import { AdminSearch } from "@/components/admin/admin-search";
import { isActive, NAV_ITEMS, ORDERS_HREF, TAB_ITEMS } from "@/components/admin/nav";
import { NewOrdersBadge, useNewOrders } from "@/components/admin/new-orders-badge";
import { ToastProvider } from "@/components/admin/toast";
import { useLogOut } from "@/components/admin/use-log-out";
import { cn } from "@/lib/utils";

const topBarButton =
  "inline-flex min-h-tap min-w-tap items-center justify-center rounded-md focus-visible:outline-topbar-ring";

/**
 * The admin layout. Wide screens: top bar with shop name, search and account menu, plus a sidebar.
 * Phones: ☰ opens the sidebar as a slide-out menu, the magnifier opens search, and a bottom tab bar holds the main pages.
 */
export function AdminShell({
  shopName,
  username,
  newOrders,
  children,
}: {
  shopName: string;
  username: string;
  /** How many Orders are New, as rendered by the server. */
  newOrders: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const newOrderCount = useNewOrders(newOrders);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <ToastProvider>
      <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <div className="flex min-h-dvh flex-col">
          <header className="sticky top-0 z-topbar bg-topbar text-topbar-foreground">
            <div className="flex items-center gap-2 px-2 py-1 md:px-4">
              <Dialog.Trigger aria-label="Open menu" className={cn(topBarButton, "md:hidden")}>
                <ListIcon aria-hidden className="size-6" />
              </Dialog.Trigger>
              <Link
                href={ORDERS_HREF}
                className={cn(topBarButton, "gap-2 px-1 text-lg font-bold tracking-tight max-md:mx-auto")}
              >
                <StorefrontIcon aria-hidden className="size-6 max-md:hidden" />
                {shopName}
              </Link>
              {/* Also balances the ☰ button so the shop name stays centred on phones. */}
              <button
                type="button"
                aria-label="Search products or orders"
                onClick={() => setSearchOpen(true)}
                className={cn(topBarButton, "md:hidden")}
              >
                <MagnifyingGlassIcon aria-hidden className="size-6" />
              </button>
              <AdminSearch searchOpen={searchOpen} onSearchClose={() => setSearchOpen(false)} />
              <div className="max-md:hidden">
                <AccountMenu username={username} />
              </div>
            </div>
          </header>

          <div className="flex flex-1">
            <aside className="hidden w-sidebar shrink-0 border-r-hairline border-border bg-sidebar p-3 md:block">
              <SidebarNav pathname={pathname} newOrders={newOrderCount} />
            </aside>
            <main className="min-w-0 flex-1 px-4 pt-4 pb-24 md:px-8 md:pt-6 md:pb-8">{children}</main>
          </div>
        </div>

        <PhoneMenu pathname={pathname} username={username} newOrders={newOrderCount} onNavigate={() => setMenuOpen(false)} />
      </Dialog.Root>

      <TabBar pathname={pathname} newOrders={newOrderCount} onMore={() => setMenuOpen(true)} />
    </ToastProvider>
  );
}

function SidebarNav({
  pathname,
  newOrders,
  onNavigate,
}: {
  pathname: string;
  newOrders: number;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Admin">
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-tap items-center gap-3 rounded-md px-3 text-sidebar-foreground hover:bg-sidebar-active",
                  active && "bg-sidebar-active font-semibold text-sidebar-active-foreground",
                )}
              >
                <Icon aria-hidden weight={active ? "fill" : "regular"} className="size-5" />
                {label}
                {href === ORDERS_HREF && <NewOrdersBadge count={newOrders} className="ml-auto" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function PhoneMenu({
  pathname,
  username,
  newOrders,
  onNavigate,
}: {
  pathname: string;
  username: string;
  newOrders: number;
  onNavigate: () => void;
}) {
  const logOut = useLogOut();
  const accountItem =
    "flex min-h-tap w-full items-center gap-3 rounded-md px-3 text-sidebar-foreground hover:bg-sidebar-active";
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-sheet bg-overlay md:hidden" />
      <Dialog.Content className="fixed inset-y-0 left-0 z-sheet flex w-sidebar max-w-full flex-col gap-4 overflow-y-auto bg-sidebar p-3 text-sm shadow-md md:hidden">
        <div className="flex items-center justify-between">
          <Dialog.Title className="px-3 font-semibold">Menu</Dialog.Title>
          <Dialog.Close
            aria-label="Close menu"
            className="inline-flex min-h-tap min-w-tap items-center justify-center rounded-md"
          >
            <XIcon aria-hidden className="size-6" />
          </Dialog.Close>
        </div>
        <Dialog.Description className="sr-only">Admin pages and your account</Dialog.Description>
        <SidebarNav pathname={pathname} newOrders={newOrders} onNavigate={onNavigate} />
        <div className="mt-auto flex flex-col gap-1 border-t-hairline border-border pt-3">
          <p className="px-3 text-muted-foreground">Signed in as {username}</p>
          <Link href="/admin/account/password" onClick={onNavigate} className={accountItem}>
            <KeyIcon aria-hidden className="size-5" />
            Change password
          </Link>
          <button type="button" onClick={logOut} className={accountItem}>
            <SignOutIcon aria-hidden className="size-5" />
            Log out
          </button>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  );
}

function TabBar({ pathname, newOrders, onMore }: { pathname: string; newOrders: number; onMore: () => void }) {
  const tab = "flex min-h-tap flex-1 flex-col items-center justify-center gap-1 py-2 text-xs";
  const onTab = TAB_ITEMS.some(({ href }) => isActive(pathname, href));
  return (
    <nav
      aria-label="Main pages"
      className="fixed inset-x-0 bottom-0 z-tabbar flex border-t-hairline border-border bg-card md:hidden"
    >
      {TAB_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(tab, active ? "font-semibold text-foreground" : "text-muted-foreground")}
          >
            <span className="relative">
              <Icon aria-hidden weight={active ? "fill" : "regular"} className="size-6" />
              {href === ORDERS_HREF && <NewOrdersBadge count={newOrders} className="absolute -top-1 -right-2" />}
            </span>
            {label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onMore}
        className={cn(tab, onTab ? "text-muted-foreground" : "font-semibold text-foreground")}
      >
        <DotsThreeIcon aria-hidden weight="bold" className="size-6" />
        More
      </button>
    </nav>
  );
}
