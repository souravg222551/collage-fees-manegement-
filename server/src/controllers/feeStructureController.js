const asyncHandler = require('express-async-handler');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { getOrCreateSettings } = require('../utils/idGenerator');

// The single group identifier a student belongs to for fee-structure
// purposes — School: their grade. College: course + semester combined.
const groupLabelFor = (student, institutionType) =>
  institutionType === 'SCHOOL' ? student.grade : `${student.course || ''}::${student.semester ?? ''}`;

const groupLabelDisplay = (label, institutionType) =>
  institutionType === 'SCHOOL' ? `Class ${label}` : label.replace('::', ' - Semester ');

// Creates a zero-paid, PENDING FeePayment "billing" record linking a
// required (non-optional) FeeStructureItem to every matching student who
// doesn't already have one. This is what makes a fee category show up in
// Reports/Dashboard/the student's payment list immediately once it's
// defined — instead of silently existing only in the structure until
// someone happens to collect it (which caused Reports and the per-student
// Fee Breakdown to disagree).
const billStructureItemToStudents = async (item) => {
  if (item.isOptional) return; // optional items are opt-in per student only

  const students = await prisma.student.findMany({
    where: { academicSession: item.academicSession },
  });

  const matching = students.filter((s) => groupLabelFor(s, s.institutionType) === item.groupLabel);
  if (matching.length === 0) return;

  const existing = await prisma.feePayment.findMany({
    where: { structureItemId: item.id, studentId: { in: matching.map((s) => s.id) } },
    select: { studentId: true },
  });
  const alreadyBilled = new Set(existing.map((e) => e.studentId));

  const toCreate = matching.filter((s) => !alreadyBilled.has(s.id));
  if (toCreate.length === 0) return;

  await prisma.feePayment.createMany({
    data: toCreate.map((s) => ({
      studentId: s.id,
      feeType: item.feeType,
      label: item.label || null,
      structureItemId: item.id,
      academicSession: item.academicSession,
      semester: s.semester || 0,
      totalAmount: item.amount,
      amountPaid: 0,
      balance: item.amount,
      status: 'PENDING',
    })),
  });
};

// Bills every required structure item for a single student's group — used
// right after a new student is created, so they're immediately billed for
// whatever their class's fee structure already defines.
const billStudentForExistingStructure = async (student) => {
  const groupLabel = groupLabelFor(student, student.institutionType);
  if (!groupLabel) return;

  const items = await prisma.feeStructureItem.findMany({
    where: { academicSession: student.academicSession, groupLabel, isOptional: false },
  });

  const existing = await prisma.feePayment.findMany({
    where: { studentId: student.id, structureItemId: { in: items.map((i) => i.id) } },
    select: { structureItemId: true },
  });
  const alreadyBilled = new Set(existing.map((e) => e.structureItemId));

  const toCreate = items.filter((i) => !alreadyBilled.has(i.id));
  if (toCreate.length === 0) return;

  await prisma.feePayment.createMany({
    data: toCreate.map((item) => ({
      studentId: student.id,
      feeType: item.feeType,
      label: item.label || null,
      structureItemId: item.id,
      academicSession: item.academicSession,
      semester: student.semester || 0,
      totalAmount: item.amount,
      amountPaid: 0,
      balance: item.amount,
      status: 'PENDING',
    })),
  });
};

// @desc    List the distinct groups (grades, or course+semester) that
//          currently have students, for the fee-structure editor's dropdown
// @route   GET /api/fee-structure/groups
// @access  Private
const getGroups = asyncHandler(async (req, res) => {
  const settings = await getOrCreateSettings();
  const students = await prisma.student.findMany({
    where: { institutionType: settings.institutionType },
    select: { grade: true, course: true, semester: true },
  });

  const labels = new Set();
  students.forEach((s) => {
    const label = groupLabelFor(s, settings.institutionType);
    if (label && !label.includes('::undefined') && label !== '::') labels.add(label);
  });

  const groups = Array.from(labels)
    .sort()
    .map((label) => ({ value: label, display: groupLabelDisplay(label, settings.institutionType) }));

  res.status(200).json(new ApiResponse(200, { institutionType: settings.institutionType, groups }));
});

// @desc    Get every fee-structure line item for a group + session
// @route   GET /api/fee-structure?academicSession=&groupLabel=
// @access  Private
const getStructure = asyncHandler(async (req, res) => {
  const { academicSession, groupLabel } = req.query;
  if (!academicSession || !groupLabel) {
    throw new ApiError(422, 'academicSession and groupLabel are required');
  }

  const items = await prisma.feeStructureItem.findMany({
    where: { academicSession, groupLabel },
    orderBy: { createdAt: 'asc' },
  });

  const grandTotal = items.filter((i) => !i.isOptional).reduce((sum, i) => sum + Number(i.amount), 0);

  res.status(200).json(new ApiResponse(200, { academicSession, groupLabel, items, grandTotal }));
});

// @desc    Add a fee-structure line item to a group + session
// @route   POST /api/fee-structure
// @access  Private (Super Admin / Admin)
const addItem = asyncHandler(async (req, res) => {
  const { academicSession, groupLabel, feeType, label, amount, frequency, isOptional } = req.body;
  if (!academicSession || !groupLabel || !feeType || amount === undefined) {
    throw new ApiError(422, 'academicSession, groupLabel, feeType, and amount are required');
  }

  const item = await prisma.feeStructureItem.create({
    data: {
      academicSession,
      groupLabel,
      feeType,
      label: label || null,
      amount: Number(amount) || 0,
      frequency: frequency || 'ANNUAL',
      isOptional: Boolean(isOptional),
    },
  });

  await billStructureItemToStudents(item);

  res.status(201).json(new ApiResponse(201, item, 'Fee item added'));
});

