import { Injectable } from '@nestjs/common';
import { ragConfig } from '../../config/app.config';
import { AiService } from '../ai/ai.service';
import { RetrievalRepository } from './retrieval.repository';

type SearchInput = {
  query: string;
  topK?: number;
  source?: string;
};

@Injectable()
export class RetrievalService {
  constructor(
    private readonly retrievalRepository: RetrievalRepository,
    private readonly aiService: AiService,
  ) {}

  async search(input: SearchInput) {
    const topK = Math.max(1, input.topK ?? ragConfig.retrievalTopK);
    const embedding = await this.aiService.embedText(input.query);
    const chunks = await this.retrievalRepository.similaritySearch({
      embedding,
      topK,
      source: input.source,
    });

    return {
      query: input.query,
      topK,
      count: chunks.length,
      chunks,
    };
  }
}
