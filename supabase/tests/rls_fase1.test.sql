-- Pruebas de seguridad (RLS) de la fase 1. Crea sus propios datos y lo deshace todo al final.
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

-- J = jefe, A y B = trabajadores
insert into auth.users (id, email, aud, role) values
  ('10000000-0000-0000-0000-000000000001', 'test-j@usuarios.local', 'authenticated', 'authenticated'),
  ('10000000-0000-0000-0000-00000000000a', 'test-a@usuarios.local', 'authenticated', 'authenticated'),
  ('10000000-0000-0000-0000-00000000000b', 'test-b@usuarios.local', 'authenticated', 'authenticated');
insert into public.profiles (id, username, nombre, rol) values
  ('10000000-0000-0000-0000-000000000001', 'test-j', 'Jefe', 'jefe'),
  ('10000000-0000-0000-0000-00000000000a', 'test-a', 'Trabajador A', 'trabajador'),
  ('10000000-0000-0000-0000-00000000000b', 'test-b', 'Trabajador B', 'trabajador');
insert into public.clientes (id, nombre) values
  ('20000000-0000-0000-0000-000000000001', 'Cliente 1'),
  ('20000000-0000-0000-0000-000000000002', 'Cliente 2');
insert into public.obras (id, cliente_id, titulo, direccion, tipo_trabajo, presupuesto) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Obra 1', 'C/ Uno 1', 'canalones', 1250.50),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Obra 2', 'C/ Dos 2', 'tejado', 900);
insert into public.obra_trabajadores (obra_id, user_id) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-00000000000a'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-00000000000b');

-- Solo los datos de prueba (por si hay seed en la base)
create temp view t_obras with (security_invoker = true) as select * from public.obras where id::text like '30000000-%';
create temp view t_clientes with (security_invoker = true) as select * from public.clientes where id::text like '20000000-%';
create temp view t_profiles with (security_invoker = true) as select * from public.profiles where username like 'test-%';
grant select on t_obras, t_clientes, t_profiles to authenticated, anon;

-- ===== Trabajador A =====
set local role authenticated;
set local request.jwt.claims = '{"sub":"10000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select is((select count(*) from t_obras), 1::bigint, 'A ve solo su obra');
select is((select presupuesto from t_obras), 1250.50::numeric, 'A ve el presupuesto de su obra');
select is((select count(*) from t_clientes), 1::bigint, 'A ve solo el cliente de su obra');
select is((select count(*) from t_profiles), 1::bigint, 'A ve solo su perfil');
select throws_ok(
  $$insert into public.clientes (nombre) values ('Intruso')$$,
  '42501', null, 'A no puede crear clientes');

update public.obras set titulo = 'x' where id = '30000000-0000-0000-0000-000000000001';
select is((select titulo from t_obras), 'Obra 1', 'A no puede editar campos de la obra');

update public.profiles set rol = 'jefe' where id = '10000000-0000-0000-0000-00000000000a';
select is((select rol::text from t_profiles), 'trabajador', 'A no puede ascenderse a jefe');

select lives_ok(
  $$select public.cambiar_estado_obra('30000000-0000-0000-0000-000000000001', 'en_curso')$$,
  'A puede cambiar el estado de su obra');
select is((select estado::text from t_obras), 'en_curso', 'el estado de su obra cambió');
select is((select titulo || '|' || presupuesto from t_obras), 'Obra 1|1250.50', 'el resto de la obra sigue igual');
select throws_ok(
  $$select public.cambiar_estado_obra('30000000-0000-0000-0000-000000000002', 'terminada')$$,
  'P0001', 'No autorizado', 'A no puede cambiar el estado de una obra ajena');

-- ===== A desactivado =====
reset role;
update public.profiles set activo = false where id = '10000000-0000-0000-0000-00000000000a';
set local role authenticated;
set local request.jwt.claims = '{"sub":"10000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select is((select count(*) from t_obras), 0::bigint, 'A desactivado no ve obras');
select is((select count(*) from t_clientes), 0::bigint, 'A desactivado no ve clientes');
select throws_ok(
  $$select public.cambiar_estado_obra('30000000-0000-0000-0000-000000000001', 'terminada')$$,
  'P0001', 'No autorizado', 'A desactivado no puede cambiar estados');

-- ===== Jefe =====
set local request.jwt.claims = '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}';
select is((select count(*) from t_obras), 2::bigint, 'J ve todas las obras');
select is((select count(*) from t_clientes), 2::bigint, 'J ve todos los clientes');
select is((select count(*) from t_profiles), 3::bigint, 'J ve todos los perfiles');
select lives_ok($$insert into public.clientes (nombre) values ('Nuevo')$$, 'J puede crear clientes');
select lives_ok(
  $$select public.cambiar_estado_obra('30000000-0000-0000-0000-000000000002', 'terminada')$$,
  'J puede cambiar el estado de cualquier obra');
select throws_ok(
  $$delete from public.clientes where id = '20000000-0000-0000-0000-000000000001'$$,
  '23503', null, 'no se puede borrar un cliente con obras');

-- ===== Sin sesión =====
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$select count(*) from public.obras$$, '42501', null, 'anon no tiene acceso a obras');

select * from finish();
rollback;
