import { Module } from '@nestjs/common';
import { AiModule } from './modules/ai/ai.module';
import { DatabaseModule } from './modules/database/database.module';
import { HealthController } from './modules/health/health.controller';
import { HealthRepository } from './modules/health/health.repository';
import { HealthService } from './modules/health/health.service';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { QueryModule } from './modules/query/query.module';
import { RetrievalModule } from './modules/retrieval/retrieval.module';

@Module({
  imports: [AiModule, DatabaseModule, IngestionModule, RetrievalModule, QueryModule],
  controllers: [HealthController],
  providers: [HealthService, HealthRepository],
})
export class AppModule {}
