import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const session = await prisma.meetingSession.findUnique({
    where: { weekId: '2026-08-20' },
    include: {
      seatMaps: {
        include: {
          seats: {
            include: {
              assignments: true
            }
          }
        }
      }
    }
  });
  if (!session || session.seatMaps.length === 0) {
    console.log('No seat map found for 2026-08-20');
    return;
  }
  const seatMap = session.seatMaps[0];
  console.log('Session Title:', session.title);
  console.log('Member Roster Size:', seatMap.memberRoster.length);
  console.log('Member Roster:', seatMap.memberRoster);
  console.log('Heroes:', seatMap.heroes);
  
  const activeAssignments = seatMap.seats
    .map(s => {
      const assignment = s.assignments[0];
      return {
        seatKey: s.seatKey,
        kind: s.kind,
        position: s.position,
        assignedName: assignment?.displayName || null,
        status: assignment?.status || null
      };
    })
    .filter(a => a.assignedName !== null);
    
  console.log('Active Assignments Count:', activeAssignments.length);
  console.log('Active Assignments:', activeAssignments);
}
main().catch(console.error).finally(() => prisma.$disconnect());
