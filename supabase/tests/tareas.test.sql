-- RLS de tareas por persona.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email, aud, role) values
  ('13000000-0000-0000-0000-000000000001', 't4-j@usuarios.local', 'authenticated', 'authenticated'),
  ('13000000-0000-0000-0000-00000000000a', 't4-a@usuarios.local', 'authenticated', 'authenticated'),
  ('13000000-0000-0000-0000-00000000000b', 't4-b@usuarios.local', 'authenticated', 'authenticated');
insert into public.profiles (id, username, nombre, rol) values
  ('13000000-0000-0000-0000-000000000001', 't4-j', 'J', 'jefe'),
  ('13000000-0000-0000-0000-00000000000a', 't4-a', 'A', 'trabajador'),
  ('13000000-0000-0000-0000-00000000000b', 't4-b', 'B', 'trabajador');
insert into public.tareas (id, titulo, asignada_a) values
  ('43000000-0000-0000-0000-000000000001', 'TA', '13000000-0000-0000-0000-00000000000a'),
  ('43000000-0000-0000-0000-000000000002', 'TB', '13000000-0000-0000-0000-00000000000b');
create temp view t_tareas with (security_invoker = true) as
  select * from public.tareas where id::text like '43000000-%';
grant select on t_tareas to authenticated;

set local role authenticated;
set local request.jwt.claims = '{"sub":"13000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select is((select count(*) from t_tareas), 1::bigint, 'A ve solo su tarea');
select throws_ok($$insert into public.tareas (titulo, asignada_a) values ('x', '13000000-0000-0000-0000-00000000000a')$$,
  '42501', null, 'A no crea tareas');
update public.tareas set titulo = 'hack' where id = '43000000-0000-0000-0000-000000000001';
select is((select titulo from t_tareas), 'TA', 'A no edita el título');
select lives_ok($$select public.marcar_tarea('43000000-0000-0000-0000-000000000001', true)$$, 'A marca la suya');
select ok((select hecha and hecha_at is not null from t_tareas), 'queda hecha con fecha');
select lives_ok($$select public.marcar_tarea('43000000-0000-0000-0000-000000000001', false)$$, 'A la desmarca');
select ok((select not hecha and hecha_at is null from t_tareas), 'vuelve a pendiente sin fecha');
select throws_ok($$select public.marcar_tarea('43000000-0000-0000-0000-000000000002', true)$$,
  'P0001', 'No autorizado', 'A no marca tareas ajenas');

reset role;
update public.profiles set activo = false where id = '13000000-0000-0000-0000-00000000000a';
set local role authenticated;
set local request.jwt.claims = '{"sub":"13000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select is((select count(*) from t_tareas), 0::bigint, 'A desactivado no ve tareas');
select throws_ok($$select public.marcar_tarea('43000000-0000-0000-0000-000000000001', true)$$,
  'P0001', 'No autorizado', 'A desactivado no marca');

set local request.jwt.claims = '{"sub":"13000000-0000-0000-0000-000000000001","role":"authenticated"}';
select is((select count(*) from t_tareas), 2::bigint, 'J ve todas');

set local role anon;
select throws_ok($$select count(*) from public.tareas$$, '42501', null, 'anon no accede');

select * from finish();
rollback;
