import { Injectable } from '@nestjs/common';
import { ragConfig } from '../../config/app.config';
import { AiService } from '../ai/ai.service';
import { QueryRepository } from './query.repository';
import { RetrievalService } from '../retrieval/retrieval.service';
import type { RetrievedChunk } from '../retrieval/retrieval.repository';

type AskInput = {
  question: string;
  source?: string;
  topK?: number;
};

const EMPTY_RETRIEVAL_ANSWER =
  "I couldn't find relevant context for this question.";

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

    const citations = searchResult.chunks.slice(0, ragConfig.maxContextChunks);

    if (citations.length === 0) {
      await this.queryRepository.logQuery({
        question: input.question,
        answer: EMPTY_RETRIEVAL_ANSWER,
        source: input.source,
        topK: searchResult.topK,
        retrieved: searchResult.count,
        usedForAnswer: 0,
        citationChunkIds: [],
      });

      return {
        question: input.question,
        answer: EMPTY_RETRIEVAL_ANSWER,
        citations: [],
        usage: {
          retrieved: searchResult.count,
          usedForAnswer: 0,
        },
      };
    }

    const labeledContexts = citations.map((chunk) =>
      this.formatContextBlock(chunk),
    );
    const answer = await this.aiService.generateAnswer(
      input.question,
      labeledContexts,
    );

    await this.queryRepository.logQuery({
      question: input.question,
      answer,
      source: input.source,
      topK: searchResult.topK,
      retrieved: searchResult.count,
      usedForAnswer: citations.length,
      citationChunkIds: citations.map((chunk) => chunk.chunkId),
    });

    return {
      question: input.question,
      answer,
      citations,
      usage: {
        retrieved: searchResult.count,
        usedForAnswer: citations.length,
      },
    };
  }

  private formatContextBlock(chunk: RetrievedChunk): string {
    return `[${chunk.chunkId}]\n${chunk.content}`;
  }
}
