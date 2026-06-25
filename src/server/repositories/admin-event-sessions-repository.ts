import 'server-only';

import { createWorkspaceState, CURRENT_MEETING_WEEK, CURRENT_SEATING_HEROES, CURRENT_SEATING_LAYOUT, CURRENT_SEATING_MEMBER_ROSTER } from '@/lib/seating-week';
import { DEFAULT_INDUSTRY_CHAINS } from '@/lib/industry-chains';
import { toAdminSeatingWorkspaceDTO } from '@/application/seating/mappers';
import { prisma } from '@/server/db/prisma';
import { findLatestSeatMapByWeekId } from '@/server/repositories/seating-workspace-repository';
import { saveSeatingDraft } from '@/server/repositories/seating-workspace-repository';
import type { IndustryChain, MeetingWeek, SeatData } from '@/types/seating';
import type { NormalizedSeatingDraft } from '@/application/seating/save-draft';

function isoDateOnly(value: string) {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error('Date must use YYYY-MM-DD format.');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error('Date is invalid.');
  return match[0];
}

function defaultTitle(dateText: string) {
  const [year, month, day] = dateText.split('-').map(Number);
  return `${year - 1911}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')} 座位表`;
}

function isSeatData(value: unknown): value is SeatData {
  return Boolean(value && typeof value === 'object' && typeof (value as SeatData).name === 'string');
}

function isIndustryChainArray(value: unknown): value is IndustryChain[] {
  return Array.isArray(value);
}

function toJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

function jsonSeatDataArray(value: unknown): SeatData[] {
  return Array.isArray(value) ? value.filter(isSeatData) : [];
}

function jsonSeatDataSlots(value: unknown): (SeatData | null)[] {
  return Array.isArray(value) ? value.map((item) => isSeatData(item) ? item : null) : [];
}

function visiblePublicSlug(publicSlug: string | null, publicStatus: string) {
  if (!publicSlug || publicSlug.startsWith('__draft__')) return null;
  if (publicStatus === 'draft' || publicStatus === 'hidden' || publicStatus === 'archived') return null;
  return publicSlug;
}

function toSeatDataFromSeat(seat: ReturnType<typeof toAdminSeatingWorkspaceDTO>['seats'][number]) {
  if (isSeatData(seat.metadata)) return seat.metadata;
  if (!seat.assignment) return null;

  return {
    id: seat.seatKey,
    name: seat.assignment.displayName,
    isGuest: seat.kind === 'guest',
    guestNumber: seat.assignment.guestNumber ?? undefined,
    isHost: seat.kind === 'host',
    hostFor: seat.assignment.hostFor ?? undefined,
    isSound: seat.kind === 'sound',
    isDuty: seat.kind === 'duty',
    role: seat.assignment.role ?? undefined,
  };
}

