import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { AiService } from '../ai/ai.service';
import { IngestionRepository } from './ingestion.repository';

type IngestOptions = {
  path: string;
  source?: string;
  chunkSize?: number;
  chunkOverlap?: number;
};

type LoadedDocument = {
  source: string;
  docId: string;
  text: string;
  updatedAt: Date;
};

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly ingestionRepository: IngestionRepository,
    private readonly aiService: AiService,
  ) {}

  async ingest(options: IngestOptions) {
    const chunkSize = options.chunkSize ?? 800;
    const chunkOverlap = options.chunkOverlap ?? 120;
    const source = options.source ?? 'local';
    const documents = await this.loadDocuments(options.path, source);

    if (documents.length === 0) {
      this.logger.warn(`No .txt or .md files found in ${options.path}`);
      return { processed: 0, chunks: 0 };
    }

    this.logger.log(
      `Found ${documents.length} documents. Starting ingestion...`,
    );

    let chunkCount = 0;
    let skipped = 0;

    for (const document of documents) {
      const contentHash = this.hashText(document.text);
      const documentMetadata = {
        source: document.source,
        docId: document.docId,
        updatedAt: document.updatedAt.toISOString(),
      };

      const existingDocument = await this.ingestionRepository.findDocument(
        document.source,
        document.docId,
      );

      if (existingDocument && existingDocument.contentHash === contentHash) {
        skipped += 1;
        this.logger.log(`Skipped unchanged ${document.docId}`);
        continue;
      }

      const { id: documentId } = await this.ingestionRepository.upsertDocument({
        source: document.source,
        docId: document.docId,
        updatedAt: document.updatedAt,
        contentHash,
        metadata: documentMetadata,
      });

      const chunks = this.chunkText(document.text, chunkSize, chunkOverlap);
      const embeddings = await this.aiService.embedTexts(
        chunks.map((chunk) => chunk.content),
      );
      const chunkIds = chunks.map(
        (chunk) => `${document.docId}:${chunk.index}`,
      );

      await this.ingestionRepository.replaceDocumentChunks(
        documentId,
        chunkIds,
      );

      for (let i = 0; i < chunks.length; i += 1) {
        const chunk = chunks[i];
        const chunkId = `${document.docId}:${chunk.index}`;
        const chunkMetadata = {
          source: document.source,
          docId: document.docId,
          updatedAt: document.updatedAt.toISOString(),
          chunkId,
        };

        await this.ingestionRepository.upsertChunk({
          documentId,
          source: document.source,
          docId: document.docId,
          chunkId,
          chunkIndex: chunk.index,
          content: chunk.content,
          tokenCount: this.estimateTokenCount(chunk.content),
          embedding: embeddings[i] ?? [],
          updatedAt: document.updatedAt,
          metadata: chunkMetadata,
        });
      }

      chunkCount += chunks.length;
      this.logger.log(`Ingested ${document.docId} (${chunks.length} chunks)`);
    }

    const processed = documents.length - skipped;
    this.logger.log(
      `Ingestion completed. Processed=${processed}, Skipped=${skipped}, Chunks=${chunkCount}`,
    );
    return { processed, skipped, chunks: chunkCount };
  }

  private async loadDocuments(
    rootPath: string,
    source: string,
  ): Promise<LoadedDocument[]> {
    const resolvedRoot = resolve(rootPath);
    const files = await this.collectSupportedFiles(resolvedRoot);
    const documents: LoadedDocument[] = [];

    for (const filePath of files) {
      const content = await readFile(filePath, 'utf8');
      const normalized = content.replace(/\r\n/g, '\n').trim();

      if (!normalized) {
        continue;
      }

      const stats = await stat(filePath);
      const relativePath = relative(resolvedRoot, filePath).replaceAll(
        '\\',
        '/',
      );

      documents.push({
        source,
        docId: relativePath,
        text: normalized,
        updatedAt: stats.mtime,
      });
    }

    return documents;
  }

  private async collectSupportedFiles(
    directoryPath: string,
  ): Promise<string[]> {
    const entries = await readdir(directoryPath, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const fullPath = join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await this.collectSupportedFiles(fullPath)));
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (fullPath.endsWith('.txt') || fullPath.endsWith('.md')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private chunkText(text: string, size: number, overlap: number) {
    if (size <= 0) {
      throw new Error('chunkSize must be greater than 0');
    }

    if (overlap < 0 || overlap >= size) {
      throw new Error('chunkOverlap must be >= 0 and < chunkSize');
    }

    const chunks: Array<{ index: number; content: string }> = [];
    let start = 0;
    let index = 0;

    while (start < text.length) {
      const end = Math.min(start + size, text.length);
      const content = text.slice(start, end).trim();
      if (content) {
        chunks.push({ index, content });
        index += 1;
      }

      if (end >= text.length) {
        break;
      }

      start = Math.max(end - overlap, start + 1);
    }

    return chunks;
  }

  private hashText(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }

  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
