import { Suspense } from "react";
import Link from "next/link";
import { requireJefe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatEUR } from "@/lib/importe";
import { formatFecha, hoyMadrid } from "@/lib/fechas";
import { mesAnterior, mesSiguiente, nombreMes, rangoMes, resumen } from "@/lib/finanzas";
import { Cabecera } from "@/components/Cabecera";
import { Cargando } from "@/components/Cargando";
import { EmptyState } from "@/components/EmptyState";
import { BotonFactura } from "./Formularios";

export const metadata = { title: "Finanzas" };

export default function FinanzasPage({ searchParams }: PageProps<"/finanzas">) {
  return (
    <Suspense fallback={<Cargando />}>
      <Finanzas searchParams={searchParams} />
    </Suspense>
  );
}

async function Finanzas({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireJefe();
  const hoy = hoyMadrid();
  const sp = await searchParams;
  const { mes, desde, hasta } = rangoMes(typeof sp.mes === "string" ? sp.mes : undefined, hoy);
  const supabase = await createClient();
  const [{ data: movs }, { data: pendientes }] = await Promise.all([
    supabase
      .from("movimientos")
      .select("id, tipo, concepto, importe, fecha, factura_id, obras (titulo)")
      .gte("fecha", desde)
      .lte("fecha", hasta)
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("facturas")
      .select("id, numero, concepto, importe, fecha_vencimiento, clientes (nombre)")
      .eq("pagada", false)
      .order("fecha_vencimiento", { nullsFirst: false }),
  ]);
  const r = resumen(movs ?? []);
  const pendiente = resumen((pendientes ?? []).map((f) => ({ tipo: "ingreso" as const, importe: f.importe }))).ingresos;
  const vencidas = (pendientes ?? []).filter((f) => f.fecha_vencimiento && f.fecha_vencimiento < hoy).length;

  return (
    <>
      <Cabecera titulo="Finanzas" volver={{ href: "/mas", texto: "Más" }} />
      <nav aria-label="Mes" className="mb-4 flex items-center justify-between rounded-card border border-line bg-surface">
        <Link href={`/finanzas?mes=${mesAnterior(mes)}`} aria-label="Mes anterior" className="flex size-12 items-center justify-center text-2xl active:bg-bg">
          ‹
        </Link>
        <span className="font-display text-xl font-bold first-letter:uppercase">{nombreMes(mes)}</span>
        <Link href={`/finanzas?mes=${mesSiguiente(mes)}`} aria-label="Mes siguiente" className="flex size-12 items-center justify-center text-2xl active:bg-bg">
          ›
        </Link>
      </nav>

      <div className="grid grid-cols-2 gap-2.5">
        <Tarjeta titulo="Ingresos" id="total-ingresos" valor={formatEUR(r.ingresos)} />
        <Tarjeta titulo="Gastos" id="total-gastos" valor={formatEUR(r.gastos)} />
        <Tarjeta titulo="Balance" id="total-balance" valor={formatEUR(r.balance)} color={r.balance < 0 ? "text-danger" : "text-ok"} />
        <Tarjeta
          titulo="Pendiente de cobro"
          id="total-pendiente"
          valor={formatEUR(pendiente)}
          nota={vencidas ? `${vencidas} vencida${vencidas > 1 ? "s" : ""}` : undefined}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Accion href="/finanzas/movimientos/nuevo?tipo=gasto">Nuevo gasto</Accion>
        <Accion href="/finanzas/movimientos/nuevo?tipo=ingreso">Nuevo ingreso</Accion>
        <Accion href="/finanzas/facturas/nueva">Nueva factura</Accion>
      </div>

      <h2 className="mt-7 mb-3 font-display text-xl font-bold">Facturas pendientes</h2>
      {pendientes?.length ? (
        <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {pendientes.map((f) => {
            const vencida = f.fecha_vencimiento && f.fecha_vencimiento < hoy;
            return (
              <li key={f.id} className="flex items-center gap-3 px-4 py-3">
                <Link href={`/finanzas/facturas/${f.id}`} className="min-w-0 flex-1 active:opacity-70">
                  <span className="block font-semibold break-words">
                    {f.numero} · {f.clientes?.nombre}
                  </span>
                  <span className="block text-[15px] break-words text-muted">{f.concepto}</span>
                  <span className={`mt-0.5 flex flex-wrap items-center gap-1.5 text-[15px] ${vencida ? "font-semibold text-danger" : "text-muted"}`}>
                    <span className="font-semibold text-ink tabular-nums">{formatEUR(f.importe)}</span>
                    {vencida ? <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[13px]">Vencida</span> : null}
                    {f.fecha_vencimiento ? <span>vence el {formatFecha(f.fecha_vencimiento, hoy)}</span> : null}
                  </span>
                </Link>
                <BotonFactura id={f.id} pagada texto="Cobrada" />
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState titulo="Todo cobrado" />
      )}

      <h2 className="mt-7 mb-3 font-display text-xl font-bold first-letter:uppercase">Movimientos de {nombreMes(mes)}</h2>
      {movs?.length ? (
        <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {movs.map((m) => (
            <li key={m.id}>
              <Link href={`/finanzas/movimientos/${m.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 active:bg-bg">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold break-words">{m.concepto}</span>
                  <span className="block text-[15px] break-words text-muted first-letter:uppercase">
                    {[formatFecha(m.fecha, hoy), m.obras?.titulo].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className={`shrink-0 font-semibold tabular-nums ${m.tipo === "ingreso" ? "text-ok" : "text-danger"}`}>
                  {m.tipo === "ingreso" ? "+" : "−"}
                  {formatEUR(m.importe)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState titulo="Sin movimientos este mes" />
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <a href={`/finanzas/exportar?mes=${mes}`} download className="flex h-11 items-center rounded-[10px] border-2 border-line bg-surface px-4 text-[15px] font-semibold active:bg-bg">
          Exportar mes a Excel
        </a>
        <a href={`/finanzas/exportar?ano=${mes.slice(0, 4)}`} download className="flex h-11 items-center rounded-[10px] border-2 border-line bg-surface px-4 text-[15px] font-semibold active:bg-bg">
          Exportar año a Excel
        </a>
      </div>
    </>
  );
}

function Tarjeta({ titulo, valor, id, color, nota }: { titulo: string; valor: string; id: string; color?: string; nota?: string }) {
  return (
    <div className="flex min-h-20 flex-col justify-between rounded-card border border-line bg-surface p-3.5">
      <span className="text-[15px] font-semibold text-muted">{titulo}</span>
      <span data-testid={id} className={`font-display text-2xl font-bold tabular-nums ${color ?? ""}`}>
        {valor}
      </span>
      {nota ? <span className="text-[13px] font-semibold text-danger">{nota}</span> : null}
    </div>
  );
}

function Accion({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex min-h-12 items-center justify-center rounded-[10px] bg-ink px-2 text-center text-[15px] leading-tight font-semibold text-white active:scale-[0.98]">
      {children}
    </Link>
  );
}
