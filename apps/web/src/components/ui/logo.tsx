import Link from "next/link";

export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 40" className={className} aria-hidden>
      {/* The island as a teardrop, with the route line through it. */}
      <path d="M16 1C9 9 3 17 3 25a13 13 0 0 0 26 0C29 17 23 9 16 1Z" fill="var(--accent)" />
      <path d="M11 30 L15 21 L20 25 L18 14" fill="none" stroke="var(--on-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="11" cy="30" r="2.2" fill="var(--signal)" />
      <circle cx="18" cy="14" r="2.2" fill="var(--on-accent)" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="Sri Lanka Navigator home">
      <LogoMark />
      <span className="leading-none">
        <span className="block font-display text-[19px] font-bold tracking-[0.02em]">NAVIGATOR</span>
        <span className="block text-[9px] font-semibold tracking-[0.3em] text-label2">SRI LANKA</span>
      </span>
    </Link>
  );
}
