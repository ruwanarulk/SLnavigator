import clsx from "clsx";
import { BadgeCheck, Star } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "inverse" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-d",
  secondary: "bg-fill text-label hover:bg-sep",
  ghost: "text-accent-ink hover:bg-accent-t",
  inverse: "bg-card text-label hover:bg-fill",
  danger: "bg-danger-t text-danger hover:brightness-95",
};

export function buttonClass(variant: Variant = "primary", size: "sm" | "md" | "lg" = "md") {
  return clsx(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition active:scale-[.97] disabled:opacity-50 disabled:pointer-events-none select-none",
    size === "sm" && "h-9 px-4 text-[13px]",
    size === "md" && "h-11 px-5 text-[15px]",
    size === "lg" && "h-13 px-6 text-base min-h-[52px]",
    VARIANTS[variant],
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  return <button className={clsx(buttonClass(variant, size), className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  return <Link className={clsx(buttonClass(variant, size), className)} {...props} />;
}

export function Chip({
  active,
  className,
  children,
  ...props
}: ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={clsx(
        "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition active:scale-[.97]",
        active ? "bg-accent text-on-accent" : "bg-fill text-label hover:bg-sep",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={clsx("rounded-card bg-card", className)} {...props} />;
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={clsx("text-[13px] font-medium text-accent-ink", className)}>{children}</p>;
}

export function DisplayHeading({
  as: Tag = "h2",
  className,
  children,
}: {
  as?: "h1" | "h2" | "h3";
  className?: string;
  children: ReactNode;
}) {
  return <Tag className={clsx("font-display font-semibold leading-[1.02] tracking-[-0.01em]", className)}>{children}</Tag>;
}

export function Pill({
  tone = "neutral",
  children,
  className,
}: {
  tone?: "neutral" | "accent" | "signal" | "ok" | "danger";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    neutral: "bg-fill text-label2",
    accent: "bg-accent-t text-accent-ink",
    signal: "bg-signal-t text-signal-ink",
    ok: "bg-ok-t text-ok",
    danger: "bg-danger-t text-danger",
  };
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Rating({ value, count }: { value: number; count?: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-[13px] font-medium">
      <Star aria-hidden className="size-3.5 fill-signal text-signal" />
      {value.toFixed(1)}
      {count !== undefined && <span className="text-label2">({count.toLocaleString()})</span>}
      <span className="sr-only">out of 5</span>
    </span>
  );
}

export function VerifiedBadge() {
  return (
    <Pill tone="ok">
      <BadgeCheck aria-hidden className="size-3.5" /> Verified
    </Pill>
  );
}

export function SampleBadge() {
  return (
    <Pill tone="signal" className="uppercase tracking-wide">
      Sample profile
    </Pill>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={clsx("skeleton rounded-tile", className)} />;
}
