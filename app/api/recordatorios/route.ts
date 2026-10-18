import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { hoyMadrid } from "@/lib/fechas";
import { elegirAvisos, enviarAvisos, type Pendiente, type Sub } from "@/lib/recordatorios";

// Lo llama Vercel Cron una vez al día con "Authorization: Bearer <CRON_SECRET>".
export async function GET(request: NextRequest) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const hoy = hoyMadrid();
  const db = createAdminClient();
  const { data: filas, error } = await db
    .from("evento_personas")
    .select("evento_id, user_id, eventos!inner (titulo, fecha, hora, fecha_aviso), profiles!inner (activo)")
    .is("avisado_at", null)
    .lte("eventos.fecha_aviso", hoy);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const pendientes = elegirAvisos(
    filas.map<Pendiente>((f) => ({
      evento_id: f.evento_id,
      user_id: f.user_id,
      titulo: f.eventos.titulo,
      fecha: f.eventos.fecha,
      hora: f.eventos.hora,
      activo: f.profiles.activo,
    })),
    hoy,
  );

  const usuarios = [...new Set(pendientes.map((p) => p.user_id))];
  const { data: subs } = usuarios.length
    ? await db.from("push_suscripciones").select("user_id, endpoint, p256dh, auth").in("user_id", usuarios)
    : { data: [] };
  const porUsuario = new Map<string, Sub[]>();
  for (const s of subs ?? []) porUsuario.set(s.user_id, [...(porUsuario.get(s.user_id) ?? []), s]);

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  const r = await enviarAvisos(
    pendientes,
    porUsuario,
    async (s, payload) => {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload));
    },
    hoy,
  );

  const ahora = new Date().toISOString();
  for (const a of r.avisados) {
    await db.from("evento_personas").update({ avisado_at: ahora }).eq("evento_id", a.evento_id).eq("user_id", a.user_id);
  }
  if (r.caducadas.length) await db.from("push_suscripciones").delete().in("endpoint", r.caducadas);

  return NextResponse.json({ avisados: r.avisados.length, caducadas: r.caducadas.length, fallos: r.fallos });
}
