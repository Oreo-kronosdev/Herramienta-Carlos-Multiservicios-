export function Cargando() {
  return (
    <div aria-busy="true" aria-label="Cargando" className="animate-pulse space-y-3">
      <div className="h-9 w-40 rounded-lg bg-line/70" />
      <div className="h-20 rounded-card bg-line/50" />
      <div className="h-20 rounded-card bg-line/50" />
    </div>
  );
}
