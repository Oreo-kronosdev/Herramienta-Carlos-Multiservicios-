import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Cierra la sesión (también la de usuarios desactivados) y vuelve al login.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const url = new URL("/login", request.url);
  const motivo = request.nextUrl.searchParams.get("motivo");
  if (motivo === "desactivado") url.searchParams.set("motivo", motivo);
  return NextResponse.redirect(url);
}
