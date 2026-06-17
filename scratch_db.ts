import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const session = await prisma.meetingSession.findUnique({
    where: { weekId: '2026-06-18' },
    include: {
      seatMaps: {
        orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
        take: 1,
        include: {
          seats: {
            include: { assignments: true }
          }
        }
      }
    }
  });

  if (!session || !session.seatMaps[0]) {
    console.log('No session or seatMap found.');
    return;
  }

  const seatMap = session.seatMaps[0];
  console.log(`Latest SeatMap Version: ${seatMap.version}`);
  console.log(`Total Seats: ${seatMap.seats.length}`);
  const assigned = seatMap.seats.filter(s => s.assignments.length > 0);
  console.log(`Total Assigned Seats: ${assigned.length}`);
  
  const names = assigned.map(s => s.assignments[0].displayName);
  const duplicates = names.filter((item, index) => names.indexOf(item) !== index);
  console.log(`Duplicates: ${duplicates.join(', ')}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
