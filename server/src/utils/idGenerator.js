const prisma = require('../config/prisma');

// Generates the next sequential Student ID, e.g. STU-2026-0007
const generateStudentId = async () => {
  const settings = await getOrCreateSettings();
  const year = new Date().getFullYear();
  const count = await prisma.student.count();
  const next = String(count + 1).padStart(4, '0');
  return `${settings.studentIdPrefix}-${year}-${next}`;
};

// Generates the next sequential receipt number and atomically increments
// the counter stored in Settings, e.g. RCPT-2026-000123
const generateReceiptNumber = async () => {
  const settings = await getOrCreateSettings();
  const year = new Date().getFullYear();
  const seq = String(settings.receiptNextNumber).padStart(6, '0');

  await prisma.settings.update({
    where: { id: settings.id },
    data: { receiptNextNumber: { increment: 1 } },
  });

  return `${settings.receiptPrefix}-${year}-${seq}`;
};

const getOrCreateSettings = async () => {
  let settings = await prisma.settings.findUnique({ where: { id: '1' } });
  if (!settings) {
    settings = await prisma.settings.create({ data: { id: '1' } });
  }
  return settings;
};

module.exports = { generateStudentId, generateReceiptNumber, getOrCreateSettings };
