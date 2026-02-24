import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';

export type RetrievedChunk = {
  chunkId: string;
  docId: string;
  source: string;
  content: string;
  updatedAt: string;
  score: number;
};

@Injectable()
export class RetrievalRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.getClient();
  }

  async similaritySearch(params: {
    embedding: number[];
    topK: number;
    source?: string;
  }): Promise<RetrievedChunk[]> {
    const vector = `[${params.embedding.join(',')}]`;

    if (params.source) {
      const result = await this.db.execute<RetrievedChunk>(sql`
        SELECT
          chunk_id AS "chunkId",
          doc_id AS "docId",
          source,
          content,
          updated_at::text AS "updatedAt",
          (1 - (embedding <=> ${vector}::vector)) AS score
        FROM rag.chunks
        WHERE embedding IS NOT NULL
          AND source = ${params.source}
        ORDER BY embedding <=> ${vector}::vector
        LIMIT ${params.topK};
      `);

      return result.rows;
    }

    const result = await this.db.execute<RetrievedChunk>(sql`
      SELECT
        chunk_id AS "chunkId",
        doc_id AS "docId",
        source,
        content,
        updated_at::text AS "updatedAt",
        (1 - (embedding <=> ${vector}::vector)) AS score
      FROM rag.chunks
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${vector}::vector
      LIMIT ${params.topK};
    `);

    return result.rows;
  }
}
