import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ResumeData } from "@/features/resume/schema";

export function ContactSection({
  data,
  onChange,
}: {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
}) {
  function updateContact(patch: Partial<ResumeData["contact"]>) {
    onChange({ ...data, contact: { ...data.contact, ...patch } });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="builder-full-name">Full name</Label>
          <Input
            id="builder-full-name"
            value={data.contact.fullName ?? ""}
            onChange={(event) => updateContact({ fullName: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="builder-email">Email</Label>
          <Input
            id="builder-email"
            type="email"
            value={data.contact.email ?? ""}
            onChange={(event) => updateContact({ email: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="builder-phone">Phone</Label>
          <Input
            id="builder-phone"
            type="tel"
            value={data.contact.phone ?? ""}
            onChange={(event) => updateContact({ phone: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="builder-location">Location</Label>
          <Input
            id="builder-location"
            value={data.contact.location ?? ""}
            onChange={(event) => updateContact({ location: event.target.value })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="builder-summary">Professional summary</Label>
        <Textarea
          id="builder-summary"
          rows={5}
          value={data.summary ?? ""}
          onChange={(event) => onChange({ ...data, summary: event.target.value })}
          placeholder="A 2-4 sentence overview of your experience and what you're looking for next…"
        />
      </div>
    </div>
  );
}
