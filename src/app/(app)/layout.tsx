import { Navbar } from "@/components/layout/navbar";
import { PageContainer } from "@/components/layout/page-container";
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
    <div className="flex min-h-svh flex-col">
      <Navbar user={user} />
      <main className="flex-1">
        <PageContainer>{children}</PageContainer>
      </main>
    </div>
  );
}
