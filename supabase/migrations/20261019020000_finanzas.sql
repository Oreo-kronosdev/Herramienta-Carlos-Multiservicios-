-- Fase 5: finanzas básicas (solo el jefe).
create type public.tipo_movimiento as enum ('ingreso', 'gasto');

create table public.facturas (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique check (length(trim(numero)) > 0),
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  obra_id uuid references public.obras (id) on delete set null,
  concepto text not null check (length(trim(concepto)) > 0),
  importe numeric(12, 2) not null check (importe > 0),
  fecha_emision date not null,
  fecha_vencimiento date check (fecha_vencimiento is null or fecha_vencimiento >= fecha_emision),
  pagada boolean not null default false,
  pagada_en date,
  created_at timestamptz not null default now()
);
create index facturas_pagada_idx on public.facturas (pagada);
create index facturas_cliente_id_idx on public.facturas (cliente_id);
create index facturas_obra_id_idx on public.facturas (obra_id);

create table public.movimientos (
  id uuid primary key default gen_random_uuid(),
  tipo public.tipo_movimiento not null,
  concepto text not null check (length(trim(concepto)) > 0),
  importe numeric(12, 2) not null check (importe > 0),
  fecha date not null,
  obra_id uuid references public.obras (id) on delete set null,
  factura_id uuid unique references public.facturas (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index movimientos_fecha_idx on public.movimientos (fecha);
create index movimientos_obra_id_idx on public.movimientos (obra_id);

alter table public.facturas enable row level security;
alter table public.movimientos enable row level security;
revoke all on public.facturas, public.movimientos from anon;
grant select, insert, update, delete on public.facturas, public.movimientos to authenticated;

create policy "solo el jefe ve y gestiona facturas" on public.facturas
  for all to authenticated
  using ((select private.es_jefe())) with check ((select private.es_jefe()));
create policy "solo el jefe ve y gestiona movimientos" on public.movimientos
  for all to authenticated
  using ((select private.es_jefe())) with check ((select private.es_jefe()));

-- Cobrar una factura crea su ingreso en la misma transacción; desmarcarla lo borra.
-- security invoker: se aplica la RLS del jefe; además se rechaza explícitamente a cualquier otro.
create function public.marcar_factura(p_factura uuid, p_pagada boolean, p_fecha date)
returns void
language plpgsql security invoker set search_path = ''
as $$
declare f record;
begin
  if not private.es_jefe() then
    raise exception 'No autorizado';
  end if;
  select fa.*, c.nombre as cliente into f
  from public.facturas fa join public.clientes c on c.id = fa.cliente_id
  where fa.id = p_factura;
  if not found then
    raise exception 'Factura no encontrada';
  end if;
  if p_pagada and f.pagada then
    return; -- ya cobrada (doble pulsación u otra pestaña): no se cambia la fecha ni el ingreso
  elsif p_pagada then
    update public.facturas set pagada = true, pagada_en = coalesce(p_fecha, pagada_en, current_date) where id = p_factura;
    insert into public.movimientos (tipo, concepto, importe, fecha, obra_id, factura_id)
    values ('ingreso', 'Factura ' || f.numero || ' · ' || f.cliente, f.importe, coalesce(p_fecha, current_date), f.obra_id, p_factura)
    on conflict (factura_id) do nothing;
  else
    update public.facturas set pagada = false, pagada_en = null where id = p_factura;
    delete from public.movimientos where factura_id = p_factura;
  end if;
end;
$$;
revoke execute on function public.marcar_factura(uuid, boolean, date) from public, anon;
grant execute on function public.marcar_factura(uuid, boolean, date) to authenticated;

-- Si se corrige una factura ya cobrada, su ingreso se actualiza.
create function private.sincronizar_ingreso() returns trigger
language plpgsql set search_path = ''
as $$
begin
  update public.movimientos m
  set importe = new.importe,
      obra_id = new.obra_id,
      concepto = 'Factura ' || new.numero || ' · ' || (select nombre from public.clientes where id = new.cliente_id)
  where m.factura_id = new.id;
  return new;
end;
$$;
create trigger facturas_sincronizar_ingreso
  after update of importe, numero, cliente_id, obra_id on public.facturas
  for each row when (new.pagada)
  execute function private.sincronizar_ingreso();
revoke execute on function private.sincronizar_ingreso() from public, anon, authenticated;
