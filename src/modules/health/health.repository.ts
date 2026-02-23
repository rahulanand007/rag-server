import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthRepository {
  getHealthStatus() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
