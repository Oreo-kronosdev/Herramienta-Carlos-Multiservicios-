-- Fase 2: agenda (citas y fechas límite por obra y persona) y suscripciones push.

create type public.tipo_evento as enum ('cita', 'fecha_limite');

create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (length(trim(titulo)) > 0),
  tipo public.tipo_evento not null default 'cita',
  fecha date not null,
  hora time,
  obra_id uuid references public.obras (id) on delete cascade,
  notas text,
  avisar_dias smallint not null default 1 check (avisar_dias in (0, 1, 2, 3, 7)),
  fecha_aviso date generated always as (fecha - avisar_dias) stored,
  created_at timestamptz not null default now()
);
create index eventos_fecha_aviso_idx on public.eventos (fecha_aviso);
create index eventos_obra_id_idx on public.eventos (obra_id);
create index eventos_fecha_idx on public.eventos (fecha);

create table public.evento_personas (
  evento_id uuid not null references public.eventos (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  avisado_at timestamptz,
  primary key (evento_id, user_id)
);
create index evento_personas_user_id_idx on public.evento_personas (user_id);

create table public.push_suscripciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index push_suscripciones_user_id_idx on public.push_suscripciones (user_id);

-- Si la cita cambia de fecha o de antelación, se vuelve a avisar.
create function private.rearmar_aviso() returns trigger
language plpgsql set search_path = ''
as $$
begin
  update public.evento_personas set avisado_at = null where evento_id = new.id;
  return new;
end;
$$;
create trigger eventos_rearmar_aviso
  after update of fecha, avisar_dias on public.eventos
  for each row
  when (old.fecha is distinct from new.fecha or old.avisar_dias is distinct from new.avisar_dias)
  execute function private.rearmar_aviso();

alter table public.eventos enable row level security;
alter table public.evento_personas enable row level security;
alter table public.push_suscripciones enable row level security;
revoke all on public.eventos, public.evento_personas, public.push_suscripciones from anon;
grant select, insert, update, delete
  on public.eventos, public.evento_personas, public.push_suscripciones to authenticated;

-- eventos
create policy "jefe gestiona eventos" on public.eventos
  for all to authenticated
  using ((select private.es_jefe())) with check ((select private.es_jefe()));
create policy "trabajador ve sus eventos" on public.eventos
  for select to authenticated
  using (
    (select private.es_activo()) and exists (
      select 1 from public.evento_personas ep
      where ep.evento_id = eventos.id and ep.user_id = (select auth.uid())
    )
  );

-- evento_personas
create policy "jefe gestiona personas de eventos" on public.evento_personas
  for all to authenticated
  using ((select private.es_jefe())) with check ((select private.es_jefe()));
create policy "trabajador ve sus asignaciones de eventos" on public.evento_personas
  for select to authenticated
  using ((select private.es_activo()) and user_id = (select auth.uid()));

-- push_suscripciones: cada uno las suyas (ni el jefe ve las de otros)
create policy "cada uno ve sus suscripciones" on public.push_suscripciones
  for select to authenticated
  using ((select private.es_activo()) and user_id = (select auth.uid()));
create policy "cada uno guarda sus suscripciones" on public.push_suscripciones
  for insert to authenticated
  with check ((select private.es_activo()) and user_id = (select auth.uid()));
create policy "cada uno actualiza sus suscripciones" on public.push_suscripciones
  for update to authenticated
  using ((select private.es_activo()) and user_id = (select auth.uid()))
  with check ((select private.es_activo()) and user_id = (select auth.uid()));
create policy "cada uno borra sus suscripciones" on public.push_suscripciones
  for delete to authenticated
  using (user_id = (select auth.uid()));

revoke execute on function private.rearmar_aviso() from public, anon, authenticated;
