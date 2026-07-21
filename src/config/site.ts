import {
  Briefcase,
  FileText,
  Home,
  ListChecks,
  Settings,
  Sparkles,
} from "lucide-react";

import { clientEnv } from "@/lib/env.client";

export const siteConfig = {
  name: "CareerOS",
  description:
    "CareerOS is the operating system for managing your career — track goals, opportunities, and growth in one place.",
  url: clientEnv.NEXT_PUBLIC_APP_URL,
} as const;

// Primary navigation — the AI Coach experience, not the old feature list.
// Advanced/secondary pages (LinkedIn, AI Job Discovery, Analytics, Account
// Connections, Recruiters) are intentionally not top-level nav items
// anymore; they're still fully reachable from the AI Coach cards and from
// links within Resume/Jobs/Applications themselves — nothing was deleted.
export const mainNav = [
  { title: "Home", href: "/dashboard", icon: Home },
  { title: "AI Coach", href: "/coach", icon: Sparkles },
  { title: "Resume", href: "/resume", icon: FileText },
  { title: "Jobs", href: "/opportunities", icon: Briefcase },
  { title: "Applications", href: "/applications", icon: ListChecks },
  { title: "Settings", href: "/settings", icon: Settings },
] as const;

export const landingNav = [
  { title: "Benefits", href: "#benefits" },
  { title: "How it works", href: "#how-it-works" },
  { title: "Features", href: "#features" },
  { title: "Pricing", href: "#pricing" },
  { title: "FAQ", href: "#faq" },
] as const;
