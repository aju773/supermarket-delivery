import { ProductGridSkeleton, Skeleton } from "@/components/customer/skeletons";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-12" />
      <ProductGridSkeleton />
    </div>
  );
}
