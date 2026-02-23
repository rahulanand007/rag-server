import { Module } from '@nestjs/common';
import { HealthController } from './modules/health/health.controller';
import { HealthRepository } from './modules/health/health.repository';
import { HealthService } from './modules/health/health.service';

@Module({
  imports: [],
  controllers: [HealthController],
  providers: [HealthService, HealthRepository],
})
export class AppModule {}
