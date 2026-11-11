// Shared helpers for the weekly-seating skill scripts. Run every script from the
// project root: `node .claude/skills/weekly-seating/scripts/<name>.mjs ...`.
// DATABASE_URL in .env points at PRODUCTION, so every writer defaults to a dry run.

import fs from 'node:fs';
import Module from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { PrismaClient } from '@prisma/client';
import ts from 'typescript';

export const ACTOR = 'claude-code (user approved)';

export function parseArgs() {
  const out = { write: false };
  for (const arg of process.argv.slice(2)) {
    if (arg === '--write') out.write = true;
    else if (arg.startsWith('--')) {
      const [key, ...rest] = arg.slice(2).split('=');
      out[key] = rest.length ? rest.join('=') : true;
    }
  }
  return out;
}

export function requireWeek(value, flag = 'week') {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    console.error(`Pass --${flag}=YYYY-MM-DD`);
    process.exit(1);
  }
  return value;
}

export function loadTsModule(relativePath) {
  const absolutePath = path.join(process.cwd(), relativePath);
  const source = fs.readFileSync(absolutePath, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  });
  const mod = new Module(absolutePath);
  mod.filename = absolutePath;
  mod.paths = Module._nodeModulePaths(path.dirname(absolutePath));
  mod._compile(outputText, absolutePath);
  return mod.exports;
}

export async function withPrisma(fn) {
  const prisma = new PrismaClient();
  try {
    return await fn(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

export async function getSession(prisma, weekId) {
  const session = await prisma.meetingSession.findUnique({ where: { weekId } });
  if (!session) {
    console.error(`No MeetingSession for ${weekId}. Seed the layout first (scripts/seed-current-layout.mjs --write).`);
    process.exit(1);
  }
  return session;
}

/** Same query as listChapterMembers() in src/server/tbx/members.ts. */
export function listChapterMembers(prisma) {
  return prisma.member.findMany({ where: { category: 'member', isActive: true }, orderBy: { displayName: 'asc' } });
}
