import { Module } from '@nestjs/common';
import { RetrievalModule } from '../retrieval/retrieval.module';
import { QueryController } from './query.controller';
import { QueryRepository } from './query.repository';
import { QueryService } from './query.service';

@Module({
  imports: [RetrievalModule],
  controllers: [QueryController],
  providers: [QueryService, QueryRepository],
})
export class QueryModule {}
