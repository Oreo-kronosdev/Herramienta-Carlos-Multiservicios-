import Link from "next/link";
import type { ReactNode } from "react";

export function Cabecera({
  titulo,
  volver,
  accion,
}: {
  titulo: ReactNode;
  volver?: { href: string; texto: string };
  accion?: { href: string; texto: string };
}) {
  return (
    <div className="mb-5">
      {volver ? (
        <Link href={volver.href} className="-ml-1 mb-2 inline-flex h-10 items-center px-1 text-[15px] font-semibold text-muted active:text-ink">
          ← {volver.texto}
        </Link>
      ) : null}
      <div className="flex items-end justify-between gap-3">
        <h1 className="min-w-0 font-display text-3xl leading-tight font-bold break-words">{titulo}</h1>
        {accion ? (
          <Link
            href={accion.href}
            className="flex h-11 shrink-0 items-center rounded-[10px] bg-accent px-4 text-[15px] font-semibold text-accent-ink active:scale-[0.98]"
          >
            {accion.texto}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
