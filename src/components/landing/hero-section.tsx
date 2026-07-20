import Link from "next/link";
import { ArrowRight, Sparkle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionContainer } from "@/components/landing/section-container";
import { ProductPreview } from "@/components/landing/product-preview";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-16 pb-16 sm:pt-24 sm:pb-20 lg:pt-32 lg:pb-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-144 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(0,0,0,0.05),transparent)] dark:bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(255,255,255,0.06),transparent)]"
      />
      <SectionContainer className="flex flex-col items-center text-center">
        <Badge variant="outline" className="gap-1.5 py-1.5 pl-2">
          <Sparkle className="size-3" />
          AI-first career intelligence
        </Badge>

        <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
          Your AI Career Agent —{" "}
          <span className="text-muted-foreground">not another job board.</span>
        </h1>

        <p className="text-muted-foreground mt-6 max-w-2xl text-lg text-balance sm:text-xl">
          CareerOS reads your resume like a hiring manager would, tells you
          exactly what to fix, and turns every application into a structured,
          AI-backed plan — so you stop guessing and start landing interviews.
        </p>

        <div className="mt-10 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/sign-up">
              Get started for free
              <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
            <a href="#how-it-works">See how it works</a>
          </Button>
        </div>

        <p className="text-muted-foreground mt-4 text-sm">
          No credit card required · Free plan included
        </p>

        <div className="mt-16 w-full sm:mt-20">
          <ProductPreview variant="dashboard" />
        </div>
      </SectionContainer>
    </section>
  );
}
