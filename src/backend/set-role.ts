import dotenv from 'dotenv';
dotenv.config();

import { prisma } from './src/lib/prisma';

// Usage: npx tsx set-role.ts <email> <ROLE>
// Roles can be: USER, COACH, ADMIN

const email = process.argv[2];
const roleInput = process.argv[3];

const validRoles = ['USER', 'COACH', 'ADMIN'];

async function run() {
  if (!email || !roleInput) {
    console.error('Error: Please provide both email and role.');
    console.log('Usage: npx tsx set-role.ts <email> <ROLE>');
    console.log('Example: npx tsx set-role.ts test01@gmail.com COACH');
    process.exit(1);
  }

  const targetRole = roleInput.toUpperCase();

  if (!validRoles.includes(targetRole)) {
    console.error(`Error: Invalid role "${roleInput}". Valid roles are: ${validRoles.join(', ')}`);
    process.exit(1);
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.error(`Error: User with email "${email}" not found.`);
    process.exit(1);
  }

  // Update role
  const updatedUser = await prisma.user.update({
    where: { email },
    data: { role: targetRole as any },
  });

  console.log(`✓ SUCCESS: Updated role for ${updatedUser.name} (${email}) to: ${updatedUser.role}`);

  // Special handling: if upgraded to COACH, make sure they have a CoachProfile
  if (targetRole === 'COACH') {
    const profile = await prisma.coachProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        specialty: 'Personal Trainer',
        hourlyRate: 100,
        isVerified: true,
      },
      update: {
        isVerified: true,
      },
    });
    console.log(`✓ CoachProfile initialized & marked active/verified.`);
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
