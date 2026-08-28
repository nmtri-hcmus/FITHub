import { prisma } from './lib/prisma'; prisma.userBiometrics.findMany().then(console.log).finally(() => prisma.$disconnect());
