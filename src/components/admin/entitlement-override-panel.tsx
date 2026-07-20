"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  removeEntitlementOverrideAction,
  setEntitlementOverrideAction,
} from "@/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAsyncAction } from "@/hooks/use-async-action";
import { METERED_FEATURES } from "@/features/entitlements/types";
import type { MeteredFeature } from "@/features/entitlements/types";
import type { EntitlementOverride } from "@/generated/prisma/client";

export function EntitlementOverridePanel({
  userId,
  overrides: initialOverrides,
}: {
  userId: string;
  overrides: EntitlementOverride[];
}) {
  const [overrides, setOverrides] = useState(initialOverrides);
  const [feature, setFeature] = useState<MeteredFeature>(METERED_FEATURES[0]);
  const [unlimited, setUnlimited] = useState(false);
  const [customLimit, setCustomLimit] = useState("0");
  const [reason, setReason] = useState("");

  const setAction = useAsyncAction(setEntitlementOverrideAction);
  const removeAction = useAsyncAction(removeEntitlementOverrideAction);

  async function handleSet() {
    const result = await setAction.run({
      userId,
      feature,
      customLimit: unlimited ? null : Number(customLimit),
      reason,
    });
    if (result) {
      setOverrides((prev) => [result, ...prev.filter((o) => o.feature !== result.feature)]);
      setReason("");
      toast.success("Override saved");
    } else if (setAction.error) {
      toast.error(setAction.error);
    }
  }

  async function handleRemove(overrideFeature: MeteredFeature) {
    const result = await removeAction.run({ userId, feature: overrideFeature });
    if (result) {
      setOverrides((prev) => prev.filter((o) => o.feature !== overrideFeature));
      toast.success("Override removed");
    } else if (removeAction.error) {
      toast.error(removeAction.error);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold">Entitlement overrides</h2>
          <p className="text-muted-foreground text-sm">
            Overrides this user&apos;s plan-tier limit for a specific feature. Every change is
            audited.
          </p>
        </div>

        {overrides.length > 0 && (
          <ul className="flex flex-col gap-2">
            {overrides.map((override) => (
              <li key={override.feature} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{override.feature}</p>
                  <p className="text-muted-foreground wrap-break-word text-xs">{override.reason}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="secondary">
                    {override.customLimit === null ? "Unlimited" : override.customLimit}
                  </Badge>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => handleRemove(override.feature as MeteredFeature)}
                    disabled={removeAction.isPending}
                    aria-label={`Remove override for ${override.feature}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="grid grid-cols-1 gap-3 border-t pt-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="override-feature">Feature</Label>
            <Select value={feature} onValueChange={(value) => setFeature(value as MeteredFeature)}>
              <SelectTrigger id="override-feature">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METERED_FEATURES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="override-limit">Custom limit</Label>
            <div className="flex items-center gap-2">
              <Input
                id="override-limit"
                type="number"
                min={0}
                value={customLimit}
                onChange={(event) => setCustomLimit(event.target.value)}
                disabled={unlimited}
              />
              <div className="flex items-center gap-1.5">
                <Checkbox
                  id="override-unlimited"
                  checked={unlimited}
                  onCheckedChange={(checked) => setUnlimited(checked === true)}
                />
                <Label htmlFor="override-unlimited" className="text-sm font-normal">
                  Unlimited
                </Label>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="override-reason">Reason</Label>
            <Input
              id="override-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. beta tester, support goodwill credit"
            />
          </div>
        </div>

        <div className="flex flex-col items-start gap-2">
          <Button onClick={handleSet} disabled={setAction.isPending || !reason.trim()} size="sm">
            {setAction.isPending ? "Saving…" : "Save override"}
          </Button>
          {setAction.error && <p className="text-destructive text-sm">{setAction.error}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
