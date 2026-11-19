import { Skeleton } from "@/ui/primitives/skeleton";

export default function ShopLoading() {
  return (
    <div className="section-container py-12">
      <Skeleton className="mb-3 h-10 w-64" />
      <Skeleton className="mb-8 h-5 w-96 max-w-full" />
      <div className="mb-8 flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-square w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
