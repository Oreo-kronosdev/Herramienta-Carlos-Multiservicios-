-- Fase 4: checklist de material y herramientas por obra.
create type public.tipo_checklist as enum ('material', 'herramienta');

create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id) on delete cascade,
  texto text not null check (length(trim(texto)) between 1 and 120),
  tipo public.tipo_checklist not null,
  preparado boolean not null default false,
  created_at timestamptz not null default now()
);
create index checklist_items_obra_id_idx on public.checklist_items (obra_id);

alter table public.checklist_items enable row level security;
revoke all on public.checklist_items from anon;
grant select, insert, update, delete on public.checklist_items to authenticated;

create function private.en_obra(p_obra uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.es_jefe() or (
    private.es_activo() and exists (
      select 1 from public.obra_trabajadores where obra_id = p_obra and user_id = (select auth.uid())
    )
  );
$$;
revoke execute on function private.en_obra(uuid) from public, anon;
grant execute on function private.en_obra(uuid) to authenticated;

create policy "jefe gestiona checklist" on public.checklist_items
  for all to authenticated
  using ((select private.es_jefe())) with check ((select private.es_jefe()));
create policy "trabajador ve el checklist de sus obras" on public.checklist_items
  for select to authenticated
  using (private.en_obra(obra_id));

-- Quien va a la obra marca lo preparado y reinicia la lista; no cambia ni borra elementos.
create function public.marcar_preparado(p_item uuid, p_preparado boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_obra uuid;
begin
  select obra_id into v_obra from public.checklist_items where id = p_item;
  if v_obra is null or not private.en_obra(v_obra) then
    raise exception 'No autorizado';
  end if;
  update public.checklist_items set preparado = p_preparado where id = p_item;
end;
$$;

create function public.reiniciar_checklist(p_obra uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.en_obra(p_obra) then
    raise exception 'No autorizado';
  end if;
  update public.checklist_items set preparado = false where obra_id = p_obra;
end;
$$;
revoke execute on function public.marcar_preparado(uuid, boolean), public.reiniciar_checklist(uuid) from public, anon;
grant execute on function public.marcar_preparado(uuid, boolean), public.reiniciar_checklist(uuid) to authenticated;
