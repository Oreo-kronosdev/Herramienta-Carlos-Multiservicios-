import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Cabecera } from "@/components/Cabecera";
import { Cargando } from "@/components/Cargando";
import { EmptyState } from "@/components/EmptyState";

export const metadata = { title: "Clientes" };

export default function ClientesPage() {
  return (
    <Suspense fallback={<Cargando />}>
      <Clientes />
    </Suspense>
  );
}

async function Clientes() {
  const perfil = await requireUser();
  const supabase = await createClient();
  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, nombre, direccion, administrador")
    .order("nombre");
  const esJefe = perfil.rol === "jefe";

  return (
    <>
      <Cabecera titulo="Clientes" accion={esJefe ? { href: "/clientes/nuevo", texto: "Nuevo cliente" } : undefined} />
      {!clientes?.length ? (
        <EmptyState titulo="Aún no hay clientes">
          {esJefe ? "Crea el primero con «Nuevo cliente»." : "Aquí verás los clientes de tus obras."}
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {clientes.map((c) => (
            <li key={c.id}>
              <Link href={`/clientes/${c.id}`} className="block min-h-16 px-4 py-3 active:bg-bg">
                <span className="block font-semibold break-words">{c.nombre}</span>
                {c.direccion || c.administrador ? (
                  <span className="block text-[15px] break-words text-muted">
                    {[c.direccion, c.administrador].filter(Boolean).join(" · ")}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
