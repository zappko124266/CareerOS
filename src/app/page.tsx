import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Logo } from "@/components/shared/logo";
import { siteConfig } from "@/config/site";

export default function HomePage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-14 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/sign-up">Get started</Link>
          </Button>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          {siteConfig.name}
        </h1>
        <p className="text-muted-foreground max-w-xl text-lg text-balance">
          {siteConfig.description}
        </p>
        <div className="flex items-center gap-3">
          <Button asChild size="lg">
            <Link href="/sign-up">Get started</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
