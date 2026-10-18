"use client";

import { useActionState } from "react";
import { Field } from "@/components/Field";
import { Select } from "@/components/Select";
import { SubmitButton } from "@/components/SubmitButton";
import { Aviso } from "@/components/Aviso";
import { ROLES, type Rol } from "@/lib/etiquetas";
import { actualizarUsuario, cambiarPassword, type FormState } from "../actions";

type Usuario = { id: string; nombre: string; rol: Rol; activo: boolean };

export function EditarUsuarioForm({ usuario }: { usuario: Usuario }) {
  const [state, action] = useActionState<FormState, FormData>(actualizarUsuario, {});
  const e = state.errores ?? {};
  return (
    <form action={action} noValidate className="space-y-4 rounded-card border border-line bg-surface p-4">
      <h2 className="font-display text-xl font-bold">Datos y permisos</h2>
      <Aviso ok={state.ok} error={state.error} />
      <input type="hidden" name="id" value={usuario.id} />
      <Field label="Nombre" name="nombre" defaultValue={usuario.nombre} error={e.nombre} required />
      <Select label="Rol" name="rol" opciones={ROLES} defaultValue={usuario.rol} error={e.rol} />
      <label className="flex min-h-12 items-center gap-3 rounded-[10px] border-2 border-line px-3.5">
        <input type="checkbox" name="activo" defaultChecked={usuario.activo} className="size-6 accent-accent" />
        <span className="font-semibold">Activo</span>
        <span className="ml-auto text-right text-sm text-muted">Si lo quitas, no podrá entrar</span>
      </label>
      <SubmitButton>Guardar cambios</SubmitButton>
    </form>
  );
}

export function PasswordForm({ id }: { id: string }) {
  const [state, action] = useActionState<FormState, FormData>(cambiarPassword, {});
  return (
    <form action={action} noValidate className="space-y-4 rounded-card border border-line bg-surface p-4">
      <h2 className="font-display text-xl font-bold">Contraseña</h2>
      <Aviso ok={state.ok} error={state.error} />
      <input type="hidden" name="id" value={id} />
      <Field
        label="Nueva contraseña"
        name="password"
        type="text"
        error={state.errores?.password}
        hint="Mínimo 8 caracteres."
        autoComplete="new-password"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        required
      />
      <SubmitButton pendingText="Cambiando…">Cambiar contraseña</SubmitButton>
    </form>
  );
}
