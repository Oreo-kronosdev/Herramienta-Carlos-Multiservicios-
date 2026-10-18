import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Rol } from "@/lib/etiquetas";

export type Profile = { id: string; username: string; nombre: string; rol: Rol; activo: boolean };

// Una lectura por petición aunque la pidan varios componentes.
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, username, nombre, rol, activo")
    .eq("id", auth.user.id)
    .maybeSingle();
  return data;
});

export async function requireUser(): Promise<Profile> {
  const perfil = await getCurrentProfile();
  if (!perfil) redirect("/salir");
  if (!perfil.activo) redirect("/salir?motivo=desactivado");
  return perfil;
}

export async function requireJefe(): Promise<Profile> {
  const perfil = await requireUser();
  if (perfil.rol !== "jefe") redirect("/");
  return perfil;
}
