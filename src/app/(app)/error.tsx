"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * Nested error boundary for the authenticated app shell — an error on
 * /dashboard or /resume renders here, keeping the sidebar/header visible,
 * rather than falling through to the global src/app/error.tsx which would
 * replace the entire page.
 */
export default function AppError({
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
    <div className="flex flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="text-muted-foreground text-sm font-medium">Error</p>
      <h1 className="text-2xl font-semibold tracking-tight">
        Something went wrong
      </h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        An unexpected error occurred loading this page. Try again, or come back
        later.
      </p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}
