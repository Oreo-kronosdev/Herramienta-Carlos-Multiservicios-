import Link from "next/link";

export default function NoEncontrado() {
  return (
    <section className="py-10 text-center">
      <h1 className="font-display text-3xl font-bold">No encontrado</h1>
      <p className="mt-2 text-muted">No existe o no tienes acceso.</p>
      <Link href="/" className="mt-6 inline-flex h-12 items-center rounded-[10px] bg-ink px-5 font-semibold text-white">
        Volver al inicio
      </Link>
    </section>
  );
}
