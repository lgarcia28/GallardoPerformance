"use client";

import { getBrandLogoUrl } from "@/lib/workshop";

interface BrandLogoProps {
  brandName: string;
  brandSlug?: string | null;
  size?: "sm" | "md" | "lg";
}

function getInitials(name: string): string {
  const words = name.trim().split(/[\s-]+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export function BrandLogo({
  brandName,
  brandSlug,
  size = "md",
}: BrandLogoProps) {
  const logoUrl = getBrandLogoUrl(brandSlug, brandName);

  const dims = {
    sm: "h-7 w-7 rounded-lg p-1 text-[10px]",
    md: "h-10 w-10 rounded-xl p-1.5 text-xs",
    lg: "h-14 w-14 rounded-2xl p-2 text-sm",
  }[size];

  if (logoUrl) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center border border-slate-200/90 bg-white shadow-sm ${dims}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={brandName}
          className="h-full w-full object-contain"
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center border border-slate-300 bg-slate-100 font-mono font-extrabold tracking-tight text-slate-800 shadow-sm ${dims}`}
      title={brandName}
    >
      {getInitials(brandName)}
    </span>
  );
}
