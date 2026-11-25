import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuotePdfClient } from "@/components/QuotePdfClient";
import { getQuoteDetail } from "@/lib/queries";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const quote = await getQuoteDetail(Number(id));
  if (!quote) {
    return { title: "Presupuesto no encontrado — GallardoPerformance" };
  }
  return {
    title: `Presupuesto ${quote.quoteNumber} · ${quote.brandName} ${quote.model} — GallardoPerformance`,
    description: `Presupuesto ${quote.quoteNumber} para ${quote.customerName} (${quote.brandName} ${quote.model}).`,
  };
}

export default async function QuoteDetailPage({ params }: PageProps) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    notFound();
  }

  const quote = await getQuoteDetail(numericId);
  if (!quote) {
    notFound();
  }

  return <QuotePdfClient initialQuote={quote} />;
}
