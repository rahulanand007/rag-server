# RAG v0 Architecture and Tradeoffs

## 1) Overview

RAG v0 is the first production-minded baseline for our `rag-service` built with NestJS, PostgreSQL + pgvector, and OpenAI-compatible models. The objective is to support a practical end-to-end path:

1. ingest documents into normalized chunks with embeddings,
2. retrieve relevant chunks for a user query,
3. synthesize an answer from retrieved context,
4. log query activity for observability and iteration.

Current runtime paths:

- Ingestion path (CLI-first): `parse -> chunk -> embed -> store`
- Query path (API): `embed question -> vector search -> answer generation`
- Health path (API): app + DB readiness check

Why v0 exists:

- de-risk integration across app, DB, and model provider,
- establish deterministic, idempotent ingestion behavior,
- define stable interfaces before optimization.

## 2) Constraints and Assumptions

### Hard constraints

- Stack: Node.js + NestJS + TypeScript.
- Data store: PostgreSQL with `pgvector`.
- ORM layer: Drizzle + typed schema in app.
- Environment-first config (`.env.example` committed, secrets uncommitted).
- Health endpoint includes DB reachability (`SELECT 1`).

### Scope constraints for v0

- Loader support is intentionally minimal (`.txt`, `.md`).
- Chunking is fixed-size with overlap; no semantic splitter yet.
- Embedding model dimension fixed at 1536 (compatible with `text-embedding-3-small`).
- Retrieval uses nearest-neighbor vector ranking only.
- Query synthesis uses context stuffing; no multi-hop tool use.

### Non-goals in v0

- No tenant-level ACLs/authorization model.
- No advanced reranking or hybrid lexical+vector retrieval.
- No offline eval framework or relevance benchmark harness.
- No asynchronous ingestion queue/workers.

## 3) Architecture Summary

### Components

- `IngestionModule` (service/repository): ingestion orchestration and persistence.
- `RetrievalModule` (controller/service/repository): top-k similarity search endpoint.
- `QueryModule` (controller/service/repository): retrieval + generation endpoint.
- `AiModule` (service): embedding and answer generation abstraction.
- `DatabaseModule`: Drizzle client and DB health integration.

### Data flow

1. **Ingest CLI** loads docs from filesystem, normalizes text, computes `docId`.
2. Service chunks text (`chunkSize`, `chunkOverlap`) and computes embeddings.
3. Repository upserts `documents` and `chunks` with deterministic identities.
4. **Retrieval API** embeds query and runs pgvector similarity search.
5. **Query API** selects top contexts and asks LLM to answer from context.
6. Query interaction is written to `rag.query_logs`.

## 4) Data Model and APIs

### Data model (schema-level)

#### `rag.documents`

- `id` (uuid, PK)
- `source` (text)
- `doc_id` (text)
- `updated_at` (timestamptz)
- `content_hash` (text)
- `metadata` (jsonb)
- `created_at`, `ingested_at` (timestamptz)

Key constraints/indexes:

- unique: `(source, doc_id)` for idempotent document upsert.

#### `rag.chunks`

- `id` (uuid, PK)
- `document_id` (uuid FK -> documents)
- `chunk_id` (text)
- `chunk_index` (int)
- `content` (text)
- `token_count` (int)
- `embedding` (`vector(1536)`)
- `source`, `doc_id`, `updated_at`, `metadata`, `created_at`

Key constraints/indexes:

- unique: `chunk_id`
- unique: `(document_id, chunk_index)`
- indexes: `document_id`, `(source, doc_id)`

#### `rag.query_logs`

- `id` (uuid, PK)
- `question` (text)
- `answer` (text)
- `metadata` (jsonb)
- `created_at` (timestamptz)

Key indexes:

- `created_at` for time-ordered debugging and analytics.

### API surface

#### `POST /retrieval/search`

Request:

```json
{
  "query": "What does ingestion validate?",
  "topK": 3,
  "source": "local-files"
}
```

Response (trimmed): ranked chunks with `chunkId`, `docId`, `content`, `score`.

#### `POST /query/ask`

Request:

```json
{
  "question": "What does notes document say?",
  "topK": 3,
  "source": "local-files"
}
```

Response (trimmed): `answer`, retrieved context chunks, usage metadata.

#### Ingestion CLI

```bash
npm run ingest -- --path ./sample-docs --source local-files
```

Optional override:

```bash
npm run ingest -- --path ./sample-docs --databaseUrl "postgresql://..."
```

## 5) Explicit Tradeoffs (v0)

1. **CLI-first ingestion vs API ingestion**
   - Choice: CLI-first.
   - Benefit: simpler operational safety and idempotent batch runs.
   - Cost: no remote ingestion trigger or multi-user orchestration yet.

2. **Fixed-size chunking vs semantic chunking**
   - Choice: fixed-size + overlap.
   - Benefit: deterministic behavior and easy tuning.
   - Cost: chunk boundaries may split concepts, reducing retrieval quality.

3. **Vector-only retrieval vs hybrid retrieval**
   - Choice: vector-only (`pgvector`).
   - Benefit: straightforward implementation and lower complexity.
   - Cost: weaker precision on exact-keyword queries and identifiers.

4. **Synchronous ingestion path vs queued async workers**
   - Choice: synchronous in-process ingest.
   - Benefit: low infrastructure overhead for early stage.
   - Cost: long runs can be slower and less fault-tolerant at scale.

5. **Graceful local embedding fallback vs strict provider dependency**
   - Choice: deterministic local fallback when provider is unavailable.
   - Benefit: local development and smoke tests remain unblocked.
   - Cost: fallback embedding quality differs from production model behavior.

## 6) Risks and Mitigations

1. **Risk: retrieval quality drift due to simplistic chunking**
   - Mitigation: evaluate chunk-size/overlap sweeps and introduce semantic boundaries in v1.

2. **Risk: embedding provider quota/rate failures**
   - Mitigation: batch requests, retries with backoff, provider health metrics, and fallback mode for non-prod.

3. **Risk: stale chunks after document updates**
   - Mitigation: deterministic `chunk_id`, document `content_hash`, and stale-chunk deletion during re-ingest.

4. **Risk: rising latency/cost for query generation**
   - Mitigation: cap `topK`/context chunks, cache frequent query embeddings, and tune generation model.

5. **Risk: weak observability during incidents**
   - Mitigation: persist query logs, include retrieval metadata, and add request-level structured logs.

## 7) Team Share Checklist

- [x] Architecture document written (this file).
- [x] Includes overview, constraints, data model, and API definitions.
- [x] Includes 3+ explicit tradeoffs (5 listed).
- [x] Includes concrete risks with mitigations.

Share this doc in the team channel/PR as:

- `docs/rag-v0-architecture-tradeoffs.md`
