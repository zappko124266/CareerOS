"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // Only reached if the root layout itself throws — `error.tsx` can't
  // catch that since it renders inside the layout it's meant to guard.
  // Next.js requires this file to render its own complete <html>/<body>,
  // since it replaces the entire root layout when it's active.
  return (
    <html lang="en">
      <body className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm font-medium text-neutral-500">Error</p>
        <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="max-w-sm text-sm text-neutral-500">
          An unexpected error occurred. Try again, or come back later.
        </p>
        <button
          onClick={() => reset()}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
