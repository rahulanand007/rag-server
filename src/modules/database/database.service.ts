import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { NodePgDatabase, drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { dbConfig } from '../../config/app.config';
import { dbSchema } from './schema';

type DatabaseHealth = {
  status: 'up' | 'down';
  latencyMs: number | null;
  error?: string;
};

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool: Pool | null;
  private readonly db: NodePgDatabase<typeof dbSchema> | null;

  constructor() {
    const connectionString = dbConfig.url;

    if (!connectionString) {
      this.pool = null;
      this.db = null;
      this.logger.warn('DATABASE_URL is not set. DB health will report down.');
      return;
    }

    this.pool = new Pool({
      connectionString,
      max: dbConfig.poolMax,
      min: dbConfig.poolMin,
      idleTimeoutMillis: dbConfig.idleTimeoutMs,
      connectionTimeoutMillis: dbConfig.connectionTimeoutMs,
      ssl: dbConfig.ssl ? { rejectUnauthorized: true } : undefined,
    });

    this.db = drizzle(this.pool, { schema: dbSchema });
  }

  async onModuleInit() {
    const health = await this.checkConnection();

    if (health.status === 'up') {
      this.logger.log(`Postgres connected (${health.latencyMs} ms)`);
      return;
    }

    this.logger.warn(
      `Postgres unavailable: ${health.error ?? 'unknown error'}`,
    );
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
    }
  }

  getClient() {
    if (!this.db) {
      throw new Error('DATABASE_URL is not configured.');
    }

    return this.db;
  }

  async checkConnection(): Promise<DatabaseHealth> {
    if (!this.pool) {
      return {
        status: 'down',
        latencyMs: null,
        error: 'DATABASE_URL is not configured',
      };
    }

    const startedAt = Date.now();

    try {
      if (!this.db) {
        throw new Error('DATABASE_URL is not configured');
      }

      await this.db.execute(sql`SELECT 1;`);

      return {
        status: 'up',
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';

      return {
        status: 'down',
        latencyMs: Date.now() - startedAt,
        error: message,
      };
    }
  }
}
