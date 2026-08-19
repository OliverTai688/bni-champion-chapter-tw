import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// New-member mentor placement rule for 2026-07-16:
// - 洪麗卿(洪總) placed directly above 蘇子茵(子茵)
// - 黃杰(黃律) flanked by 黎士銓(士銓) and 馬廷軒(廷軒) in the same row
// - 韓政諺(政諺) placed directly below 叢晧日(叢導)
const MOVES: { seatKey: string; name: string }[] = [
  { seatKey: 'main-7-3', name: '黃佳琪' },
  { seatKey: 'main-3-1', name: '洪麗卿' },
  { seatKey: 'main-3-2', name: '陳俊鳴' },
  { seatKey: 'main-2-3', name: '林塏秢' },
  { seatKey: 'main-8-1', name: '黎士銓' },
  { seatKey: 'main-8-3', name: '馬廷軒' },
  { seatKey: 'main-9-0', name: '陳志誠' },
  { seatKey: 'main-2-2', name: '韓政諺' },
];

async function main() {
  const session = await prisma.meetingSession.findUnique({
    where: { weekId: '2026-07-16' },
    include: { seatMaps: { include: { seats: { include: { assignments: true } } } } },
  });
  if (!session || !session.seatMaps[0]) {
    console.log('No seat map found for 2026-07-16');
    return;
  }
  const seatMap = session.seatMaps[0];

  const memberIds = new Map<string, string>();
  for (const { name } of MOVES) {
    const member = await prisma.member.upsert({
      where: { displayName: name },
      create: { displayName: name, roles: [], metadata: { savedFrom: 'reseat-0716-mentors' } },
      update: { isActive: true },
      select: { id: true, displayName: true },
    });
    memberIds.set(name, member.id);
  }

  for (const { seatKey, name } of MOVES) {
    const seat = seatMap.seats.find((s) => s.seatKey === seatKey);
    if (!seat) throw new Error(`Seat ${seatKey} not found`);
    const assignment = seat.assignments[0];
    if (!assignment) throw new Error(`Seat ${seatKey} has no active assignment`);
    await prisma.seatAssignment.update({
      where: { id: assignment.id },
      data: { displayName: name, memberId: memberIds.get(name) },
    });
    console.log(`${seatKey}: -> ${name}`);
  }

  await prisma.operationLog.create({
    data: {
      sessionId: session.id,
      actorRole: 'admin',
      actorName: 'claude-code',
      action: 'seating_manual_mentor_placement',
      targetType: 'SeatMap',
      targetId: seatMap.id,
      reason: '新會員(洪麗卿/黃杰/韓政諺)旁邊安排特定成員(蘇子茵/黎士銓+馬廷軒/叢晧日)引導熟悉活動',
      metadata: { moves: MOVES },
    },
  });

  console.log('Done.');
}
main().catch(console.error).finally(() => prisma.$disconnect());
