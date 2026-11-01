"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { CaretDownIcon, KeyIcon, SignOutIcon } from "@phosphor-icons/react";
import Link from "next/link";

import { useLogOut } from "@/components/admin/use-log-out";

const itemClass =
  "flex min-h-tap cursor-pointer items-center gap-3 rounded-sm px-3 outline-none data-highlighted:bg-accent";

export function AccountMenu({ username }: { username: string }) {
  const logOut = useLogOut();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`Account: ${username}`}
        className="inline-flex min-h-tap items-center gap-2 rounded-md px-2 font-medium focus-visible:outline-topbar-ring"
      >
        {username}
        <CaretDownIcon aria-hidden className="size-4" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          className="z-menu mt-1 min-w-48 rounded-md border-hairline border-border bg-popover p-1 text-sm text-popover-foreground shadow-md"
        >
          <DropdownMenu.Item asChild className={itemClass}>
            <Link href="/admin/account/password">
              <KeyIcon aria-hidden className="size-5" />
              Change password
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item className={itemClass} onSelect={logOut}>
            <SignOutIcon aria-hidden className="size-5" />
            Log out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
