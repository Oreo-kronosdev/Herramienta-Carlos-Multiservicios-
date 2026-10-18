import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Rol } from "@/lib/etiquetas";

export type Profile = { id: string; username: string; nombre: string; rol: Rol; activo: boolean };

// Una lectura por petición aunque la pidan varios componentes.
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  // getClaims verifica la firma del token sin preguntar a Auth; así un usuario bloqueado
  // sigue llegando a su perfil y ve "desactivado" en lugar de un login sin explicación.
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, username, nombre, rol, activo")
    .eq("id", userId)
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
