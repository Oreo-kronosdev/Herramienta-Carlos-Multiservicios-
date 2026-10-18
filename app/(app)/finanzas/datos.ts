import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function obrasYClientes() {
  const supabase = await createClient();
  const [{ data: obras }, { data: clientes }] = await Promise.all([
    supabase.from("obras").select("id, titulo").order("titulo"),
    supabase.from("clientes").select("id, nombre").order("nombre"),
  ]);
  return { obras: obras ?? [], clientes: clientes ?? [] };
}
