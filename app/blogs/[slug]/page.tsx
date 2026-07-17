import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock3 } from "lucide-react";
import { blogPosts } from "@/lib/blogs";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts.find((item) => item.slug === slug);

  if (!post) {
    return { title: "Blog | DrGodly" };
  }

  return {
    title: `${post.title} | DrGodly`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = blogPosts.find((item) => item.slug === slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-black dark:text-zinc-100">
      <section className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-900 dark:bg-zinc-950">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <Link
            href="/blogs"
            className="inline-flex items-center gap-2 text-sm font-bold text-zinc-500 transition hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to blogs
          </Link>
          <p className="mt-6 text-xs font-bold uppercase tracking-widest text-zinc-500">{post.category}</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
            {post.title}
          </h1>
          <p className="mt-5 text-lg leading-8 text-zinc-600 dark:text-zinc-400">{post.excerpt}</p>
          <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold uppercase tracking-widest text-zinc-500">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {post.date}
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              {post.readTime}
            </span>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto grid max-w-4xl gap-6 px-6">
          <article className="space-y-6 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-base leading-8 text-zinc-600 dark:text-zinc-400">
              This article is part of the DrGodly educational library. It explains the topic in plain language and points readers toward the next step in the structured funnel.
            </p>
            <p className="text-base leading-8 text-zinc-600 dark:text-zinc-400">
              When users are evaluating treatment, the useful next move is usually to check eligibility, review the available plan options, and speak with a clinician when needed.
            </p>
            <p className="text-base leading-8 text-zinc-600 dark:text-zinc-400">
              The goal of these posts is to reduce uncertainty without turning the experience into a generic marketing page.
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
              href="/events"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-900 transition-transform hover:scale-[1.02] active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            >
              View events
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
