"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { updateProfileAction } from "@/actions/profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useAsyncAction } from "@/hooks/use-async-action";
import { EXPERIENCE_LEVEL_LABEL } from "@/features/discovery/types";
import type { CareerProfile } from "@/features/career-brain/types";
import type { OnboardingStep } from "@/features/onboarding/service";
import type { ConnectionSummary } from "@/features/connectors/manager";
import type { UserDTO } from "@/lib/auth/dto";

function initials(fullName: string | null, email: string) {
  const source = fullName ?? email;
  return source
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function IdentityOverviewPanel({
  user: initialUser,
  profile,
  completeness,
  googleConnection,
}: {
  user: UserDTO;
  profile: CareerProfile;
  completeness: { items: OnboardingStep[]; completedCount: number; totalCount: number; percentage: number };
  googleConnection: ConnectionSummary | null;
}) {
  const [user, setUser] = useState(initialUser);
  const [fullName, setFullName] = useState(user.fullName ?? "");
  const updateAction = useAsyncAction(updateProfileAction);

  const googleNameDiffers =
    googleConnection?.externalAccountName &&
    googleConnection.externalAccountName !== user.fullName;

  async function handleSaveName(event: React.FormEvent) {
    event.preventDefault();
    const updated = await updateAction.run(fullName);
    if (updated) {
      setUser(updated);
      toast.success("Name updated");
    } else if (updateAction.error) {
      toast.error(updateAction.error);
    }
  }

  async function handleUseGoogleName() {
    if (!googleConnection?.externalAccountName) return;
    const updated = await updateAction.run(googleConnection.externalAccountName);
    if (updated) {
      setUser(updated);
      setFullName(updated.fullName ?? "");
      toast.success("Name updated from Google");
    } else if (updateAction.error) {
      toast.error(updateAction.error);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-14">
              <AvatarImage src={user.avatarUrl ?? undefined} alt="" />
              <AvatarFallback>{initials(user.fullName, user.email)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium">{user.fullName ?? "Add your name"}</p>
              <p className="text-muted-foreground truncate text-sm">{user.email}</p>
            </div>
            {googleConnection && (
              <Badge variant="secondary" className="ml-auto shrink-0 gap-1">
                <ShieldCheck className="size-3" />
                Verified via Google
              </Badge>
            )}
          </div>

          <form onSubmit={handleSaveName} className="flex flex-col gap-2">
            <Label htmlFor="identity-full-name">Full name</Label>
            <div className="flex flex-wrap gap-2">
              <Input
                id="identity-full-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="max-w-sm"
              />
              <Button type="submit" size="sm" disabled={updateAction.isPending}>
                {updateAction.isPending ? "Saving…" : "Save"}
              </Button>
              {googleNameDiffers && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={updateAction.isPending}
                  onClick={handleUseGoogleName}
                >
                  Use name from Google ({googleConnection.externalAccountName})
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Profile completeness</h2>
            <span className="text-muted-foreground text-sm">{completeness.percentage}%</span>
          </div>
          <Progress
            value={completeness.percentage}
            aria-label="Profile completeness"
            aria-valuetext={`${completeness.percentage}% complete`}
          />
          <ul className="flex flex-col gap-1.5">
            {completeness.items.map((item) => (
              <li key={item.id} className="flex items-start gap-2.5">
                {item.completed ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-500" />
                ) : (
                  <Circle className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{item.label}</p>
                  {!item.completed && (
                    <Link href={item.href} className="text-muted-foreground text-xs underline">
                      {item.cta}
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Career profile</h2>
            <Button asChild size="sm" variant="ghost">
              <Link href="/onboarding">
                <Sparkles />
                Edit in onboarding wizard
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-xs">Target role</p>
              <p className="text-sm font-medium">{profile.goals.targetRole ?? "Not set"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Career stage</p>
              <p className="text-sm font-medium">
                {profile.careerStage ? EXPERIENCE_LEVEL_LABEL[profile.careerStage] : "Not set"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Years of experience</p>
              <p className="text-sm font-medium">{profile.yearsOfExperience ?? "Not set"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Education level</p>
              <p className="text-sm font-medium">{profile.educationLevel ?? "Not set"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Location & work</p>
              <p className="text-sm font-medium">{profile.preferences.locationSummary ?? "Not set"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Target companies</p>
              <p className="text-sm font-medium">
                {profile.goals.targetCompanies.length > 0
                  ? profile.goals.targetCompanies.join(", ")
                  : "None saved"}
              </p>
            </div>
          </div>
          {profile.skills.length > 0 && (
            <div>
              <p className="text-muted-foreground text-xs">Skills</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {profile.skills.slice(0, 20).map((skill) => (
                  <Badge key={skill} variant="outline">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
