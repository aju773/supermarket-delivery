import { ProductGridSkeleton, Skeleton } from "@/components/customer/skeletons";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-12" />
      <Skeleton className="h-24" />
      <ProductGridSkeleton />
    </div>
  );
}
