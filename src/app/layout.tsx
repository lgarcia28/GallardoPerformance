import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { WorkshopShell } from "@/components/WorkshopShell";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Gallardo Performance — Gestión de Taller Mecánico",
  description:
    "Panel interno del taller mecánico Gallardo Performance para registrar vehículos, consultar historial de reparaciones y enviar alertas de mantenimiento por WhatsApp.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${plusJakarta.variable} ${jetbrainsMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full bg-[#0B0F19] text-slate-50">
        <WorkshopShell>{children}</WorkshopShell>
      </body>
    </html>
  );
}
