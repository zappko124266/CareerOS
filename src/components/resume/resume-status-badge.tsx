import { Badge } from "@/components/ui/badge";
import type { ResumeStatus } from "@/generated/prisma/client";

const STATUS_LABEL: Record<ResumeStatus, string> = {
  UPLOADED: "Uploaded",
  PARSING: "Parsing…",
  PARSED: "Parsed",
  FAILED: "Failed",
};

const STATUS_VARIANT: Record<
  ResumeStatus,
  "default" | "secondary" | "destructive"
> = {
  UPLOADED: "secondary",
  PARSING: "secondary",
  PARSED: "default",
  FAILED: "destructive",
};

export function ResumeStatusBadge({ status }: { status: ResumeStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
