"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandX,
  IconBrandLinkedin,
  IconBrandYoutube,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground px-4 sm:px-6 lg:px-10 py-8 sm:py-16">
      <div className="relative mx-auto w-full max-w-6xl px-0 sm:px-2 lg:px-0 overflow-hidden">
        {/* Top navigation */}
        <header className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <div className="flex items-center gap-2 text-base font-semibold text-foreground">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              P
            </span>
            <span>Prefix</span>
          </div>

          <nav className="ml-auto hidden items-center gap-6 md:flex">
            <Link href="#features" className="hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="hover:text-foreground transition-colors">
              How it works
            </Link>
            <Link href="#about" className="hover:text-foreground transition-colors">
              About
            </Link>
            <div className="relative flex items-center gap-1">
              <Link
                href="#resources"
                className="hover:text-foreground transition-colors flex items-center gap-1"
              >
                <span>Resources</span>
                <span className="text-xs">▾</span>
              </Link>
            </div>
          </nav>

          <Button
            asChild
            size="sm"
            className="ml-auto md:ml-6 rounded-full px-5 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Link href="/dashboard">Start</Link>
          </Button>
        </header>

        {/* Hero content */}
        <section id="hero" className="relative mt-12 grid gap-10 sm:mt-16 lg:mt-20">
          {/* Centered headline and copy */}
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Catch broken tokens
              <br className="hidden sm:block" />
              <span className="block">before you send</span>
            </h1>
            <p className="mt-6 text-sm sm:text-base text-muted-foreground leading-relaxed">
              Prefix sits between your workflow and your ESP, catching unresolved merge
              tags before they damage your reputation. One API call. One response.
              Clean sends, every time.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button className="rounded-full px-6">Validate</Button>
              <Button variant="outline" className="rounded-full px-6">
                Docs
              </Button>
            </div>
          </div>

          {/* Image collage */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="hidden h-full w-full sm:block">
              {/* top row */}
              <div className="flex justify-between px-8 pt-4">
                <div className="relative h-24 w-40 overflow-hidden rounded-2xl border border-border/40">
                  <Image
                    src="/landing/hero-top-left.jpg"
                    alt="People collaborating over coffee"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
                <div className="relative h-28 w-44 overflow-hidden rounded-2xl border border-border/40">
                  <Image
                    src="/landing/hero-top-center.jpg"
                    alt="Team working together"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
                <div className="relative h-24 w-40 overflow-hidden rounded-2xl border border-border/40">
                  <Image
                    src="/landing/hero-top-right.jpg"
                    alt="Team on laptops"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
              {/* middle side pieces */}
              <div className="mt-20 flex justify-between px-2">
                <div className="relative h-28 w-40 overflow-hidden rounded-2xl border border-border/40">
                  <Image
                    src="/landing/hero-middle-left.jpg"
                    alt="Group sitting outdoors"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="relative h-28 w-40 overflow-hidden rounded-2xl border border-border/40">
                  <Image
                    src="/landing/hero-middle-right.jpg"
                    alt="Person with laptop"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
              {/* bottom row */}
              <div className="mt-16 flex justify-between px-8 pb-4">
                <div className="relative h-28 w-44 overflow-hidden rounded-2xl border border-border/40">
                  <Image
                    src="/landing/hero-bottom-left.jpg"
                    alt="Portrait"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="relative h-24 w-40 overflow-hidden rounded-2xl border border-border/40">
                  <Image
                    src="/landing/hero-bottom-center.jpg"
                    alt="Working in cafe"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="relative h-28 w-44 overflow-hidden rounded-2xl border border-border/40">
                  <Image
                    src="/landing/hero-bottom-right.jpg"
                    alt="Woman at desk"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core section */}
        <section
          id="core"
          className="mt-24 sm:mt-28 lg:mt-32 border-t border-border/40 pt-16 sm:pt-20"
        >
          <div className="flex flex-col items-center text-center gap-4 sm:gap-5">
            <div className="h-0.5 w-10 rounded-full bg-primary/80" />
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Core
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">
              Three layers of protection
            </h2>
            <p className="max-w-xl text-sm sm:text-base text-muted-foreground">
              Prefix works in three simple moves to keep your sends clean
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:gap-8 md:grid-cols-3">
            {[
              {
                pill: "Scan",
                title: "Pattern detection finds every broken token",
                body: "Detects unresolved tokens across Mailchimp, Klaviyo, Resend, and beyond.",
              },
              {
                pill: "Scan",
                title: "Bad sends never leave",
                body: "Stops the send cold with exact error details so your team fixes it fast.",
              },
              {
                pill: "Block",
                title: "Integrates anywhere you build",
                body: "Plugs into n8n, Make, Zapier, or your backend with a single HTTP call.",
              },
            ].map((item) => (
              <article
                key={item.title}
                className="relative flex flex-col justify-between rounded-2xl bg-[#111017] px-6 py-8 sm:px-7 sm:py-10 border border-border/40"
              >
                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {item.pill}
                  </p>
                  <h3 className="text-lg sm:text-xl font-semibold">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.body}
                  </p>
                </div>
                <button className="mt-8 inline-flex items-center text-sm font-medium text-primary hover:text-primary/80">
                  Learn
                  <span className="ml-1 text-base">›</span>
                </button>
              </article>
            ))}
          </div>
        </section>

        {/* Why section */}
        <section
          id="why"
          className="mt-24 sm:mt-28 lg:mt-32 border-t border-border/40 pt-16 sm:pt-20"
        >
          <div className="flex flex-col items-center text-center gap-4 sm:gap-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Why
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">
              Stop mistakes that cost campaigns
            </h2>
            <p className="max-w-xl text-sm sm:text-base text-muted-foreground">
              One broken token tanks everything. Prefix catches it before it matters.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:gap-8 md:grid-cols-3">
            {[
              {
                imageSrc: "/landing/why-1.jpg",
                tag: "Tagline",
                title: "Damaged trust happens in seconds",
                body: "Detect issues before they hit the inbox and hurt your sender reputation.",
                cta: "Protect",
              },
              {
                imageSrc: "/landing/why-2.jpg",
                tag: "Tagline",
                title: "Fix problems before they spread",
                body: "Catch broken tokens early so you can ship confident, repeatable campaigns.",
                cta: "Fix",
              },
              {
                imageSrc: "/landing/why-3.jpg",
                tag: "Tagline",
                title: "Send without second guessing",
                body: "Know every send is clean so your team focuses on strategy instead of fire drills.",
                cta: "Send",
              },
            ].map((item) => (
              <article
                key={item.title}
                className="overflow-hidden rounded-2xl border border-border/40 bg-[#111017] flex flex-col"
              >
                <div className="relative h-40 w-full sm:h-44 md:h-48">
                  <Image
                    src={item.imageSrc}
                    alt={item.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col justify-between px-6 py-6 sm:px-7 sm:py-7">
                  <div className="space-y-3">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      {item.tag}
                    </p>
                    <h3 className="text-lg sm:text-xl font-semibold">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.body}
                    </p>
                  </div>
                  <button className="mt-6 inline-flex items-center text-sm font-medium text-primary hover:text-primary/80">
                    {item.cta}
                    <span className="ml-1 text-base">
                      
                      
                    </span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* FAQ section */}
        <section
          id="faq"
          className="mt-24 sm:mt-28 lg:mt-32 border-t border-border/40 pt-16 pb-10 sm:pt-20 sm:pb-16"
        >
          <div className="flex flex-col items-center text-center gap-4 sm:gap-5">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">
              FAQ
            </h2>
            <p className="max-w-2xl text-sm sm:text-base text-muted-foreground">
              Everything you need to know about integrating and using Prefix.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:gap-5 md:grid-cols-2">
            {[
              {
                question: "How do I integrate Prefix?",
                answer:
                  "Send your email subject and body to Prefix's HTTP endpoint. It returns 200 OK or 409 BLOCKED with error details. Works with n8n, Make, Zapier, or any backend.",
              },
              {
                question: "What if I have custom tokens?",
                answer:
                  "Tell us the pattern. Prefix can be configured to recognize custom merge tag formats. Reach out and we'll set it up.",
              },
              {
                question: "Which ESPs does Prefix support?",
                answer:
                  "Prefix detects merge tags from Mailchimp, Klaviyo, Resend, Brevo, and any other platform. It's vendor-agnostic by design.",
              },
              {
                question: "Is Prefix secure?",
                answer:
                  "Yes. All data is encrypted in transit. Prefix doesn't store email content or recipient information. It scans and discards.",
              },
              {
                question: "How fast is the validation?",
                answer:
                  "Sub-100ms scans. Validation is so quick it adds effectively zero lag to your workflow.",
              },
              {
                question: "What happens if validation fails?",
                answer:
                  "Prefix returns a 409 error with exact line numbers and token snippets. Your workflow halts the send and notifies your team.",
              },
              {
                question: "Do I need an account for recipients?",
                answer:
                  "No. Prefix doesn't touch or store recipient data. It only scans your email content for broken tokens.",
              },
              {
                question: "Can I use Prefix in production?",
                answer:
                  "Yes. Prefix is built for production workflows. It's lightweight, reliable, and handles high volume.",
              },
              {
                question: "What about pricing?",
                answer:
                  "Prefix is free to start. No credit card required. Scale as you grow, and contact us for enterprise plans.",
              },
            ].map((item) => (
              <article
                key={item.question}
                className="relative flex flex-col gap-3 rounded-2xl border border-border/40 bg-[#111017] px-5 py-4 sm:px-6 sm:py-5"
              >
                <button
                  type="button"
                  className="absolute right-4 top-4 text-xs text-muted-foreground/70 hover:text-muted-foreground"
                  aria-label="Close"
                >
                  ×
                </button>
                <h3 className="pr-6 text-sm sm:text-base font-semibold">
                  {item.question}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {item.answer}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-16 sm:mt-20 lg:mt-24 border-t border-border/40 pt-10 pb-6 sm:pt-12 sm:pb-8">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
            {/* Brand + contact */}
            <div className="max-w-sm space-y-6">
              <div className="flex items-center gap-2 text-base font-semibold">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  P
                </span>
                <span>Prefix</span>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">Location</p>
                  <p className="mt-1 text-muted-foreground">
                    San Francisco, California, United States
                  </p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Reach</p>
                  <div className="mt-1 flex flex-col gap-1 text-muted-foreground underline-offset-2">
                    <a href="mailto:hello@useprefix.com" className="hover:underline">
                      hello@useprefix.com
                    </a>
                    <a href="mailto:support@useprefix.com" className="hover:underline">
                      support@useprefix.com
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-muted-foreground">
                <a aria-label="Prefix on Facebook" href="https://facebook.com" className="hover:text-foreground">
                  <IconBrandFacebook className="h-5 w-5" />
                </a>
                <a aria-label="Prefix on Instagram" href="https://instagram.com" className="hover:text-foreground">
                  <IconBrandInstagram className="h-5 w-5" />
                </a>
                <a aria-label="Prefix on X" href="https://x.com" className="hover:text-foreground">
                  <IconBrandX className="h-5 w-5" />
                </a>
                <a aria-label="Prefix on LinkedIn" href="https://linkedin.com" className="hover:text-foreground">
                  <IconBrandLinkedin className="h-5 w-5" />
                </a>
                <a aria-label="Prefix on YouTube" href="https://youtube.com" className="hover:text-foreground">
                  <IconBrandYoutube className="h-5 w-5" />
                </a>
              </div>
            </div>

            {/* Nav columns */}
            <div className="grid gap-8 text-sm sm:grid-cols-2 sm:gap-10">
              <div className="space-y-2">
                <FooterLink href="/landing#hero">Validate</FooterLink>
                <FooterLink href="/docs/integrate">Integrate</FooterLink>
                <FooterLink href="/docs">Docs</FooterLink>
                <FooterLink href="/pricing">Pricing</FooterLink>
                <FooterLink href="/status">Status</FooterLink>
              </div>
              <div className="space-y-2">
                <FooterLink href="/about">About</FooterLink>
                <FooterLink href="/blog">Blog</FooterLink>
                <FooterLink href="/contact">Contact</FooterLink>
                <FooterLink href="/careers">Careers</FooterLink>
                <FooterLink href="/press">Press</FooterLink>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 text-xs text-muted-foreground sm:mt-12 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Prefix. All rights reserved.</p>
            <div className="flex flex-wrap gap-4 underline-offset-2">
              <FooterLink href="/legal/privacy">Privacy Policy</FooterLink>
              <FooterLink href="/legal/terms">Terms of Service</FooterLink>
              <FooterLink href="/legal/cookies">Cookies Settings</FooterLink>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

type FooterLinkProps = {
  href: string;
  children: ReactNode;
};

function FooterLink({ href, children }: FooterLinkProps) {
  return (
    <Link
      href={href}
      className="text-xs sm:text-sm text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
    >
      {children}
    </Link>
  );
}
