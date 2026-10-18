import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { hoyMadrid } from "@/lib/fechas";
import { procesarAvisos, type Sub } from "@/lib/recordatorios";

const LOTE = 500; // por debajo del máximo de filas que devuelve la API (1000)

// Lo llama Vercel Cron una vez al día con "Authorization: Bearer <CRON_SECRET>".
export async function GET(request: NextRequest) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const hoy = hoyMadrid();
  const db = createAdminClient();
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );

  try {
    const r = await procesarAvisos({
      hoy,
      limite: LOTE,
      async reclamar(limite) {
        const { data, error } = await db.rpc("reclamar_avisos", { p_hoy: hoy, p_limite: limite });
        if (error) throw error;
        return data.map((f) => ({ ...f, activo: true }));
      },
      async cargarSubs(usuarios) {
        const { data, error } = await db
          .from("push_suscripciones")
          .select("user_id, endpoint, p256dh, auth")
          .in("user_id", usuarios);
        if (error) throw error;
        const porUsuario = new Map<string, Sub[]>();
        for (const s of data) porUsuario.set(s.user_id, [...(porUsuario.get(s.user_id) ?? []), s]);
        return porUsuario;
      },
      async liberar(filas) {
        for (const f of filas) {
          await db.from("evento_personas").update({ avisado_at: null }).eq("evento_id", f.evento_id).eq("user_id", f.user_id);
        }
      },
      async borrarCaducadas(endpoints) {
        await db.from("push_suscripciones").delete().in("endpoint", endpoints);
      },
      async enviar(s, payload) {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload));
      },
    });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
