import { Skeleton } from "@/components/customer/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-form flex-col gap-4">
      <Skeleton className="aspect-square" />
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40" />
    </div>
  );
}