// @desc    Update a fee-structure line item
// @route   PUT /api/fee-structure/:id
// @access  Private (Super Admin / Admin)
const updateItem = asyncHandler(async (req, res) => {
  const { feeType, label, amount, frequency, isOptional } = req.body;
  const data = {};
  if (feeType !== undefined) data.feeType = feeType;
  if (label !== undefined) data.label = label || null;
  if (amount !== undefined) data.amount = Number(amount) || 0;
  if (frequency !== undefined) data.frequency = frequency;
  if (isOptional !== undefined) data.isOptional = Boolean(isOptional);

  const item = await prisma.feeStructureItem.update({ where: { id: req.params.id }, data });

  // Keep any still-fully-unpaid billing records in sync with a new amount
  // (never touches records that already have a payment against them).
  if (data.amount !== undefined) {
    await prisma.feePayment.updateMany({
      where: { structureItemId: item.id, amountPaid: 0 },
      data: { totalAmount: item.amount, balance: item.amount },
    });
  }

  // If this item just became required, bill it to every matching student
  // who doesn't already have a record for it.
  if (!item.isOptional) {
    await billStructureItemToStudents(item);
  }

  res.status(200).json(new ApiResponse(200, item, 'Fee item updated'));
});

// @desc    Delete a fee-structure line item
// @route   DELETE /api/fee-structure/:id
// @access  Private (Super Admin / Admin)
const deleteItem = asyncHandler(async (req, res) => {
  await prisma.feeStructureItem.delete({ where: { id: req.params.id } });
  res.status(200).json(new ApiResponse(200, null, 'Fee item removed'));
});

// @desc    Get a student's full fee breakdown: required class items +
//          their personal add-on items, each with computed paid/balance
// @route   GET /api/fee-structure/summary/:studentId
// @access  Private
const getStudentSummary = asyncHandler(async (req, res) => {
  const student = await prisma.student.findUnique({ where: { id: req.params.studentId } });
  if (!student) throw new ApiError(404, 'Student not found');

  const groupLabel = groupLabelFor(student, student.institutionType);

  const [requiredItems, personalItems, payments] = await Promise.all([
    groupLabel
      ? prisma.feeStructureItem.findMany({
          where: { academicSession: student.academicSession, groupLabel, isOptional: false },
        })
      : Promise.resolve([]),
    prisma.studentFeeItem.findMany({ where: { studentId: student.id, academicSession: student.academicSession } }),
    prisma.feePayment.findMany({ where: { studentId: student.id, status: { not: 'CANCELLED' } } }),
  ]);

  const paidForStructureItem = {};
  const paidForPersonalItem = {};
  let unlinkedPaid = 0;

  payments.forEach((p) => {
    if (p.structureItemId) {
      paidForStructureItem[p.structureItemId] = (paidForStructureItem[p.structureItemId] || 0) + Number(p.amountPaid);
    } else if (p.studentFeeItemId) {
      paidForPersonalItem[p.studentFeeItemId] = (paidForPersonalItem[p.studentFeeItemId] || 0) + Number(p.amountPaid);
    } else {
      unlinkedPaid += Number(p.amountPaid);
    }
  });

  const breakdown = [
    ...requiredItems.map((i) => {
      const paid = paidForStructureItem[i.id] || 0;
      return {
        id: i.id,
        source: 'structure',
        feeType: i.feeType,
        label: i.label || i.feeType,
        frequency: i.frequency,
        total: Number(i.amount),
        paid,
        balance: Math.max(Number(i.amount) - paid, 0),
      };
    }),
    ...personalItems.map((i) => {
      const paid = paidForPersonalItem[i.id] || 0;
      return {
        id: i.id,
        source: 'personal',
        feeType: i.feeType,
        label: i.label,
        frequency: i.frequency,
        total: Number(i.amount),
        paid,
        balance: Math.max(Number(i.amount) - paid, 0),
      };
    }),
  ];

  const grandTotal = breakdown.reduce((sum, i) => sum + i.total, 0);
  const grandPaid = breakdown.reduce((sum, i) => sum + i.paid, 0) + unlinkedPaid;
  const grandBalance = breakdown.reduce((sum, i) => sum + i.balance, 0);

  res.status(200).json(
    new ApiResponse(200, {
      groupLabel,
      hasStructure: requiredItems.length > 0 || personalItems.length > 0,
      breakdown,
      unlinkedPaid,
      grandTotal,
      grandPaid,
      grandBalance,
    })
  );
});

// @desc    Backfill: bill every required (non-optional) fee-structure item
//          to every student in its group who's missing a record for it.
//          One-time fix for data that predates auto-billing, and safe to
//          run repeatedly (skips students already billed).
// @route   POST /api/fee-structure/sync-charges
// @access  Private (Super Admin / Admin)
const syncCharges = asyncHandler(async (req, res) => {
  const requiredItems = await prisma.feeStructureItem.findMany({ where: { isOptional: false } });

  let billedCount = 0;
  for (const item of requiredItems) {
    const before = await prisma.feePayment.count({ where: { structureItemId: item.id } });
    await billStructureItemToStudents(item);
    const after = await prisma.feePayment.count({ where: { structureItemId: item.id } });
    billedCount += after - before;
  }

  res.status(200).json(new ApiResponse(200, { billedCount }, `${billedCount} missing billing record(s) created`));
});

module.exports = {
  getGroups,
  getStructure,
  addItem,
  updateItem,
  deleteItem,
  getStudentSummary,
  syncCharges,
  groupLabelFor,
  billStudentForExistingStructure,
};
