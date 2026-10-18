import type { InputHTMLAttributes, ReactNode } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  error?: string;
  hint?: ReactNode;
};

export function Field({ label, name, error, hint, className, ...input }: Props) {
  const errorId = error ? `${name}-error` : undefined;
  return (
    <label className="block">
      <span className="mb-1.5 block text-[15px] font-semibold text-ink">{label}</span>
      <input
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={`h-13 w-full rounded-[10px] border-2 bg-surface px-3.5 text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-accent ${
          error ? "border-danger" : "border-line"
        } ${className ?? ""}`}
        {...input}
      />
      {hint && !error ? <span className="mt-1 block text-sm text-muted">{hint}</span> : null}
      {error ? (
        <span id={errorId} className="mt-1 block text-sm font-medium text-danger">
          {error}
        </span>
      ) : null}
    </label>
  );
}
