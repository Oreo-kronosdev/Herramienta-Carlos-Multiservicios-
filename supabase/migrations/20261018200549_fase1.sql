-- Fase 1: usuarios (perfiles), clientes, obras y asignaciones, con RLS.

create type public.rol_usuario as enum ('jefe', 'trabajador');
create type public.tipo_trabajo as enum
  ('reparacion', 'tejado', 'canalones', 'chimenea', 'pintura', 'trabajo_altura', 'otro');
create type public.estado_obra as enum
  ('pendiente', 'presupuestada', 'en_curso', 'terminada', 'cancelada');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9._-]{3,30}$'),
  nombre text not null check (length(trim(nombre)) > 0),
  rol public.rol_usuario not null default 'trabajador',
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) > 0),
  direccion text,
  administrador text,
  telefono text,
  created_at timestamptz not null default now()
);

create table public.obras (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  titulo text not null check (length(trim(titulo)) > 0),
  direccion text not null,
  tipo_trabajo public.tipo_trabajo not null,
  presupuesto numeric(12, 2) check (presupuesto >= 0),
  estado public.estado_obra not null default 'pendiente',
  created_at timestamptz not null default now()
);
create index obras_cliente_id_idx on public.obras (cliente_id);

create table public.obra_trabajadores (
  obra_id uuid not null references public.obras (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (obra_id, user_id)
);
create index obra_trabajadores_user_id_idx on public.obra_trabajadores (user_id);

-- Funciones auxiliares en un esquema que la API no expone.
create schema if not exists private;
grant usage on schema private to authenticated;

create function private.es_jefe() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and rol = 'jefe' and activo
  );
$$;

create function private.es_activo() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and activo
  );
$$;

revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- RLS en todas las tablas. Sin sesión (anon) no hay acceso.
alter table public.profiles enable row level security;
alter table public.clientes enable row level security;
alter table public.obras enable row level security;
alter table public.obra_trabajadores enable row level security;
revoke all on public.profiles, public.clientes, public.obras, public.obra_trabajadores from anon;

-- profiles: cada uno ve el suyo; el jefe ve todos. Altas y cambios solo por servidor (service role).
create policy "perfil propio o jefe" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select private.es_jefe()));

-- clientes
create policy "jefe gestiona clientes" on public.clientes
  for all to authenticated
  using ((select private.es_jefe())) with check ((select private.es_jefe()));
create policy "trabajador ve clientes de sus obras" on public.clientes
  for select to authenticated
  using (
    (select private.es_activo()) and exists (
      select 1 from public.obras o
      join public.obra_trabajadores ot on ot.obra_id = o.id
      where o.cliente_id = clientes.id and ot.user_id = (select auth.uid())
    )
  );

-- obras (el trabajador solo cambia el estado, con cambiar_estado_obra)
create policy "jefe gestiona obras" on public.obras
  for all to authenticated
  using ((select private.es_jefe())) with check ((select private.es_jefe()));
create policy "trabajador ve sus obras" on public.obras
  for select to authenticated
  using (
    (select private.es_activo()) and exists (
      select 1 from public.obra_trabajadores ot
      where ot.obra_id = obras.id and ot.user_id = (select auth.uid())
    )
  );

-- obra_trabajadores
create policy "jefe gestiona asignaciones" on public.obra_trabajadores
  for all to authenticated
  using ((select private.es_jefe())) with check ((select private.es_jefe()));
create policy "trabajador ve sus asignaciones" on public.obra_trabajadores
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Cambio de estado: jefe en cualquier obra; trabajador activo solo en las suyas.
create function public.cambiar_estado_obra(p_obra uuid, p_estado public.estado_obra)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not (
    private.es_jefe() or (
      private.es_activo() and exists (
        select 1 from public.obra_trabajadores
        where obra_id = p_obra and user_id = (select auth.uid())
      )
    )
  ) then
    raise exception 'No autorizado';
  end if;
  update public.obras set estado = p_estado where id = p_obra;
end;
$$;
revoke execute on function public.cambiar_estado_obra(uuid, public.estado_obra) from public, anon;
grant execute on function public.cambiar_estado_obra(uuid, public.estado_obra) to authenticated;
