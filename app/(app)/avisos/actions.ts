"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type SubJSON = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

export async function guardarSuscripcion(sub: SubJSON): Promise<{ ok: boolean }> {
  const perfil = await requireUser();
  const { endpoint, keys } = sub;
  if (!endpoint?.startsWith("https://") || !keys?.p256dh || !keys?.auth) return { ok: false };
  // El endpoint identifica este móvil: si estaba a nombre de otra persona (móvil compartido), pasa a quien
  // tiene ahora la sesión. Para borrar la de otro hace falta la clave secreta (RLS solo deja tocar las propias).
  await createAdminClient().from("push_suscripciones").delete().eq("endpoint", endpoint);
  const supabase = await createClient();
  const { error } = await supabase
    .from("push_suscripciones")
    .insert({ user_id: perfil.id, endpoint, p256dh: keys.p256dh, auth: keys.auth });
  return { ok: !error };
}

export async function borrarSuscripcion(endpoint: string): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  await supabase.from("push_suscripciones").delete().eq("endpoint", endpoint);
}
