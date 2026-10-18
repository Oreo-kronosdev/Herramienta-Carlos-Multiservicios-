"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireJefe, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { esEstado, parseObra } from "@/lib/obra";
import type { FormState } from "@/app/(app)/equipo/actions";
import { borrarCarpetas } from "@/app/(app)/presupuestos/archivos";

export async function guardarObra(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireJefe();
  const r = parseObra(fd);
  if (!r.ok) return { errores: r.errores };
  const { trabajadores, ...obra } = r.data;
  const id = String(fd.get("id") ?? "");
  const supabase = await createClient();

  const { data, error } = id
    ? await supabase.from("obras").update(obra).eq("id", id).select("id").single()
    : await supabase.from("obras").insert(obra).select("id").single();
  if (error || !data) return { error: "No se pudo guardar la obra. Inténtalo de nuevo." };

  // shortcut: borrar+insertar no es atómico; si falla el insert quedan sin asignar y se avisa. Pasar a una función SQL si molesta.
  const { error: e1 } = await supabase.from("obra_trabajadores").delete().eq("obra_id", data.id);
  const { error: e2 } = trabajadores.length
    ? await supabase
        .from("obra_trabajadores")
        .insert(trabajadores.map((user_id) => ({ obra_id: data.id, user_id })))
    : { error: null };
  if (e1 || e2) return { error: "La obra se guardó, pero no las personas asignadas. Vuelve a guardar." };

  revalidatePath("/obras");
  revalidatePath("/");
  redirect(`/obras/${data.id}`);
}

export async function cambiarEstado(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const id = String(fd.get("id") ?? "");
  const estado = fd.get("estado");
  if (!esEstado(estado)) return { error: "Estado no válido" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("cambiar_estado_obra", { p_obra: id, p_estado: estado });
  if (error) return { error: "No se pudo cambiar el estado" };
  revalidatePath(`/obras/${id}`);
  revalidatePath("/obras");
  revalidatePath("/");
  return { ok: "Estado actualizado" };
}

export async function borrarObra(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireJefe();
  const id = String(fd.get("id") ?? "");
  const supabase = await createClient();
  // Las fotos de sus tomas de datos se borran antes: la base de datos no puede borrar archivos
  const { data: presupuestos } = await supabase.from("presupuestos").select("id").eq("obra_id", id);
  if (!(await borrarCarpetas(supabase, (presupuestos ?? []).map((p) => p.id))))
    return { error: "No se pudieron borrar las fotos de la obra. Inténtalo de nuevo." };
  const { error } = await supabase.from("obras").delete().eq("id", id);
  if (error) return { error: "No se pudo borrar la obra" };
  revalidatePath("/obras");
  revalidatePath("/");
  redirect("/obras");
}
