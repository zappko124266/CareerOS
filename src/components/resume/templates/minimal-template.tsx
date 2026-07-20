import {
  formatContactLine,
  formatDateRange,
  resumeDisplayName,
} from "@/features/resume/format";
import type { ResumeData } from "@/features/resume/schema";

/** Single-column, centered header, generous whitespace — the classic
 * resume layout. See `modern-template.tsx` for the two-column alternative. */
export function MinimalTemplate({ data }: { data: ResumeData }) {
  const contactLine = formatContactLine(data);

  return (
    <div className="mx-auto max-w-2xl bg-white p-8 text-neutral-900 sm:p-10">
      <header className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {resumeDisplayName(data)}
        </h1>
        {contactLine && (
          <p className="mt-1 text-sm text-neutral-600">{contactLine}</p>
        )}
      </header>

      {data.summary && (
        <section className="mt-6">
          <p className="text-sm leading-relaxed text-neutral-700">
            {data.summary}
          </p>
        </section>
      )}

      {data.experience.length > 0 && (
        <section className="mt-6">
          <h2 className="border-b border-neutral-300 pb-1 text-xs font-semibold tracking-widest text-neutral-500 uppercase">
            Experience
          </h2>
          <div className="mt-3 flex flex-col gap-4">
            {data.experience.map((entry, index) => (
              <div key={index}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="text-sm font-semibold">
                    {entry.title} · {entry.company}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {formatDateRange(entry.startDate, entry.endDate, entry.current)}
                  </p>
                </div>
                {entry.location && (
                  <p className="text-xs text-neutral-500">{entry.location}</p>
                )}
                {entry.bullets.length > 0 && (
                  <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-neutral-700">
                    {entry.bullets.map((bullet, bulletIndex) => (
                      <li key={bulletIndex}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {data.education.length > 0 && (
        <section className="mt-6">
          <h2 className="border-b border-neutral-300 pb-1 text-xs font-semibold tracking-widest text-neutral-500 uppercase">
            Education
          </h2>
          <div className="mt-3 flex flex-col gap-3">
            {data.education.map((entry, index) => (
              <div key={index} className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="text-sm font-semibold">
                  {entry.degree ? `${entry.degree}, ` : ""}
                  {entry.institution}
                </p>
                <p className="text-xs text-neutral-500">
                  {formatDateRange(entry.startDate, entry.endDate, false)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.skills.length > 0 && (
        <section className="mt-6">
          <h2 className="border-b border-neutral-300 pb-1 text-xs font-semibold tracking-widest text-neutral-500 uppercase">
            Skills
          </h2>
          <p className="mt-3 text-sm text-neutral-700">
            {data.skills.join(" · ")}
          </p>
        </section>
      )}

      {data.certifications.length > 0 && (
        <section className="mt-6">
          <h2 className="border-b border-neutral-300 pb-1 text-xs font-semibold tracking-widest text-neutral-500 uppercase">
            Certifications
          </h2>
          <p className="mt-3 text-sm text-neutral-700">
            {data.certifications.map((cert) => cert.name).join(" · ")}
          </p>
        </section>
      )}

      {data.projects.length > 0 && (
        <section className="mt-6">
          <h2 className="border-b border-neutral-300 pb-1 text-xs font-semibold tracking-widest text-neutral-500 uppercase">
            Projects
          </h2>
          <div className="mt-3 flex flex-col gap-3">
            {data.projects.map((project, index) => (
              <div key={index}>
                <p className="text-sm font-semibold">{project.name}</p>
                {project.description && (
                  <p className="text-sm text-neutral-700">{project.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
