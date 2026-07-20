import { Skeleton } from "@/components/ui/skeleton";

export default function OpportunityWorkspaceLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-40" />
      <div className="ring-foreground/10 flex flex-col gap-4 rounded-xl p-4 ring-1 sm:flex-row sm:justify-between">
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-11 w-full sm:w-56" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="ring-foreground/10 flex flex-col gap-3 rounded-xl p-4 ring-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}
