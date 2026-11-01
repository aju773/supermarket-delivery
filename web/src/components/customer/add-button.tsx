import { Button } from "@/components/ui/button";

/** Add to cart, or "Out of stock" with no button. Adding itself arrives with the cart (ticket 08). */
export function AddButton({ inStock, label }: { inStock: boolean; label: string }) {
  if (!inStock) {
    return <span className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">Out of stock</span>;
  }
  return (
    <Button variant="outline" aria-label={`Add ${label}`} className="border-brand text-brand">
      Add
    </Button>
  );
}
