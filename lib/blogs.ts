export type BlogPost = {
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  readTime: string;
  date: string;
};

export const blogPosts: BlogPost[] = [
  {
    slug: "glp1-structured-weight-loss-plan",
    category: "Treatment basics",
    title: "How GLP-1 treatment fits into a structured weight-loss plan",
    excerpt:
      "A practical guide to the intake flow, safety screening, and why the program follows a step-by-step medical process instead of a free-form chat.",
    readTime: "5 min read",
    date: "July 2026",
  },
  {
    slug: "what-to-eat-when-starting-treatment",
    category: "Nutrition",
    title: "What to eat while starting treatment",
    excerpt:
      "Simple meal ideas, hydration reminders, and habits that support consistency while the body adjusts to the program.",
    readTime: "4 min read",
    date: "July 2026",
  },
  {
    slug: "how-to-measure-progress-beyond-the-scale",
    category: "Progress tracking",
    title: "How to measure progress beyond the scale",
    excerpt:
      "Use waist size, energy, clothing fit, and routine adherence to understand progress in a more useful way.",
    readTime: "6 min read",
    date: "June 2026",
  },
  {
    slug: "when-to-ask-for-a-clinician-review",
    category: "Doctor guidance",
    title: "When to ask for a clinician review",
    excerpt:
      "Know the signs that need review, including side effects, missed doses, and changes in your health history.",
    readTime: "3 min read",
    date: "June 2026",
  },
];
