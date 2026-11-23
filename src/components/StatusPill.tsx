"use client";

import { AlertTriangle, CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import type { AlertUrgency } from "@/lib/workshop";

interface StatusPillProps {
  urgency: AlertUrgency;
  label: string;
  size?: "sm" | "md";
}

export function StatusPill({ urgency, label, size = "md" }: StatusPillProps) {
  const styles: Record<
    AlertUrgency,
    { wrapper: string; icon: React.ReactNode }
  > = {
    overdue: {
      wrapper:
        "bg-red-500/12 text-red-400 border-red-500/25",
      icon: <AlertTriangle className="h-3.5 w-3.5 shrink-0" />,
    },
    upcoming: {
      wrapper:
        "bg-amber-500/12 text-amber-400 border-amber-500/25",
      icon: <Clock className="h-3.5 w-3.5 shrink-0" />,
    },
    notified: {
      wrapper:
        "bg-emerald-500/12 text-emerald-400 border-emerald-500/25",
      icon: <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />,
    },
    ok: {
      wrapper:
        "bg-slate-500/12 text-slate-300 border-slate-700/80",
      icon: <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400/80" />,
    },
  };

  const current = styles[urgency];
  const padding = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium tabular-nums whitespace-nowrap ${padding} ${current.wrapper}`}
    >
      {current.icon}
      <span>{label}</span>
    </span>
  );
}
