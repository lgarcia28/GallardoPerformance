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
  CalendarDays,
  CarFront,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileText,
  Globe,
  KeyRound,
  LogOut,
  MapPin,
  Plus,
  Wallet,
  X,
} from "lucide-react";
import {
  QuickEntryModal,
  type QuickEntryOptions,
} from "@/components/QuickEntryModal";
import {
  WhatsAppModal,
  type WhatsAppAlertPayload,
} from "@/components/WhatsAppModal";
import type { AdminSession } from "@/lib/auth-edge";
import { WORKSHOP_INFO } from "@/lib/workshop";

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

export function WorkshopShell({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: AdminSession | null;
}) {
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
  const [todayAppointmentsCount, setTodayAppointmentsCount] =
    useState<number>(0);

  // Admin account / password modal
  const [accountOpen, setAccountOpen] = useState(false);
  const [acctUsername, setAcctUsername] = useState(session?.username ?? "admin");
  const [acctEmail, setAcctEmail] = useState(
    session?.email ?? "admin@gallardoperformance.com"
  );
  const [acctCurrentPassword, setAcctCurrentPassword] = useState("");
  const [acctNewPassword, setAcctNewPassword] = useState("");
  const [acctSaving, setAcctSaving] = useState(false);
  const [acctError, setAcctError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

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
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (typeof data?.kpis?.overdueCount === "number") {
          setOverdueCount(data.kpis.overdueCount);
        }
        if (typeof data?.kpis?.todayAppointmentsCount === "number") {
          setTodayAppointmentsCount(data.kpis.todayAppointmentsCount);
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

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/admin");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }, [router]);

  const handleOpenAccountModal = useCallback(() => {
    setAcctUsername(session?.username ?? "admin");
    setAcctEmail(session?.email ?? "admin@gallardoperformance.com");
    setAcctCurrentPassword("");
    setAcctNewPassword("");
    setAcctError(null);
    setAccountOpen(true);
  }, [session]);

  const handleSaveAccount = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setAcctSaving(true);
      setAcctError(null);
      try {
        const res = await fetch("/api/auth/account", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: acctUsername.trim(),
            email: acctEmail.trim(),
            currentPassword: acctCurrentPassword || undefined,
            newPassword: acctNewPassword || undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "No se pudo guardar.");
        }
        setAccountOpen(false);
        showToast("Datos de acceso actualizados.");
        router.refresh();
      } catch (err) {
        setAcctError(
          err instanceof Error ? err.message : "Error al actualizar la cuenta."
        );
      } finally {
        setAcctSaving(false);
      }
    },
    [
      acctCurrentPassword,
      acctEmail,
      acctNewPassword,
      acctUsername,
      router,
      showToast,
    ]
  );

  const navItems = [
    {
      href: "/admin",
      label: "Alertas y Resumen",
      shortLabel: "Alertas",
      icon: BellRing,
      badge: overdueCount > 0 ? overdueCount : undefined,
      badgeTone: "danger" as const,
      isActive: pathname === "/admin",
      showInMobileBar: true,
    },
    {
      href: "/turnos",
      label: "Turnos",
      shortLabel: "Turnos",
      icon: CalendarDays,
      badge: todayAppointmentsCount > 0 ? todayAppointmentsCount : undefined,
      badgeTone: "amber" as const,
      isActive: pathname.startsWith("/turnos"),
      showInMobileBar: true,
    },
    {
      href: "/presupuestos",
      label: "Presupuestos",
      shortLabel: "Presup.",
      icon: FileText,
      isActive: pathname.startsWith("/presupuestos"),
      showInMobileBar: true,
    },
    {
      href: "/vehiculos",
      label: "Vehículos",
      shortLabel: "Vehículos",
      icon: CarFront,
      isActive: pathname.startsWith("/vehiculos"),
      showInMobileBar: true,
    },
    {
      href: "/historial",
      label: "Historial de Trabajos",
      shortLabel: "Historial",
      icon: ClipboardList,
      isActive: pathname.startsWith("/historial"),
      showInMobileBar: false,
    },
    {
      href: "/finanzas",
      label: "Finanzas",
      shortLabel: "Finanzas",
      icon: Wallet,
      isActive: pathname.startsWith("/finanzas"),
      showInMobileBar: true,
    },
  ];

  const mobileNavItems = navItems.filter((item) => item.showInMobileBar);

  return (
    <WorkshopUIContext.Provider
      value={{
        openQuickEntry,
        openWhatsApp,
        showToast,
        refreshOverdueCount,
      }}
    >
      <div className="min-h-screen flex flex-col lg:flex-row print:min-h-0 print:block">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:w-68 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-800/90 bg-[#0D121F] print:hidden">
          {/* Brand */}
          <Link
            href="/admin"
            className="flex flex-col gap-2 px-5 py-5 border-b border-slate-800/80 transition hover:bg-slate-900/40"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-gallardo.png"
              alt={WORKSHOP_INFO.name}
              width={220}
              height={42}
              className="h-9 w-auto max-w-full object-contain object-left"
            />
            <p className="text-[11px] font-medium text-slate-400">
              {WORKSHOP_INFO.shortTagline}
            </p>
          </Link>

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
          <nav
            className="flex-1 space-y-1 overflow-y-auto px-3 py-2"
            aria-label="Navegación principal"
          >
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
                    <span
                      className={`inline-flex min-w-[22px] items-center justify-center rounded-full px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums border ${
                        item.badgeTone === "amber"
                          ? "bg-amber-500/18 text-amber-300 border-amber-500/30"
                          : "bg-red-500/18 text-red-400 border-red-500/30"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer: Public site, Account & Logout */}
          <div className="space-y-2.5 border-t border-slate-800/80 px-4 py-4">
            <div className="space-y-1.5 rounded-xl border border-slate-800 bg-slate-950/65 px-3 py-2.5">
              {session && (
                <p className="truncate text-[11px] font-semibold text-slate-200">
                  {session.username}{" "}
                  <span className="font-normal text-slate-500">
                    · {session.email}
                  </span>
                </p>
              )}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <MapPin className="h-3 w-3 shrink-0 text-red-500" />
                <span className="truncate">{WORKSHOP_INFO.address}</span>
              </div>
              <div className="flex items-center gap-3 pt-0.5">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 transition hover:text-amber-300"
                >
                  <Globe className="h-3 w-3" />
                  <span>Web pública</span>
                </Link>
                <a
                  href={WORKSHOP_INFO.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 transition hover:text-slate-200"
                >
                  <span>Instagram</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={handleOpenAccountModal}
                className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:border-slate-700 hover:text-white cursor-pointer"
              >
                <KeyRound className="h-3.5 w-3.5 text-amber-400" />
                <span>Mi clave</span>
              </button>
              <button
                type="button"
                disabled={loggingOut}
                onClick={handleLogout}
                className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>{loggingOut ? "..." : "Salir"}</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Top Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-slate-800/90 bg-[#0D121F]/95 px-3.5 py-3 backdrop-blur-md lg:hidden print:hidden">
          <Link href="/admin" className="flex items-center min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-gallardo.png"
              alt={WORKSHOP_INFO.name}
              width={150}
              height={28}
              className="h-6 w-auto object-contain object-left sm:h-7"
            />
          </Link>

          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href="/historial"
              className={`inline-flex min-h-[36px] items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                pathname.startsWith("/historial")
                  ? "border-amber-500/40 bg-amber-500/12 text-amber-300"
                  : "border-slate-700 bg-slate-900/80 text-slate-300"
              }`}
            >
              <ClipboardList className="h-3.5 w-3.5" />
              <span className="hidden xs:inline sm:inline">Historial</span>
            </Link>
            <button
              type="button"
              onClick={handleOpenAccountModal}
              aria-label="Cambiar usuario o contraseña"
              className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-lg border border-slate-700 bg-slate-900/80 text-slate-300 hover:text-amber-300 cursor-pointer"
            >
              <KeyRound className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={loggingOut}
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-lg border border-slate-700 bg-slate-900/80 text-slate-300 hover:border-red-500/40 hover:text-red-300 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 pb-28 lg:pb-10 lg:pl-68 print:p-0">
          <div className="mx-auto w-full max-w-6xl px-3.5 py-5 sm:px-6 lg:px-8 lg:py-8 print:max-w-none print:p-0">
            {children}
          </div>
        </main>

        {/* Mobile Thumb-Zone Floating Action Button */}
        <button
          type="button"
          onClick={() => openQuickEntry({ mode: "existing" })}
          aria-label="Cargar auto o reparación"
          className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 items-center gap-2 rounded-full bg-amber-500 px-5 text-sm font-bold text-slate-950 shadow-xl shadow-black/50 ring-1 ring-amber-300/40 transition active:scale-95 lg:hidden print:hidden cursor-pointer"
        >
          <Plus className="h-5 w-5 stroke-[2.6]" />
          <span>Cargar</span>
        </button>

        {/* Mobile Bottom Navigation */}
        <nav
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-800 bg-[#0D121F]/96 px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden print:hidden"
          aria-label="Navegación móvil"
        >
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-xl py-1 text-[10px] font-semibold transition active:bg-slate-800/60 ${
                  item.isActive ? "text-amber-400" : "text-slate-400"
                }`}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {item.badge !== undefined && (
                    <span
                      className={`absolute -right-2.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 font-mono text-[10px] font-bold tabular-nums ${
                        item.badgeTone === "amber"
                          ? "bg-amber-500 text-slate-950"
                          : "bg-red-500 text-white"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </span>
                <span className="truncate">{item.shortLabel}</span>
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

        {/* Admin Account & Password Modal */}
        {accountOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Configurar acceso administrador"
            onClick={(e) => {
              if (e.target === e.currentTarget) setAccountOpen(false);
            }}
          >
            <div className="gp-card w-full max-w-md overflow-hidden rounded-t-2xl border border-slate-800 shadow-2xl sm:rounded-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/12 text-amber-400">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-100">
                      Acceso al Panel (/admin)
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Editá tu usuario, email o contraseña
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAccountOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveAccount} className="space-y-3.5 p-5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Usuario
                  </label>
                  <input
                    type="text"
                    required
                    value={acctUsername}
                    onChange={(e) => setAcctUsername(e.target.value)}
                    className="min-h-[44px] w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={acctEmail}
                    onChange={(e) => setAcctEmail(e.target.value)}
                    className="min-h-[44px] w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-3 border-t border-slate-800 pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Cambiar contraseña (opcional)
                  </p>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">
                      Contraseña actual
                    </label>
                    <input
                      type="password"
                      value={acctCurrentPassword}
                      onChange={(e) => setAcctCurrentPassword(e.target.value)}
                      placeholder="Solo si querés cambiarla"
                      className="min-h-[44px] w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">
                      Nueva contraseña
                    </label>
                    <input
                      type="password"
                      value={acctNewPassword}
                      onChange={(e) => setAcctNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="min-h-[44px] w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {acctError && (
                  <p className="rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                    {acctError}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAccountOpen(false)}
                    className="min-h-[42px] rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={acctSaving}
                    className="min-h-[42px] rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50 cursor-pointer"
                  >
                    {acctSaving ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </form>
            </div>
          </div>
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
