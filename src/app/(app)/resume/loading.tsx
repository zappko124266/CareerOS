import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ResumeListLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-11 w-36 shrink-0 rounded-lg" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <Skeleton className="size-5 shrink-0 rounded" />
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-40 max-w-full" />
                  <Skeleton className="h-3 w-28 max-w-full" />
                </div>
              </div>
              <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
