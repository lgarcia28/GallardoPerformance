import Link from "next/link";
import { ArrowLeft, CarFront } from "lucide-react";

export default function NotFound() {
  return (
    <div className="gp-card mx-auto my-16 max-w-md rounded-2xl p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-400">
        <CarFront className="h-6 w-6" />
      </div>
      <h1 className="mt-4 text-xl font-bold text-slate-50">
        No encontramos esa ficha
      </h1>
      <p className="mt-2 text-xs leading-relaxed text-slate-400">
        El vehículo o la página que buscás no existe o fue eliminada del taller.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-amber-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al Panel Principal
      </Link>
    </div>
  );
}
