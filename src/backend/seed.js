const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function seed() {
  await prisma.challenge.upsert({
    where: { id: "seed-1" },
    update: {},
    create: {
      id: "seed-1",
      title: "30-Day Daily Logging Streak",
      description: "Log your meals and workouts for 30 consecutive days to earn the Consistency Master badge.",
      startDate: new Date(),
      endDate: new Date(Date.now() + 15 * 86400000),
      criteria: {}
    }
  });
  await prisma.challenge.upsert({
    where: { id: "seed-2" },
    update: {},
    create: {
      id: "seed-2",
      title: "Summer Shred: 10k Steps",
      description: "Hit 10,000 steps every day this month.",
      startDate: new Date(),
      endDate: new Date(Date.now() + 5 * 86400000),
      criteria: {}
    }
  });
  console.log("Seeded challenges");
}
seed().catch(console.error).finally(() => prisma.$disconnect());
