import { Skeleton } from "@/components/ui/skeleton";

export default function ResumeStudioLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-64" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="ring-foreground/10 flex h-96 flex-col gap-3 rounded-xl p-4 ring-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="ring-foreground/10 flex h-96 flex-col gap-3 rounded-xl p-4 ring-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}
