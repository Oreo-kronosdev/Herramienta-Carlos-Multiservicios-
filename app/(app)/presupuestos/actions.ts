"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseLinea } from "@/lib/presupuesto";
import type { FormState } from "@/app/(app)/equipo/actions";

// La RLS decide quién puede (jefe o quien trabaja en la obra); aquí solo se exige sesión.
const BUCKET = "presupuestos";
const refrescar = (id: string) => revalidatePath(`/presupuestos/${id}`, "layout");

export async function crearPresupuesto(_prev: FormState, fd: FormData): Promise<FormState> {
  const perfil = await requireUser();
  const obra_id = String(fd.get("obra_id") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase.from("presupuestos").insert({ obra_id, autor_id: perfil.id }).select("id").single();
  if (error || !data) return { error: "No se pudo crear. Inténtalo de nuevo." };
  revalidatePath(`/obras/${obra_id}`);
  redirect(`/presupuestos/${data.id}`);
}

export async function guardarDatos(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const id = String(fd.get("id") ?? "");
  const titulo = String(fd.get("titulo") ?? "").trim();
  if (!titulo) return { errores: { titulo: "Pon un título" } };
  const supabase = await createClient();
  const { error } = await supabase
    .from("presupuestos")
    .update({ titulo, observaciones: String(fd.get("observaciones") ?? "").trim() || null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: "No se pudo guardar" };
  refrescar(id);
  return { ok: "Guardado" };
}

export async function anadirLinea(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const id = String(fd.get("presupuesto_id") ?? "");
  const esMedida = fd.get("tipo") === "medida";
  const r = parseLinea(fd, esMedida ? "concepto" : "material");
  if (!r.ok) return { errores: r.errores };
  const supabase = await createClient();
  const { texto, cantidad, unidad } = r.data;
  const { error } = esMedida
    ? await supabase.from("presupuesto_medidas").insert({ presupuesto_id: id, concepto: texto, cantidad, unidad })
    : await supabase.from("presupuesto_materiales").insert({ presupuesto_id: id, material: texto, cantidad, unidad });
  if (error) return { error: "No se pudo añadir. Inténtalo de nuevo." };
  refrescar(id);
  return { ok: "Añadido" };
}

export async function quitarLinea(tipo: "medida" | "material", lineaId: string, presupuestoId: string): Promise<{ error?: string }> {
  await requireUser();
  const supabase = await createClient();
  const tabla = tipo === "medida" ? "presupuesto_medidas" : "presupuesto_materiales";
  const { error } = await supabase.from(tabla).delete().eq("id", lineaId);
  refrescar(presupuestoId);
  return error ? { error: "No se pudo quitar" } : {};
}

export async function registrarFoto(presupuestoId: string, path: string): Promise<{ error?: string }> {
  await requireUser();
  if (!path.startsWith(`${presupuestoId}/`)) return { error: "Ruta no válida" };
  const supabase = await createClient();
  const { error } = await supabase.from("presupuesto_fotos").insert({ presupuesto_id: presupuestoId, path });
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]); // no dejar archivos sueltos
    return { error: error.message.includes("Máximo 20") ? "Máximo 20 fotos por presupuesto" : "No se pudo guardar la foto" };
  }
  refrescar(presupuestoId);
  return {};
}

export async function guardarPie(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("presupuesto_fotos")
    .update({ pie: String(fd.get("pie") ?? "").trim() || null })
    .eq("id", String(fd.get("id") ?? ""));
  if (error) return { error: "No se pudo guardar" };
  refrescar(String(fd.get("presupuesto_id") ?? ""));
  return { ok: "Guardado" };
}

export async function quitarFoto(fotoId: string, presupuestoId: string): Promise<{ error?: string }> {
  await requireUser();
  const supabase = await createClient();
  const { data: foto } = await supabase.from("presupuesto_fotos").select("path").eq("id", fotoId).maybeSingle();
  if (!foto) return { error: "No encontrada" };
  const { error: e1 } = await supabase.storage.from(BUCKET).remove([foto.path]);
  if (e1) return { error: "No se pudo quitar la foto" };
  await supabase.from("presupuesto_fotos").delete().eq("id", fotoId);
  refrescar(presupuestoId);
  return {};
}

export async function borrarPresupuesto(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const id = String(fd.get("id") ?? "");
  const supabase = await createClient();
  const { data: p } = await supabase.from("presupuestos").select("obra_id, presupuesto_fotos (path)").eq("id", id).maybeSingle();
  if (!p) return { error: "No encontrado" };
  const paths = p.presupuesto_fotos.map((f) => f.path);
  if (paths.length) {
    const { error } = await supabase.storage.from(BUCKET).remove(paths);
    if (error) return { error: "No se pudieron borrar las fotos. Inténtalo de nuevo." };
  }
  const { error } = await supabase.from("presupuestos").delete().eq("id", id);
  if (error) return { error: "No se pudo borrar" };
  revalidatePath(`/obras/${p.obra_id}`);
  redirect(`/obras/${p.obra_id}`);
}
