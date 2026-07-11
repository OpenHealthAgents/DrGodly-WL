import React from "react";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, ArrowRight, ShieldCheck, Zap, Star, Phone } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DrGodlyLogo } from "@/components/DrGodlyLogo";
import { getDetectedRegion } from "@/lib/region-server";
import { getLowestEntryPriceLabel } from "@/lib/pricing-strategy";

export default async function LandingPage() {
  // Landing-page pricing is region-aware so the first number the user sees is not hardcoded.
  const region = await getDetectedRegion();
  const startingPrice = getLowestEntryPriceLabel(region.country, region.locale);

  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-black dark:text-zinc-100">
      {/* Navigation */}
      <header className="fixed top-0 z-50 w-full border-b border-zinc-100 bg-white/80 backdrop-blur-md dark:border-zinc-900 dark:bg-black/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <DrGodlyLogo />
          <nav className="hidden items-center gap-8 text-sm font-medium sm:flex">
            <Link href="#how-it-works" className="hover:text-zinc-500">How it Works</Link>
            <Link href="#pricing" className="hover:text-zinc-500">Pricing</Link>
            <Link href="/dashboard" className="hover:text-zinc-500">Dashboard</Link>
          </nav>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link
              href="/intake"
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-bold text-white transition-transform hover:scale-105 active:scale-95 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))]" />
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-1 text-xs font-bold uppercase tracking-widest dark:bg-zinc-900">
            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
            Most trusted weight loss platform
          </div>
          <h1 className="mb-8 text-5xl font-black tracking-tight sm:text-7xl">
            Finally serious about <span className="text-zinc-500">weight loss?</span> So are we.
          </h1>
          <p className="mb-10 text-xl text-zinc-600 dark:text-zinc-400 sm:text-2xl">
            Fat loss made easy with personalized care, doctor-prescribed GLP-1 medications, and 1:1 support.
          </p>
          <div className="flex flex-col items-center justify-center gap-3">
            <Link
              href="/intake"
              className="group flex w-full items-center justify-center gap-2 rounded-full bg-zinc-900 px-8 py-4 text-lg font-bold text-white transition-all hover:bg-zinc-800 sm:w-auto dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Am I Qualified?
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/bmi-calculator"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-6 py-3 text-sm font-bold text-zinc-900 transition-transform hover:scale-[1.02] active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            >
              BMI Calculator
            </Link>
            <p className="text-sm font-medium text-zinc-500">
              <span className="text-zinc-900 dark:text-zinc-100">{startingPrice}</span>
            </p>
            <a
              href="tel:+919346317790"
              className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
            >
              <Phone className="h-4 w-4" />
              Prefer to talk? Call 9346317790 (India)
            </a>
          </div>
          
          <div className="mt-16 grid grid-cols-2 gap-8 border-t border-zinc-100 pt-16 dark:border-zinc-900 sm:grid-cols-4">
            <Feature icon={<ShieldCheck className="h-5 w-5 text-green-500" />} text="HSA/FSA Approved" />
            <Feature icon={<Zap className="h-5 w-5 text-yellow-500" />} text="Lose Weight Fast" />
            <Feature icon={<CheckCircle2 className="h-5 w-5 text-blue-500" />} text="No Hidden Fees" />
            <Feature icon={<CheckCircle2 className="h-5 w-5 text-purple-500" />} text="Free Shipping" />
          </div>
        </div>
      </section>

      {/* Progress Stories */}
      <section className="bg-white py-24 dark:bg-black">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Real Progress Stories</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
              Visible changes from structured treatment
            </h2>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
              These visuals show the kind of improvement patients work toward with a doctor-guided plan, consistent follow-up, and healthy habits. Individual results vary.
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            <figure className="overflow-hidden rounded-3xl border border-zinc-100 bg-zinc-50 shadow-sm dark:border-zinc-900 dark:bg-zinc-950">
              <Image
                src="/Before-After1.png"
                alt="Before and after progress example showing a woman’s transformation"
                width={2816}
                height={1536}
                className="h-auto w-full object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <figcaption className="space-y-2 p-6">
                <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">Example 1</p>
                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">From starting point to a more active routine</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  A visual example of a more confident, energized look after following a structured program with medical support.
                </p>
              </figcaption>
            </figure>

            <figure className="overflow-hidden rounded-3xl border border-zinc-100 bg-zinc-50 shadow-sm dark:border-zinc-900 dark:bg-zinc-950">
              <Image
                src="/Before-After2.png"
                alt="Before and after progress example showing a man’s transformation"
                width={2816}
                height={1536}
                className="h-auto w-full object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <figcaption className="space-y-2 p-6">
                <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">Example 2</p>
                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">A clearer path toward steady progress</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Another example of the kind of body-composition change patients may pursue through a supervised weight-loss plan.
                </p>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* Clinical Expertise */}
      <section className="bg-zinc-50 py-24 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <Image
                src="/Kalyan%20Chakravarthy%20Kalwa.jpeg"
                alt="Dr Kalyan Chakravarthy Kalwa, MBBS, DPharm"
                width={800}
                height={1000}
                className="h-auto w-full object-cover"
                sizes="(max-width: 1024px) 100vw, 45vw"
                priority={false}
              />
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Consulting Doctor</p>
                <h2 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
                  Dr. Kalyan Chakravarthy Kalwa
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-lg font-semibold text-zinc-600 dark:text-zinc-400">
                  <span>MBBS, DPharm</span>
                  <a
                    href="https://www.linkedin.com/in/kalyankalwa/"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Dr. Kalyan Chakravarthy Kalwa LinkedIn profile"
                    className="inline-flex items-center gap-2 text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    <LinkedInIcon className="h-5 w-5" />
                    LinkedIn
                  </a>
                </div>
              </div>

              <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
                Dr. Kalyan Chakravarthy Kalwa brings practical experience in structured weight-loss care and metabolic health support.
                The consultation flow is designed for patients who want a clearer plan, closer follow-up, and medically guided next steps.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">Weight Loss</p>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    Focuses on treatment pathways, dose progression, and realistic goals for sustained reduction.
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">Diabetes</p>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    Supports patients managing diabetes-related concerns alongside their weight-loss program.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">Clinical Approach</p>
                <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                  The consultation experience emphasizes safety screening, medication fit, and clear expectations before treatment begins.
                  Users get a simple next step rather than a generic sales pitch.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="bg-zinc-50 py-24 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="space-y-6">
              <h2 className="text-4xl font-bold tracking-tight">The DrGodly Guarantee</h2>
              <p className="text-lg text-zinc-600 dark:text-zinc-400">
                We believe so strongly in our program that if you do not lose weight by the end of your complete program, you can request a refund. It is that simple!
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 font-medium">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  FDA-approved medications
                </li>
                <li className="flex items-center gap-3 font-medium">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  US-based, board-certified clinicians
                </li>
                <li className="flex items-center gap-3 font-medium">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  24/7 unlimited medical support
                </li>
              </ul>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <Stat value="18%" label="Average body weight reduction" />
              <Stat value="9/10" label="Patients say this is the most effective" />
              <Stat value='6.5"' label="Average reduction in waist size" />
              <Stat value="93%" label="Patients have kept the weight off" />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 py-12 dark:border-zinc-900">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-6 text-center text-sm text-zinc-500">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Follow DrGodly</span>
            <div className="flex items-center gap-3">
              <a
                href="https://www.youtube.com/@DrGodlyApp"
                target="_blank"
                rel="noreferrer"
                aria-label="DrGodly YouTube channel"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                <YouTubeIcon className="h-5 w-5" />
              </a>
              <a
                href="https://www.instagram.com/drgodlyapp/"
                target="_blank"
                rel="noreferrer"
                aria-label="DrGodly Instagram profile"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                <InstagramIcon className="h-5 w-5" />
              </a>
              <a
                href="https://www.linkedin.com/company/drgodly"
                target="_blank"
                rel="noreferrer"
                aria-label="DrGodly LinkedIn company page"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                <LinkedInIcon className="h-5 w-5" />
              </a>
            </div>
          </div>
          <p className="mb-4">© 2026 DrGodly. All rights reserved.</p>
          <p className="mx-auto max-w-3xl leading-relaxed opacity-70">
            Medication prescriptions are at the discretion of medical providers and may not be suitable for everyone. 
            DrGodly patients typically result in 1-2 lbs per week weight loss in 4 weeks, involving a healthy diet and exercise changes.
            Consult a healthcare professional before using medication or starting any weight loss program.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      {icon}
      <span className="text-xs font-bold uppercase tracking-widest opacity-70">{text}</span>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-3xl bg-white p-8 shadow-sm dark:bg-zinc-900">
      <div className="text-3xl font-black">{value}</div>
      <p className="mt-1 text-sm text-zinc-500">{label}</p>
    </div>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.44-2.13 2.93v5.68H9.35V9h3.42v1.56h.05c.48-.9 1.65-1.85 3.4-1.85 3.64 0 4.31 2.4 4.31 5.51v6.23ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.78C.8 0 0 .77 0 1.72v20.55C0 23.23.8 24 1.78 24h20.44C23.2 24 24 23.23 24 22.27V1.72C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.7 12 3.7 12 3.7s-7.5 0-9.4.4A3 3 0 0 0 .5 6.2 31.8 31.8 0 0 0 0 12a31.8 31.8 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.4 9.4.4 9.4.4s7.5 0 9.4-.4a3 3 0 0 0 2.1-2.1A31.8 31.8 0 0 0 24 12a31.8 31.8 0 0 0-.5-5.8ZM9.6 15.3V8.7L15.7 12l-6.1 3.3Z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 2.7A5.3 5.3 0 1 1 6.7 12 5.3 5.3 0 0 1 12 6.7Zm0 2A3.3 3.3 0 1 0 15.3 12 3.3 3.3 0 0 0 12 8.7Zm5.8-2.6a1.2 1.2 0 1 1-1.2-1.2 1.2 1.2 0 0 1 1.2 1.2Z" />
    </svg>
  );
}
