require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@college.edu').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
  const name = process.env.SEED_ADMIN_NAME || 'System Administrator';

  const existing = await prisma.admin.findUnique({ where: { email } });

  if (!existing) {
    const hashed = await bcrypt.hash(password, 12);
    await prisma.admin.create({
      data: { name, email, password: hashed, role: 'SUPER_ADMIN' },
    });
    console.log(`✅ Seeded super admin: ${email} / ${password}`);
  } else {
    console.log('ℹ️  Admin already exists, skipping admin seed.');
  }

  const settings = await prisma.settings.findUnique({ where: { id: '1' } });
  if (!settings) {
    await prisma.settings.create({ data: { id: '1' } });
    console.log('✅ Seeded default settings.');
  } else {
    console.log('ℹ️  Settings already exist, skipping.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
