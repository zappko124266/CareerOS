import { Briefcase, FileText, IdCard, LayoutDashboard } from "lucide-react";

import { clientEnv } from "@/lib/env.client";

export const siteConfig = {
  name: "CareerOS",
  description:
    "CareerOS is the operating system for managing your career — track goals, opportunities, and growth in one place.",
  url: clientEnv.NEXT_PUBLIC_APP_URL,
} as const;

export const mainNav = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Resumes", href: "/resume", icon: FileText },
  { title: "LinkedIn", href: "/linkedin", icon: IdCard },
  { title: "Opportunities", href: "/opportunities", icon: Briefcase },
] as const;

export const landingNav = [
  { title: "Benefits", href: "#benefits" },
  { title: "How it works", href: "#how-it-works" },
  { title: "Features", href: "#features" },
  { title: "Pricing", href: "#pricing" },
  { title: "FAQ", href: "#faq" },
] as const;
