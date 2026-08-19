import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const sessions = await prisma.meetingSession.findMany({
    select: { weekId: true, date: true, title: true, status: true, publicSlug: true, publicStatus: true }
  });
  console.log(JSON.stringify(sessions, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());


