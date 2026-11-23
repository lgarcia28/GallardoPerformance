"use client";

interface PlateBadgeProps {
  plate: string;
  size?: "sm" | "md" | "lg";
}

export function PlateBadge({ plate, size = "md" }: PlateBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5 tracking-[0.14em]",
    md: "text-[13px] px-2.5 py-1 tracking-[0.15em]",
    lg: "text-base px-3.5 py-1.5 tracking-[0.18em]",
  }[size];

  return (
    <span
      className={`inline-flex flex-col overflow-hidden rounded-md border border-slate-600/80 bg-slate-950 font-mono font-bold uppercase text-slate-100 shadow-sm tabular-nums select-all`}
    >
      <span className="h-[3px] w-full bg-sky-600/90" aria-hidden="true" />
      <span className={`${sizeClasses} leading-none`}>{plate}</span>
    </span>
  );
}
