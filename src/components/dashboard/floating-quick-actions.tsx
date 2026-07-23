"use client";

import Link from "next/link";
import { Briefcase, FileText, ListChecks, Plus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const QUICK_ACTIONS = [
  { href: "/resume", label: "Upload resume", icon: FileText },
  { href: "/opportunities", label: "Find jobs", icon: Briefcase },
  { href: "/coach", label: "Ask AI Coach", icon: Sparkles },
  { href: "/applications", label: "View applications", icon: ListChecks },
] as const;

/**
 * Floating Quick Actions — Sprint 10, requirement 10 (and, together with
 * `AiCoachPreviewCard`, requirement 7's persistent AI Coach entry point).
 * A `DropdownMenu` (already used throughout this codebase, already has
 * `tw-animate-css` open/close animation, focus trap, `Escape`-to-close,
 * and `role="menu"` semantics built in) fixed to the corner — every item
 * is a plain link to an already-existing route, no new data or logic.
 */
export function FloatingQuickActions() {
  return (
    <div className="fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" className="size-12 rounded-full shadow-lg" aria-label="Quick actions">
            <Plus className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-56">
          <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {QUICK_ACTIONS.map((action) => (
            <DropdownMenuItem key={action.href} asChild>
              <Link href={action.href}>
                <action.icon />
                {action.label}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
