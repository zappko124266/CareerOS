import { cn } from "@/lib/utils";

export function ScoreRing({
  score,
  size = "default",
  label,
  className,
}: {
  score: number;
  size?: "default" | "sm";
  label: string;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={`${label}: ${score} out of 100`}
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full",
        size === "sm" ? "size-14" : "size-20",
        className,
      )}
      style={{
        background: `conic-gradient(var(--color-foreground) ${score * 3.6}deg, var(--color-muted) 0deg)`,
      }}
    >
      <div className="bg-card absolute inset-1.5 flex items-center justify-center rounded-full">
        <span
          aria-hidden
          className={cn("font-semibold", size === "sm" ? "text-base" : "text-xl")}
        >
          {score}
        </span>
      </div>
    </div>
  );
}
