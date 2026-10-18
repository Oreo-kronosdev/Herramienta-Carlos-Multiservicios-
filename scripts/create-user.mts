// Alta de usuarios desde la terminal (sirve para crear el primer jefe).
// Uso: npx tsx scripts/create-user.mts <usuario> <contraseña> "<Nombre>" [jefe|trabajador]
import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { esRol, validarPassword } from "../lib/equipo";
import { normalizeUsername, usernameToEmail, validateUsername } from "../lib/username";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const [usuarioRaw, password, nombre, rol = "trabajador"] = process.argv.slice(2);
const username = normalizeUsername(usuarioRaw ?? "");

function fallar(msg: string): never {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

if (!usuarioRaw || !password || !nombre?.trim())
  fallar('uso: npx tsx scripts/create-user.mts <usuario> <contraseña> "<Nombre>" [jefe|trabajador]');
const eu = validateUsername(username);
if (eu) fallar(`usuario no válido: ${eu}`);
const ep = validarPassword(password);
if (ep) fallar(`contraseña no válida: ${ep}`);
if (!esRol(rol)) fallar("el rol debe ser jefe o trabajador");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) fallar("faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (en .env.local o el entorno)");

const admin = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await admin.auth.admin.createUser({
  email: usernameToEmail(username),
  password,
  email_confirm: true,
});
if (error || !data.user) fallar(error?.code === "email_exists" ? "ese usuario ya existe" : (error?.message ?? "desconocido"));

const { error: errPerfil } = await admin
  .from("profiles")
  .insert({ id: data.user.id, username, nombre: nombre.trim(), rol });
if (errPerfil) {
  await admin.auth.admin.deleteUser(data.user.id);
  fallar(`no se pudo crear el perfil: ${errPerfil.message}`);
}

console.log(`Creado: ${username} (${rol}). Ya puede entrar con su usuario y contraseña.`);
