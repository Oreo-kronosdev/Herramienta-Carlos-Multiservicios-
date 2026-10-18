"use server";

import { revalidatePath } from "next/cache";
import { requireJefe, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseItem } from "@/lib/checklist";
import type { FormState } from "@/app/(app)/equipo/actions";

export async function anadirItem(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireJefe();
  const r = parseItem(fd);
  if (!r.ok) return { errores: r.errores };
  const supabase = await createClient();
  const { error } = await supabase.from("checklist_items").insert(r.data);
  if (error) return { error: "No se pudo añadir. Inténtalo de nuevo." };
  revalidatePath(`/obras/${r.data.obra_id}`);
  return { ok: "Añadido" };
}

export async function borrarItem(id: string, obraId: string): Promise<{ error?: string }> {
  await requireJefe();
  const supabase = await createClient();
  const { error } = await supabase.from("checklist_items").delete().eq("id", id);
  revalidatePath(`/obras/${obraId}`);
  return error ? { error: "No se pudo quitar" } : {};
}

export async function marcarItem(id: string, preparado: boolean, obraId: string): Promise<{ error?: string }> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("marcar_preparado", { p_item: id, p_preparado: preparado });
  revalidatePath(`/obras/${obraId}`);
  return error ? { error: "No se pudo guardar" } : {};
}

export async function reiniciarChecklist(obraId: string): Promise<{ error?: string }> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("reiniciar_checklist", { p_obra: obraId });
  revalidatePath(`/obras/${obraId}`);
  return error ? { error: "No se pudo desmarcar" } : {};
}
