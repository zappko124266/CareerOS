"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { Checklist } from "@/features/opportunities/types";

export function ChecklistEditor({
  checklist,
  onChange,
}: {
  checklist: Checklist;
  onChange: (checklist: Checklist) => void;
}) {
  const [newLabel, setNewLabel] = useState("");

  function addItem() {
    const label = newLabel.trim();
    if (!label) return;
    onChange([
      ...checklist,
      { id: crypto.randomUUID(), label, done: false },
    ]);
    setNewLabel("");
  }

  function toggleItem(id: string) {
    onChange(
      checklist.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item,
      ),
    );
  }

  function removeItem(id: string) {
    onChange(checklist.filter((item) => item.id !== id));
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      {checklist.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No checklist items yet — add what you need to do before applying.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {checklist.map((item) => (
            <li key={item.id} className="flex items-center gap-2.5">
              <Checkbox
                id={`checklist-${item.id}`}
                checked={item.done}
                onCheckedChange={() => toggleItem(item.id)}
              />
              <label
                htmlFor={`checklist-${item.id}`}
                className={
                  item.done
                    ? "text-muted-foreground flex-1 text-sm line-through"
                    : "flex-1 text-sm"
                }
              >
                {item.label}
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeItem(item.id)}
                aria-label={`Remove ${item.label}`}
              >
                <X className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="e.g. Tailor resume bullet points"
          value={newLabel}
          onChange={(event) => setNewLabel(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addItem();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={addItem}
          disabled={!newLabel.trim()}
          aria-label="Add checklist item"
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}
