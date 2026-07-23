const asyncHandler = require('express-async-handler');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { groupLabelFor } = require('./feeStructureController');

// @desc    List the optional fee-structure items available for a student's
//          group (e.g. different Transport distance slabs) — a menu the
//          admin can pick from instead of typing a fully custom item.
// @route   GET /api/students/:studentId/fee-items/catalog
// @access  Private
const getOptionalCatalog = asyncHandler(async (req, res) => {
  const student = await prisma.student.findUnique({ where: { id: req.params.studentId } });
  if (!student) throw new ApiError(404, 'Student not found');

  const groupLabel = groupLabelFor(student, student.institutionType);
  if (!groupLabel) return res.status(200).json(new ApiResponse(200, []));

  const items = await prisma.feeStructureItem.findMany({
    where: { academicSession: student.academicSession, groupLabel, isOptional: true },
    orderBy: { createdAt: 'asc' },
  });

  res.status(200).json(new ApiResponse(200, items));
});

// @desc    List a student's personal fee add-on items
// @route   GET /api/students/:studentId/fee-items
// @access  Private
const getStudentFeeItems = asyncHandler(async (req, res) => {
  const items = await prisma.studentFeeItem.findMany({
    where: { studentId: req.params.studentId },
    orderBy: { createdAt: 'desc' },
  });
  res.status(200).json(new ApiResponse(200, items));
});

// @desc    Add a personal fee item to a student (either copied from the
//          optional catalog, or fully custom)
// @route   POST /api/students/:studentId/fee-items
// @access  Private (Super Admin / Admin)
const addStudentFeeItem = asyncHandler(async (req, res) => {
  const student = await prisma.student.findUnique({ where: { id: req.params.studentId } });
  if (!student) throw new ApiError(404, 'Student not found');

  const { feeType, label, amount, frequency } = req.body;
  if (!label || amount === undefined) {
    throw new ApiError(422, 'label and amount are required');
  }

  const item = await prisma.studentFeeItem.create({
    data: {
      studentId: student.id,
      feeType: feeType || 'OTHER',
      label,
      amount: Number(amount) || 0,
      frequency: frequency || 'ANNUAL',
      academicSession: student.academicSession,
    },
  });

  res.status(201).json(new ApiResponse(201, item, 'Fee item added to student'));
});

// @desc    Remove a personal fee item from a student
// @route   DELETE /api/students/:studentId/fee-items/:itemId
// @access  Private (Super Admin / Admin)
const deleteStudentFeeItem = asyncHandler(async (req, res) => {
  const item = await prisma.studentFeeItem.findUnique({ where: { id: req.params.itemId } });
  if (!item || item.studentId !== req.params.studentId) throw new ApiError(404, 'Fee item not found');

  await prisma.studentFeeItem.delete({ where: { id: req.params.itemId } });
  res.status(200).json(new ApiResponse(200, null, 'Fee item removed'));
});

module.exports = { getOptionalCatalog, getStudentFeeItems, addStudentFeeItem, deleteStudentFeeItem };
