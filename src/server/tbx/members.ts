import 'server-only';

import { CHAPTER_MEMBER_DIRECTORY } from '@/lib/chapter-members';
import { prisma } from '@/server/db/prisma';

/**
 * Copies the static directory into the Member collection and marks those rows
 * as chapter members. Existing rows are matched by displayName; profile fields
 * a leader already edited are left alone.
 */
export async function syncMemberDirectory() {
  let created = 0;
  let updated = 0;

  for (const entry of CHAPTER_MEMBER_DIRECTORY) {
    const name = entry.name.trim();
    if (!name) continue;
    const existing = await prisma.member.findUnique({ where: { displayName: name } });

    if (!existing) {
      await prisma.member.create({
        data: {
          displayName: name,
          adminGroup: entry.adminGroup ?? null,
          roles: entry.roles ?? [],
          note: entry.note ?? null,
          category: 'member',
          isActive: true,
        },
      });
      created += 1;
      continue;
    }

    if (existing.category !== 'member' || (existing.roles.length === 0 && (entry.roles?.length ?? 0) > 0) || (!existing.adminGroup && entry.adminGroup)) {
      await prisma.member.update({
        where: { id: existing.id },
        data: {
          category: 'member',
          adminGroup: existing.adminGroup ?? entry.adminGroup ?? null,
          roles: existing.roles.length > 0 ? existing.roles : entry.roles ?? [],
        },
      });
      updated += 1;
    }
  }

  return { created, updated };
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
