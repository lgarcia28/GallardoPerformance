import Link from "next/link";
import { ArrowLeft, CarFront, Lock } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#09090B] px-4">
      <div className="gp-card w-full max-w-md rounded-2xl p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-400">
          <CarFront className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-zinc-50">
          No encontramos esa página
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-zinc-400">
          El vehículo o la dirección que buscás no existe o fue eliminada.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          <Link
            href="/"
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-zinc-950 transition hover:bg-amber-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Ir al inicio
          </Link>
          <Link
            href="/admin"
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-800"
          >
            <Lock className="h-3.5 w-3.5 text-amber-400" />
            Panel del Taller
          </Link>
        </div>
      </div>
    </div>
  );
}
