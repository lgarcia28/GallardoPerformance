"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BellRing,
  CarFront,
  CheckCircle2,
  ClipboardList,
  Gauge,
  Plus,
} from "lucide-react";
import {
  QuickEntryModal,
  type QuickEntryOptions,
} from "@/components/QuickEntryModal";
import {
  WhatsAppModal,
  type WhatsAppAlertPayload,
} from "@/components/WhatsAppModal";

interface WorkshopUIContextValue {
  openQuickEntry: (options?: QuickEntryOptions) => void;
  openWhatsApp: (alert: WhatsAppAlertPayload) => void;
  showToast: (message: string) => void;
  refreshOverdueCount: () => void;
}

const WorkshopUIContext = createContext<WorkshopUIContextValue | null>(null);

export function useWorkshopUI() {
  const ctx = useContext(WorkshopUIContext);
  if (!ctx) {
    throw new Error("useWorkshopUI must be used inside WorkshopShell");
  }
  return ctx;
}

export function WorkshopShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const [quickEntryOptions, setQuickEntryOptions] = useState<QuickEntryOptions>(
    {}
  );
  const [whatsAppAlert, setWhatsAppAlert] =
    useState<WhatsAppAlertPayload | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [overdueCount, setOverdueCount] = useState<number>(0);

  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const refreshOverdueCount = useCallback(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((data) => {
        if (typeof data?.kpis?.overdueCount === "number") {
          setOverdueCount(data.kpis.overdueCount);
        }
      })
      .catch(() => {
        // Ignore badge refresh error
      });
  }, []);

  useEffect(() => {
    refreshOverdueCount();
  }, [pathname, refreshOverdueCount]);

  const openQuickEntry = useCallback((options?: QuickEntryOptions) => {
    setQuickEntryOptions(options ?? {});
    setQuickEntryOpen(true);
  }, []);

  const openWhatsApp = useCallback((alert: WhatsAppAlertPayload) => {
    setWhatsAppAlert(alert);
  }, []);

  const handleQuickEntrySuccess = useCallback(
    (message: string) => {
      showToast(message);
      refreshOverdueCount();
      router.refresh();
      window.dispatchEvent(new CustomEvent("gallardo:data-changed"));
    },
    [refreshOverdueCount, router, showToast]
  );

  const handleWhatsAppMarked = useCallback(() => {
    showToast("Aviso por WhatsApp registrado.");
    refreshOverdueCount();
    router.refresh();
    window.dispatchEvent(new CustomEvent("gallardo:data-changed"));
  }, [refreshOverdueCount, router, showToast]);

  const navItems = [
    {
      href: "/",
      label: "Alertas y Resumen",
      shortLabel: "Alertas",
      icon: BellRing,
      badge: overdueCount > 0 ? overdueCount : undefined,
      isActive: pathname === "/",
    },
    {
      href: "/vehiculos",
      label: "Vehículos",
      shortLabel: "Vehículos",
      icon: CarFront,
      isActive: pathname.startsWith("/vehiculos"),
    },
    {
      href: "/historial",
      label: "Historial de Trabajos",
      shortLabel: "Historial",
      icon: ClipboardList,
      isActive: pathname.startsWith("/historial"),
    },
  ];

  return (
    <WorkshopUIContext.Provider
      value={{
        openQuickEntry,
        openWhatsApp,
        showToast,
        refreshOverdueCount,
      }}
    >
      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:w-68 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-800/90 bg-[#0D121F]">
          {/* Brand */}
          <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-800/80">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20">
              <Gauge className="h-5 w-5 stroke-[2.3]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold tracking-tight text-slate-50 truncate">
                Gallardo Performance
              </p>
              <p className="text-[11px] font-medium text-slate-400">
                Gestión de Taller Mecánico
              </p>
            </div>
          </div>

          {/* Primary CTA */}
          <div className="px-4 pt-5 pb-3">
            <button
              type="button"
              id="sidebar-quick-entry-btn"
              onClick={() => openQuickEntry({ mode: "existing" })}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/15 transition hover:bg-amber-400 active:scale-[0.99] cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Cargar Auto / Reparación</span>
            </button>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Navegación principal">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                    item.isActive
                      ? "bg-slate-800/90 text-white shadow-inner shadow-white/[0.03] border border-slate-700/70"
                      : "text-slate-400 hover:bg-slate-800/45 hover:text-slate-200 border border-transparent"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon
                      className={`h-4 w-4 ${
                        item.isActive ? "text-amber-400" : "text-slate-500"
                      }`}
                    />
                    <span>{item.label}</span>
                  </span>
                  {item.badge !== undefined && (
                    <span className="inline-flex min-w-[22px] items-center justify-center rounded-full bg-red-500/18 px-1.5 py-0.5 font-mono text-[11px] font-bold text-red-400 tabular-nums border border-red-500/30">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer info */}
          <div className="border-t border-slate-800/80 px-5 py-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-3">
              <p className="text-[11px] font-semibold text-slate-300">
                Recordatorios automáticos
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                Cada cambio de aceite programa una alerta a 1 año para avisar por
                WhatsApp en un clic.
              </p>
            </div>
          </div>
        </aside>

        {/* Mobile Top Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800/90 bg-[#0D121F]/95 px-4 py-3 backdrop-blur-md lg:hidden">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-slate-950">
              <Gauge className="h-4 w-4 stroke-[2.4]" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight text-slate-50">
                Gallardo Performance
              </p>
              <p className="text-[10px] text-slate-400">Taller Mecánico</p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => openQuickEntry({ mode: "existing" })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Cargar</span>
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 pb-24 lg:pb-10 lg:pl-68">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-slate-800 bg-[#0D121F]/95 px-2 py-2 backdrop-blur-md lg:hidden"
          aria-label="Navegación móvil"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[11px] font-medium transition ${
                  item.isActive ? "text-amber-400" : "text-slate-400"
                }`}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {item.badge !== undefined && (
                    <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 font-mono text-[10px] font-bold text-white tabular-nums">
                      {item.badge}
                    </span>
                  )}
                </span>
                <span>{item.shortLabel}</span>
              </Link>
            );
          })}
        </nav>

        {/* Modals */}
        {quickEntryOpen && (
          <QuickEntryModal
            key={`${quickEntryOptions.mode ?? "existing"}-${quickEntryOptions.vehicleId ?? "none"}`}
            open={quickEntryOpen}
            options={quickEntryOptions}
            onClose={() => setQuickEntryOpen(false)}
            onSuccess={handleQuickEntrySuccess}
          />
        )}

        {whatsAppAlert && (
          <WhatsAppModal
            key={whatsAppAlert.repairId}
            alert={whatsAppAlert}
            onClose={() => setWhatsAppAlert(null)}
            onMarkedNotified={handleWhatsAppMarked}
          />
        )}

        {/* Toast Feedback */}
        {toast && (
          <div
            role="status"
            className="fixed bottom-20 right-4 z-50 flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-slate-900/95 px-4 py-3 text-xs font-medium text-slate-100 shadow-2xl backdrop-blur-md lg:bottom-6 lg:right-6"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{toast}</span>
          </div>
        )}
      </div>
    </WorkshopUIContext.Provider>
  );
}
