-- RLS y cobro de facturas (solo el jefe).
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users (id, email, aud, role) values
  ('15000000-0000-0000-0000-000000000001', 't6-j@usuarios.local', 'authenticated', 'authenticated'),
  ('15000000-0000-0000-0000-00000000000a', 't6-a@usuarios.local', 'authenticated', 'authenticated');
insert into public.profiles (id, username, nombre, rol) values
  ('15000000-0000-0000-0000-000000000001', 't6-j', 'J', 'jefe'),
  ('15000000-0000-0000-0000-00000000000a', 't6-a', 'A', 'trabajador');
insert into public.clientes (id, nombre) values ('25000000-0000-0000-0000-000000000001', 'Cliente F');
insert into public.obras (id, cliente_id, titulo, direccion, tipo_trabajo) values
  ('35000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000001', 'OF', 'D', 'tejado');
insert into public.facturas (id, numero, cliente_id, obra_id, concepto, importe, fecha_emision) values
  ('45000000-0000-0000-0000-000000000001', 'T-001', '25000000-0000-0000-0000-000000000001', '35000000-0000-0000-0000-000000000001', 'Tejado', 1210, '2030-03-01');
insert into public.movimientos (id, tipo, concepto, importe, fecha, obra_id) values
  ('55000000-0000-0000-0000-000000000001', 'gasto', 'Tejas', 300, '2030-03-02', '35000000-0000-0000-0000-000000000001');
create temp view t_ingresos with (security_invoker = true) as
  select * from public.movimientos where factura_id = '45000000-0000-0000-0000-000000000001';
grant select on t_ingresos to authenticated;

-- ===== Trabajador =====
set local role authenticated;
set local request.jwt.claims = '{"sub":"15000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select is((select count(*) from public.movimientos where id::text like '55000000-%'), 0::bigint, 'A no ve movimientos');
select is((select count(*) from public.facturas where id::text like '45000000-%'), 0::bigint, 'A no ve facturas');
select throws_ok($$insert into public.movimientos (tipo, concepto, importe, fecha) values ('gasto', 'x', 1, '2030-03-03')$$,
  '42501', null, 'A no crea movimientos');
select throws_ok($$select public.marcar_factura('45000000-0000-0000-0000-000000000001', true, '2030-03-10')$$,
  'P0001', 'No autorizado', 'A no cobra facturas');

-- ===== Jefe =====
set local request.jwt.claims = '{"sub":"15000000-0000-0000-0000-000000000001","role":"authenticated"}';
select lives_ok($$select public.marcar_factura('45000000-0000-0000-0000-000000000001', true, '2030-03-10')$$, 'J cobra la factura');
select is((select count(*) from t_ingresos), 1::bigint, 'se crea un ingreso');
select is((select importe || '|' || fecha || '|' || tipo from t_ingresos), '1210.00|2030-03-10|ingreso', 'con importe, fecha y tipo');
select lives_ok($$select public.marcar_factura('45000000-0000-0000-0000-000000000001', true, '2030-03-11')$$, 'cobrarla otra vez no falla');
select is((select count(*) from t_ingresos), 1::bigint, 'y no duplica el ingreso');
select is((select pagada_en from public.facturas where id = '45000000-0000-0000-0000-000000000001'), '2030-03-10'::date,
  'cobrarla otra vez no cambia la fecha de cobro');
select is((select fecha from t_ingresos), '2030-03-10'::date, 'y el ingreso sigue con la misma fecha');
update public.facturas set importe = 1500 where id = '45000000-0000-0000-0000-000000000001';
select is((select importe from t_ingresos), 1500.00::numeric, 'cambiar el importe actualiza el ingreso');
select lives_ok($$select public.marcar_factura('45000000-0000-0000-0000-000000000001', false, null)$$, 'J la desmarca');
select is((select count(*) from t_ingresos), 0::bigint, 'el ingreso desaparece');
select is((select pagada_en from public.facturas where id = '45000000-0000-0000-0000-000000000001'), null::date, 'sin fecha de cobro');

-- Borrar la obra conserva factura y movimiento sin obra
delete from public.obras where id = '35000000-0000-0000-0000-000000000001';
select is((select count(*) from public.facturas where id = '45000000-0000-0000-0000-000000000001' and obra_id is null)
  + (select count(*) from public.movimientos where id = '55000000-0000-0000-0000-000000000001' and obra_id is null),
  2::bigint, 'borrar la obra conserva factura y gasto sin obra');
select throws_ok($$delete from public.clientes where id = '25000000-0000-0000-0000-000000000001'$$,
  '23503', null, 'un cliente con facturas no se borra');

set local role anon;
select throws_ok($$select count(*) from public.facturas$$, '42501', null, 'anon no accede');

select * from finish();
rollback;
