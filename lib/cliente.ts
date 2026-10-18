import type { Resultado } from "@/lib/equipo";

export type ClienteInput = {
  nombre: string;
  direccion: string | null;
  administrador: string | null;
  telefono: string | null;
};

const texto = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim() || null;

export function parseCliente(fd: FormData): Resultado<ClienteInput> {
  const data: ClienteInput = {
    nombre: texto(fd, "nombre") ?? "",
    direccion: texto(fd, "direccion"),
    administrador: texto(fd, "administrador"),
    telefono: texto(fd, "telefono"),
  };
  const errores: Record<string, string> = {};
  if (!data.nombre) errores.nombre = "El nombre es obligatorio";
  if (data.telefono && !/^\+?[\d\s().-]{6,20}$/.test(data.telefono))
    errores.telefono = "Escribe solo el número (ej.: 600 111 222)";
  return Object.keys(errores).length ? { ok: false, errores } : { ok: true, data };
}
