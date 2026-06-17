import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const session = await prisma.meetingSession.findFirst({
    where: { weekId: '2026-06-18' },
    include: {
      seatMaps: {
        orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
        include: {
          seats: {
            include: { assignments: true }
          }
        }
      }
    }
  });

  if (!session) {
    console.log('No session found for weekId 2026-06-18');
    return;
  }
  
  console.log(`Session publicSlug: ${session.publicSlug}`);

  for (const seatMap of session.seatMaps) {
    console.log(`SeatMap ID: ${seatMap.id}, Version: ${seatMap.version}, Source: ${seatMap.source}, Status: ${seatMap.status}`);
    const assigned = seatMap.seats.filter(s => s.assignments.length > 0);
    const names = assigned.map(s => s.assignments[0].displayName);
    const duplicates = names.filter((item, index) => names.indexOf(item) !== index);
    console.log(` - Total assigned: ${assigned.length}`);
    console.log(` - Duplicates: ${duplicates.join(', ')}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
