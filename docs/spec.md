# Especificación — App de mantenimiento de edificios

Copia de los requisitos dados por el cliente (2026-10-18).

Aplicación web sencilla para una empresa de mantenimiento de edificios (reparaciones, tejados, canalones, chimeneas, pintura, trabajos en altura). Usuarios: el jefe (Carlos) y los trabajadores. Simple, en español, usable desde el móvil.

**Stack:** Next.js (App Router) + TypeScript + Tailwind; base de datos y autenticación con Supabase (Postgres con Row Level Security). PWA, mobile-first, sin zoom en inputs, sin hover pegajoso.

## Roles
- **Jefe (admin):** ve y edita todo; crea usuarios y asigna permisos.
- **Trabajador:** ve solo sus tareas, sus obras asignadas y lo que el jefe le haya compartido.

## Módulos (en este orden)
1. Login con usuario y contraseña por persona.
2. Clientes y obras: nombre, dirección, comunidad/administrador, tipo de trabajo, presupuesto, estado.
3. Agenda: citas y fechas límite por obra y por persona, con recordatorios días antes (empezar con aviso por notificación web o email).
4. Tareas por persona: asignar, marcar como hecho, fecha límite.
5. Checklist de materiales y herramientas por obra.
6. Finanzas básicas: ingresos, gastos, facturas pendientes, con exportación a Excel.
7. Documento de presupuesto: plantilla rellenable por el trabajador (medidas, fotos, materiales).

## Reglas
- Empezar por los módulos 1 y 2 y entregar algo que funcione antes de seguir.
- Verificar cada módulo antes de darlo por terminado.
- No añadir funciones que no estén en la lista sin preguntar.
- Documentar en README cómo desplegar y cómo crear usuarios.
