import { FileText, LayoutDashboard, Sparkle } from "lucide-react";

import { cn } from "@/lib/utils";

const DIMENSIONS = [
  { label: "Keyword relevance", value: 88 },
  { label: "ATS-friendly formatting", value: 95 },
  { label: "Impact language", value: 74 },
];

function BrowserFrame({
  path,
  children,
  className,
}: {
  path: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-card ring-foreground/10 mx-auto w-full max-w-4xl overflow-hidden rounded-2xl shadow-2xl ring-1",
        className,
      )}
    >
      <div
        aria-hidden
        className="bg-muted/40 flex h-9 shrink-0 items-center gap-4 border-b px-4"
      >
        <div className="flex gap-1.5">
          <span className="bg-foreground/15 size-2.5 rounded-full" />
          <span className="bg-foreground/15 size-2.5 rounded-full" />
          <span className="bg-foreground/15 size-2.5 rounded-full" />
        </div>
        <div className="bg-background/80 text-muted-foreground flex h-6 flex-1 items-center justify-center rounded-md text-xs">
          careeros.app{path}
        </div>
      </div>
      {children}
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  return (
    <div
      aria-hidden
      className="relative flex size-24 shrink-0 items-center justify-center rounded-full sm:size-28"
      style={{
        background: `conic-gradient(var(--color-foreground) ${score * 3.6}deg, var(--color-muted) 0deg)`,
      }}
    >
      <div className="bg-card absolute inset-1.5 flex flex-col items-center justify-center rounded-full">
        <span className="text-2xl font-semibold sm:text-3xl">{score}</span>
        <span className="text-muted-foreground text-[10px] sm:text-xs">
          / 100
        </span>
      </div>
    </div>
  );
}

function DashboardMockup() {
  return (
    <BrowserFrame path="/dashboard">
      <div className="flex">
        <div
          aria-hidden
          className="bg-muted/20 hidden w-14 shrink-0 flex-col items-center gap-4 border-r py-4 sm:flex"
        >
          <Sparkle className="size-4" />
          <div className="bg-foreground/10 flex size-8 items-center justify-center rounded-lg">
            <LayoutDashboard className="size-4" />
          </div>
          <div className="text-muted-foreground flex size-8 items-center justify-center rounded-lg">
            <FileText className="size-4" />
          </div>
        </div>

        <div className="flex-1 p-4 sm:p-6">
          <div aria-hidden className="mb-5 flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="bg-foreground/15 h-3 w-32 rounded-full" />
              <div className="bg-muted h-2.5 w-48 rounded-full" />
            </div>
            <div className="bg-foreground h-8 w-24 rounded-lg opacity-90 sm:w-28" />
          </div>

          <div aria-hidden className="mb-5 grid grid-cols-3 gap-3">
            {[
              { label: "Resumes", value: "3" },
              { label: "Avg. ATS", value: "82" },
              { label: "Insights", value: "12" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="ring-foreground/10 rounded-xl py-3 text-center ring-1"
              >
                <div className="text-lg font-semibold sm:text-xl">
                  {stat.value}
                </div>
                <div className="text-muted-foreground mt-0.5 text-[10px] sm:text-xs">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          <div className="ring-foreground/10 flex flex-col gap-4 rounded-xl p-4 ring-1 sm:flex-row sm:items-center sm:gap-6">
            <ScoreRing score={82} />
            <div aria-hidden className="flex-1 space-y-2.5">
              {DIMENSIONS.map((dim) => (
                <div key={dim.label} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground/80">{dim.label}</span>
                    <span className="text-muted-foreground">{dim.value}</span>
                  </div>
                  <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                    <div
                      className="bg-foreground h-full rounded-full"
                      style={{ width: `${dim.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <span className="sr-only">
        Illustration of the CareerOS dashboard, showing an overall ATS score
        of 82 out of 100 and a breakdown across keyword relevance,
        formatting, and impact language.
      </span>
    </BrowserFrame>
  );
}

function ResumeAnalysisMockup() {
  return (
    <BrowserFrame path="/resume/senior-product-designer">
      <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:p-6">
        <div aria-hidden className="space-y-3">
          <div className="bg-foreground/15 h-3.5 w-2/3 rounded-full" />
          <div className="bg-muted h-2.5 w-full rounded-full" />
          <div className="bg-muted h-2.5 w-5/6 rounded-full" />
          <div className="bg-muted h-2.5 w-full rounded-full" />
          <div className="bg-muted h-2.5 w-3/4 rounded-full" />
          <div className="mt-4 h-2.5 w-2/5 rounded-full bg-emerald-500/40" />
          <div className="bg-muted h-2.5 w-full rounded-full" />
          <div className="bg-muted h-2.5 w-4/6 rounded-full" />
        </div>
        <div className="ring-foreground/10 flex flex-col items-center gap-3 rounded-xl p-4 ring-1 sm:w-48">
          <ScoreRing score={91} />
          <p className="text-muted-foreground text-center text-xs">
            Strong ATS match for this role
          </p>
        </div>
      </div>
      <span className="sr-only">
        Illustration of a CareerOS resume analysis page, showing a resume
        with a 91 out of 100 ATS match score for the target role.
      </span>
    </BrowserFrame>
  );
}

export function ProductPreview({
  variant,
}: {
  variant: "dashboard" | "resume-analysis";
}) {
  return variant === "dashboard" ? <DashboardMockup /> : <ResumeAnalysisMockup />;
}
