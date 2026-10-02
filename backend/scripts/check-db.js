/**
 * Verifica la conexión a la base de datos configurada en .env.
 * Uso: yarn db:check
 */
require('dotenv').config();
const { Client } = require('pg');

(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL no está definida en backend/.env');
    process.exit(1);
  }

  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    const { rows } = await client.query(
      'select current_database() as base, current_user as usuario, version() as version',
    );
    const extensiones = await client.query(
      'select extname from pg_extension order by extname',
    );
    console.log(`Conexión OK -> ${rows[0].base} (usuario ${rows[0].usuario})`);
    console.log(rows[0].version.split(',')[0]);
    console.log(
      `Extensiones: ${extensiones.rows.map((r) => r.extname).join(', ')}`,
    );
  } catch (error) {
    console.error('Error de conexión:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
