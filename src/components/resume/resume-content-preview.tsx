import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { ResumeData } from "@/features/resume/schema";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function ResumeContentPreview({ data }: { data: ResumeData }) {
  return (
    <div className="flex flex-col gap-6">
      <Section title="Contact">
        <p className="font-medium">{data.contact.fullName ?? "—"}</p>
        <p className="text-muted-foreground text-sm">
          {[data.contact.email, data.contact.phone, data.contact.location]
            .filter(Boolean)
            .join(" · ") || "—"}
        </p>
      </Section>

      {data.summary && (
        <Section title="Summary">
          <p className="text-sm">{data.summary}</p>
        </Section>
      )}

      {data.experience.length > 0 && (
        <Section title="Experience">
          <div className="flex flex-col gap-4">
            {data.experience.map((entry, index) => (
              <div key={index}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-medium">
                    {entry.title} · {entry.company}
                  </p>
                  <p className="text-muted-foreground shrink-0 text-xs">
                    {entry.startDate ?? "?"} –{" "}
                    {entry.current ? "Present" : (entry.endDate ?? "?")}
                  </p>
                </div>
                {entry.bullets.length > 0 && (
                  <ul className="text-muted-foreground mt-1 list-disc space-y-0.5 pl-5 text-sm">
                    {entry.bullets.map((bullet, bulletIndex) => (
                      <li key={bulletIndex}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {data.education.length > 0 && (
        <Section title="Education">
          <div className="flex flex-col gap-2">
            {data.education.map((entry, index) => (
              <div
                key={index}
                className="flex items-baseline justify-between gap-2"
              >
                <p className="text-sm">
                  {entry.degree
                    ? `${entry.degree}${entry.field ? `, ${entry.field}` : ""} — `
                    : ""}
                  {entry.institution}
                </p>
                <p className="text-muted-foreground shrink-0 text-xs">
                  {entry.startDate ?? "?"} – {entry.endDate ?? "?"}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {data.skills.length > 0 && (
        <Section title="Skills">
          <div className="flex flex-wrap gap-1.5">
            {data.skills.map((skill) => (
              <Badge key={skill} variant="secondary">
                {skill}
              </Badge>
            ))}
          </div>
        </Section>
      )}

      {data.certifications.length > 0 && (
        <>
          <Separator />
          <Section title="Certifications">
            <div className="flex flex-col gap-1">
              {data.certifications.map((cert, index) => (
                <p key={index} className="text-sm">
                  {cert.name}
                  {cert.issuer ? ` — ${cert.issuer}` : ""}
                  {cert.date ? ` (${cert.date})` : ""}
                </p>
              ))}
            </div>
          </Section>
        </>
      )}

      {data.projects.length > 0 && (
        <Section title="Projects">
          <div className="flex flex-col gap-3">
            {data.projects.map((project, index) => (
              <div key={index}>
                <p className="font-medium">{project.name}</p>
                {project.description && (
                  <p className="text-muted-foreground text-sm">
                    {project.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
