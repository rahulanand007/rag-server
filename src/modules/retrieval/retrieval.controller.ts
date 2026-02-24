import { Body, Controller, Post } from '@nestjs/common';
import { RetrievalService } from './retrieval.service';

type SearchBody = {
  query: string;
  topK?: number;
  source?: string;
};

@Controller('retrieval')
export class RetrievalController {
  constructor(private readonly retrievalService: RetrievalService) {}

  @Post('search')
  async search(@Body() body: SearchBody) {
    return this.retrievalService.search(body);
  }
}
