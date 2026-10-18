"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONOS = {
  inicio: "M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5",
  obras: "M4 20V9l8-5 8 5v11M9 20v-6h6v6",
  agenda: "M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1M8 12h2M8 16h2M14 12h2",
  tareas: "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2",
  clientes: "M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M20 19v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.15a3.5 3.5 0 0 1 0 6.7",
  mas: "M4 12a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0M10.5 12a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0M17 12a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0",
  equipo: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M5 20a7 7 0 0 1 14 0",
} as const;

const ENLACES = [
  { href: "/", texto: "Inicio", icono: "inicio" },
  { href: "/obras", texto: "Obras", icono: "obras" },
  { href: "/agenda", texto: "Agenda", icono: "agenda" },
  { href: "/tareas", texto: "Tareas", icono: "tareas" },
  { href: "/clientes", texto: "Clientes", icono: "clientes" },
  { href: "/mas", texto: "Más", icono: "mas", soloJefe: true, tambien: ["/equipo", "/finanzas"] },
] as const;

export function BottomNav({ esJefe }: { esJefe: boolean }) {
  const path = usePathname();
  const activo = (href: string, tambien: readonly string[] = []) =>
    href === "/" ? path === "/" : [href, ...tambien].some((h) => path.startsWith(h));
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex h-(--nav-h) max-w-2xl">
        {ENLACES.filter((e) => esJefe || !("soloJefe" in e)).map((e) => (
          <li key={e.href} className="flex-1">
            <Link
              href={e.href}
              aria-current={activo(e.href, "tambien" in e ? e.tambien : []) ? "page" : undefined}
              className="flex h-full flex-col items-center justify-center gap-0.5 text-[13px] font-semibold text-muted transition-colors active:bg-bg aria-[current=page]:text-accent"
            >
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={ICONOS[e.icono]} />
              </svg>
              {e.texto}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
