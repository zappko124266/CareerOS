"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { UserMenu } from "@/components/layout/user-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { mainNav } from "@/config/site";
import type { UserDTO } from "@/lib/auth/dto";

const ADMIN_NAV_ITEM = { title: "Admin", href: "/admin", icon: ShieldCheck } as const;

/**
 * Desktop: persistent collapsible sidebar. Mobile (<768px, matching
 * `useIsMobile`'s breakpoint): automatically renders as a Sheet drawer
 * instead — both are the same component, shadcn's `Sidebar` primitive
 * switches internally. Toggle it via `AppHeader`'s `SidebarTrigger`, or
 * Cmd/Ctrl+B.
 */
export function AppSidebar({ user }: { user: UserDTO }) {
  const pathname = usePathname();
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  const navItems = isAdmin ? [...mainNav, ADMIN_NAV_ITEM] : mainNav;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-3">
        <Logo className="px-1 group-data-[collapsible=icon]:hidden" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="gap-1 px-2">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.title}
                  size="lg"
                  className="text-base"
                >
                  <Link href={item.href}>
                    <item.icon className="size-5" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <UserMenu user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
