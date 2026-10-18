-- Datos de prueba SOLO para desarrollo local (`supabase db reset`). No se cargan en producción.
-- Usuarios: carlos / carlos1234 (jefe), pepe / pepe12345 y ana / ana123456 (trabajadores).

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', u.id::uuid, 'authenticated', 'authenticated',
  u.username || '@usuarios.local', extensions.crypt(u.password, extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
from (values
  ('a0000000-0000-0000-0000-000000000001', 'carlos', 'carlos1234'),
  ('a0000000-0000-0000-0000-000000000002', 'pepe', 'pepe12345'),
  ('a0000000-0000-0000-0000-000000000003', 'ana', 'ana123456')
) as u (id, username, password);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
select gen_random_uuid(), id, id::text, jsonb_build_object('sub', id::text, 'email', email), 'email', now(), now(), now()
from auth.users where email like '%@usuarios.local';

insert into public.profiles (id, username, nombre, rol) values
  ('a0000000-0000-0000-0000-000000000001', 'carlos', 'Carlos', 'jefe'),
  ('a0000000-0000-0000-0000-000000000002', 'pepe', 'Pepe', 'trabajador'),
  ('a0000000-0000-0000-0000-000000000003', 'ana', 'Ana', 'trabajador');

insert into public.clientes (id, nombre, direccion, administrador, telefono) values
  ('b0000000-0000-0000-0000-000000000001', 'Comunidad C/ Mayor 5', 'Calle Mayor 5, Madrid', 'Fincas Sol (Marta)', '600111222'),
  ('b0000000-0000-0000-0000-000000000002', 'Lucía Pérez', 'Av. de la Paz 12, Madrid', null, '600333444');

insert into public.obras (id, cliente_id, titulo, direccion, tipo_trabajo, presupuesto, estado) values
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Limpieza de canalones', 'Calle Mayor 5, Madrid', 'canalones', 480, 'en_curso'),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Revisión de chimenea', 'Calle Mayor 5, Madrid', 'chimenea', null, 'pendiente'),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'Pintura de fachada', 'Av. de la Paz 12, Madrid', 'pintura', 3200, 'presupuestada');

insert into public.obra_trabajadores (obra_id, user_id) values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002'),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003');

-- Agenda (fechas relativas al día en que se carga el seed)
insert into public.eventos (id, titulo, tipo, fecha, hora, obra_id, avisar_dias) values
  ('d0000000-0000-0000-0000-000000000001', 'Revisar bajantes con el presidente', 'cita', current_date + 1, '09:30', 'c0000000-0000-0000-0000-000000000001', 1),
  ('d0000000-0000-0000-0000-000000000002', 'Entregar presupuesto de fachada', 'fecha_limite', current_date + 3, null, 'c0000000-0000-0000-0000-000000000003', 2);
insert into public.evento_personas (evento_id, user_id) values
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002'),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003');

-- Tareas
insert into public.tareas (id, titulo, fecha_limite, obra_id, asignada_a) values
  ('e0000000-0000-0000-0000-000000000001', 'Llevar la escalera grande', current_date + 1, 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002'),
  ('e0000000-0000-0000-0000-000000000002', 'Mandar fotos del tiro de la chimenea', current_date - 1, 'c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002'),
  ('e0000000-0000-0000-0000-000000000003', 'Comprar pintura de fachada', null, 'c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003');

-- Checklist de la obra de canalones
insert into public.checklist_items (obra_id, texto, tipo) values
  ('c0000000-0000-0000-0000-000000000001', 'Silicona', 'material'),
  ('c0000000-0000-0000-0000-000000000001', 'Guantes', 'material'),
  ('c0000000-0000-0000-0000-000000000001', 'Escalera de 7 m', 'herramienta'),
  ('c0000000-0000-0000-0000-000000000001', 'Arnés', 'herramienta');

-- Finanzas (fechas del mes en curso)
insert into public.facturas (id, numero, cliente_id, obra_id, concepto, importe, fecha_emision, fecha_vencimiento, pagada, pagada_en) values
  ('f0000000-0000-0000-0000-000000000001', '2026-001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Limpieza de canalones', 480, date_trunc('month', current_date)::date, date_trunc('month', current_date)::date + 10, false, null),
  ('f0000000-0000-0000-0000-000000000002', '2026-002', 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 'Señal pintura de fachada', 1000, current_date, current_date + 30, false, null),
  ('f0000000-0000-0000-0000-000000000003', '2026-000', 'b0000000-0000-0000-0000-000000000001', null, 'Reparación de goteras', 350, date_trunc('month', current_date)::date, null, true, date_trunc('month', current_date)::date + 1);
insert into public.movimientos (tipo, concepto, importe, fecha, obra_id, factura_id) values
  ('ingreso', 'Factura 2026-000 · Comunidad C/ Mayor 5', 350, date_trunc('month', current_date)::date + 1, null, 'f0000000-0000-0000-0000-000000000003'),
  ('gasto', 'Tubos de canalón', 86.40, date_trunc('month', current_date)::date + 2, 'c0000000-0000-0000-0000-000000000001', null),
  ('gasto', 'Gasolina furgoneta', 60, current_date, null, null),
  ('ingreso', 'Pago en mano revisión', 120, current_date, null, null);
