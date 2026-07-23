const defaultPrisma = require('../config/prisma');

// Every function below accepts an optional `client` — pass the `tx` object
// when calling these from inside a prisma.$transaction(async (tx) => ...)
// callback. Using the wrong (outer, non-tx) client from inside a
// transaction opens a second database connection while the first is still
// open, which Neon's pooled connection can reject with errors like
// "Transaction not found" or silently lose track of. When called outside
// any transaction, omit `client` and it falls back to the shared instance.

// Generates the next sequential Student ID, e.g. STU-2026-0007
const generateStudentId = async (client = defaultPrisma) => {
  const settings = await getOrCreateSettings(client);
  const year = new Date().getFullYear();
  const count = await client.student.count();
  const next = String(count + 1).padStart(4, '0');
  return `${settings.studentIdPrefix}-${year}-${next}`;
};

// Generates the next sequential receipt number and atomically increments
// the counter stored in Settings, e.g. RCPT-2026-000123
const generateReceiptNumber = async (client = defaultPrisma) => {
  const settings = await getOrCreateSettings(client);
  const year = new Date().getFullYear();
  const seq = String(settings.receiptNextNumber).padStart(6, '0');

  await client.settings.update({
    where: { id: settings.id },
    data: { receiptNextNumber: { increment: 1 } },
  });

  return `${settings.receiptPrefix}-${year}-${seq}`;
};

const getOrCreateSettings = async (client = defaultPrisma) => {
  let settings = await client.settings.findUnique({ where: { id: '1' } });
  if (!settings) {
    settings = await client.settings.create({ data: { id: '1' } });
  }
  return settings;
};

module.exports = { generateStudentId, generateReceiptNumber, getOrCreateSettings };
