import { WarningCircleIcon } from "@phosphor-icons/react/ssr";

/** An error message box; announced to screen readers when it appears. */
export function FormError({ message }: { message: string | null }) {
  return (
    <div role="alert">
      {message && (
        <p className="flex items-center gap-2 rounded-md border-hairline border-error-border bg-error px-3 py-2 text-error-foreground">
          <WarningCircleIcon aria-hidden className="size-5 shrink-0" />
          {message}
        </p>
      )}
    </div>
  );
}
