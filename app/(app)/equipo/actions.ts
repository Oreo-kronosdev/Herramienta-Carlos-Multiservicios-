"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireJefe } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { usernameToEmail } from "@/lib/username";
import { comprobarCambioPropio, esRol, parseNuevoUsuario, validarPassword } from "@/lib/equipo";

export type FormState = { ok?: string; error?: string; errores?: Record<string, string> };

const BANEO_INDEFINIDO = "876000h"; // ~100 años

export async function crearUsuario(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireJefe();
  const r = parseNuevoUsuario(fd);
  if (!r.ok) return { errores: r.errores };
  const { username, nombre, password, rol } = r.data;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: usernameToEmail(username),
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    if (error?.code === "email_exists") return { errores: { username: "Ese usuario ya existe" } };
    return { error: "No se pudo crear el usuario. Inténtalo de nuevo." };
  }

  const { error: errPerfil } = await admin
    .from("profiles")
    .insert({ id: data.user.id, username, nombre, rol });
  if (errPerfil) {
    await admin.auth.admin.deleteUser(data.user.id); // no dejar cuentas sin perfil
    if (errPerfil.code === "23505") return { errores: { username: "Ese usuario ya existe" } };
    return { error: "No se pudo crear el usuario. Inténtalo de nuevo." };
  }

  revalidatePath("/equipo");
  redirect("/equipo");
}

export async function actualizarUsuario(_prev: FormState, fd: FormData): Promise<FormState> {
  const jefe = await requireJefe();
  const id = String(fd.get("id") ?? "");
  const nombre = String(fd.get("nombre") ?? "").trim();
  const rol = fd.get("rol");
  const activo = fd.get("activo") === "on";

  if (!nombre) return { errores: { nombre: "El nombre es obligatorio" } };
  if (!esRol(rol)) return { errores: { rol: "Elige un rol" } };
  const propio = comprobarCambioPropio(jefe.id, id, { rol, activo });
  if (propio) return { error: propio };

  const admin = createAdminClient();
  const { data: antes } = await admin.from("profiles").select("activo").eq("id", id).maybeSingle();
  if (!antes) return { error: "Usuario no encontrado" };

  const { error } = await admin.from("profiles").update({ nombre, rol, activo }).eq("id", id);
  if (error) return { error: "No se pudieron guardar los cambios" };

  if (antes.activo !== activo) {
    const { error: errBan } = await admin.auth.admin.updateUserById(id, {
      ban_duration: activo ? "none" : BANEO_INDEFINIDO,
    });
    if (errBan) return { error: "Se guardó el perfil, pero no se pudo bloquear/desbloquear el acceso. Repite." };
  }

  revalidatePath("/equipo");
  return { ok: "Cambios guardados" };
}

export async function cambiarPassword(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireJefe();
  const id = String(fd.get("id") ?? "");
  const password = String(fd.get("password") ?? "");
  const e = validarPassword(password);
  if (e) return { errores: { password: e } };

  const { error } = await createAdminClient().auth.admin.updateUserById(id, { password });
  if (error) return { error: "No se pudo cambiar la contraseña" };
  return { ok: "Contraseña cambiada" };
}
