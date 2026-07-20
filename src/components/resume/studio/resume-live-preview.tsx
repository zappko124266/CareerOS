import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RESUME_TEMPLATE_IDS,
  RESUME_TEMPLATES,
  type ResumeTemplateId,
} from "@/components/resume/templates";
import type { ResumeData } from "@/features/resume/schema";

export function ResumeLivePreview({
  data,
  templateId,
  onTemplateChange,
}: {
  data: ResumeData;
  templateId: ResumeTemplateId;
  onTemplateChange: (templateId: ResumeTemplateId) => void;
}) {
  const Template = RESUME_TEMPLATES[templateId].component;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Live preview</span>
        <Select
          value={templateId}
          onValueChange={(value) => onTemplateChange(value as ResumeTemplateId)}
        >
          <SelectTrigger aria-label="Resume template" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RESUME_TEMPLATE_IDS.map((id) => (
              <SelectItem key={id} value={id}>
                {RESUME_TEMPLATES[id].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="ring-foreground/10 overflow-hidden rounded-xl bg-neutral-100 p-3 ring-1 sm:p-6 dark:bg-neutral-800">
        <div className="overflow-x-auto rounded-lg shadow-sm">
          <Template data={data} />
        </div>
      </div>
    </div>
  );
}
