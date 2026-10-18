import { Suspense } from "react";
import Link from "next/link";
import { requireJefe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ROLES } from "@/lib/etiquetas";
import { Cabecera } from "@/components/Cabecera";
import { Cargando } from "@/components/Cargando";

export const metadata = { title: "Equipo" };

export default function EquipoPage() {
  return (
    <>
      <Cabecera titulo="Equipo" accion={{ href: "/equipo/nuevo", texto: "Nuevo usuario" }} />
      <Suspense fallback={<Cargando />}>
        <Lista />
      </Suspense>
    </>
  );
}

async function Lista() {
  await requireJefe();
  const supabase = await createClient();
  const { data: usuarios } = await supabase
    .from("profiles")
    .select("id, username, nombre, rol, activo")
    .order("activo", { ascending: false })
    .order("nombre");

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
      {(usuarios ?? []).map((u) => (
        <li key={u.id}>
          <Link href={`/equipo/${u.id}`} className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 active:bg-bg">
            <span className="min-w-0">
              <span className={`block font-semibold break-words ${u.activo ? "" : "text-muted line-through"}`}>{u.nombre}</span>
              <span className="block text-[15px] text-muted">@{u.username}</span>
            </span>
            <span className="flex shrink-0 gap-1.5">
              {!u.activo ? <Etiqueta clase="bg-danger-soft text-danger">Desactivado</Etiqueta> : null}
              <Etiqueta clase={u.rol === "jefe" ? "bg-ink text-white" : "bg-bg text-muted"}>{ROLES[u.rol]}</Etiqueta>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Etiqueta({ clase, children }: { clase: string; children: React.ReactNode }) {
  return <span className={`rounded-full px-2.5 py-1 text-[13px] font-semibold ${clase}`}>{children}</span>;
}
