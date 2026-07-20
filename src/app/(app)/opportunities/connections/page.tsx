import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Link2Off } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Account Connections" };

const CONNECTIONS = [
  {
    provider: "LINKEDIN",
    name: "LinkedIn",
    reason:
      "LinkedIn's public API doesn't offer individual-user job-application automation — only approved Partner Program integrations.",
  },
  {
    provider: "NAUKRI",
    name: "Naukri",
    reason: "No public, self-serve OAuth API is available for this integration.",
  },
  {
    provider: "INDEED",
    name: "Indeed",
    reason:
      "Indeed's API access is employer/publisher-focused, not available for individual account connections.",
  },
  {
    provider: "FOUNDIT",
    name: "Foundit",
    reason: "No public, self-serve OAuth API is available for this integration.",
  },
  {
    provider: "WELLFOUND",
    name: "Wellfound",
    reason: "No public, self-serve OAuth API is available for this integration.",
  },
  {
    provider: "APNA",
    name: "Apna",
    reason: "No public, self-serve OAuth API is available for this integration.",
  },
  {
    provider: "INTERNSHALA",
    name: "Internshala",
    reason: "No public, self-serve OAuth API is available for this integration.",
  },
] as const;

export default async function ConnectionsPage() {
  await verifySession();

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href="/opportunities">
          <ArrowLeft />
          Back to Opportunities
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Account connections
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          CareerOS never collects a password for any external site. Every
          connection below either uses that platform&apos;s own officially
          supported sign-in flow, or isn&apos;t offered at all until one
          exists.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {CONNECTIONS.map((connection) => (
          <Card key={connection.provider}>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">{connection.name}</h2>
                <Badge variant="outline">Not available</Badge>
              </div>
              <p className="text-muted-foreground flex items-start gap-2 text-sm">
                <Link2Off className="mt-0.5 size-4 shrink-0" />
                {connection.reason}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
