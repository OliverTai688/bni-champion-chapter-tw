import { prisma } from '@/server/db/prisma';

export const dynamic = 'force-dynamic';

const DB_HEALTH_TIMEOUT_MS = 6000;

function classifyDatabaseUrl() {
  const value = process.env.DATABASE_URL;
  if (!value) {
    return {
      configured: false,
      validUrl: false,
      protocol: null,
      host: null,
      database: null,
      hasRetryWrites: false,
      hasWriteConcern: false,
      hasAppName: false,
    };
  }

  try {
    const url = new URL(value);
    return {
      configured: true,
      validUrl: true,
      protocol: url.protocol,
      host: url.host,
      database: url.pathname.replace(/^\//, '') || null,
      hasRetryWrites: url.searchParams.has('retryWrites'),
      hasWriteConcern: url.searchParams.has('w'),
      hasAppName: url.searchParams.has('appName'),
    };
  } catch {
    return {
      configured: true,
      validUrl: false,
      protocol: null,
      host: null,
      database: null,
      hasRetryWrites: false,
      hasWriteConcern: false,
      hasAppName: false,
    };
  }
}

async function pingDatabase() {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<{ ok: false; reason: 'timeout'; durationMs: number }>((resolve) => {
    timeoutId = setTimeout(() => {
      resolve({
        ok: false,
        reason: 'timeout',
        durationMs: DB_HEALTH_TIMEOUT_MS,
      });
    }, DB_HEALTH_TIMEOUT_MS);
  });

  const startTime = Date.now();
  const ping = prisma.$runCommandRaw({ ping: 1 })
    .then(() => ({
      ok: true as const,
      reason: 'connected' as const,
      durationMs: Date.now() - startTime,
    }))
    .catch((error) => ({
      ok: false as const,
      reason: 'error' as const,
      durationMs: Date.now() - startTime,
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message.split('\n')[0] : 'Unknown database error',
    }));

  const result = await Promise.race([ping, timeout]);
  if (timeoutId) clearTimeout(timeoutId);
  return result;
}

export async function GET() {
  const urlState = classifyDatabaseUrl();
  if (!urlState.configured || !urlState.validUrl) {
    return Response.json({
      ok: false,
      databaseUrl: urlState,
      status: !urlState.configured ? 'missing_database_url' : 'invalid_database_url',
    }, { status: 500 });
  }

  const ping = await pingDatabase();
  return Response.json({
    ok: ping.ok,
    status: ping.reason,
    durationMs: ping.durationMs,
    databaseUrl: urlState,
    error: ping.ok ? null : {
      name: 'errorName' in ping ? ping.errorName : null,
      message: 'errorMessage' in ping ? ping.errorMessage : null,
    },
  }, { status: ping.ok ? 200 : 503 });
}

