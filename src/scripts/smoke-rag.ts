import 'dotenv/config';

type JsonRecord = Record<string, unknown>;

type QueryResponse = {
  answer?: string;
  citations?: unknown[];
  usage?: {
    retrieved?: number;
    usedForAnswer?: number;
  };
};

async function post(url: string, body: JsonRecord): Promise<JsonRecord> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(
      `Request failed ${response.status}: ${await response.text()}`,
    );
  }

  return (await response.json()) as JsonRecord;
}

function assertQueryResponseShape(query: QueryResponse) {
  if (typeof query.answer !== 'string') {
    throw new Error('Query response is missing an answer string.');
  }

  if (!Array.isArray(query.citations)) {
    throw new Error('Query response is missing a citations array.');
  }

  if (!query.usage || typeof query.usage.retrieved !== 'number') {
    throw new Error('Query response is missing retrieval usage metadata.');
  }
}

async function run() {
  const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost:3000';

  const retrieval = await post(`${baseUrl}/retrieval/search`, {
    query: 'What does ingestion validate?',
    topK: 3,
    source: 'local-files',
  });

  const query = (await post(`${baseUrl}/query/ask`, {
    question: 'What does notes document say?',
    topK: 3,
    source: 'local-files',
  })) as QueryResponse;

  assertQueryResponseShape(query);

  console.log('RAG smoke passed');
  console.log(JSON.stringify({ retrieval, query }, null, 2));
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'unknown error';
  console.error(`RAG smoke failed: ${message}`);
  process.exit(1);
});
