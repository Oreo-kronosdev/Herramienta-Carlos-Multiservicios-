# Carlos Multiservicios — herramienta interna

App web (PWA) para el jefe y los trabajadores: login por usuario, equipo, clientes, obras, agenda con avisos en el móvil y tareas por persona. Pensada para el móvil y solo para uso interno. No hay registro público: los usuarios los crea el jefe.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Auth + Postgres con Row Level Security).

## Qué puede hacer cada uno

| | Jefe | Trabajador |
|---|---|---|
| Equipo (crear usuarios, roles, desactivar, contraseñas) | ✅ | — |
| Clientes | ver y editar todos | ver los de sus obras |
| Obras | ver, crear, editar, borrar y asignar | ver las suyas (con presupuesto) y cambiar su estado |
| Agenda (citas y fechas límite) | ver, crear, editar y borrar todas | ver las que tiene asignadas |
| Tareas | crear, asignar, editar y borrar | ver las suyas y marcarlas como hechas |
| Material y herramientas (en cada obra) | apuntar y quitar | marcar lo preparado y «Desmarcar todo» en sus obras |
| Avisos en el móvil | sí | sí |

La base de datos impone estos permisos (RLS), no solo las pantallas.

---

## Desarrollo en local

Requisitos: Node 20 o superior y Docker.

```bash
npm install
npx supabase start          # levanta Postgres y Auth en Docker
cp .env.example .env.local  # y rellena con los valores de `npx supabase status`
npx supabase db reset       # crea las tablas y carga datos de prueba
npm run dev                 # http://localhost:3000
```

Usuarios de prueba en local (los carga `supabase/seed.sql`; **no existen en producción**):
- `carlos` / `carlos1234` (jefe)
- `pepe` / `pepe12345` (trabajador)
- `ana` / `ana123456` (trabajador)

Para probar desde el móvil en la misma wifi: `npm run dev -- -H 0.0.0.0` y abre `http://<IP-del-ordenador>:3000`.

### Pruebas

```bash
npm test           # pruebas unitarias (Vitest)
npm run db:test    # pruebas de seguridad de la base de datos (pgTAP)
npm run test:e2e   # pruebas de punta a punta en un móvil simulado (Playwright)
npm run lint && npm run build
```

---

## Despliegue (Supabase en la nube + Vercel, planes gratuitos)

### 1. Base de datos (Supabase)

1. Crea un proyecto en <https://supabase.com/dashboard> (región Europa, p. ej. Frankfurt). Guarda la contraseña de la base de datos.
2. En **Authentication → Sign In / Providers**:
   - Desactiva **Allow new users to sign up** (nadie puede registrarse por su cuenta).
   - Deja activado el proveedor **Email** y desactiva **Confirm email** (los emails son internos, `usuario@usuarios.local`, y no reciben correo).
3. Sube el esquema desde tu ordenador:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-del-proyecto>
   npx supabase db push        # aplica supabase/migrations (no carga los datos de prueba)
   ```
4. En **Project Settings → API Keys** copia:
   - la **URL** del proyecto,
   - la clave **publishable** (`sb_publishable_…`),
   - la clave **secret** (`sb_secret_…`). Es secreta: no la compartas ni la subas al repositorio.

### 2. Web (Vercel)

1. En <https://vercel.com/new> importa este repositorio de GitHub (framework: Next.js, sin más cambios).
2. Añade las variables de entorno (Production y Preview):
   | Variable | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | clave publishable |
   | `SUPABASE_SERVICE_ROLE_KEY` | clave secret |
3. Despliega. En Supabase → **Authentication → URL Configuration** pon como *Site URL* la dirección de Vercel (p. ej. `https://carlos-multiservicios.vercel.app`).

4. Variables para los avisos (ver «Avisos en el móvil» más abajo): `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` y `CRON_SECRET`.

Cada push a `main` vuelve a desplegar. Si hay migraciones nuevas, ejecuta `npx supabase db push` antes.

---

## Crear usuarios

### El primer jefe (una sola vez)

Desde tu ordenador, con `.env.local` apuntando al proyecto **de producción** (URL y clave secret de la nube):

