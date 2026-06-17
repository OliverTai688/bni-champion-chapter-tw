import 'server-only';

import { S3Client } from '@aws-sdk/client-s3';

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicBaseUrl?: string;
  presignedUrlTtlSeconds: number;
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getR2Config(): R2Config {
  const rawTtl = process.env.R2_PRESIGNED_URL_TTL_SECONDS ?? '900';
  const presignedUrlTtlSeconds = Number.parseInt(rawTtl, 10);

  return {
    accountId: requiredEnv('R2_ACCOUNT_ID'),
    accessKeyId: requiredEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: requiredEnv('R2_SECRET_ACCESS_KEY'),
    bucketName: requiredEnv('R2_BUCKET_NAME'),
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL || undefined,
    presignedUrlTtlSeconds: Number.isFinite(presignedUrlTtlSeconds)
      ? presignedUrlTtlSeconds
      : 900,
  };
}

export function createR2Client(config = getR2Config()) {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}
