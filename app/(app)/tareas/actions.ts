"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireJefe, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseTarea } from "@/lib/tarea";
import type { FormState } from "@/app/(app)/equipo/actions";

function refrescar() {
  revalidatePath("/tareas");
  revalidatePath("/obras", "layout");
  revalidatePath("/");
}

export async function guardarTarea(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireJefe();
  const r = parseTarea(fd);
  if (!r.ok) return { errores: r.errores };
  const id = String(fd.get("id") ?? "");
  const supabase = await createClient();
  // «hecha» no se toca al editar: solo cambia al marcarla
  const { error } = id
    ? await supabase.from("tareas").update(r.data).eq("id", id)
    : await supabase.from("tareas").insert(r.data);
  if (error) return { error: "No se pudo guardar la tarea. Inténtalo de nuevo." };
  refrescar();
  redirect("/tareas");
}

export async function marcarTarea(id: string, hecha: boolean): Promise<{ error?: string }> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("marcar_tarea", { p_tarea: id, p_hecha: hecha });
  if (error) return { error: "No se pudo guardar. Inténtalo de nuevo." };
  refrescar();
  return {};
}

export async function borrarTarea(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireJefe();
  const supabase = await createClient();
  const { error } = await supabase.from("tareas").delete().eq("id", String(fd.get("id") ?? ""));
  if (error) return { error: "No se pudo borrar la tarea" };
  refrescar();
  redirect("/tareas");
}
