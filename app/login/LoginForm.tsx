"use client";

import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";

export function LoginForm() {
  return (
    <form className="space-y-4">
      <Field
        label="Usuario"
        name="username"
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
