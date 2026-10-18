import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|icons/|apple-icon|manifest.webmanifest|robots.txt|sw.js|api/recordatorios|.*\\.(?:png|svg|jpg|ico)$).*)",
  ],
};
