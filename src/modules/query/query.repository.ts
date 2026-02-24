import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class QueryRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.getClient();
  }

  async logQuery(input: {
    question: string;
    answer: string;
    source?: string;
    topK: number;
    chunksUsed: number;
  }): Promise<void> {
    await this.db.execute(sql`
      INSERT INTO rag.query_logs (question, answer, metadata)
      VALUES (
        ${input.question},
        ${input.answer},
        ${JSON.stringify({
          source: input.source ?? null,
          topK: input.topK,
          chunksUsed: input.chunksUsed,
        })}::jsonb
      );
    `);
  }
}
