import Link from "next/link";
import {
  Briefcase,
  FileText,
  IdCard,
  ListChecks,
  MessagesSquare,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export interface CoachAction {
  id: string;
  title: string;
  description: string;
  href: string;
}

const ICON: Record<CoachAction["id"], LucideIcon> = {
  "find-a-job": Briefcase,
  "improve-resume": FileText,
  "optimize-linkedin": IdCard,
  "prepare-interview": MessagesSquare,
  "track-applications": ListChecks,
};

/**
 * Five large, tappable entry points into CareerOS's existing features —
 * every href routes to an already-built page (see coach/page.tsx for how
 * each is resolved). No new business logic here, purely navigation.
 */
export function CoachActionCards({ actions }: { actions: CoachAction[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {actions.map((action) => {
        const Icon = ICON[action.id];
        return (
          <Link key={action.id} href={action.href} className="group">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardContent className="flex h-full flex-col gap-3 p-6">
                <span className="bg-muted text-foreground flex size-11 shrink-0 items-center justify-center rounded-full">
                  <Icon className="size-5" />
                </span>
                <h2 className="text-lg font-semibold tracking-tight">
                  {action.title}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {action.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
