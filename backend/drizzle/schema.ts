/**
 * Esquema Drizzle de la base de datos operativa (`public`).
 *
 * Este archivo es la fuente única del esquema: materializa la especificación
 * de `docs/arquitectura/esquema/01–04` y se migra con `drizzle-kit`
 * (`yarn db:generate` / `yarn db:migrate`). Decisiones: D-BD-02/03/04 en
 * `docs/arquitectura/05-stack-tecnologico.md`.
 *
 * IMPORTANTE: se implementa por etapas (E1–E9 del plan de BD). Mientras no
 * existan tablas queda vacío a propósito, para que `import * as schema`
 * funcione en la capa de base de datos.
 */
export {};
