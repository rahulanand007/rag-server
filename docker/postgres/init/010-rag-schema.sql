CREATE SCHEMA IF NOT EXISTS rag;

CREATE TABLE IF NOT EXISTS rag.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  doc_id TEXT,
  updated_at TIMESTAMPTZ,
  content_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rag.chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES rag.documents(id) ON DELETE CASCADE,
  chunk_id TEXT,
  chunk_index INTEGER,
  content TEXT NOT NULL,
  token_count INTEGER,
  embedding VECTOR(1536),
  source TEXT,
  doc_id TEXT,
  updated_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rag.query_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE rag.documents ADD COLUMN IF NOT EXISTS doc_id TEXT;
ALTER TABLE rag.documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE rag.documents ADD COLUMN IF NOT EXISTS content_hash TEXT;
ALTER TABLE rag.documents ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE rag.documents SET doc_id = source WHERE doc_id IS NULL;
UPDATE rag.documents SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE rag.documents SET content_hash = '' WHERE content_hash IS NULL;

ALTER TABLE rag.documents ALTER COLUMN doc_id SET NOT NULL;
ALTER TABLE rag.documents ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE rag.documents ALTER COLUMN content_hash SET NOT NULL;

ALTER TABLE rag.chunks ADD COLUMN IF NOT EXISTS chunk_id TEXT;
ALTER TABLE rag.chunks ADD COLUMN IF NOT EXISTS chunk_index INTEGER;
ALTER TABLE rag.chunks ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE rag.chunks ADD COLUMN IF NOT EXISTS doc_id TEXT;
ALTER TABLE rag.chunks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE rag.chunks
SET
  chunk_id = COALESCE(chunk_id, id::text),
  chunk_index = COALESCE(chunk_index, 0),
  source = COALESCE(source, ''),
  doc_id = COALESCE(doc_id, ''),
  updated_at = COALESCE(updated_at, created_at)
WHERE chunk_id IS NULL
   OR chunk_index IS NULL
   OR source IS NULL
   OR doc_id IS NULL
   OR updated_at IS NULL;

ALTER TABLE rag.chunks ALTER COLUMN chunk_id SET NOT NULL;
ALTER TABLE rag.chunks ALTER COLUMN chunk_index SET NOT NULL;
ALTER TABLE rag.chunks ALTER COLUMN source SET NOT NULL;
ALTER TABLE rag.chunks ALTER COLUMN doc_id SET NOT NULL;
ALTER TABLE rag.chunks ALTER COLUMN updated_at SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_documents_source_doc_id ON rag.documents(source, doc_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_chunks_chunk_id ON rag.chunks(chunk_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_chunks_document_chunk_index ON rag.chunks(document_id, chunk_index);

CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON rag.chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_source_doc_id ON rag.chunks(source, doc_id);
CREATE INDEX IF NOT EXISTS idx_query_logs_created_at ON rag.query_logs(created_at);
