import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock3, MapPin } from "lucide-react";
import { eventItems } from "@/lib/events";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return eventItems.map((event) => ({ slug: event.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = eventItems.find((item) => item.slug === slug);

  if (!event) {
    return { title: "Event | DrGodly" };
  }

  return {
    title: `${event.title} | DrGodly`,
    description: event.description,
  };
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  const event = eventItems.find((item) => item.slug === slug);

  if (!event) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-black dark:text-zinc-100">
      <section className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-900 dark:bg-zinc-950">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-sm font-bold text-zinc-500 transition hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to events
          </Link>
          <h1 className="mt-6 text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
            {event.title}
          </h1>
          <p className="mt-5 text-lg leading-8 text-zinc-600 dark:text-zinc-400">{event.description}</p>
          <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold uppercase tracking-widest text-zinc-500">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {event.date}
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              {event.time}
            </span>
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {event.location}
            </span>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto grid max-w-4xl gap-6 px-6">
          <article className="space-y-6 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-base leading-8 text-zinc-600 dark:text-zinc-400">
              This event is designed to answer questions before users enter the intake flow. It is a simple way to reduce hesitation and help users decide whether they want to continue.
            </p>
            <p className="text-base leading-8 text-zinc-600 dark:text-zinc-400">
              Sessions stay focused on practical next steps, treatment expectations, and what a medically guided program looks like in practice.
            </p>
          </article>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/intake"
              className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-3 text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] dark:bg-zinc-100 dark:text-zinc-900"
            >
              Start intake
            </Link>
            <Link
              href="/blogs"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-900 transition-transform hover:scale-[1.02] active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            >
              Read blogs
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
