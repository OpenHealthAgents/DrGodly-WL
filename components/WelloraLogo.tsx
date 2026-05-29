import Link from "next/link";

export function WelloraLogo({ href = "/" }: { href?: string }) {
  const content = (
    <span className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F2F2A] shadow-sm">
        <svg viewBox="0 0 128 128" className="h-7 w-7" aria-hidden="true">
          <path
            d="M82.8 28C67.7 31.2 54.6 39.3 45.5 51.1C36.7 62.4 33.2 76.2 35.7 90.2C48.7 91.7 62.1 87.1 72.4 77.6C83.1 67.8 89.8 53.7 91.2 38.2C91.7 32.8 88.1 26.9 82.8 28Z"
            fill="#83E6BF"
          />
          <path
            d="M43 88C54.5 75.7 66.8 63.6 80.7 52.9"
            stroke="#0F2F2A"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M37.5 37L49.7 89.5L64 56.2L78.4 89.5L91.5 37"
            stroke="#F7FFF9"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-xl font-black tracking-tight text-zinc-950 dark:text-zinc-50">
        Wellora
      </span>
    </span>
  );

  if (!href) {
    return <div aria-label="Wellora">{content}</div>;
  }

  return (
    <Link href={href} aria-label="Wellora home" className="shrink-0">
      {content}
    </Link>
  );
}
