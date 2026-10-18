-- Fase 3: tareas por persona.
create table public.tareas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (length(trim(titulo)) > 0),
  notas text,
  fecha_limite date,
  obra_id uuid references public.obras (id) on delete cascade,
  asignada_a uuid not null references public.profiles (id) on delete cascade,
  hecha boolean not null default false,
  hecha_at timestamptz,
  created_at timestamptz not null default now()
);
create index tareas_asignada_a_idx on public.tareas (asignada_a);
create index tareas_obra_id_idx on public.tareas (obra_id);
create index tareas_hecha_fecha_idx on public.tareas (hecha, fecha_limite);

alter table public.tareas enable row level security;
revoke all on public.tareas from anon;
grant select, insert, update, delete on public.tareas to authenticated;

create policy "jefe gestiona tareas" on public.tareas
  for all to authenticated
  using ((select private.es_jefe())) with check ((select private.es_jefe()));
create policy "trabajador ve sus tareas" on public.tareas
  for select to authenticated
  using ((select private.es_activo()) and asignada_a = (select auth.uid()));

-- El trabajador solo marca/desmarca las suyas (no cambia nada más).
create function public.marcar_tarea(p_tarea uuid, p_hecha boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not (
    private.es_jefe() or (
      private.es_activo() and exists (
        select 1 from public.tareas where id = p_tarea and asignada_a = (select auth.uid())
      )
    )
  ) then
    raise exception 'No autorizado';
  end if;
  update public.tareas
  set hecha = p_hecha, hecha_at = case when p_hecha then now() end
  where id = p_tarea;
end;
$$;
revoke execute on function public.marcar_tarea(uuid, boolean) from public, anon;
grant execute on function public.marcar_tarea(uuid, boolean) to authenticated;
