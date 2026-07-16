"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-muted-foreground text-sm font-medium">Error</p>
      <h1 className="text-2xl font-semibold tracking-tight">
        Something went wrong
      </h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        An unexpected error occurred. Try again, or come back later.
      </p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}
