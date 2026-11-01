import { ProductGridSkeleton, Skeleton } from "@/components/customer/skeletons";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-tap" />
      <Skeleton className="h-8 w-40" />
      <ProductGridSkeleton />
    </div>
  );
}
