import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';

type UpsertDocumentInput = {
  source: string;
  docId: string;
  updatedAt: Date;
  contentHash: string;
  metadata: Record<string, unknown>;
};

type UpsertChunkInput = {
  documentId: string;
  source: string;
  docId: string;
  chunkId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  embedding: number[];
  updatedAt: Date;
  metadata: Record<string, unknown>;
};

@Injectable()
export class IngestionRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.getClient();
  }

  async findDocument(source: string, docId: string): Promise<{ id: string; contentHash: string } | null> {
    const result = await this.db.execute<{ id: string; contentHash: string }>(sql`
      SELECT id, content_hash AS "contentHash"
      FROM rag.documents
      WHERE source = ${source} AND doc_id = ${docId}
      LIMIT 1;
    `);

    return result.rows[0] ?? null;
  }

  async upsertDocument(input: UpsertDocumentInput): Promise<{ id: string }> {
    const result = await this.db.execute<{ id: string }>(sql`
      INSERT INTO rag.documents (source, doc_id, updated_at, content_hash, metadata, ingested_at)
      VALUES (${input.source}, ${input.docId}, ${input.updatedAt.toISOString()}::timestamptz, ${input.contentHash}, ${JSON.stringify(input.metadata)}::jsonb, NOW())
      ON CONFLICT (source, doc_id)
      DO UPDATE SET
        updated_at = EXCLUDED.updated_at,
        content_hash = EXCLUDED.content_hash,
        metadata = EXCLUDED.metadata,
        ingested_at = NOW()
      RETURNING id;
    `);

    const id = result.rows[0]?.id;
    if (!id) {
      throw new Error(`Failed to upsert document ${input.source}/${input.docId}`);
    }

    return { id };
  }

  async replaceDocumentChunks(documentId: string, chunkIds: string[]): Promise<void> {
    if (chunkIds.length === 0) {
      await this.db.execute(sql`
        DELETE FROM rag.chunks
        WHERE document_id = ${documentId}::uuid;
      `);
      return;
    }

    const chunkIdParams = sql.join(
      chunkIds.map((chunkId) => sql`${chunkId}`),
      sql`, `,
    );

    await this.db.execute(sql`
      DELETE FROM rag.chunks
      WHERE document_id = ${documentId}::uuid
        AND chunk_id NOT IN (${chunkIdParams});
    `);
  }

  async upsertChunk(input: UpsertChunkInput): Promise<void> {
    const embeddingLiteral = `[${input.embedding.join(',')}]`;

    await this.db.execute(sql`
      INSERT INTO rag.chunks (
        document_id,
        chunk_id,
        chunk_index,
        content,
        token_count,
        embedding,
        source,
        doc_id,
        updated_at,
        metadata
      )
      VALUES (
        ${input.documentId}::uuid,
        ${input.chunkId},
        ${input.chunkIndex},
        ${input.content},
        ${input.tokenCount},
        ${embeddingLiteral}::vector,
        ${input.source},
        ${input.docId},
        ${input.updatedAt.toISOString()}::timestamptz,
        ${JSON.stringify(input.metadata)}::jsonb
      )
      ON CONFLICT (chunk_id)
      DO UPDATE SET
        document_id = EXCLUDED.document_id,
        chunk_index = EXCLUDED.chunk_index,
        content = EXCLUDED.content,
        token_count = EXCLUDED.token_count,
        embedding = EXCLUDED.embedding,
        source = EXCLUDED.source,
        doc_id = EXCLUDED.doc_id,
        updated_at = EXCLUDED.updated_at,
        metadata = EXCLUDED.metadata;
    `);
  }
}
