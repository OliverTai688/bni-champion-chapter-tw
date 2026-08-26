import { prisma } from '@/server/db/prisma';
import { Prisma } from '@prisma/client';
import { CHAPTER_MEMBER_DIRECTORY } from '@/lib/chapter-members';

function isValidDateString(dateStr: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !isNaN(Date.parse(dateStr));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const date = typeof body?.date === 'string' ? body.date.trim() : '';
  const memberName = typeof body?.memberName === 'string' ? body.memberName.trim() : '';
  const status = typeof body?.status === 'string' ? body.status : '';
  const proxyName = typeof body?.proxyName === 'string' ? body.proxyName.trim() : undefined;

  if (!isValidDateString(date)) {
    return Response.json(
      { error: 'invalid_date', message: '請選擇正確的活動日期。' },
      { status: 400 },
    );
  }

  const memberExists = CHAPTER_MEMBER_DIRECTORY.some((m) => m.name === memberName);
  if (!memberExists) {
    return Response.json(
      { error: 'invalid_member', message: '找不到此會員姓名，請重新輸入。' },
      { status: 400 },
    );
  }

  if (!['present', 'absent', 'proxy'].includes(status)) {
    return Response.json(
      { error: 'invalid_status', message: '請選擇正確的登記項目。' },
      { status: 400 },
    );
  }

  try {
    const session = await prisma.meetingSession.findUnique({
      where: { weekId: date },
      select: { id: true, metadata: true },
    });

    if (session) {
      const currentMetadata =
        session.metadata && typeof session.metadata === 'object'
          ? (session.metadata as Record<string, unknown>)
          : {};

      const currentOverrides = (currentMetadata.attendanceOverrides && typeof currentMetadata.attendanceOverrides === 'object')
        ? { ...(currentMetadata.attendanceOverrides as Record<string, unknown>) }
        : {};

      if (status === 'present') {
        delete currentOverrides[memberName];
      } else {
        currentOverrides[memberName] = {
          status,
          proxyName: status === 'proxy' ? proxyName || '代理人' : undefined,
        };
      }

      const updatedMetadata = {
        ...currentMetadata,
        attendanceOverrides: currentOverrides,
      };

      await prisma.meetingSession.update({
        where: { id: session.id },
        data: {
          metadata: updatedMetadata as Prisma.InputJsonValue,
        },
      });

      await prisma.operationLog.create({
        data: {
          sessionId: session.id,
          actorRole: 'member',
          actorName: memberName,
          action: `member_pre_leave_${status}`,
          targetType: 'MeetingSession',
          targetId: session.id,
          metadata: {
            memberName,
            status,
            proxyName: status === 'proxy' ? proxyName : undefined,
          },
        },
      });
    } else {
      // Create new draft meeting session shell
      const parsedDate = new Date(date);
      const year = parsedDate.getFullYear();
      const rocYear = year - 1911;
      const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const day = String(parsedDate.getDate()).padStart(2, '0');
      const defaultTitle = `${rocYear}/${month}/${day} 座位表`;

      const initialOverrides = {
        [memberName]: {
          status,
          proxyName: status === 'proxy' ? proxyName || '代理人' : undefined,
        },
      };

      const newSession = await prisma.meetingSession.create({
        data: {
          weekId: date,
          date: parsedDate,
          title: defaultTitle,
          chapterName: 'BNI 長冠軍分會',
          meetingLabel: '每週例會排座',
          source: 'generated',
          status: 'draft',
          publicStatus: 'draft',
          publicSlug: `__draft__${date}`,
          metadata: {
            attendanceOverrides: status === 'present' ? {} : initialOverrides,
          } as Prisma.InputJsonValue,
        },
      });

      await prisma.operationLog.create({
        data: {
          sessionId: newSession.id,
          actorRole: 'member',
          actorName: memberName,
          action: `member_pre_leave_${status}_shell_created`,
          targetType: 'MeetingSession',
          targetId: newSession.id,
          metadata: {
            memberName,
            status,
            proxyName: status === 'proxy' ? proxyName : undefined,
          },
        },
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      {
        error: 'database_error',
        message: error instanceof Error ? error.message : '登記失敗，請重試。',
      },
      { status: 500 },
    );
  }
}
