const defaultPrisma = require('../config/prisma');

// Every function below accepts an optional `client` — pass the `tx` object
// when calling these from inside a prisma.$transaction(async (tx) => ...)
// callback. Using the wrong (outer, non-tx) client from inside a
// transaction opens a second database connection while the first is still
// open, which Neon's pooled connection can reject with errors like
// "Transaction not found" or silently lose track of. When called outside
// any transaction, omit `client` and it falls back to the shared instance.

// Generates the next sequential Student ID, e.g. STU-2026-0007, and
// atomically increments a persistent counter in Settings. Deliberately
// does NOT derive the number from student.count() — that count drops the
// moment any student is deleted, which would eventually reissue an ID that
// still exists on another record and fail with a duplicate-key error.
//
// Self-healing: if the counter is behind reality (e.g. right after this
// counter was introduced, when existing students already occupy the low
// numbers), it keeps advancing past any ID that's already taken instead of
// colliding.
const generateStudentId = async (client = defaultPrisma) => {
  const settings = await getOrCreateSettings(client);
  const year = new Date().getFullYear();

  let candidateNumber = settings.studentIdNextNumber;
  let studentId;
  // Cap the search so a runaway loop can't hang the request; in practice
  // this only ever iterates past the handful of pre-existing IDs, if any.
  for (let attempts = 0; attempts < 10000; attempts++) {
    studentId = `${settings.studentIdPrefix}-${year}-${String(candidateNumber).padStart(4, '0')}`;
    // eslint-disable-next-line no-await-in-loop
    const existing = await client.student.findUnique({ where: { studentId }, select: { id: true } });
    if (!existing) break;
    candidateNumber += 1;
  }

  await client.settings.update({
    where: { id: settings.id },
    data: { studentIdNextNumber: candidateNumber + 1 },
  });

  return studentId;
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
