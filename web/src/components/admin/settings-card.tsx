import type { ReactNode } from "react";

/** A white settings card with a heading and an optional action beside it, e.g. "Add area". */
export function SettingsCard({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  const headingId = `${title.toLowerCase().replaceAll(" ", "-")}-heading`;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4 rounded-lg border-hairline border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h2 id={headingId} className="text-base font-semibold">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
