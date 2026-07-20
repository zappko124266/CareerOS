"use client";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Time-of-day greeting. The server and the client can legitimately compute
 * different values here (server clock/timezone vs. the visitor's own) —
 * `suppressHydrationWarning` is the documented React escape hatch for
 * exactly this case, scoped to just the one dynamic word rather than the
 * whole component.
 */
export function GreetingText({ name }: { name: string }) {
  return (
    <>
      <span suppressHydrationWarning>{getGreeting()}</span>
      {name ? `, ${name}` : ""}
    </>
  );
}
