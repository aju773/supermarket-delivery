import { ChangePasswordForm } from "@/components/admin/change-password-form";
import { PageHeader } from "@/components/admin/page-header";

export default function ChangePasswordPage() {
  return (
    <div className="max-w-form">
      <PageHeader title="Change password" />
      <section className="rounded-lg border-hairline border-border bg-card p-6 shadow-sm">
        <ChangePasswordForm />
      </section>
    </div>
  );
}
