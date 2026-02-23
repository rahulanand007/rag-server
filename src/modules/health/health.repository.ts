import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class HealthRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async getHealthStatus() {
    const db = await this.databaseService.checkConnection();

    return {
      status: db.status === 'up' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      db,
    };
  }
}
