"use client";

import { useActionState } from "react";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Aviso } from "@/components/Aviso";
import type { FormState } from "@/app/(app)/equipo/actions";
import { borrarCliente, guardarCliente } from "./actions";

type Cliente = {
  id: string;
  nombre: string;
  direccion: string | null;
  administrador: string | null;
  telefono: string | null;
};

export function ClienteForm({ cliente }: { cliente?: Cliente }) {
  const [state, action] = useActionState<FormState, FormData>(guardarCliente, {});
  const e = state.errores ?? {};
  return (
    <form action={action} className="space-y-4 rounded-card border border-line bg-surface p-4">
      <Aviso error={state.error} />
      {cliente ? <input type="hidden" name="id" value={cliente.id} /> : null}
      <Field
        label="Nombre"
        name="nombre"
        defaultValue={cliente?.nombre}
        error={e.nombre}
        hint="Persona o comunidad. Ej.: Comunidad C/ Mayor 5"
        autoCapitalize="words"
        required
      />
      <Field label="Dirección" name="direccion" defaultValue={cliente?.direccion ?? ""} autoComplete="street-address" />
      <Field
        label="Comunidad / administrador"
        name="administrador"
        defaultValue={cliente?.administrador ?? ""}
        hint="Administrador de fincas o presidente, si lo hay"
      />
      <Field
        label="Teléfono"
        name="telefono"
        type="tel"
        inputMode="tel"
        defaultValue={cliente?.telefono ?? ""}
        error={e.telefono}
        autoComplete="tel"
      />
      <SubmitButton>Guardar cliente</SubmitButton>
    </form>
  );
}

export function BorrarCliente({ id }: { id: string }) {
  const [state, action] = useActionState<FormState, FormData>(borrarCliente, {});
  return (
    <form
      action={action}
      onSubmit={(ev) => {
        if (!confirm("¿Borrar este cliente? No se puede deshacer.")) ev.preventDefault();
      }}
      className="space-y-3"
    >
      <Aviso error={state.error} />
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="danger" pendingText="Borrando…">
        Borrar cliente
      </SubmitButton>
    </form>
  );
}
