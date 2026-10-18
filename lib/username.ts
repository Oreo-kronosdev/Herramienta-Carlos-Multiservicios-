// Supabase Auth necesita un email; cada usuario entra con su nombre y por dentro usamos uno ficticio.
const DOMINIO = "usuarios.local";

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateUsername(u: string): string | null {
  if (u.length < 3) return "Mínimo 3 caracteres";
  if (u.length > 30) return "Máximo 30 caracteres";
  if (!/^[a-z0-9._-]+$/.test(u)) return "Solo letras sin tildes, números, punto, guion o guion bajo (sin espacios)";
  return null;
}

export function usernameToEmail(u: string): string {
  return `${normalizeUsername(u)}@${DOMINIO}`;
}
