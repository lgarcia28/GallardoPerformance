import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B0F19",
};

export const metadata: Metadata = {
  title: "GallardoPerformance — Taller Mecánico · Rosario",
  description:
    "GallardoPerformance es un taller mecánico dedicado al mantenimiento, diagnóstico y mejoras para que tu auto funcione siempre al máximo. Humberto Primo 820, Rosario 2000.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${plusJakarta.variable} ${jetbrainsMono.variable} dark h-full antialiased print:h-auto print:bg-white`}
    >
      <body className="min-h-full bg-[#0B0F19] text-slate-50 print:min-h-0 print:bg-white print:text-slate-900">
        <WorkshopShell>{children}</WorkshopShell>
      </body>
    </html>
  );
}
