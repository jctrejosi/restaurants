import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../drizzle/schema';

@Injectable()
export class DrizzleService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  public db: NodePgDatabase<typeof schema>;

  constructor(private configService: ConfigService) {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');

    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL no está definida. Revise backend/.env o backend/.env.development.local.',
      );
    }

    // SSL automático: se activa con DB_SSL=true, con sslmode/ssl en la URL, o
    // en producción (proveedores gestionados); DB_SSL=false lo fuerza a off.
    const hasSslInUrl =
      /[?&](sslmode=(require|verify-ca|verify-full)|ssl=(true|require))([&#]|$)/i.test(
        databaseUrl,
      );
    const sslEnabled =
      process.env.DB_SSL === 'true' ||
      (process.env.DB_SSL !== 'false' &&
        (hasSslInUrl || process.env.NODE_ENV === 'production'));

    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 15,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: sslEnabled ? { rejectUnauthorized: false } : false,
    });

    // El pool emite 'error' cuando un cliente inactivo falla (p. ej. si
    // PostgreSQL se reinicia). Sin listener, Node mata el proceso.
    this.pool.on('error', (err) => {
      console.error('Error en el pool de PostgreSQL:', err.message);
    });

    this.db = drizzle(this.pool, { schema });
  }

  async onModuleInit() {
    const host = this.pool.options.host ?? 'localhost (ver DATABASE_URL)';
    let lastError: unknown;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await this.pool.query('SELECT 1');
        console.log(`Base de datos conectada (${host})`);
        return;
      } catch (error) {
        lastError = error;
        console.error(`Intento ${attempt}/3 de conexión a ${host} falló`);
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    }

    console.error(
      'Verifique que el contenedor esté arriba: cd db/docker && docker compose up -d',
    );
    throw lastError;
  }

  async onModuleDestroy() {
    await this.pool.end();
    console.log('Conexión a base de datos cerrada');
  }

  // Consultas SQL crudas (reportes o SQL que Drizzle no expresa).
  async execute<T = any>(query: string, params?: any[]): Promise<T[]> {
    const result = await this.pool.query(query, params);
    return result.rows as T[];
  }

  // Transacción sobre una conexión dedicada.
  async transaction<T>(
    callback: (tx: NodePgDatabase<typeof schema>) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const txDb = drizzle(client, { schema });
      const result = await callback(txDb);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
