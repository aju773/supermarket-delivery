import { ReceiptIcon } from "@phosphor-icons/react/ssr";

import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";

// The orders list arrives with ticket 11; until then there are no orders to show.
export default function AdminOrdersPage() {
  return (
    <>
      <PageHeader title="Orders" />
      <EmptyState
        icon={ReceiptIcon}
        text="No orders yet. New orders from the website will show here."
        action={
          <Button asChild variant="outline" size="sm">
            <a href="/" target="_blank" rel="noreferrer">
              View the shop website
            </a>
          </Button>
        }
      />
    </>
  );
}
