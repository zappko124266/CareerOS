export const siteConfig = {
  name: "CareerOS",
  description:
    "CareerOS is the operating system for managing your career — track goals, opportunities, and growth in one place.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;

export const mainNav = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Resumes", href: "/resume" },
] as const;
