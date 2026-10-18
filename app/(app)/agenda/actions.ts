"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireJefe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseEvento } from "@/lib/evento";
import type { FormState } from "@/app/(app)/equipo/actions";

export async function guardarEvento(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireJefe();
  const r = parseEvento(fd);
  if (!r.ok) return { errores: r.errores };
  const { personas, ...evento } = r.data;
  const id = String(fd.get("id") ?? "");
  const supabase = await createClient();

  const { data, error } = id
    ? await supabase.from("eventos").update(evento).eq("id", id).select("id").single()
    : await supabase.from("eventos").insert(evento).select("id").single();
  if (error || !data) return { error: "No se pudo guardar la cita. Inténtalo de nuevo." };

  // Conserva avisado_at de quien sigue asignado; solo se quitan y añaden las diferencias.
  const { data: actuales } = await supabase.from("evento_personas").select("user_id").eq("evento_id", data.id);
  const antes = new Set((actuales ?? []).map((p) => p.user_id));
  const quitar = [...antes].filter((u) => !personas.includes(u));
  const poner = personas.filter((u) => !antes.has(u));
  const { error: e1 } = quitar.length
    ? await supabase.from("evento_personas").delete().eq("evento_id", data.id).in("user_id", quitar)
    : { error: null };
  const { error: e2 } = poner.length
    ? await supabase.from("evento_personas").insert(poner.map((user_id) => ({ evento_id: data.id, user_id })))
    : { error: null };
  if (e1 || e2) return { error: "La cita se guardó, pero no las personas. Vuelve a guardar." };

  revalidatePath("/agenda");
  revalidatePath("/");
  redirect(`/agenda/${data.id}`);
}

export async function borrarEvento(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireJefe();
  const id = String(fd.get("id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("eventos").delete().eq("id", id);
  if (error) return { error: "No se pudo borrar la cita" };
  revalidatePath("/agenda");
  revalidatePath("/");
  redirect("/agenda");
}
