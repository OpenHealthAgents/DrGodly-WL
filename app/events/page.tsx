import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, MapPin, Mic2 } from "lucide-react";

export const eventItems = [
  {
    slug: "live-qa-starting-glp1-treatment",
    title: "Live Q&A: Starting GLP-1 treatment",
    date: "August 10, 2026",
    time: "7:00 PM IST",
    location: "Online",
    description:
      "A short live session covering how the intake works, what to expect after qualification, and how follow-up is handled.",
  },
  {
    slug: "doctor-led-nutrition-workshop",
    title: "Doctor-led nutrition workshop",
    date: "August 24, 2026",
    time: "6:30 PM IST",
    location: "Online",
    description:
      "Practical meal planning guidance for users who want a simple routine that fits a weight-loss plan.",
  },
  {
    slug: "progress-check-in-clinic",
    title: "Progress check-in clinic",
    date: "September 3, 2026",
    time: "8:00 PM IST",
    location: "Online",
    description:
      "A community check-in focused on adherence, side effects, and how to know when to speak with the care team.",
  },
];

export const metadata: Metadata = {
  title: "Events | DrGodly",
  description: "Upcoming DrGodly events, webinars, and doctor-led information sessions.",
};

export default function EventsPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-black dark:text-zinc-100">
      <section className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-900 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="max-w-3xl space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1 text-xs font-bold uppercase tracking-widest text-zinc-500 shadow-sm dark:bg-zinc-900 dark:text-zinc-400">
              <Mic2 className="h-3.5 w-3.5" />
              Events
            </div>
            <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
              Join live sessions that help users move forward.
            </h1>
            <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
              Attend webinars, Q&A sessions, and doctor-led workshops designed to answer common questions and reduce friction before intake.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/intake"
                className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-3 text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] dark:bg-zinc-100 dark:text-zinc-900"
              >
                Start intake
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/blogs"
                className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-900 transition-transform hover:scale-[1.02] active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              >
                Read blogs
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {eventItems.map((event) => (
              <Link
                key={event.title}
                href={`/events/${event.slug}`}
                className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              >
                <h2 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                  {event.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">{event.description}</p>
                <div className="mt-6 space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
                  <p className="inline-flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    {event.date}
                  </p>
                  <p className="inline-flex items-center gap-2">
                    <Clock3 className="h-4 w-4" />
                    {event.time}
                  </p>
                  <p className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {event.location}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
