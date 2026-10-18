import type { SelectHTMLAttributes } from "react";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  name: string;
  error?: string;
  opciones: Record<string, string>;
  vacia?: string;
};

export function Select({ label, name, error, opciones, vacia, ...select }: Props) {
  const errorId = error ? `${name}-error` : undefined;
  return (
    <label className="block">
      <span className="mb-1.5 block text-[15px] font-semibold text-ink">{label}</span>
      <select
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={`h-13 w-full appearance-none rounded-[10px] border-2 bg-surface bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%23625b51%22><path d=%22M5 7l5 6 5-6z%22/></svg>')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat px-3.5 pr-10 text-ink outline-none focus:border-accent ${
          error ? "border-danger" : "border-line"
        }`}
        {...select}
      >
        {vacia !== undefined ? <option value="">{vacia}</option> : null}
        {Object.entries(opciones).map(([valor, texto]) => (
          <option key={valor} value={valor}>
            {texto}
          </option>
        ))}
      </select>
      {error ? (
        <span id={errorId} className="mt-1 block text-sm font-medium text-danger">
          {error}
        </span>
      ) : null}
    </label>
  );
}
