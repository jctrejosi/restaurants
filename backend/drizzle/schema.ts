/**
 * Esquema Drizzle de la base de datos operativa (`public`).
 *
 * Este archivo es la fuente única del esquema: materializa la especificación
 * de `docs/arquitectura/esquema/` y se migra con `drizzle-kit`
 * (`yarn db:generate` / `yarn db:migrate`). Decisiones: D-BD-02/03/04 en
 * `docs/arquitectura/05-stack-tecnologico.md`.
 *
 * Se implementa por etapas (E1–E9 del plan de BD) y se organiza en módulos
 * por dominio (`drizzle/schema/NN-*.ts`) para evitar un archivo gigante; este
 * archivo solo re-exporta tablas, enums y relaciones.
 */
export * from './schema/01-nucleo';
export * from './schema/02-catalogo';
export * from './schema/03-salon-reservas';
export * from './schema/04-pedidos';
export * from './schema/05-domicilio';
export * from './schema/06-pagos';
export * from './schema/07-marketing';
export * from './schema/08-operacion';
export * from './relations';
