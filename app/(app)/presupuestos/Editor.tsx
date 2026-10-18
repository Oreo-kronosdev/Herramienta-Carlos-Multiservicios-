"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/Field";
import { Select } from "@/components/Select";
import { SubmitButton } from "@/components/SubmitButton";
import { Aviso } from "@/components/Aviso";
import { createClient } from "@/lib/supabase/client";
import { comprimirFoto, FotoIlegible, validarFoto } from "@/lib/imagen";
import { UNIDADES } from "@/lib/etiquetas";
import type { FormState } from "@/app/(app)/equipo/actions";
import {
  anadirLinea,
  borrarPresupuesto,
  crearPresupuesto,
  guardarDatos,
  guardarPie,
  quitarFoto,
  quitarLinea,
  registrarFoto,
} from "./actions";

export function NuevoPresupuesto({ obraId }: { obraId: string }) {
  const [state, action] = useActionState<FormState, FormData>(crearPresupuesto, {});
  return (
    <form action={action}>
      <input type="hidden" name="obra_id" value={obraId} />
      <SubmitButton pendingText="Creando…">Nueva toma de datos</SubmitButton>
      {state.error ? <div className="mt-2"><Aviso error={state.error} /></div> : null}
    </form>
  );
}

export function DatosForm({ id, titulo, observaciones }: { id: string; titulo: string; observaciones: string | null }) {
  const [state, action] = useActionState<FormState, FormData>(guardarDatos, {});
  return (
    <form action={action} noValidate className="space-y-4">
      <Aviso ok={state.ok} error={state.error} />
      <input type="hidden" name="id" value={id} />
      <Field label="Título" name="titulo" defaultValue={titulo} error={state.errores?.titulo} />
      <label className="block">
        <span className="mb-1.5 block text-[15px] font-semibold">Observaciones</span>
        <textarea
          name="observaciones"
          rows={4}
          defaultValue={observaciones ?? ""}
          placeholder="Estado, accesos, si hace falta andamio…"
          className="w-full rounded-[10px] border-2 border-line bg-surface px-3.5 py-3 outline-none focus:border-accent"
        />
      </label>
      <SubmitButton>Guardar datos</SubmitButton>
    </form>
  );
}

export function LineaForm({ presupuestoId, tipo }: { presupuestoId: string; tipo: "medida" | "material" }) {
  const [state, action] = useActionState<FormState, FormData>(anadirLinea, {});
  const e = state.errores ?? {};
  const campo = tipo === "medida" ? "concepto" : "material";
  return (
    <form action={action} noValidate className="mt-3 space-y-3 border-t border-line pt-3">
      <Aviso error={state.error} />
      <input type="hidden" name="presupuesto_id" value={presupuestoId} />
      <input type="hidden" name="tipo" value={tipo} />
      <Field label={tipo === "medida" ? "Qué se mide" : "Material"} name={campo} error={e[campo]} hint={tipo === "medida" ? "Ej.: Canalón fachada" : "Ej.: Abrazaderas"} />
      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <Field label="Cantidad" name="cantidad" inputMode="decimal" error={e.cantidad} />
        <Select label="Unidad" name="unidad" opciones={UNIDADES} defaultValue={tipo === "medida" ? "ml" : "ud"} error={e.unidad} />
      </div>
      <SubmitButton pendingText="Añadiendo…">{tipo === "medida" ? "Añadir medida" : "Añadir material"}</SubmitButton>
    </form>
  );
}

function useAccion() {
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const ejecutar = (fn: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      try {
        setError((await fn()).error ?? null);
      } catch {
        setError("Sin conexión. Inténtalo de nuevo.");
      }
    });
  return { pendiente, error, ejecutar };
}

export function QuitarLinea({ tipo, id, presupuestoId, texto }: { tipo: "medida" | "material"; id: string; presupuestoId: string; texto: string }) {
  const { pendiente, error, ejecutar } = useAccion();
  return (
    <>
      {error ? <span role="alert" className="text-[13px] font-semibold text-danger">{error}</span> : null}
      <button
        type="button"
        aria-label={`Quitar ${texto}`}
        disabled={pendiente}
        onClick={() => confirm(`¿Quitar «${texto}»?`) && ejecutar(() => quitarLinea(tipo, id, presupuestoId))}
        className="flex size-11 shrink-0 items-center justify-center rounded-lg text-xl text-muted active:bg-bg disabled:opacity-40"
      >
        ×
      </button>
    </>
  );
}

