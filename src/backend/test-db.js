const { PrismaClient } = require('./src/generated/prisma/client');
const prisma = new PrismaClient();
async function main() {
  const members = await prisma.subCommunityMember.findMany({ include: { subCommunity: true, user: true } });
  console.log(JSON.stringify(members, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
