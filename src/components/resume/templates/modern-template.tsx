import {
  formatDateRange,
  resumeDisplayName,
} from "@/features/resume/format";
import type { ResumeData } from "@/features/resume/schema";

/** Two-column layout — a left sidebar (contact, skills, certifications)
 * alongside a main column (summary, experience, education, projects). See
 * `minimal-template.tsx` for the single-column alternative. */
export function ModernTemplate({ data }: { data: ResumeData }) {
  return (
    <div className="mx-auto grid max-w-2xl grid-cols-1 gap-6 bg-white p-8 text-neutral-900 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:p-10">
      <aside className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {resumeDisplayName(data)}
          </h1>
          <div className="mt-2 flex flex-col gap-0.5 text-xs text-neutral-600">
            {data.contact.email && <span>{data.contact.email}</span>}
            {data.contact.phone && <span>{data.contact.phone}</span>}
            {data.contact.location && <span>{data.contact.location}</span>}
          </div>
        </div>

        {data.skills.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold tracking-widest text-neutral-500 uppercase">
              Skills
            </h2>
            <ul className="mt-2 flex flex-col gap-1 text-sm text-neutral-700">
              {data.skills.map((skill) => (
                <li key={skill}>{skill}</li>
              ))}
            </ul>
          </div>
        )}

        {data.certifications.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold tracking-widest text-neutral-500 uppercase">
              Certifications
            </h2>
            <ul className="mt-2 flex flex-col gap-1 text-sm text-neutral-700">
              {data.certifications.map((cert, index) => (
                <li key={index}>{cert.name}</li>
              ))}
            </ul>
          </div>
        )}

        {data.education.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold tracking-widest text-neutral-500 uppercase">
              Education
            </h2>
            <div className="mt-2 flex flex-col gap-2">
              {data.education.map((entry, index) => (
                <div key={index} className="text-sm text-neutral-700">
                  <p className="font-medium text-neutral-900">
                    {entry.institution}
                  </p>
                  {entry.degree && <p>{entry.degree}</p>}
                  <p className="text-xs text-neutral-500">
                    {formatDateRange(entry.startDate, entry.endDate, false)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

      <main className="flex flex-col gap-6">
        {data.summary && (
          <section>
            <h2 className="text-xs font-semibold tracking-widest text-neutral-500 uppercase">
              Summary
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-700">
              {data.summary}
            </p>
          </section>
        )}

        {data.experience.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold tracking-widest text-neutral-500 uppercase">
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
                      {formatDateRange(
                        entry.startDate,
                        entry.endDate,
                        entry.current,
                      )}
                    </p>
                  </div>
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

        {data.projects.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold tracking-widest text-neutral-500 uppercase">
              Projects
            </h2>
            <div className="mt-3 flex flex-col gap-3">
              {data.projects.map((project, index) => (
                <div key={index}>
                  <p className="text-sm font-semibold">{project.name}</p>
                  {project.description && (
                    <p className="text-sm text-neutral-700">
                      {project.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
