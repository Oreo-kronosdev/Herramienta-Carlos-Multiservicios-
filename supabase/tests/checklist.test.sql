-- RLS del checklist de material y herramientas por obra.
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users (id, email, aud, role) values
  ('14000000-0000-0000-0000-000000000001', 't5-j@usuarios.local', 'authenticated', 'authenticated'),
  ('14000000-0000-0000-0000-00000000000a', 't5-a@usuarios.local', 'authenticated', 'authenticated');
insert into public.profiles (id, username, nombre, rol) values
  ('14000000-0000-0000-0000-000000000001', 't5-j', 'J', 'jefe'),
  ('14000000-0000-0000-0000-00000000000a', 't5-a', 'A', 'trabajador');
insert into public.clientes (id, nombre) values ('24000000-0000-0000-0000-000000000001', 'C');
insert into public.obras (id, cliente_id, titulo, direccion, tipo_trabajo) values
  ('34000000-0000-0000-0000-000000000001', '24000000-0000-0000-0000-000000000001', 'O1', 'D', 'tejado'),
  ('34000000-0000-0000-0000-000000000002', '24000000-0000-0000-0000-000000000001', 'O2', 'D', 'tejado');
insert into public.obra_trabajadores (obra_id, user_id) values
  ('34000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-00000000000a');
insert into public.checklist_items (id, obra_id, texto, tipo, preparado) values
  ('44000000-0000-0000-0000-000000000001', '34000000-0000-0000-0000-000000000001', 'Silicona', 'material', false),
  ('44000000-0000-0000-0000-000000000002', '34000000-0000-0000-0000-000000000001', 'Escalera', 'herramienta', true),
  ('44000000-0000-0000-0000-000000000003', '34000000-0000-0000-0000-000000000002', 'Arnés', 'herramienta', true);
create temp view t_items with (security_invoker = true) as
  select * from public.checklist_items where id::text like '44000000-%';
grant select on t_items to authenticated;

set local role authenticated;
set local request.jwt.claims = '{"sub":"14000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select is((select count(*) from t_items), 2::bigint, 'A ve solo los de su obra');
select lives_ok($$select public.marcar_preparado('44000000-0000-0000-0000-000000000001', true)$$, 'A marca uno de su obra');
select ok((select preparado from t_items where texto = 'Silicona'), 'queda preparado');
select throws_ok($$select public.marcar_preparado('44000000-0000-0000-0000-000000000003', false)$$,
  'P0001', 'No autorizado', 'A no marca los de otra obra');
update public.checklist_items set texto = 'hack' where id = '44000000-0000-0000-0000-000000000001';
select is((select texto from t_items where id = '44000000-0000-0000-0000-000000000001'), 'Silicona', 'A no cambia el texto');
select throws_ok($$insert into public.checklist_items (obra_id, texto, tipo) values ('34000000-0000-0000-0000-000000000001', 'x', 'material')$$,
  '42501', null, 'A no añade elementos');
delete from public.checklist_items where id = '44000000-0000-0000-0000-000000000002';
select is((select count(*) from t_items where id = '44000000-0000-0000-0000-000000000002'), 1::bigint, 'A no borra elementos');
select lives_ok($$select public.reiniciar_checklist('34000000-0000-0000-0000-000000000001')$$, 'A reinicia su obra');
select is((select count(*) from t_items where obra_id = '34000000-0000-0000-0000-000000000001' and preparado), 0::bigint, 'todo desmarcado en O1');
select throws_ok($$select public.reiniciar_checklist('34000000-0000-0000-0000-000000000002')$$,
  'P0001', 'No autorizado', 'A no reinicia otra obra');

reset role;
select ok((select preparado from public.checklist_items where id = '44000000-0000-0000-0000-000000000003'), 'O2 sigue igual');
update public.profiles set activo = false where id = '14000000-0000-0000-0000-00000000000a';
set local role authenticated;
set local request.jwt.claims = '{"sub":"14000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select is((select count(*) from t_items), 0::bigint, 'A desactivado no ve nada');
select throws_ok($$select public.marcar_preparado('44000000-0000-0000-0000-000000000001', true)$$,
  'P0001', 'No autorizado', 'A desactivado no marca');
select throws_ok($$select public.reiniciar_checklist('34000000-0000-0000-0000-000000000001')$$,
  'P0001', 'No autorizado', 'A desactivado no reinicia');

set local request.jwt.claims = '{"sub":"14000000-0000-0000-0000-000000000001","role":"authenticated"}';
select is((select count(*) from t_items), 3::bigint, 'J ve todo');
select lives_ok($$insert into public.checklist_items (id, obra_id, texto, tipo)
  values ('44000000-0000-0000-0000-000000000009', '34000000-0000-0000-0000-000000000002', 'Cinta', 'material')$$, 'J añade');
delete from public.checklist_items where id = '44000000-0000-0000-0000-000000000009';
select is((select count(*) from t_items where id = '44000000-0000-0000-0000-000000000009'), 0::bigint, 'J borra');

set local role anon;
select throws_ok($$select count(*) from public.checklist_items$$, '42501', null, 'anon no accede');

select * from finish();
rollback;
