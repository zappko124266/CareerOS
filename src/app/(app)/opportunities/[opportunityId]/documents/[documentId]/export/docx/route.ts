import { NextResponse } from "next/server";

import { verifySession } from "@/lib/auth/dal";
import { logAuditEvent } from "@/lib/audit";
import { getOwnedApplicationDocumentOrThrow } from "@/features/applications/queries";
import { buildExportBody } from "@/features/applications/format";
import { renderPlainDocumentDocx } from "@/features/applications/export/plain-docx";
import { checkEntitlement, consumeEntitlement } from "@/features/entitlements/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ opportunityId: string; documentId: string }> },
) {
  const { documentId } = await params;
  const user = await verifySession();

  const entitlement = await checkEntitlement(user.id, "APPLICATION_EXPORT");
  if (!entitlement.allowed) {
    return NextResponse.json(
      {
        error: `You've used all ${entitlement.limit} free exports this month. This resets monthly — the Pro plan removes the limit.`,
      },
      { status: 403 },
    );
  }

  const document = await getOwnedApplicationDocumentOrThrow(documentId, user.id).catch(
    () => null,
  );
  if (!document) {
    return NextResponse.json({ error: "That document doesn't exist." }, { status: 404 });
  }

  const buffer = await renderPlainDocumentDocx(document.title, buildExportBody(document));

  await consumeEntitlement(user.id, "APPLICATION_EXPORT");
  await logAuditEvent("application_document.exported", {
    userId: user.id,
    metadata: { documentId, format: "docx", kind: document.kind },
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${document.title.replace(/[^a-z0-9-_ ]/gi, "")}.docx"`,
    },
  });
}
