import 'dotenv/config';

type JsonRecord = Record<string, unknown>;

async function post(url: string, body: JsonRecord): Promise<JsonRecord> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Request failed ${response.status}: ${await response.text()}`);
  }

  return (await response.json()) as JsonRecord;
}

async function run() {
  const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost:3000';

  const retrieval = await post(`${baseUrl}/retrieval/search`, {
    query: 'What does ingestion validate?',
    topK: 3,
    source: 'local-files',
  });

  const query = await post(`${baseUrl}/query/ask`, {
    question: 'What does notes document say?',
    topK: 3,
    source: 'local-files',
  });

  console.log('RAG smoke passed');
  console.log(JSON.stringify({ retrieval, query }, null, 2));
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'unknown error';
  console.error(`RAG smoke failed: ${message}`);
  process.exit(1);
});
