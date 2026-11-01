import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Staff admin" };

// The admin uses 14 px body text; form inputs stay 16 px (globals.css) so phones don't zoom.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-page text-sm">{children}</div>;
}
