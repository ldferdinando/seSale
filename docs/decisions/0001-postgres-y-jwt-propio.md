# 0001 — PostgreSQL y JWT propio para Etapa 3

**Estado:** aceptada
**Fecha:** 2026-07-31

## Contexto

`AGENTS.md` y `ARCHITECTURE.md` preveían originalmente resolver la auth de
Etapa 3 con Supabase Auth (login social, gestión de usuarios delegada). Al
llegar a esta etapa se decidió no depender todavía de un proveedor externo de
identidad, y usar en cambio las librerías `python-jose` y `passlib[bcrypt]`
(ya declaradas en `pyproject.toml` desde Etapa 1, sin usar) para emitir JWT
propios contra la tabla `users` de Postgres.

## Decisiones

1. **SQLite → PostgreSQL 16.** SQLite fue suficiente para Etapas 1-2 (sin
   auth real, un solo proceso). Etapa 3 necesita constraints/tipos más
   estrictos (enums nativos, concurrencia) para soportar auth y roles en
   serio. Postgres corre en local vía Docker Compose (`docker-compose.yml`,
   solo el servicio de base de datos — la app sigue corriendo con
   `uv run uvicorn` directo, sin containerizar el backend todavía).

2. **JWT propio en vez de Supabase Auth.** Se difiere Supabase Auth a Etapa 6
   (se reevalúa ahí si hace falta login social con Google/WhatsApp). Mientras
   tanto: `access_token` (30 min) + `refresh_token` (7 días) firmados con
   `python-jose`, passwords hasheadas con `passlib`/`bcrypt`.

3. **Refresh token en cookie httpOnly, sesión única.** El `refresh_token`
   viaja como cookie `httpOnly` — el frontend nunca lo toca, solo guarda el
   `access_token` en memoria (nunca `localStorage`). Se guarda un solo
   `refresh_token_hash` por usuario en `users` (no una tabla dedicada de
   sesiones): cada login pisa el anterior, cada `/api/auth/refresh` rota el
   token. Tradeoff aceptado: un usuario no puede tener dos sesiones activas
   simultáneas (ej. dos dispositivos) — si hace falta soportarlo, migrar a una
   tabla `refresh_tokens` dedicada es un cambio localizado.

4. **sha256 para el hash del refresh token, bcrypt solo para passwords.**
   bcrypt está pensado para secretos de baja entropía (passwords humanas) y
   trunca su input a 72 bytes — un JWT es más largo y de alta entropía, así
   que compararlo con sha256 es correcto y evita latencia innecesaria en cada
   refresh.

5. **Tests siguen en SQLite in-memory.** Postgres se usa para dev/staging/prod
   vía Docker Compose; la suite de `pytest` no lo necesita y sigue siendo
   rápida y sin dependencias externas.

## Consecuencias

- Se corrigió `alembic/versions/0002_pricing_system.py` (el `ALTER COLUMN` de
  `events.plan` usaba `batch_alter_table`, un patrón específico de SQLite que
  falla en Postgres sin una cláusula `USING`). Esa migración nunca se había
  aplicado contra una base real (Etapas 1-2 eran SQLite-only), así que se
  ajustó directamente en lugar de agregar una migración correctiva encima.
- `x-admin-key` y el `user_id` manual en los bodies/queries de `/api/events`
  quedan completamente reemplazados por JWT + rol `admin`.
