import React from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight, ShieldCheck, Zap, Star } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WelloraLogo } from "@/components/WelloraLogo";

export default async function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-black dark:text-zinc-100">
      {/* Navigation */}
      <header className="fixed top-0 z-50 w-full border-b border-zinc-100 bg-white/80 backdrop-blur-md dark:border-zinc-900 dark:bg-black/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <WelloraLogo />
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
            <p className="text-sm font-medium text-zinc-500">
              Lowest medication option from <span className="text-zinc-900 dark:text-zinc-100">₹3,956/mo</span>
            </p>
          </div>
          
          <div className="mt-16 grid grid-cols-2 gap-8 border-t border-zinc-100 pt-16 dark:border-zinc-900 sm:grid-cols-4">
            <Feature icon={<ShieldCheck className="h-5 w-5 text-green-500" />} text="HSA/FSA Approved" />
            <Feature icon={<Zap className="h-5 w-5 text-yellow-500" />} text="Lose Weight Fast" />
            <Feature icon={<CheckCircle2 className="h-5 w-5 text-blue-500" />} text="No Hidden Fees" />
            <Feature icon={<CheckCircle2 className="h-5 w-5 text-purple-500" />} text="Free Shipping" />
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="bg-zinc-50 py-24 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="space-y-6">
              <h2 className="text-4xl font-bold tracking-tight">The Wellora Guarantee</h2>
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
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-zinc-500">
          <p className="mb-4">© 2026 Wellora. All rights reserved.</p>
          <p className="mx-auto max-w-3xl leading-relaxed opacity-70">
            Medication prescriptions are at the discretion of medical providers and may not be suitable for everyone. 
            Wellora patients typically result in 1-2 lbs per week weight loss in 4 weeks, involving a healthy diet and exercise changes. 
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
