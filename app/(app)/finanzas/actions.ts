"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireJefe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseFactura, parseMovimiento } from "@/lib/finanzas";
import { esFechaValida, hoyMadrid } from "@/lib/fechas";
import type { FormState } from "@/app/(app)/equipo/actions";

const refrescar = () => {
  revalidatePath("/finanzas", "layout");
  revalidatePath("/");
};

export async function guardarMovimiento(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireJefe();
  const r = parseMovimiento(fd);
  if (!r.ok) return { errores: r.errores };
  const id = String(fd.get("id") ?? "");
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("movimientos").update(r.data).eq("id", id).is("factura_id", null)
    : await supabase.from("movimientos").insert(r.data);
  if (error) return { error: "No se pudo guardar. Inténtalo de nuevo." };
  refrescar();
  redirect(`/finanzas?mes=${r.data.fecha.slice(0, 7)}`);
}

export async function borrarMovimiento(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireJefe();
  const supabase = await createClient();
  // Los ingresos de facturas se quitan desmarcando la factura, no aquí
  const { error } = await supabase.from("movimientos").delete().eq("id", String(fd.get("id") ?? "")).is("factura_id", null);
  if (error) return { error: "No se pudo borrar" };
  refrescar();
  redirect("/finanzas");
}

export async function guardarFactura(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireJefe();
  const r = parseFactura(fd);
  if (!r.ok) return { errores: r.errores };
  const id = String(fd.get("id") ?? "");
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("facturas").update(r.data).eq("id", id)
    : await supabase.from("facturas").insert(r.data);
  if (error?.code === "23505") return { errores: { numero: "Ya hay una factura con ese número" } };
  if (error) return { error: "No se pudo guardar la factura. Inténtalo de nuevo." };
  refrescar();
  redirect("/finanzas");
}

export async function borrarFactura(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireJefe();
  const supabase = await createClient();
  const { error } = await supabase.from("facturas").delete().eq("id", String(fd.get("id") ?? ""));
  if (error) return { error: "No se pudo borrar la factura" };
  refrescar();
  redirect("/finanzas");
}

export async function marcarFactura(id: string, pagada: boolean, fecha?: string): Promise<{ error?: string }> {
  await requireJefe();
  const dia = fecha && esFechaValida(fecha) ? fecha : hoyMadrid();
  const supabase = await createClient();
  const { error } = await supabase.rpc("marcar_factura", { p_factura: id, p_pagada: pagada, p_fecha: dia });
  if (error) return { error: "No se pudo guardar. Inténtalo de nuevo." };
  refrescar();
  return {};
}
