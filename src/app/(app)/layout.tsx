import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { PageContainer } from "@/components/layout/page-container";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { verifySession } from "@/lib/auth/dal";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Real authorization check — Proxy's redirect is only an optimistic
  // fast-path, this is the source of truth.
  const user = await verifySession();

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      {/* `SidebarInset` already renders the <main> landmark — id lives
          here (not on a nested element) so the skip link and this stay
          the single <main> on the page. */}
      <SidebarInset id="main-content">
        <AppHeader />
        <PageContainer>{children}</PageContainer>
      </SidebarInset>
    </SidebarProvider>
  );
}
