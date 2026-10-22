#!/usr/bin/env node
// Imports a pasted LINE 接龍 gift list into one event's gifts (長冠軍禮物).
//
//   node scripts/import-gift-list.mjs --week=2026-10-22 --file=scripts/data/gifts-2026-10-22.txt --dry-run
//   DATABASE_URL=... node scripts/import-gift-list.mjs --week=2026-10-22 --file=... --write
//
// --dry-run parses the list against the static roster and needs no database.
// --write resolves donors against the database roster, skips lines already
// imported for this event (same line number and name), appends the rest after
// the existing gifts and writes one operation log per gift.

import fs from 'node:fs';
import Module from 'node:module';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';

const projectRoot = process.cwd();
const arg = (name) => process.argv.find((item) => item.startsWith(`--${name}=`))?.slice(name.length + 3);
const week = arg('week');
const file = arg('file');
const write = process.argv.includes('--write');
const dryRun = process.argv.includes('--dry-run');

if (!week || !file || write === dryRun) {
  console.error('Usage: --week=YYYY-MM-DD --file=<list.txt> (--dry-run | --write)');
  process.exit(1);
}

function loadTsModule(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath);
  const output = ts.transpileModule(fs.readFileSync(absolutePath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const mod = new Module(absolutePath);
  mod.filename = absolutePath;
  mod.paths = Module._nodeModulePaths(path.dirname(absolutePath));
  mod._compile(output, absolutePath);
  return mod.exports;
}

const { parseGiftList } = loadTsModule('src/lib/tbx/gift-list.ts');
const directory = loadTsModule('src/lib/chapter-members.ts');
const text = fs.readFileSync(path.resolve(projectRoot, file), 'utf8');

function print(rows) {
  for (const row of rows) {
    const donor = row.donorMemberName ?? (row.donorName ? `${row.donorName}（非會員名冊）` : '（未填）');
    console.log(`${String(row.line).padStart(2)}. ${donor.padEnd(10)} ${row.name}${row.note ? `   [${row.note}]` : ''}`);
  }
  console.log(`\n${rows.length} gifts, ${rows.filter((row) => row.donorMemberName).length} matched to members.`);
}

if (dryRun) {
  const members = directory.CHAPTER_MEMBER_DIRECTORY.map((member) => ({ id: null, displayName: member.name, aliases: member.aliases }));
  print(parseGiftList(text, members, directory.FORMER_CHAPTER_MEMBER_NAMES));
  process.exit(0);
}

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
try {
  const session = await prisma.meetingSession.findUnique({ where: { weekId: week } });
  if (!session) throw new Error(`No event with weekId ${week}.`);

  const members = await prisma.member.findMany({
    where: { isActive: true, category: 'member' },
    select: { id: true, displayName: true, aliases: true },
  });
  const rows = parseGiftList(text, members, directory.FORMER_CHAPTER_MEMBER_NAMES);
  print(rows);

  const existing = await prisma.gift.findMany({ where: { sessionId: session.id }, select: { name: true, note: true, position: true } });
  const importedKeys = new Set(existing.map((gift) => `${gift.note ?? ''}|${gift.name}`));
  let position = existing.reduce((max, gift) => Math.max(max, gift.position), -1);
  let created = 0;

  for (const row of rows) {
    const note = [`清單 #${row.line}`, row.note].filter(Boolean).join('・');
    if (importedKeys.has(`${note}|${row.name}`)) continue;
    position += 1;
    const gift = await prisma.gift.create({
      data: {
        sessionId: session.id,
        name: row.name.slice(0, 60),
        quantity: 1,
        donorMemberId: row.donorMemberId,
        donorName: row.donorMemberId ? null : row.donorName,
        note,
        position,
      },
    });
    await prisma.operationLog.create({
      data: {
        sessionId: session.id,
        actorRole: 'import',
        actorName: 'import-gift-list',
        action: 'gift_created',
        targetType: 'Gift',
        targetId: gift.id,
        metadata: { name: gift.name, quantity: 1, donor: row.donorMemberName ?? row.donorName, note, source: path.basename(file) },
      },
    });
    created += 1;
  }
  console.log(`Created ${created} gifts for ${week} (${rows.length - created} already present).`);
} finally {
  await prisma.$disconnect();
}
