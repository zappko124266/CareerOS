"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

/** Free-text tag list — type and press Enter (or comma) to add, click the
 * badge's X to remove. Used for preference fields where the possible
 * values aren't a fixed, known set (preferred roles, keywords, company
 * names) — `MultiSelectCombobox` is for picking from a known list. */
export function TagInput({
  value,
  onChange,
  placeholder = "Type and press Enter…",
  "aria-label": ariaLabel,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  "aria-label"?: string;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setDraft("");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit();
    } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function remove(entry: string) {
    onChange(value.filter((item) => item !== entry));
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((entry) => (
            <Badge key={entry} variant="secondary" className="gap-1 pr-1">
              {entry}
              <button
                type="button"
                onClick={() => remove(entry)}
                aria-label={`Remove ${entry}`}
                className="hover:bg-foreground/10 rounded-full p-0.5"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
