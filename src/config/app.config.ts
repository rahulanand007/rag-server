type NodeEnv = 'development' | 'test' | 'production';

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  return value === 'true' || value === '1';
}

const nodeEnv = (process.env.NODE_ENV as NodeEnv | undefined) ?? 'development';

export const appConfig = {
  nodeEnv,
  port: parseNumber(process.env.PORT, 3000),
};

export const dbConfig = {
  url: process.env.DATABASE_URL ?? '',
  poolMax: parseNumber(process.env.DB_POOL_MAX, 20),
  poolMin: parseNumber(process.env.DB_POOL_MIN, 2),
  idleTimeoutMs: parseNumber(process.env.DB_IDLE_TIMEOUT_MS, 30000),
  connectionTimeoutMs: parseNumber(process.env.DB_CONN_TIMEOUT_MS, 5000),
  ssl: parseBoolean(process.env.DB_SSL, false),
};

export const ragConfig = {
  embeddingModel: process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small',
  chatModel: process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o-mini',
  retrievalTopK: parseNumber(process.env.RAG_RETRIEVAL_TOP_K, 5),
  maxContextChunks: parseNumber(process.env.RAG_MAX_CONTEXT_CHUNKS, 4),
};
