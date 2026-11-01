"use client";

import { CheckIcon, CopyIcon } from "@phosphor-icons/react/ssr";
import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

const noSubscription = () => () => {};

/** The Order's private Status Link, with a Copy button, so the customer can come back to it later. */
export function StatusLink({ token }: { token: string }) {
  const path = `/orders/${token}`;
  const url = useSyncExternalStore(
    noSubscription,
    () => `${window.location.origin}${path}`,
    () => path,
  );
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Clipboard blocked: the link is still shown to copy by hand.
    }
  }

  return (
    <div className="flex w-full flex-col gap-2 pt-2 text-left">
      <p className="text-sm text-muted-foreground">Your private status link. It's also saved in My orders on this phone.</p>
      <div className="flex items-center gap-2 rounded-md border-hairline border-border bg-muted px-3 py-1">
        <a href={path} className="min-w-0 grow truncate text-sm underline">
          {url}
        </a>
        <Button type="button" variant="ghost" size="sm" onClick={copy}>
          {copied ? <CheckIcon aria-hidden className="size-4" /> : <CopyIcon aria-hidden className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}
