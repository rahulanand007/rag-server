import { relations, sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const rag = pgSchema('rag');

export const documents = rag.table(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    source: text('source').notNull(),
    docId: text('doc_id').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
    contentHash: text('content_hash').notNull(),
    metadata: jsonb('metadata')
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    ingestedAt: timestamp('ingested_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_documents_source_doc_id').on(table.source, table.docId),
  ],
);

export const chunks = rag.table(
  'chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    chunkId: text('chunk_id').notNull(),
    chunkIndex: integer('chunk_index').notNull(),
    content: text('content').notNull(),
    tokenCount: integer('token_count'),
    embedding: text('embedding'),
    source: text('source').notNull(),
    docId: text('doc_id').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
    metadata: jsonb('metadata')
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_chunks_chunk_id').on(table.chunkId),
    uniqueIndex('uq_chunks_document_chunk_index').on(
      table.documentId,
      table.chunkIndex,
    ),
    index('idx_chunks_document_id').on(table.documentId),
    index('idx_chunks_source_doc_id').on(table.source, table.docId),
  ],
);

export const queryLogs = rag.table(
  'query_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    question: text('question').notNull(),
    answer: text('answer').notNull(),
    metadata: jsonb('metadata')
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('idx_query_logs_created_at').on(table.createdAt)],
);

export const documentsRelations = relations(documents, ({ many }) => ({
  chunks: many(chunks),
}));

export const chunksRelations = relations(chunks, ({ one }) => ({
  document: one(documents, {
    fields: [chunks.documentId],
    references: [documents.id],
  }),
}));

export const dbSchema = {
  documents,
  chunks,
  queryLogs,
};
