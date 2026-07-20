import Link from "next/link";

import { Logo } from "@/components/shared/logo";
import { SectionContainer } from "@/components/landing/section-container";
import { landingNav, siteConfig } from "@/config/site";

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t">
      <SectionContainer className="py-12">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="text-muted-foreground mt-3 text-sm">
              {siteConfig.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:flex sm:gap-16">
            <div>
              <h3 className="text-sm font-semibold">Product</h3>
              <ul className="mt-3 flex flex-col gap-2.5">
                {landingNav.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className="text-muted-foreground hover:text-foreground text-sm"
                    >
                      {item.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold">Account</h3>
              <ul className="mt-3 flex flex-col gap-2.5">
                <li>
                  <Link
                    href="/login"
                    className="text-muted-foreground hover:text-foreground text-sm"
                  >
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link
                    href="/sign-up"
                    className="text-muted-foreground hover:text-foreground text-sm"
                  >
                    Get started
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="text-muted-foreground mt-10 border-t pt-6 text-sm">
          © {year} {siteConfig.name}. All rights reserved.
        </div>
      </SectionContainer>
    </footer>
  );
}
