-- Pruebas de seguridad (RLS) de la fase 2: agenda y suscripciones push.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email, aud, role) values
  ('11000000-0000-0000-0000-000000000001', 't2-j@usuarios.local', 'authenticated', 'authenticated'),
  ('11000000-0000-0000-0000-00000000000a', 't2-a@usuarios.local', 'authenticated', 'authenticated'),
  ('11000000-0000-0000-0000-00000000000b', 't2-b@usuarios.local', 'authenticated', 'authenticated');
insert into public.profiles (id, username, nombre, rol) values
  ('11000000-0000-0000-0000-000000000001', 't2-j', 'Jefe', 'jefe'),
  ('11000000-0000-0000-0000-00000000000a', 't2-a', 'A', 'trabajador'),
  ('11000000-0000-0000-0000-00000000000b', 't2-b', 'B', 'trabajador');
insert into public.clientes (id, nombre) values ('21000000-0000-0000-0000-000000000001', 'C');
insert into public.obras (id, cliente_id, titulo, direccion, tipo_trabajo) values
  ('31000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', 'O1', 'D', 'tejado');
insert into public.eventos (id, titulo, fecha, avisar_dias, obra_id) values
  ('41000000-0000-0000-0000-000000000001', 'E1', '2026-10-20', 2, '31000000-0000-0000-0000-000000000001'),
  ('41000000-0000-0000-0000-000000000002', 'E2', '2026-10-21', 1, null);
insert into public.evento_personas (evento_id, user_id) values
  ('41000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-00000000000a'),
  ('41000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-00000000000b');

create temp view t_eventos with (security_invoker = true) as
  select * from public.eventos where id::text like '41000000-%';
create temp view t_ep with (security_invoker = true) as
  select * from public.evento_personas where evento_id::text like '41000000-%';
create temp view t_subs with (security_invoker = true) as
  select * from public.push_suscripciones where endpoint like 'https://t2.test/%';
grant select on t_eventos, t_ep, t_subs to authenticated;

select is((select fecha_aviso from public.eventos where id = '41000000-0000-0000-0000-000000000001'),
  '2026-10-18'::date, 'fecha_aviso = fecha - avisar_dias');

-- ===== Trabajador A =====
set local role authenticated;
set local request.jwt.claims = '{"sub":"11000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select is((select count(*) from t_eventos), 1::bigint, 'A ve solo su cita');
select is((select titulo from t_eventos), 'E1', 'y es E1');
select is((select count(*) from t_ep), 1::bigint, 'A ve solo su asignación');
select throws_ok($$insert into public.eventos (titulo, fecha) values ('x', '2026-10-30')$$, '42501', null, 'A no crea citas');
update public.eventos set titulo = 'hack' where id = '41000000-0000-0000-0000-000000000001';
select is((select titulo from t_eventos), 'E1', 'A no edita citas');
select lives_ok($$insert into public.push_suscripciones (user_id, endpoint, p256dh, auth)
  values ('11000000-0000-0000-0000-00000000000a', 'https://t2.test/a', 'k', 'x')$$, 'A guarda su suscripción');
select throws_ok($$insert into public.push_suscripciones (user_id, endpoint, p256dh, auth)
  values ('11000000-0000-0000-0000-00000000000b', 'https://t2.test/b', 'k', 'x')$$, '42501', null, 'A no guarda suscripciones de otro');

-- ===== A desactivado =====
reset role;
update public.profiles set activo = false where id = '11000000-0000-0000-0000-00000000000a';
set local role authenticated;
set local request.jwt.claims = '{"sub":"11000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select is((select count(*) from t_eventos), 0::bigint, 'A desactivado no ve citas');
select is((select count(*) from t_ep), 0::bigint, 'A desactivado no ve asignaciones');

-- ===== Jefe =====
set local request.jwt.claims = '{"sub":"11000000-0000-0000-0000-000000000001","role":"authenticated"}';
select is((select count(*) from t_eventos), 2::bigint, 'J ve todas las citas');
select lives_ok($$
  with e as (insert into public.eventos (id, titulo, fecha) values ('41000000-0000-0000-0000-000000000003', 'E3', '2026-11-01') returning id)
  insert into public.evento_personas (evento_id, user_id) select id, '11000000-0000-0000-0000-00000000000b' from e
$$, 'J crea y asigna citas');
select is((select count(*) from t_subs), 0::bigint, 'J no ve suscripciones ajenas');

-- ===== Re-armado del aviso =====
reset role;
update public.evento_personas set avisado_at = now() where evento_id = '41000000-0000-0000-0000-000000000001';
update public.eventos set titulo = 'E1 bis' where id = '41000000-0000-0000-0000-000000000001';
select isnt((select avisado_at from public.evento_personas where evento_id = '41000000-0000-0000-0000-000000000001'),
  null, 'cambiar solo el título no re-arma el aviso');
update public.eventos set fecha = fecha + 3 where id = '41000000-0000-0000-0000-000000000001';
select is((select avisado_at from public.evento_personas where evento_id = '41000000-0000-0000-0000-000000000001'),
  null, 'mover la fecha re-arma el aviso');

-- ===== Sin sesión =====
set local role anon;
select throws_ok($$select count(*) from public.eventos$$, '42501', null, 'anon no accede a la agenda');

select * from finish();
rollback;
