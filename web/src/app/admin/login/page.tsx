import { StorefrontIcon } from "@phosphor-icons/react/ssr";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/admin/login-form";
import { getStaffMember } from "@/lib/admin-session";
import { getShopInfo } from "@/lib/shop";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await getStaffMember()) redirect("/admin/orders");
  const shop = await getShopInfo();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-auth flex-col justify-center gap-6 px-4 py-8">
      <div className="flex flex-col items-center gap-1">
        <p className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <span className="inline-flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <StorefrontIcon aria-hidden className="size-5" />
          </span>
          {shop.name}
        </p>
        <p className="text-muted-foreground">Staff admin</p>
      </div>
      <section className="rounded-lg border-hairline border-border bg-card p-6 shadow-sm">
        <h1 className="mb-4 text-xl font-semibold">Log in</h1>
        <LoginForm />
      </section>
      <p className="text-center text-muted-foreground">Forgot your password? Ask another staff member to reset it.</p>
    </main>
  );
}
