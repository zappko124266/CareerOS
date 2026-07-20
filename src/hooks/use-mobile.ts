import * as React from "react";

const MOBILE_BREAKPOINT = 768;

// useSyncExternalStore (not useState+useEffect) is the correct primitive
// for subscribing to external mutable state like matchMedia — it avoids
// the "setState synchronously in an effect" cascading-render lint issue
// upstream shadcn's version of this hook has, and is SSR-safe via
// getServerSnapshot.
function subscribe(onChange: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT;
}

function getServerSnapshot() {
  return false;
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
