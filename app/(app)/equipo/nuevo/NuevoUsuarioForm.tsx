"use client";

import { useActionState } from "react";
import { Field } from "@/components/Field";
import { Select } from "@/components/Select";
import { SubmitButton } from "@/components/SubmitButton";
import { Aviso } from "@/components/Aviso";
import { ROLES } from "@/lib/etiquetas";
import { crearUsuario, type FormState } from "../actions";

export function NuevoUsuarioForm() {
  const [state, action] = useActionState<FormState, FormData>(crearUsuario, {});
  const e = state.errores ?? {};
  return (
    <form action={action} noValidate className="space-y-4 rounded-card border border-line bg-surface p-4">
      <Aviso error={state.error} />
      <Field
        label="Usuario"
        name="username"
        error={e.username}
        hint="Con lo que entrará: minúsculas, sin espacios ni tildes. Ej.: jose.luis"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        required
      />
      <Field label="Nombre" name="nombre" error={e.nombre} autoComplete="off" required />
      <Field
        label="Contraseña"
        name="password"
        type="text"
        error={e.password}
        hint="Mínimo 8 caracteres. Apúntala y dásela a la persona."
        autoComplete="new-password"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        required
      />
      <Select label="Rol" name="rol" opciones={ROLES} defaultValue="trabajador" error={e.rol} />
      <SubmitButton pendingText="Creando…">Crear usuario</SubmitButton>
    </form>
  );
}
