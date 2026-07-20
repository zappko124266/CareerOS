import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export function AppHeader() {
  return (
    <header className="border-border/60 bg-background/80 sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-2 backdrop-blur sm:px-4">
      <SidebarTrigger aria-label="Toggle sidebar" />
      <div className="flex-1" />
      <ThemeToggle />
    </header>
  );
}
