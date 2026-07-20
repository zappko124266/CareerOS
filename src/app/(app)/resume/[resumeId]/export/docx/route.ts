import { NextResponse } from "next/server";

import { verifySession } from "@/lib/auth/dal";
import { logAuditEvent } from "@/lib/audit";
import { getOwnedResumeOrThrow } from "@/features/resume/queries";
import { ResumeDataSchema } from "@/features/resume/schema";
import { renderResumeDocx } from "@/features/resume/export/docx";
import { checkEntitlement, consumeEntitlement } from "@/features/entitlements/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ resumeId: string }> },
) {
  const { resumeId } = await params;
  const user = await verifySession();

  const entitlement = await checkEntitlement(user.id, "RESUME_EXPORT");
  if (!entitlement.allowed) {
    return NextResponse.json(
      {
        error: `You've used all ${entitlement.limit} free exports this month. This resets monthly — the Pro plan removes the limit.`,
      },
      { status: 403 },
    );
  }

  const resume = await getOwnedResumeOrThrow(resumeId, user.id).catch(() => null);
  if (!resume?.parsedData) {
    return NextResponse.json(
      { error: "This resume has no content to export yet." },
      { status: 404 },
    );
  }

  const data = ResumeDataSchema.parse(resume.parsedData);
  const buffer = await renderResumeDocx(data);

  await consumeEntitlement(user.id, "RESUME_EXPORT");
  await logAuditEvent("resume.exported", {
    userId: user.id,
    metadata: { resumeId, format: "docx" },
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${resume.title.replace(/[^a-z0-9-_ ]/gi, "")}.docx"`,
    },
  });
}
