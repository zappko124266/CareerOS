export const SUGGESTIONS = [
  "Improve my resume",
  "Find remote jobs",
  "Optimize LinkedIn",
  "Prepare for interviews",
  "Review my applications",
  "Switch careers",
] as const;

export function ChatSuggestionChips({
  onSelect,
}: {
  onSelect: (suggestion: string) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Suggested questions"
      className="flex flex-wrap justify-center gap-2"
    >
      {SUGGESTIONS.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          onClick={() => onSelect(suggestion)}
          className="border-border hover:bg-muted focus-visible:ring-ring rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:outline-none"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
