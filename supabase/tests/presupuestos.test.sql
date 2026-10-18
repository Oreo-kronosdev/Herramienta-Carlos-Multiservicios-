-- RLS de los documentos de presupuesto y de sus fotos en Storage.
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (id, email, aud, role) values
  ('16000000-0000-0000-0000-000000000001', 't7-j@usuarios.local', 'authenticated', 'authenticated'),
  ('16000000-0000-0000-0000-00000000000a', 't7-a@usuarios.local', 'authenticated', 'authenticated'),
  ('16000000-0000-0000-0000-00000000000b', 't7-b@usuarios.local', 'authenticated', 'authenticated');
insert into public.profiles (id, username, nombre, rol) values
  ('16000000-0000-0000-0000-000000000001', 't7-j', 'J', 'jefe'),
  ('16000000-0000-0000-0000-00000000000a', 't7-a', 'A', 'trabajador'),
  ('16000000-0000-0000-0000-00000000000b', 't7-b', 'B', 'trabajador');
insert into public.clientes (id, nombre) values ('26000000-0000-0000-0000-000000000001', 'C');
insert into public.obras (id, cliente_id, titulo, direccion, tipo_trabajo) values
  ('36000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000001', 'O1', 'D', 'tejado'),
  ('36000000-0000-0000-0000-000000000002', '26000000-0000-0000-0000-000000000001', 'O2', 'D', 'tejado');
insert into public.obra_trabajadores (obra_id, user_id) values
  ('36000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-00000000000a'),
  ('36000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-00000000000b'),
  ('36000000-0000-0000-0000-000000000002', '16000000-0000-0000-0000-00000000000b');
-- P1 en O1 (lo hizo B), P2 en O2
insert into public.presupuestos (id, obra_id, autor_id) values
  ('46000000-0000-0000-0000-000000000001', '36000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-00000000000b'),
  ('46000000-0000-0000-0000-000000000002', '36000000-0000-0000-0000-000000000002', '16000000-0000-0000-0000-00000000000b');
insert into public.presupuesto_medidas (presupuesto_id, concepto, cantidad, unidad) values
  ('46000000-0000-0000-0000-000000000002', 'Ajena', 3, 'm');
insert into storage.objects (bucket_id, name) values
  ('presupuestos', '46000000-0000-0000-0000-000000000002/ajena.jpg');

create temp view t_p with (security_invoker = true) as
  select * from public.presupuestos where id::text like '46000000-%';
create temp view t_m with (security_invoker = true) as
  select m.* from public.presupuesto_medidas m where presupuesto_id::text like '46000000-%';
create temp view t_obj with (security_invoker = true) as
  select * from storage.objects where bucket_id = 'presupuestos' and name like '46000000-%';
grant select on t_p, t_m, t_obj to authenticated;

select is((select public from storage.buckets where id = 'presupuestos'), false, 'el bucket es privado');

-- ===== A (asignado solo a O1) =====
set local role authenticated;
set local request.jwt.claims = '{"sub":"16000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select is((select count(*) from t_p), 1::bigint, 'A ve el de su obra aunque lo hiciera otro');
select lives_ok($$insert into public.presupuestos (id, obra_id, autor_id) values
  ('46000000-0000-0000-0000-000000000003', '36000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-00000000000a')$$,
  'A crea en su obra');
select throws_ok($$insert into public.presupuestos (obra_id, autor_id) values
  ('36000000-0000-0000-0000-000000000002', '16000000-0000-0000-0000-00000000000a')$$, '42501', null, 'A no crea en otra obra');
select lives_ok($$insert into public.presupuesto_medidas (presupuesto_id, concepto, cantidad, unidad)
  values ('46000000-0000-0000-0000-000000000001', 'Canalón', 12.5, 'ml')$$, 'A añade medidas al de su obra');
select throws_ok($$insert into public.presupuesto_medidas (presupuesto_id, concepto, cantidad, unidad)
  values ('46000000-0000-0000-0000-000000000002', 'x', 1, 'm')$$, '42501', null, 'A no añade medidas a uno ajeno');
select is((select count(*) from t_m), 1::bigint, 'A solo ve medidas de su obra');
select lives_ok($$insert into storage.objects (bucket_id, name) values
  ('presupuestos', '46000000-0000-0000-0000-000000000001/foto.jpg')$$, 'A sube una foto al de su obra');
select throws_ok($$insert into storage.objects (bucket_id, name) values
  ('presupuestos', '46000000-0000-0000-0000-000000000002/intruso.jpg')$$, '42501', null, 'A no sube fotos a uno ajeno');
select throws_ok($$insert into storage.objects (bucket_id, name) values
  ('presupuestos', 'no-es-un-id/foto.jpg')$$, '42501', null, 'una ruta inventada se rechaza');
select is((select count(*) from t_obj where name like '46000000-0000-0000-0000-000000000002/%'), 0::bigint,
  'A no ve fotos de uno ajeno');
select is((select count(*) from t_obj where name like '46000000-0000-0000-0000-000000000001/%'), 1::bigint,
  'A ve las fotos del suyo');

-- ===== A desactivado =====
reset role;
update public.profiles set activo = false where id = '16000000-0000-0000-0000-00000000000a';
set local role authenticated;
set local request.jwt.claims = '{"sub":"16000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select is((select count(*) from t_p), 0::bigint, 'A desactivado no ve presupuestos');
select is((select count(*) from t_obj), 0::bigint, 'ni fotos');

-- ===== Jefe =====
set local request.jwt.claims = '{"sub":"16000000-0000-0000-0000-000000000001","role":"authenticated"}';
select is((select count(*) from t_p), 3::bigint, 'J ve todos');
select is((select count(*) from t_obj), 2::bigint, 'J ve todas las fotos');

set local role anon;
select throws_ok($$select count(*) from public.presupuestos$$, '42501', null, 'anon no accede');

select * from finish();
rollback;
