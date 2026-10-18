import type { Database } from "./database.types";

export type Rol = Database["public"]["Enums"]["rol_usuario"];
export type TipoTrabajo = Database["public"]["Enums"]["tipo_trabajo"];
export type EstadoObra = Database["public"]["Enums"]["estado_obra"];

export const ROLES: Record<Rol, string> = { jefe: "Jefe", trabajador: "Trabajador" };

export const TIPOS_TRABAJO: Record<TipoTrabajo, string> = {
  reparacion: "Reparación",
  tejado: "Tejado",
  canalones: "Canalones",
  chimenea: "Chimenea",
  pintura: "Pintura",
  trabajo_altura: "Trabajos en altura",
  otro: "Otro",
};

export const ESTADOS_OBRA: Record<EstadoObra, string> = {
  pendiente: "Pendiente",
  presupuestada: "Presupuestada",
  en_curso: "En curso",
  terminada: "Terminada",
  cancelada: "Cancelada",
};
