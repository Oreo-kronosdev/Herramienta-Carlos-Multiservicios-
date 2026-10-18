"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { signIn, type LoginState } from "./actions";

export function LoginForm() {
  const aviso =
    useSearchParams().get("motivo") === "desactivado" ? "Usuario desactivado. Habla con Carlos." : undefined;
  const [state, action] = useActionState<LoginState, FormData>(signIn, {});
  const mensaje = state.error ?? aviso;
  return (
    <form action={action} className="space-y-4">
      {mensaje ? (
        <p role="alert" className="rounded-[10px] bg-danger-soft px-3.5 py-3 font-medium text-danger">
          {mensaje}
        </p>
      ) : null}
      <Field
        label="Usuario"
        name="username"
        defaultValue={state.username}
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="next"
        required
      />
      <Field
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="current-password"
        enterKeyHint="go"
        required
      />
      <div className="pt-2">
        <SubmitButton pendingText="Entrando…">Entrar</SubmitButton>
      </div>
    </form>
  );
}
