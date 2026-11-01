import { productGridClass } from "@/components/customer/product-card";

/** A grey placeholder block, shown while a catalog page loads. */
export function Skeleton({ className }: { className: string }) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-skeleton ${className}`} />;
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className={productGridClass} role="status" aria-label="Loading products">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="aspect-3/4" />
      ))}
    </div>
  );
}
