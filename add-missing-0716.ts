import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MISSING = ['洪麗卿', '黃杰', '林塏秢', '韓政諺'];

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

  const emptySeatKeys = ['main-7-3', 'main-8-2', 'main-8-3'];
  const emptySeats = seatMap.seats.filter((s) => emptySeatKeys.includes(s.seatKey));
  if (emptySeats.length !== 3) {
    throw new Error(`Expected 3 empty seats, found ${emptySeats.length}`);
  }

  const memberIds = new Map<string, string>();
  for (const name of MISSING) {
    const member = await prisma.member.upsert({
      where: { displayName: name },
      create: { displayName: name, roles: [], metadata: { savedFrom: 'add-missing-0716' } },
      update: { isActive: true },
      select: { id: true, displayName: true },
    });
    memberIds.set(name, member.id);
  }

  // Fill the 3 existing empty seats with the first 3 missing members.
  for (let i = 0; i < emptySeatKeys.length; i++) {
    const seat = emptySeats.find((s) => s.seatKey === emptySeatKeys[i])!;
    const name = MISSING[i];
    await prisma.seat.update({
      where: { id: seat.id },
      data: { kind: 'member' },
    });
    await prisma.seatAssignment.create({
      data: {
        seatMapId: seatMap.id,
        seatId: seat.id,
        memberId: memberIds.get(name),
        displayName: name,
        role: '會員',
        status: 'assigned',
        source: 'add-missing-0716',
      },
    });
    console.log(`Assigned ${name} to ${seat.seatKey}`);
  }

  // Add a new seat for the 4th missing member (no empty seats left).
  const fourthName = MISSING[3];
  const newSeat = await prisma.seat.create({
    data: {
      seatMapId: seatMap.id,
      seatKey: 'main-9-0',
      row: 9,
      col: 0,
      zone: 'main',
      position: 36,
      kind: 'member',
      metadata: { name: fourthName, isGuest: false },
    },
  });
  await prisma.seatAssignment.create({
    data: {
      seatMapId: seatMap.id,
      seatId: newSeat.id,
      memberId: memberIds.get(fourthName),
      displayName: fourthName,
      role: '會員',
      status: 'assigned',
      source: 'add-missing-0716',
    },
  });
  console.log(`Assigned ${fourthName} to new seat ${newSeat.seatKey}`);

  // Ensure memberRoster reference list includes all 4 names.
  const newRoster = [...seatMap.memberRoster];
  for (const name of MISSING) {
    if (!newRoster.includes(name)) newRoster.push(name);
  }
  await prisma.seatMap.update({
    where: { id: seatMap.id },
    data: { memberRoster: newRoster },
  });

  await prisma.operationLog.create({
    data: {
      sessionId: session.id,
      actorRole: 'admin',
      actorName: 'claude-code',
      action: 'seating_manual_fill_missing_members',
      targetType: 'SeatMap',
      targetId: seatMap.id,
      reason: 'Add 4 chapter members missing from 2026-07-16 seat map',
      metadata: { names: MISSING },
    },
  });

  console.log('Done.');
}
main().catch(console.error).finally(() => prisma.$disconnect());
