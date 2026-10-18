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

export type TipoEvento = Database["public"]["Enums"]["tipo_evento"];
export type AvisarDias = 0 | 1 | 2 | 3 | 7;

export const TIPOS_EVENTO: Record<TipoEvento, string> = { cita: "Cita", fecha_limite: "Fecha límite" };

export const AVISAR_DIAS: Record<AvisarDias, string> = {
  0: "El mismo día",
  1: "1 día antes",
  2: "2 días antes",
  3: "3 días antes",
  7: "1 semana antes",
};

export type TipoChecklist = Database["public"]["Enums"]["tipo_checklist"];
export const TIPOS_CHECKLIST: Record<TipoChecklist, string> = { material: "Material", herramienta: "Herramientas" };

export type TipoMovimiento = Database["public"]["Enums"]["tipo_movimiento"];
export const TIPOS_MOVIMIENTO: Record<TipoMovimiento, string> = { ingreso: "Ingreso", gasto: "Gasto" };

export type Unidad = Database["public"]["Enums"]["unidad_medida"];
export const UNIDADES: Record<Unidad, string> = { m: "m", m2: "m²", m3: "m³", ml: "ml", ud: "ud", kg: "kg", l: "l" };