```bash
npm run crear-usuario -- carlos 'UnaContraseñaLarga' "Carlos" jefe
```

Formato: `npm run crear-usuario -- <usuario> <contraseña> "<Nombre>" [jefe|trabajador]`. Después, vuelve a dejar `.env.local` con los valores locales si sigues desarrollando.

### El resto (desde la app)

1. Entra como jefe → **Equipo** → **Nuevo usuario**.
2. Usuario: minúsculas, sin espacios ni tildes (p. ej. `jose.luis`). Contraseña: mínimo 8 caracteres.
3. Dale a la persona su usuario y contraseña. Entra en la app con ellos.

En la ficha de cada persona el jefe puede cambiar el nombre, el rol o la contraseña, o **desactivarla**. Una persona desactivada sale de la app en cuanto la vuelve a usar y ya no puede entrar. El jefe no puede quitarse a sí mismo el rol ni desactivarse.

---

## Avisos en el móvil

Cada cita tiene un «Avisar» (el mismo día, 1, 2, 3 o 7 días antes). Una vez al día, Vercel llama a `/api/recordatorios`, que manda una notificación a las personas asignadas.

**Configuración (una vez):**

1. Genera las claves en tu ordenador:
   ```bash
   npx web-push generate-vapid-keys
   ```
2. En Vercel → Settings → Environment Variables añade:
   | Variable | Valor |
   |---|---|
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | la *Public Key* |
   | `VAPID_PRIVATE_KEY` | la *Private Key* (secreta) |
   | `VAPID_SUBJECT` | `mailto:` + un email de contacto, p. ej. `mailto:carlos@ejemplo.com` |
   | `CRON_SECRET` | una contraseña larga cualquiera (Vercel la usa para llamar al aviso diario) |
3. Vuelve a desplegar. El horario está en `vercel.json` (`0 6 * * *`, en UTC): sale hacia las **8:00 en verano y las 7:00 en invierno**. En el plan gratuito de Vercel puede retrasarse hasta una hora.

No cambies las claves VAPID una vez en uso: si las cambias, todos tendrán que volver a activar los avisos.

**Cada persona, en su móvil:**

- **Android (Chrome):** entra en **Agenda** → **Activar avisos en este móvil** → Permitir.
- **iPhone (iOS 16.4 o posterior):** primero instala la app (ver abajo) y ábrela desde el icono de la pantalla de inicio. Después: **Agenda** → **Activar avisos en este móvil** → Permitir. En Safari, sin instalar, el iPhone no permite avisos.

Si una cita cambia de fecha o de antelación, el aviso se vuelve a programar. Nadie recibe el mismo aviso dos veces. Las personas desactivadas y las citas ya pasadas no generan avisos.

**Probarlo a mano** (por ejemplo, después de desplegar):
```bash
curl -H "Authorization: Bearer <CRON_SECRET>" https://<tu-app>.vercel.app/api/recordatorios
# → {"avisados":1,"caducadas":0,"fallos":0}
```
Para ver una notificación al momento, crea una cita para hoy con «El mismo día», asígnatela y llama a esa URL.

## Instalar en el móvil

- **iPhone (Safari):** abre la web → botón Compartir → **Añadir a pantalla de inicio**.
- **Android (Chrome):** abre la web → menú ⋮ → **Instalar aplicación** (o **Añadir a pantalla de inicio**).

Se abre a pantalla completa como una app. Necesita conexión a internet; no funciona sin conexión.

## Estructura

```
app/(app)/        pantallas con sesión: inicio, obras, agenda, tareas, clientes, equipo
app/api/          aviso diario (lo llama Vercel Cron)
public/sw.js      service worker: solo muestra notificaciones
app/login/        entrada y salida
lib/              validación (usuario, cliente, obra, cita, importes), fechas en hora de Madrid, avisos, sesión
supabase/         migraciones, datos de prueba y pruebas de seguridad (RLS)
scripts/          alta de usuarios por terminal
tests/            pruebas unitarias y de punta a punta
docs/             especificación y plan por fases
```
