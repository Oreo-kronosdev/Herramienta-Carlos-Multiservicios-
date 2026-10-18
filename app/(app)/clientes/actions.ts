"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireJefe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseCliente } from "@/lib/cliente";
import type { FormState } from "@/app/(app)/equipo/actions";

export async function guardarCliente(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireJefe();
  const r = parseCliente(fd);
  if (!r.ok) return { errores: r.errores };
  const id = String(fd.get("id") ?? "");
  const supabase = await createClient();

  const { data, error } = id
    ? await supabase.from("clientes").update(r.data).eq("id", id).select("id").single()
    : await supabase.from("clientes").insert(r.data).select("id").single();
  if (error || !data) return { error: "No se pudo guardar el cliente. Inténtalo de nuevo." };

  revalidatePath("/clientes");
  redirect(`/clientes/${data.id}`);
}

export async function borrarCliente(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireJefe();
  const id = String(fd.get("id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("clientes").delete().eq("id", id);
  if (error?.code === "23503") return { error: "No se puede borrar: tiene obras o facturas. Bórralas antes." };
  if (error) return { error: "No se pudo borrar el cliente" };
  revalidatePath("/clientes");
  redirect("/clientes");
}
