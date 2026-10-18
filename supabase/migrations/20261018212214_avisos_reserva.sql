-- Reserva atómica de avisos: se marcan como avisados ANTES de enviarlos (y se liberan si el envío
-- falla), así dos ejecuciones simultáneas del aviso diario no mandan lo mismo dos veces.
create function public.reclamar_avisos(p_hoy date, p_limite int default 500)
returns table (evento_id uuid, user_id uuid, titulo text, fecha date, hora time)
language sql volatile security definer set search_path = ''
as $$
  with pendientes as (
    select ep.evento_id, ep.user_id
    from public.evento_personas ep
    join public.eventos e on e.id = ep.evento_id
    join public.profiles p on p.id = ep.user_id
    where ep.avisado_at is null and e.fecha_aviso <= p_hoy and e.fecha >= p_hoy and p.activo
    order by e.fecha, ep.evento_id
    limit p_limite
    for update of ep skip locked
  ), reservadas as (
    update public.evento_personas ep set avisado_at = now()
    from pendientes
    where ep.evento_id = pendientes.evento_id and ep.user_id = pendientes.user_id
    returning ep.evento_id, ep.user_id
  )
  select r.evento_id, r.user_id, e.titulo, e.fecha, e.hora
  from reservadas r join public.eventos e on e.id = r.evento_id;
$$;
revoke execute on function public.reclamar_avisos(date, int) from public, anon, authenticated;
grant execute on function public.reclamar_avisos(date, int) to service_role;
