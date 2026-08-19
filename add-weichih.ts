import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const session = await prisma.meetingSession.findUnique({
    where: { weekId: '2026-07-18' },
    include: { seatMaps: true }
  });
  
  if (!session || !session.seatMaps[0]) {
    console.log("No seat map found for 0718");
    return;
  }

  const seatMap = session.seatMaps[0];
  const newRoster = [...seatMap.memberRoster];
  if (!newRoster.includes('簡偉志')) {
    newRoster.push('簡偉志');
  }

  const newHeroes = [...seatMap.heroes];
  if (!newHeroes.includes('偉志')) {
    // Check if he should be in heroes by looking at previous weeks? 
    // The user just said "把偉志加回去", usually heroes are rotated. Let's just add to roster first.
  }

  await prisma.seatMap.update({
    where: { id: seatMap.id },
    data: { memberRoster: newRoster }
  });

  console.log("Successfully added 簡偉志 to memberRoster.");
}
main().catch(console.error).finally(() => prisma.$disconnect());
