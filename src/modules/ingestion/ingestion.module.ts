import { Module } from '@nestjs/common';
import { IngestionRepository } from './ingestion.repository';
import { IngestionService } from './ingestion.service';

@Module({
  providers: [IngestionService, IngestionRepository],
  exports: [IngestionService],
})
export class IngestionModule {}
