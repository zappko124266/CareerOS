"use client";

import { approveApplicationExecutionAction, declineApplicationExecutionAction } from "@/actions/application-automation";
import { Button } from "@/components/ui/button";
import { useAsyncAction } from "@/hooks/use-async-action";

export interface WaitingApprovalItem {
  id: string;
  opportunity: { id: string; title: string; companyName: string };
}

/**
 * Sprint 18 — the Autonomous Application Engine's real Human Approval
 * surface. A small client island composed *into* the existing
 * `ApplicationsSummaryCard` rather than a new top-level dashboard
 * widget. Buttons are real `<button>` elements (via the existing
 * `Button` primitive) — keyboard-focusable and activatable by default,
 * with `aria-label`s naming the specific company so a screen-reader user
 * doesn't hear three identical "Approve" buttons with no context.
 */
function ApprovalRow({ item }: { item: WaitingApprovalItem }) {
  const approveAction = useAsyncAction(approveApplicationExecutionAction);
  const declineAction = useAsyncAction(declineApplicationExecutionAction);
  const isPending = approveAction.isPending || declineAction.isPending;

  return (
    <li className="flex items-center justify-between gap-2 text-sm">
      <span className="min-w-0 truncate">
        {item.opportunity.companyName} — {item.opportunity.title}
      </span>
      <span className="flex shrink-0 gap-1.5">
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => approveAction.run(item.id)}
          aria-label={`Approve application to ${item.opportunity.companyName}`}
        >
          {approveAction.isPending ? "Approving…" : "Approve"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={() => declineAction.run(item.id)}
          aria-label={`Decline application to ${item.opportunity.companyName}`}
        >
          {declineAction.isPending ? "Declining…" : "Decline"}
        </Button>
      </span>
      {(approveAction.error || declineAction.error) && (
        <p role="alert" className="text-destructive w-full text-xs">
          {approveAction.error ?? declineAction.error}
        </p>
      )}
    </li>
  );
}

export function ApplicationApprovalList({ items }: { items: WaitingApprovalItem[] }) {
  if (items.length === 0) return null;

  return (
    <div>
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Waiting your approval</p>
      <ul className="mt-1.5 flex flex-col gap-2">
        {items.slice(0, 3).map((item) => (
          <ApprovalRow key={item.id} item={item} />
        ))}
      </ul>
    </div>
  );
}
