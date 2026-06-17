import 'server-only';

import { randomBytes } from 'node:crypto';
import { prisma } from '@/server/db/prisma';
import type { AdminEventPublicationDTO, PublicEventPublishAction } from '@/application/events/publication';

const DRAFT_PUBLIC_SLUG_PREFIX = '__draft__';

function isDraftPublicSlug(publicSlug: string | null) {
  return Boolean(publicSlug?.startsWith(DRAFT_PUBLIC_SLUG_PREFIX));
}

function visiblePublicSlug(publicSlug: string | null) {
  return isDraftPublicSlug(publicSlug) ? null : publicSlug;
}

function buildPublicUrl(publicSlug: string | null) {
  const slug = visiblePublicSlug(publicSlug);
  return slug ? `/w/${slug}` : null;
}

function toDTO(session: {
  weekId: string;
  title: string;
  publicSlug: string | null;
  publicStatus: string;
  updatedAt: Date;
}): AdminEventPublicationDTO {
  return {
    weekId: session.weekId,
    title: session.title,
    publicSlug: visiblePublicSlug(session.publicSlug),
    publicUrl: buildPublicUrl(session.publicSlug),
    publicStatus: session.publicStatus,
    updatedAt: session.updatedAt.toISOString(),
  };
}

function slugPrefix(weekId: string) {
  return weekId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'week';
}

async function generateUniqueSlug(weekId: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = `${slugPrefix(weekId)}-${randomBytes(3).toString('hex')}`;
    const existing = await prisma.meetingSession.findUnique({
      where: { publicSlug: slug },
      select: { id: true },
    });
    if (!existing) return slug;
  }

  throw new Error('Unable to generate a unique public slug.');
}

export async function getEventPublicationByWeekId(weekId: string) {
  const session = await prisma.meetingSession.findUnique({
    where: { weekId },
    select: {
      weekId: true,
      title: true,
      publicSlug: true,
      publicStatus: true,
      updatedAt: true,
    },
  });

  return session ? toDTO(session) : null;
}

export async function updateEventPublication(
  weekId: string,
  action: PublicEventPublishAction,
  actorName: string,
) {
  const session = await prisma.meetingSession.findUnique({
    where: { weekId },
    select: {
      id: true,
      weekId: true,
      title: true,
      publicSlug: true,
      publicStatus: true,
    },
  });

  if (!session) return null;

  const publicSlug = action === 'generate_slug' || action === 'publish'
    ? visiblePublicSlug(session.publicSlug) ?? await generateUniqueSlug(weekId)
    : session.publicSlug;

  const publicStatus = action === 'publish'
    ? 'published'
    : action === 'hide'
      ? 'hidden'
      : action === 'archive'
        ? 'archived'
        : session.publicStatus;

  const updated = await prisma.meetingSession.update({
    where: { id: session.id },
    data: {
      publicSlug,
      publicStatus,
      publicConfig: {
        route: buildPublicUrl(publicSlug),
        lastAction: action,
      },
    },
    select: {
      weekId: true,
      title: true,
      publicSlug: true,
      publicStatus: true,
      updatedAt: true,
    },
  });

  await prisma.operationLog.create({
    data: {
      sessionId: session.id,
      actorRole: 'admin',
      actorName,
      action: `public_event_${action}`,
      targetType: 'MeetingSession',
      targetId: session.id,
      metadata: {
        publicStatus,
        hasPublicSlug: Boolean(publicSlug),
      },
    },
  });

  return toDTO(updated);
}