export function SubirFotos({ presupuestoId, quedan }: { presupuestoId: string; quedan: number }) {
  const router = useRouter();
  const [estado, setEstado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function subir(files: File[]) {
    setError(null);
    if (files.length > quedan) return setError(`Solo caben ${quedan} fotos más (máximo 20)`);
    const malo = files.map(validarFoto).find(Boolean);
    if (malo) return setError(malo);
    const supabase = createClient();
    for (const [i, file] of files.entries()) {
      setEstado(`Subiendo ${i + 1} de ${files.length}…`);
      try {
        const blob = await comprimirFoto(file);
        const path = `${presupuestoId}/${crypto.randomUUID()}.jpg`;
        const { error: e } = await supabase.storage.from("presupuestos").upload(path, blob, { contentType: "image/jpeg" });
        if (e) throw e;
        const r = await registrarFoto(presupuestoId, path);
        if (r.error) throw new Error(r.error);
      } catch (e) {
        setError(
          e instanceof FotoIlegible || (e instanceof Error && e.message.startsWith("Máximo"))
            ? e.message
            : `No se pudo subir «${file.name}». Comprueba la conexión.`,
        );
        break;
      }
    }
    setEstado(null);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <label className="relative flex h-13 cursor-pointer items-center justify-center rounded-[10px] bg-ink font-semibold text-white has-focus-visible:outline-3 has-focus-visible:outline-accent">
        {estado ?? "Añadir fotos"}
        <input
          type="file"
          accept="image/*"
          multiple
          aria-label="Añadir fotos"
          disabled={!!estado || quedan <= 0}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (files.length) void subir(files);
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      {error ? <p role="alert" className="rounded-[10px] bg-danger-soft px-3.5 py-3 font-medium text-danger">{error}</p> : null}
    </div>
  );
}

export function Foto({ id, presupuestoId, url, pie }: { id: string; presupuestoId: string; url: string | null; pie: string | null }) {
  const [state, action] = useActionState<FormState, FormData>(guardarPie, {});
  const { pendiente, error, ejecutar } = useAccion();
  return (
    <li className="overflow-hidden rounded-[10px] border border-line">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal de Storage
        <img src={url} alt={pie ?? "Foto de la obra"} className="aspect-[4/3] w-full bg-bg object-cover" />
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center bg-bg text-muted">Sin vista previa</div>
      )}
      <form action={action} noValidate className="space-y-2 p-3">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="presupuesto_id" value={presupuestoId} />
        <Field label="Pie de foto" name="pie" defaultValue={pie ?? ""} />
        <div className="flex items-center gap-2">
          <button type="submit" className="h-11 flex-1 rounded-[10px] border-2 border-line font-semibold active:bg-bg">
            Guardar pie
          </button>
          <button
            type="button"
            disabled={pendiente}
            onClick={() => confirm("¿Quitar esta foto?") && ejecutar(() => quitarFoto(id, presupuestoId))}
            className="h-11 rounded-[10px] px-3 font-semibold text-danger active:bg-danger-soft disabled:opacity-40"
          >
            Quitar
          </button>
        </div>
        {state.ok ? <p role="status" className="text-[13px] font-semibold text-ok">Guardado</p> : null}
        {state.error || error ? <p role="alert" className="text-[13px] font-semibold text-danger">{state.error ?? error}</p> : null}
      </form>
    </li>
  );
}

export function BorrarPresupuesto({ id }: { id: string }) {
  const [state, action] = useActionState<FormState, FormData>(borrarPresupuesto, {});
  return (
    <form
      action={action}
      onSubmit={(ev) => {
        if (!confirm("¿Borrar esta toma de datos y sus fotos? No se puede deshacer.")) ev.preventDefault();
      }}
      className="space-y-3"
    >
      <Aviso error={state.error} />
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="danger" pendingText="Borrando…">
        Borrar toma de datos
      </SubmitButton>
    </form>
  );
}
