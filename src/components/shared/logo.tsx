import Link from "next/link";
import { Sparkle } from "lucide-react";

import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2 text-lg font-semibold tracking-tight",
        className,
      )}
    >
      <Sparkle className="size-5" />
      {siteConfig.name}
    </Link>
  );
}
