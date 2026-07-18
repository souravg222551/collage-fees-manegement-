const asyncHandler = require('express-async-handler');
const fs = require('fs');
const path = require('path');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { generateStudentId } = require('../utils/idGenerator');

// @desc    List students with search, filters, and pagination
// @route   GET /api/students
// @access  Private
const getStudents = asyncHandler(async (req, res) => {
  const {
    search = '',
    department,
    course,
    branch,
    semester,
    section,
    academicSession,
    status,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const where = {
    AND: [
      search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { studentId: { contains: search, mode: 'insensitive' } },
              { rollNumber: { contains: search, mode: 'insensitive' } },
              { enrollmentNumber: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { mobile: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {},
      department ? { department } : {},
      course ? { course } : {},
      branch ? { branch } : {},
      semester ? { semester: Number(semester) } : {},
      section ? { section } : {},
      academicSession ? { academicSession } : {},
      status ? { status } : {},
    ],
  };

  const take = Math.min(Number(limit), 100);
  const skip = (Number(page) - 1) * take;

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take,
      include: {
        _count: { select: { feePayments: true } },
      },
    }),
    prisma.student.count({ where }),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      students,
      pagination: {
        total,
        page: Number(page),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    })
  );
});

// @desc    Get a single student with fee history
// @route   GET /api/students/:id
// @access  Private
const getStudentById = asyncHandler(async (req, res) => {
  const student = await prisma.student.findUnique({
    where: { id: req.params.id },
    include: {
      feePayments: {
        orderBy: { paidAt: 'desc' },
        include: { receipt: true },
      },
    },
  });

  if (!student) throw new ApiError(404, 'Student not found');

  const totalPaid = student.feePayments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
  const totalOutstanding = student.feePayments.reduce((sum, p) => sum + Number(p.balance), 0);

  res.status(200).json(new ApiResponse(200, { ...student, totalPaid, totalOutstanding }));
});

// @desc    Create a new student
// @route   POST /api/students
// @access  Private
const createStudent = asyncHandler(async (req, res) => {
  const studentId = await generateStudentId();
  const photoUrl = req.file ? `/uploads/students/${req.file.filename}` : null;

  const data = { ...req.body, studentId, photoUrl };
  if (data.semester) data.semester = Number(data.semester);
  if (data.dob) data.dob = new Date(data.dob);
  if (data.totalFeeAssigned) data.totalFeeAssigned = Number(data.totalFeeAssigned);

  const student = await prisma.student.create({ data });

  res.status(201).json(new ApiResponse(201, student, 'Student created successfully'));
});

// @desc    Update a student
// @route   PUT /api/students/:id
// @access  Private
const updateStudent = asyncHandler(async (req, res) => {
  const existing = await prisma.student.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, 'Student not found');

  const data = { ...req.body };
  if (data.semester) data.semester = Number(data.semester);
  if (data.dob) data.dob = new Date(data.dob);
  if (data.totalFeeAssigned) data.totalFeeAssigned = Number(data.totalFeeAssigned);

  if (req.file) {
    data.photoUrl = `/uploads/students/${req.file.filename}`;
    // Remove old photo file if it exists
    if (existing.photoUrl) {
      const oldPath = path.join(__dirname, '..', '..', existing.photoUrl);
      fs.unlink(oldPath, () => {});
    }
  }

  const student = await prisma.student.update({ where: { id: req.params.id }, data });

  res.status(200).json(new ApiResponse(200, student, 'Student updated successfully'));
});

// @desc    Delete a student
// @route   DELETE /api/students/:id
// @access  Private
const deleteStudent = asyncHandler(async (req, res) => {
  const existing = await prisma.student.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, 'Student not found');

  await prisma.student.delete({ where: { id: req.params.id } });

  if (existing.photoUrl) {
    const filePath = path.join(__dirname, '..', '..', existing.photoUrl);
    fs.unlink(filePath, () => {});
  }

  res.status(200).json(new ApiResponse(200, null, 'Student deleted successfully'));
});

// @desc    Get distinct filter options (departments, courses, branches, sessions)
// @route   GET /api/students/meta/filters
// @access  Private
const getFilterOptions = asyncHandler(async (req, res) => {
  const [departments, courses, branches, sessions] = await Promise.all([
    prisma.student.findMany({ distinct: ['department'], select: { department: true } }),
    prisma.student.findMany({ distinct: ['course'], select: { course: true } }),
    prisma.student.findMany({ distinct: ['branch'], select: { branch: true } }),
    prisma.student.findMany({ distinct: ['academicSession'], select: { academicSession: true } }),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      departments: departments.map((d) => d.department),
      courses: courses.map((c) => c.course),
      branches: branches.map((b) => b.branch),
      sessions: sessions.map((s) => s.academicSession),
    })
  );
});

module.exports = {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  getFilterOptions,
};
