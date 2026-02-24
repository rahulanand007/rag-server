import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { ragConfig } from '../../config/app.config';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  async embedTexts(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const apiKey = process.env.OPENAI_API_KEY ?? '';
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY is missing. Falling back to deterministic local embeddings.');
      return texts.map((text) => this.createLocalEmbedding(text));
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: ragConfig.embeddingModel,
          input: texts,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.warn(
          `Embedding request failed (${response.status}). Falling back to deterministic local embeddings. ${errorBody}`,
        );
        return texts.map((text) => this.createLocalEmbedding(text));
      }

      const body = (await response.json()) as { data: Array<{ embedding: number[] }> };
      return body.data.map((item) => item.embedding);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(
        `Embedding request crashed. Falling back to deterministic local embeddings. ${message}`,
      );
      return texts.map((text) => this.createLocalEmbedding(text));
    }
  }

  async embedText(text: string): Promise<number[]> {
    const embeddings = await this.embedTexts([text]);
    return embeddings[0] ?? this.createLocalEmbedding(text);
  }

  async generateAnswer(question: string, contexts: string[]): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY ?? '';
    const contextText = contexts.length > 0 ? contexts.join('\n\n---\n\n') : 'No context retrieved.';

    if (!apiKey) {
      return `OPENAI_API_KEY is not configured. Retrieved context:\n\n${contextText}`;
    }

    const systemPrompt =
      'You are a retrieval-augmented assistant. Answer using the provided context only. If context is insufficient, say so clearly.';
    const userPrompt = `Question:\n${question}\n\nContext:\n${contextText}`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: ragConfig.chatModel,
          temperature: 0.2,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.warn(
          `Chat completion failed (${response.status}). Returning context-only response. ${errorBody}`,
        );
        return `Model unavailable. Retrieved context:\n\n${contextText}`;
      }

      const body = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const answer = body.choices?.[0]?.message?.content?.trim();
      if (!answer) {
        return `No answer generated. Retrieved context:\n\n${contextText}`;
      }

      return answer;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`Chat completion crashed. Returning context-only response. ${message}`);
      return `Model unavailable. Retrieved context:\n\n${contextText}`;
    }
  }

  private createLocalEmbedding(text: string): number[] {
    const vectorLength = 1536;
    const embedding = new Array<number>(vectorLength).fill(0);
    const hash = createHash('sha256').update(text).digest();

    for (let i = 0; i < vectorLength; i += 1) {
      const value = hash[i % hash.length] ?? 0;
      embedding[i] = (value / 255) * 2 - 1;
    }

    return embedding;
  }
}
