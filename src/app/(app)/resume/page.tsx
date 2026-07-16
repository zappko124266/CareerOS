import type { Metadata } from "next";
import { FileText } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { ResumeList } from "@/components/resume/resume-list";
import { ResumeUploadDialog } from "@/components/resume/resume-upload-dialog";
import { listResumesForUser } from "@/features/resume/queries";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Resumes" };

export default async function ResumePage() {
  const user = await verifySession();
  const resumes = await listResumesForUser(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Resumes</h1>
          <p className="text-muted-foreground text-sm">
            Upload a resume to get an ATS score and optimization suggestions.
          </p>
        </div>
        {resumes.length > 0 && <ResumeUploadDialog />}
      </div>
      {resumes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No resumes yet"
          description="Upload a PDF or DOCX to get started."
          action={<ResumeUploadDialog />}
        />
      ) : (
        <ResumeList resumes={resumes} />
      )}
    </div>
  );
}
