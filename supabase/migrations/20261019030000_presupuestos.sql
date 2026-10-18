-- Fase 6: documento de presupuesto (toma de datos con medidas, materiales y fotos).
create type public.unidad_medida as enum ('m', 'm2', 'm3', 'ml', 'ud', 'kg', 'l');

create table public.presupuestos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id) on delete cascade,
  autor_id uuid references public.profiles (id) on delete set null,
  titulo text not null default 'Toma de datos' check (length(trim(titulo)) > 0),
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index presupuestos_obra_id_idx on public.presupuestos (obra_id);

create table public.presupuesto_medidas (
  id uuid primary key default gen_random_uuid(),
  presupuesto_id uuid not null references public.presupuestos (id) on delete cascade,
  concepto text not null check (length(trim(concepto)) > 0),
  cantidad numeric(12, 2) not null check (cantidad > 0),
  unidad public.unidad_medida not null,
  created_at timestamptz not null default now()
);
create index presupuesto_medidas_presupuesto_id_idx on public.presupuesto_medidas (presupuesto_id);

create table public.presupuesto_materiales (
  id uuid primary key default gen_random_uuid(),
  presupuesto_id uuid not null references public.presupuestos (id) on delete cascade,
  material text not null check (length(trim(material)) > 0),
  cantidad numeric(12, 2) not null check (cantidad > 0),
  unidad public.unidad_medida not null,
  created_at timestamptz not null default now()
);
create index presupuesto_materiales_presupuesto_id_idx on public.presupuesto_materiales (presupuesto_id);

create table public.presupuesto_fotos (
  id uuid primary key default gen_random_uuid(),
  presupuesto_id uuid not null references public.presupuestos (id) on delete cascade,
  path text not null unique,
  pie text,
  created_at timestamptz not null default now()
);
create index presupuesto_fotos_presupuesto_id_idx on public.presupuesto_fotos (presupuesto_id);

-- Quién puede ver/editar un presupuesto: el jefe o quien trabaja en su obra (private.en_obra, fase 4).
create function private.puede_ver_presupuesto(p uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select private.en_obra(obra_id) from public.presupuestos where id = p), false);
$$;

-- Para Storage: la primera carpeta de la ruta es el id del presupuesto. Si no es un uuid, no.
create function private.puede_ver_ruta(nombre text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when split_part(nombre, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then private.puede_ver_presupuesto(split_part(nombre, '/', 1)::uuid)
    else false
  end;
$$;
revoke execute on function private.puede_ver_presupuesto(uuid), private.puede_ver_ruta(text) from public, anon;
grant execute on function private.puede_ver_presupuesto(uuid), private.puede_ver_ruta(text) to authenticated;

-- Máximo 20 fotos por presupuesto
create function private.limite_fotos() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if (select count(*) from public.presupuesto_fotos where presupuesto_id = new.presupuesto_id) >= 20 then
    raise exception 'Máximo 20 fotos por presupuesto';
  end if;
  return new;
end;
$$;
create trigger presupuesto_fotos_limite before insert on public.presupuesto_fotos
  for each row execute function private.limite_fotos();
revoke execute on function private.limite_fotos() from public, anon, authenticated;

alter table public.presupuestos enable row level security;
alter table public.presupuesto_medidas enable row level security;
alter table public.presupuesto_materiales enable row level security;
alter table public.presupuesto_fotos enable row level security;
revoke all on public.presupuestos, public.presupuesto_medidas, public.presupuesto_materiales, public.presupuesto_fotos from anon;
grant select, insert, update, delete
  on public.presupuestos, public.presupuesto_medidas, public.presupuesto_materiales, public.presupuesto_fotos to authenticated;

create policy "presupuestos de mis obras" on public.presupuestos
  for all to authenticated
  using (private.en_obra(obra_id)) with check (private.en_obra(obra_id));
create policy "medidas de presupuestos de mis obras" on public.presupuesto_medidas
  for all to authenticated
  using (private.puede_ver_presupuesto(presupuesto_id)) with check (private.puede_ver_presupuesto(presupuesto_id));
create policy "materiales de presupuestos de mis obras" on public.presupuesto_materiales
  for all to authenticated
  using (private.puede_ver_presupuesto(presupuesto_id)) with check (private.puede_ver_presupuesto(presupuesto_id));
create policy "fotos de presupuestos de mis obras" on public.presupuesto_fotos
  for all to authenticated
  using (private.puede_ver_presupuesto(presupuesto_id)) with check (private.puede_ver_presupuesto(presupuesto_id));

-- Bucket privado para las fotos (máx. 5 MB tras comprimir, solo imágenes).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('presupuestos', 'presupuestos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create policy "presupuestos: ver fotos" on storage.objects
  for select to authenticated
  using (bucket_id = 'presupuestos' and private.puede_ver_ruta(name));
create policy "presupuestos: subir fotos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'presupuestos' and private.puede_ver_ruta(name));
create policy "presupuestos: cambiar fotos" on storage.objects
  for update to authenticated
  using (bucket_id = 'presupuestos' and private.puede_ver_ruta(name))
  with check (bucket_id = 'presupuestos' and private.puede_ver_ruta(name));
create policy "presupuestos: borrar fotos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'presupuestos' and private.puede_ver_ruta(name));