export async function listAdminEventSessions() {
  const sessions = await prisma.meetingSession.findMany({
    orderBy: { date: 'desc' },
    include: {
      seatMaps: {
        orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
        take: 1,
        include: {
          seats: {
            select: { id: true },
          },
          assignments: {
            select: { id: true },
          },
        },
      },
      livePolls: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  return sessions.map((session) => {
    const seatMap = session.seatMaps[0] ?? null;
    return {
      weekId: session.weekId,
      date: session.date.toISOString(),
      title: session.title,
      chapterName: session.chapterName,
      meetingLabel: session.meetingLabel,
      publicStatus: session.publicStatus,
      publicSlug: visiblePublicSlug(session.publicSlug, session.publicStatus),
      latestSeatMap: seatMap ? {
        id: seatMap.id,
        title: seatMap.title,
        status: seatMap.status,
        version: seatMap.version,
        seatCount: seatMap.seats.length,
        assignmentCount: seatMap.assignments.length,
        updatedAt: seatMap.updatedAt.toISOString(),
      } : null,
      pollCount: session.livePolls.length,
      openPollCount: session.livePolls.filter((poll) => poll.status === 'open').length,
    };
  });
}

export async function listSeatTemplates() {
  const seatTemplate = prisma.seatTemplate;
  if (!seatTemplate) return [];

  const templates = await seatTemplate.findMany({
    where: { isActive: true },
    orderBy: { updatedAt: 'desc' },
  });

  return templates.map((template) => {
    const items = Array.isArray(template.items) ? template.items : [];
    const topRoles = Array.isArray(template.topRoles) ? template.topRoles : [];
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      sourceWeekId: template.sourceWeekId,
      sourceSeatMapId: template.sourceSeatMapId,
      seatCount: items.length + topRoles.length,
      assignmentCount: items.filter(Boolean).length + topRoles.length,
      updatedAt: template.updatedAt.toISOString(),
    };
  });
}

export async function createAdminEventSessionFromCurrentTemplate(input: {
  date: string;
  title?: string;
  meetingLabel?: string;
}) {
  const dateText = isoDateOnly(input.date);
  const week: MeetingWeek = {
    id: dateText,
    date: dateText,
    title: input.title?.trim() || defaultTitle(dateText),
    chapterName: CURRENT_MEETING_WEEK.chapterName,
    meetingLabel: input.meetingLabel?.trim() || CURRENT_MEETING_WEEK.meetingLabel,
    source: 'generated',
  };

  const workspace = createWorkspaceState(
    week,
    CURRENT_SEATING_LAYOUT,
    CURRENT_SEATING_HEROES,
    CURRENT_SEATING_MEMBER_ROSTER,
  );

  const saveResult = await saveSeatingDraft({
    week,
    topRoles: workspace.topRoles,
    items: workspace.items,
    memberRoster: workspace.memberRoster,
    heroes: workspace.heroes,
    industryChains: workspace.industryChains,
    updatedAt: workspace.updatedAt,
    reason: 'Created from admin multi-day event template.',
  });

  return {
    session: (await listAdminEventSessions()).find((session) => session.weekId === week.id) ?? null,
    saveResult,
  };
}

export type SeatMapSourceKind = 'base_template' | 'latest_event' | 'selected_event' | 'named_template';

export async function createEventSeatMap(input: {
  targetDate: string;
  targetTitle?: string;
  meetingLabel?: string;
  sourceKind: SeatMapSourceKind;
  sourceWeekId?: string;
  sourceTemplateId?: string;
  confirmOverwrite?: boolean;
  registrationMode?: boolean;
}) {
  const targetDate = isoDateOnly(input.targetDate);
  const existing = await prisma.meetingSession.findUnique({
    where: { weekId: targetDate },
    select: {
      weekId: true,
      title: true,
      date: true,
    },
  });

  if (existing && !input.confirmOverwrite) {
    return {
      conflict: true as const,
      existing: {
        weekId: existing.weekId,
        title: existing.title,
        date: existing.date.toISOString(),
      },
    };
  }

  const sourceDraft = await buildSourceDraft(input.sourceKind, input.sourceWeekId, input.sourceTemplateId);
  const targetWeek: MeetingWeek = {
    ...sourceDraft.week,
    id: targetDate,
    date: targetDate,
    title: input.targetTitle?.trim() || defaultTitle(targetDate),
    meetingLabel: input.meetingLabel?.trim() || sourceDraft.week.meetingLabel,
    source: 'generated',
  };

  const saveResult = await saveSeatingDraft(
    {
      ...sourceDraft,
      week: targetWeek,
      updatedAt: new Date().toISOString(),
      reason: `Created from ${sourceDraft.week.id} via ${input.sourceKind}.`,
    },
    { registrationMode: Boolean(input.registrationMode) },
  );
  const session = await prisma.meetingSession.findUnique({
    where: { weekId: targetWeek.id },
    select: { id: true },
  });

  await prisma.operationLog.create({
    data: {
      sessionId: session?.id,
      actorRole: 'admin',
      actorName: 'seating-index',
      action: 'event_seat_map_created',
      targetType: 'MeetingSession',
      targetId: session?.id,
      metadata: {
        targetWeekId: targetWeek.id,
        sourceKind: input.sourceKind,
        sourceWeekId: input.sourceWeekId ?? sourceDraft.week.id,
        sourceTemplateId: input.sourceTemplateId,
        confirmedOverwrite: Boolean(input.confirmOverwrite),
        registrationMode: Boolean(input.registrationMode),
        seatMapId: saveResult.seatMapId,
        version: saveResult.version,
      },
    },
  });

  return {
    conflict: false as const,
    week: targetWeek,
    editUrl: `/seats/${encodeURIComponent(targetWeek.id)}`,
    saveResult,
  };
}

export async function createSeatTemplateFromEvent(input: {
  sourceWeekId: string;
  name: string;
  description?: string;
}) {
  const name = input.name.trim();
  if (!name) throw new Error('Template name is required.');

  const sourceSeatMap = await findLatestSeatMapByWeekId(input.sourceWeekId);
  if (!sourceSeatMap) throw new Error('Selected event does not have a seat map.');
  const seatTemplate = prisma.seatTemplate;
  if (!seatTemplate) throw new Error('SeatTemplate model is unavailable. Run prisma generate and restart the dev server.');

  const draft = seatMapToDraft(sourceSeatMap);
  const template = await seatTemplate.upsert({
    where: { name },
    create: {
      name,
      description: input.description?.trim() || null,
      layoutKind: 'bni-weekly-grid',
      topRoles: toJsonValue(draft.topRoles),
      items: toJsonValue(draft.items),
      memberRoster: draft.memberRoster,
      heroes: draft.heroes,
      industryChains: toJsonValue(draft.industryChains),
      sourceWeekId: input.sourceWeekId,
      sourceSeatMapId: sourceSeatMap.id,
      isActive: true,
      metadata: {
        savedFrom: 'admin-event-operations',
        sourceTitle: draft.week.title,
      },
    },
    update: {
      description: input.description?.trim() || null,
      layoutKind: 'bni-weekly-grid',
      topRoles: toJsonValue(draft.topRoles),
      items: toJsonValue(draft.items),
      memberRoster: draft.memberRoster,
      heroes: draft.heroes,
      industryChains: toJsonValue(draft.industryChains),
      sourceWeekId: input.sourceWeekId,
      sourceSeatMapId: sourceSeatMap.id,
      isActive: true,
      metadata: {
        savedFrom: 'admin-event-operations',
        sourceTitle: draft.week.title,
      },
    },
  });

  const session = await prisma.meetingSession.findUnique({
    where: { weekId: input.sourceWeekId },
    select: { id: true },
  });

  await prisma.operationLog.create({
    data: {
      sessionId: session?.id,
      actorRole: 'admin',
      actorName: 'event-operations',
      action: 'seat_template_saved',
      targetType: 'SeatTemplate',
      targetId: template.id,
      metadata: {
        templateId: template.id,
        templateName: template.name,
        sourceWeekId: input.sourceWeekId,
        sourceSeatMapId: sourceSeatMap.id,
      },
    },
  });

  return {
    id: template.id,
    name: template.name,
    description: template.description,
    sourceWeekId: template.sourceWeekId,
    sourceSeatMapId: template.sourceSeatMapId,
    seatCount: draft.items.length + draft.topRoles.length,
    assignmentCount: draft.items.filter(Boolean).length + draft.topRoles.length,
    updatedAt: template.updatedAt.toISOString(),
  };
}

async function buildSourceDraft(sourceKind: SeatMapSourceKind, sourceWeekId?: string, sourceTemplateId?: string): Promise<NormalizedSeatingDraft> {
  if (sourceKind === 'base_template') return buildBaseTemplateDraft();
  if (sourceKind === 'named_template') return buildNamedTemplateDraft(sourceTemplateId);

  const sourceSeatMap = sourceKind === 'selected_event'
    ? sourceWeekId ? await findLatestSeatMapByWeekId(sourceWeekId) : null
    : await findLatestEventSeatMap();

  if (!sourceSeatMap) {
    throw new Error(sourceKind === 'selected_event'
      ? 'Selected source event does not have a seat map.'
      : 'No latest event seat map is available.');
  }

  return seatMapToDraft(sourceSeatMap);
}

function seatMapToDraft(sourceSeatMap: NonNullable<Awaited<ReturnType<typeof findLatestSeatMapByWeekId>>>): NormalizedSeatingDraft {
  const dto = toAdminSeatingWorkspaceDTO(sourceSeatMap);
  const topRoles = Array.isArray(dto.seatMap.topRoles)
    ? dto.seatMap.topRoles.filter(isSeatData)
    : [];
  const items = dto.seats
    .filter((seat) => seat.zone === 'main')
    .sort((a, b) => a.position - b.position)
    .map(toSeatDataFromSeat);

  return {
    week: {
      id: dto.weekId,
      date: dto.date.slice(0, 10),
      title: dto.title,
      chapterName: dto.chapterName,
      meetingLabel: dto.meetingLabel,
      source: 'draft',
    },
    topRoles,
    items,
    memberRoster: dto.seatMap.memberRoster,
    heroes: dto.seatMap.heroes,
    industryChains: isIndustryChainArray(dto.seatMap.industryChains) ? dto.seatMap.industryChains : DEFAULT_INDUSTRY_CHAINS,
    updatedAt: new Date().toISOString(),
    reason: `Source draft from ${dto.weekId}.`,
  };
}

async function buildNamedTemplateDraft(sourceTemplateId?: string): Promise<NormalizedSeatingDraft> {
  if (!sourceTemplateId) throw new Error('Source template is required.');

  const seatTemplate = prisma.seatTemplate;
  if (!seatTemplate) throw new Error('SeatTemplate model is unavailable. Run prisma generate and restart the dev server.');

  const template = await seatTemplate.findUnique({
    where: { id: sourceTemplateId },
  });
  if (!template || !template.isActive) throw new Error('Selected template is unavailable.');

  return {
    week: {
      id: `template-${template.id}`,
      date: CURRENT_MEETING_WEEK.date,
      title: template.name,
      chapterName: CURRENT_MEETING_WEEK.chapterName,
      meetingLabel: CURRENT_MEETING_WEEK.meetingLabel,
      source: 'generated',
    },
    topRoles: jsonSeatDataArray(template.topRoles),
    items: jsonSeatDataSlots(template.items),
    memberRoster: template.memberRoster,
    heroes: template.heroes,
    industryChains: isIndustryChainArray(template.industryChains) ? template.industryChains : DEFAULT_INDUSTRY_CHAINS,
    updatedAt: new Date().toISOString(),
    reason: `Source draft from named template ${template.name}.`,
  };
}

function buildBaseTemplateDraft(): NormalizedSeatingDraft {
  const workspace = createWorkspaceState(
    CURRENT_MEETING_WEEK,
    CURRENT_SEATING_LAYOUT,
    CURRENT_SEATING_HEROES,
    CURRENT_SEATING_MEMBER_ROSTER,
  );

  return {
    week: workspace.week,
    topRoles: workspace.topRoles,
    items: workspace.items,
    memberRoster: workspace.memberRoster,
    heroes: workspace.heroes,
    industryChains: workspace.industryChains,
    updatedAt: workspace.updatedAt,
    reason: 'Source draft from base TypeScript template.',
  };
}

async function findLatestEventSeatMap() {
  const session = await prisma.meetingSession.findFirst({
    orderBy: { date: 'desc' },
    include: {
      seatMaps: {
        orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
        take: 1,
        include: {
          session: true,
          seats: {
            orderBy: [{ zone: 'asc' }, { position: 'asc' }],
            include: {
              assignments: {
                where: {
                  status: {
                    not: 'released',
                  },
                },
                orderBy: { updatedAt: 'desc' },
              },
            },
          },
          assignments: true,
          revisions: {
            orderBy: { version: 'desc' },
            take: 5,
          },
        },
      },
    },
  });

  return session?.seatMaps[0] ?? null;
}
