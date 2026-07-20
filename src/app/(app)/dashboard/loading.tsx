import { Skeleton } from "@/components/ui/skeleton";

function CardSkeleton() {
  return (
    <div className="ring-foreground/10 flex h-48 flex-col gap-4 rounded-xl p-4 ring-1">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="mt-auto h-9 w-28" />
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="bg-muted h-56 w-full rounded-2xl sm:h-44">
        <div className="flex h-full flex-col justify-between p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-6 w-48" />
              </div>
            </div>
            <Skeleton className="hidden h-9 w-56 sm:block" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-72 max-w-full" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
          <Skeleton className="h-9 w-40" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="ring-foreground/10 flex h-64 flex-col gap-3 rounded-xl p-4 ring-1">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
        <div className="ring-foreground/10 flex h-64 flex-col gap-3 rounded-xl p-4 ring-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
    </div>
  );
}
