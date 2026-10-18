export function Aviso({ ok, error }: { ok?: string; error?: string }) {
  if (error)
    return (
      <p role="alert" className="rounded-[10px] bg-danger-soft px-3.5 py-3 font-medium text-danger">
        {error}
      </p>
    );
  if (ok)
    return (
      <p role="status" className="rounded-[10px] bg-ok-soft px-3.5 py-3 font-medium text-ok">
        {ok}
      </p>
    );
  return null;
}
