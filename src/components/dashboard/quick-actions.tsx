import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { FileText, LayoutDashboard, Upload } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ACTIONS: { icon: LucideIcon; label: string; href: string }[] = [
  { icon: Upload, label: "Upload resume", href: "/resume" },
  { icon: FileText, label: "View resumes", href: "/resume" },
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
];

export function QuickActions() {
  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {ACTIONS.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="border-border hover:bg-muted focus-visible:ring-ring flex h-11 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:outline-none"
            >
              <action.icon className="size-4 shrink-0" />
              {action.label}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
