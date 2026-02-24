import { Injectable } from '@nestjs/common';
import { ragConfig } from '../../config/app.config';
import { AiService } from '../ai/ai.service';
import { QueryRepository } from './query.repository';
import { RetrievalService } from '../retrieval/retrieval.service';

type AskInput = {
  question: string;
  source?: string;
  topK?: number;
};

@Injectable()
export class QueryService {
  constructor(
    private readonly retrievalService: RetrievalService,
    private readonly queryRepository: QueryRepository,
    private readonly aiService: AiService,
  ) {}

  async ask(input: AskInput) {
    const searchResult = await this.retrievalService.search({
      query: input.question,
      source: input.source,
      topK: input.topK ?? ragConfig.retrievalTopK,
    });

    const contexts = searchResult.chunks
      .slice(0, ragConfig.maxContextChunks)
      .map((chunk) => chunk.content);

    const answer = await this.aiService.generateAnswer(input.question, contexts);

    await this.queryRepository.logQuery({
      question: input.question,
      answer,
      source: input.source,
      topK: searchResult.topK,
      chunksUsed: contexts.length,
    });

    return {
      question: input.question,
      answer,
      context: searchResult.chunks.slice(0, ragConfig.maxContextChunks),
      usage: {
        retrieved: searchResult.count,
        usedForAnswer: contexts.length,
      },
    };
  }
}
