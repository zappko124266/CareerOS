"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  LayoutDashboard,
  LogOut,
  Search,
  Upload,
} from "lucide-react";

import { signOutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

export function DashboardCommandPalette({
  className,
}: {
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className={cn(
          "text-muted-foreground w-full justify-between sm:w-64",
          className,
        )}
      >
        <span className="flex items-center gap-2">
          <Search className="size-4" />
          Search or jump to…
        </span>
        <kbd className="pointer-events-none hidden h-5 items-center gap-0.5 rounded border border-current/20 px-1.5 font-mono text-[10px] font-medium text-current/70 sm:inline-flex">
          ⌘K
        </kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Command palette"
        description="Jump to a page or run a quick action"
      >
        <CommandInput placeholder="Type a command or search…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigate">
            <CommandItem onSelect={() => navigate("/dashboard")}>
              <LayoutDashboard />
              Dashboard
              <CommandShortcut>Home</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => navigate("/resume")}>
              <FileText />
              My resumes
            </CommandItem>
            <CommandItem onSelect={() => navigate("/resume")}>
              <Upload />
              Upload a resume
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Account">
            <CommandItem
              onSelect={() => {
                setOpen(false);
                void signOutAction();
              }}
            >
              <LogOut />
              Sign out
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
