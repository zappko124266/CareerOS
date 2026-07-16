import Link from "next/link";
import { FileText } from "lucide-react";

import { ResumeStatusBadge } from "@/components/resume/resume-status-badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Resume } from "@/generated/prisma/client";

export function ResumeList({ resumes }: { resumes: Resume[] }) {
  return (
    <div className="flex flex-col gap-3">
      {resumes.map((resume) => (
        <Link key={resume.id} href={`/resume/${resume.id}`}>
          <Card className="hover:border-primary/50 transition-colors">
            <CardContent className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 overflow-hidden">
                <FileText className="text-muted-foreground size-5 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{resume.title}</p>
                  <p className="text-muted-foreground truncate text-sm">
                    {resume.originalFilename}
                  </p>
                </div>
              </div>
              <ResumeStatusBadge status={resume.status} />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
