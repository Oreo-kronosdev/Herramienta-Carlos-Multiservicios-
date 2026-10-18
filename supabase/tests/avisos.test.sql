-- Reserva atómica de avisos pendientes (la usa el aviso diario con la clave secreta).
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email, aud, role) values
  ('12000000-0000-0000-0000-00000000000a', 't3-a@usuarios.local', 'authenticated', 'authenticated'),
  ('12000000-0000-0000-0000-00000000000b', 't3-b@usuarios.local', 'authenticated', 'authenticated');
insert into public.profiles (id, username, nombre, rol, activo) values
  ('12000000-0000-0000-0000-00000000000a', 't3-a', 'A', 'trabajador', true),
  ('12000000-0000-0000-0000-00000000000b', 't3-b', 'B', 'trabajador', false);
insert into public.eventos (id, titulo, fecha, avisar_dias) values
  ('42000000-0000-0000-0000-000000000001', 'hoy', '2030-06-10', 0),
  ('42000000-0000-0000-0000-000000000002', 'pasada', '2030-06-09', 0),
  ('42000000-0000-0000-0000-000000000003', 'aun no', '2030-06-20', 1);
insert into public.evento_personas (evento_id, user_id) values
  ('42000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-00000000000a'),
  ('42000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-00000000000b'),
  ('42000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-00000000000a'),
  ('42000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-00000000000a');

set local role service_role;
create temp table r1 as select * from public.reclamar_avisos('2030-06-10', 100) where evento_id::text like '42000000-%';
select is((select count(*) from r1), 1::bigint, 'solo la de hoy, de la persona activa');
select is((select titulo from r1), 'hoy', 'con su título');
select isnt((select avisado_at from public.evento_personas
  where evento_id = '42000000-0000-0000-0000-000000000001' and user_id = '12000000-0000-0000-0000-00000000000a'),
  null, 'queda reservada al devolverla');
select is((select count(*) from public.reclamar_avisos('2030-06-10', 100) where evento_id::text like '42000000-%'),
  0::bigint, 'una segunda ejecución no la vuelve a dar');
select is((select avisado_at from public.evento_personas
  where evento_id = '42000000-0000-0000-0000-000000000002'), null, 'la pasada ni se toca');

-- Mover la fecha después de reservar la vuelve a dejar pendiente
reset role;
update public.eventos set fecha = '2030-06-11' where id = '42000000-0000-0000-0000-000000000001';
set local role service_role;
select is((select count(*) from public.reclamar_avisos('2030-06-11', 100) where evento_id::text like '42000000-%'),
  1::bigint, 'tras mover la fecha se vuelve a avisar');

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"12000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select throws_ok($$select * from public.reclamar_avisos('2030-06-10', 100)$$, '42501', null, 'un usuario no puede reservar avisos');
reset role;
set local role anon;
select throws_ok($$select * from public.reclamar_avisos('2030-06-10', 100)$$, '42501', null, 'anon tampoco');

select * from finish();
rollback;
