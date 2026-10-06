import 'server-only';

import { CHAPTER_MEMBER_DIRECTORY, FORMER_CHAPTER_MEMBER_NAMES } from '@/lib/chapter-members';
import { prisma } from '@/server/db/prisma';

/**
 * Copies the static directory into the Member collection and marks those rows
 * as chapter members. Existing rows are matched by displayName; profile fields
 * a leader already edited are left alone. Aliases from the directory are added
 * to the ones already stored, and members listed as departed are deactivated.
 */
export async function syncMemberDirectory() {
  let created = 0;
  let updated = 0;
  let deactivated = 0;

  for (const entry of CHAPTER_MEMBER_DIRECTORY) {
    const name = entry.name.trim();
    if (!name) continue;
    const directoryAliases = (entry.aliases ?? []).map((alias) => alias.trim()).filter(Boolean);
    const existing = await prisma.member.findUnique({ where: { displayName: name } });

    if (!existing) {
      await prisma.member.create({
        data: {
          displayName: name,
          adminGroup: entry.adminGroup ?? null,
          roles: entry.roles ?? [],
          note: entry.note ?? null,
          aliases: directoryAliases,
          category: 'member',
          isActive: true,
        },
      });
      created += 1;
      continue;
    }

    const missingAliases = directoryAliases.filter((alias) => !existing.aliases.includes(alias));
    if (
      existing.category !== 'member' ||
      (existing.roles.length === 0 && (entry.roles?.length ?? 0) > 0) ||
      (!existing.adminGroup && entry.adminGroup) ||
      missingAliases.length > 0
    ) {
      await prisma.member.update({
        where: { id: existing.id },
        data: {
          category: 'member',
          adminGroup: existing.adminGroup ?? entry.adminGroup ?? null,
          roles: existing.roles.length > 0 ? existing.roles : entry.roles ?? [],
          aliases: [...existing.aliases, ...missingAliases],
        },
      });
      updated += 1;
    }
  }

  // Departed members keep their history (seats, votes, attendance) but leave the roster.
  for (const formerName of FORMER_CHAPTER_MEMBER_NAMES) {
    const existing = await prisma.member.findUnique({ where: { displayName: formerName.trim() } });
    if (!existing) continue;
    if (existing.category === 'member' && !existing.isActive) continue;
    await prisma.member.update({ where: { id: existing.id }, data: { category: 'member', isActive: false } });
    deactivated += 1;
  }

  return { created, updated, deactivated };
}

/** Active chapter members. Seeds from the static directory the first time. */
export async function listChapterMembers() {
  let members = await prisma.member.findMany({
    where: { category: 'member', isActive: true },
    orderBy: { displayName: 'asc' },
  });

  if (members.length === 0) {
    await syncMemberDirectory();
    members = await prisma.member.findMany({
      where: { category: 'member', isActive: true },
      orderBy: { displayName: 'asc' },
    });
  }

  return members;
}

/** Normalises a PALMS style name ("道元 Lam,Kirin") to its CJK part. */
export function normalizeMemberName(lastName: string, firstName: string) {
  const first = firstName.trim().split(/\s+/)[0] ?? '';
  return `${lastName.trim()}${first}`;
}
