import { prisma } from "./src/lib/prisma";

async function main() {
  await prisma.challenge.upsert({
    where: { id: "chal-001" },
    update: {
      title: "Hit Your Macros Daily",
      description: "Log your daily meals and hit your macro goals for the month to win the Nutrition Master badge.",
      criteria: { type: "macros" }
    },
    create: {
      id: "chal-001",
      title: "Hit Your Macros Daily",
      description: "Log your daily meals and hit your macro goals for the month to win the Nutrition Master badge.",
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 86400000),
      criteria: { type: "macros" }
    }
  });

  await prisma.challenge.upsert({
    where: { id: "chal-002" },
    update: {
      title: "The 30 Days Physique Challenge",
      description: "Update your physique progress log (body weight and photos) consistently for 30 days.",
      criteria: { type: "physique" }
    },
    create: {
      id: "chal-002",
      title: "The 30 Days Physique Challenge",
      description: "Update your physique progress log (body weight and photos) consistently for 30 days.",
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 86400000),
      criteria: { type: "physique" }
    }
  });
  console.log("Challenges re-seeded!");
}
main().catch(console.error).finally(() => prisma.$disconnect());
