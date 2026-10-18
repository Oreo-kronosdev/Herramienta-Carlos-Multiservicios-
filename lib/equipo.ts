import { ROLES, type Rol } from "@/lib/etiquetas";
import { normalizeUsername, validateUsername } from "@/lib/username";

export type NuevoUsuario = { username: string; nombre: string; password: string; rol: Rol };
export type Resultado<T> = { ok: true; data: T } | { ok: false; errores: Record<string, string> };

export function esRol(v: unknown): v is Rol {
  return typeof v === "string" && Object.hasOwn(ROLES, v);
}

export function validarPassword(p: string): string | null {
  return p.length < 8 ? "Mínimo 8 caracteres" : null;
}

export function parseNuevoUsuario(fd: FormData): Resultado<NuevoUsuario> {
  const username = normalizeUsername(String(fd.get("username") ?? ""));
  const nombre = String(fd.get("nombre") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  const rol = fd.get("rol");
  const errores: Record<string, string> = {};

  const eu = validateUsername(username);
  if (eu) errores.username = eu;
  if (!nombre) errores.nombre = "El nombre es obligatorio";
  const ep = validarPassword(password);
  if (ep) errores.password = ep;
  if (!esRol(rol)) errores.rol = "Elige un rol";

  if (Object.keys(errores).length) return { ok: false, errores };
  return { ok: true, data: { username, nombre, password, rol: rol as Rol } };
}

// Evita que el jefe se deje a la empresa sin jefe.
export function comprobarCambioPropio(
  actorId: string,
  targetId: string,
  cambios: { rol?: Rol; activo?: boolean },
): string | null {
  if (actorId !== targetId) return null;
  if (cambios.rol && cambios.rol !== "jefe") return "No puedes quitarte el rol de jefe a ti mismo";
  if (cambios.activo === false) return "No puedes desactivarte a ti mismo";
  return null;
}
