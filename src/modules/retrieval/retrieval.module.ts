import { Module } from '@nestjs/common';
import { RetrievalController } from './retrieval.controller';
import { RetrievalRepository } from './retrieval.repository';
import { RetrievalService } from './retrieval.service';

@Module({
  controllers: [RetrievalController],
  providers: [RetrievalService, RetrievalRepository],
  exports: [RetrievalService],
})
export class RetrievalModule {}
