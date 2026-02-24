import 'dotenv/config';
import { existsSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { IngestionService } from '../modules/ingestion/ingestion.service';

function parseArgs(argv: string[]) {
  const args = new Map<string, string>();

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[i + 1];

    if (!next || next.startsWith('--')) {
      args.set(key, 'true');
      continue;
    }

    args.set(key, next);
    i += 1;
  }

  return args;
}

function isRunningInContainer(): boolean {
  return existsSync('/.dockerenv');
}

function normalizeDatabaseUrlForHostCli(databaseUrl: string): string {
  if (!databaseUrl || isRunningInContainer()) {
    return databaseUrl;
  }

  try {
    const parsed = new URL(databaseUrl);
    if (parsed.hostname !== 'db') {
      return databaseUrl;
    }

    parsed.hostname = 'localhost';
    console.warn(
      'DATABASE_URL host was "db". Switched to "localhost" for local CLI execution.',
    );
    return parsed.toString();
  } catch {
    return databaseUrl;
  }
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = args.get('path') ?? args.get('dir') ?? '';

  if (!inputPath) {
    throw new Error(
      'Missing --path argument. Example: npm run ingest -- --path ./sample-docs',
    );
  }

  const chunkSize = Number(args.get('chunkSize') ?? 800);
  const chunkOverlap = Number(args.get('chunkOverlap') ?? 120);
  const source = args.get('source') ?? 'local';
  const cliDatabaseUrl = args.get('databaseUrl') ?? args.get('dbUrl') ?? '';

  if (cliDatabaseUrl) {
    process.env.DATABASE_URL = cliDatabaseUrl;
  }

  process.env.DATABASE_URL = normalizeDatabaseUrlForHostCli(
    process.env.DATABASE_URL ?? '',
  );

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const ingestionService = app.get(IngestionService);
    const result = await ingestionService.ingest({
      path: inputPath,
      source,
      chunkSize,
      chunkOverlap,
    });
    console.log(`Ingestion complete: ${JSON.stringify(result)}`);
  } finally {
    await app.close();
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'unknown error';
  console.error(`Ingestion failed: ${message}`);
  console.error(
    'Hint: if running locally, use --databaseUrl "postgresql://<user>:<pass>@localhost:5432/<db>".',
  );
  process.exit(1);
});
