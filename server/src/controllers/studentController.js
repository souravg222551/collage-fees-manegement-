const asyncHandler = require('express-async-handler');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { generateStudentId, getOrCreateSettings } = require('../utils/idGenerator');
const { uploadBufferToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');
const { billStudentForExistingStructure } = require('./feeStructureController');

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
    grade,
    stream,
    section,
    academicSession,
    status,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  // Always scope the list to whichever institution type is currently
  // active in Settings, so switching College <-> School never mixes the
  // two sets of students together.
  const settings = await getOrCreateSettings();

  const where = {
    AND: [
      { institutionType: settings.institutionType },
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
      grade ? { grade } : {},
      stream ? { stream } : {},
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
  const settings = await getOrCreateSettings();

  let photoUrl = null;
  let photoPublicId = null;
  if (req.file) {
    const uploaded = await uploadBufferToCloudinary(req.file.buffer, 'students');
    photoUrl = uploaded.url;
    photoPublicId = uploaded.publicId;
  }

  const data = { ...req.body, studentId, photoUrl, photoPublicId, institutionType: settings.institutionType };
  if (data.semester) data.semester = Number(data.semester);
  else delete data.semester;
  if (data.dob) data.dob = new Date(data.dob);
  if (data.totalFeeAssigned) data.totalFeeAssigned = Number(data.totalFeeAssigned);

  const student = await prisma.student.create({ data });

  // Immediately bill this student for whatever required fee categories
  // already exist for their group (e.g. adding a new "5th" grade student
  // to a class that already has Tuition/Exam/Annual Charge defined).
  await billStudentForExistingStructure(student);

  res.status(201).json(new ApiResponse(201, student, 'Student created successfully'));
});

// Fields a client is allowed to modify on a student record.
// Anything else in the request body (id, studentId, _count, createdAt,
// updatedAt, feePayments, etc.) is deliberately ignored.
const EDITABLE_STUDENT_FIELDS = [
  'rollNumber',
  'enrollmentNumber',
  'firstName',
  'lastName',
  'fathersName',
  'mothersName',
  'dob',
  'gender',
  'mobile',
  'altMobile',
  'email',
  'address',
  'aadharNumber',
  // College-mode fields
  'department',
  'course',
  'branch',
  'semester',
  // School-mode fields
  'grade',
  'stream',
  // Shared
  'section',
  'academicSession',
  'admissionDate',
  'status',
  'totalFeeAssigned',
];

// @desc    Update a student
// @route   PUT /api/students/:id
// @access  Private
const updateStudent = asyncHandler(async (req, res) => {
  const existing = await prisma.student.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, 'Student not found');

  const data = {};
  EDITABLE_STUDENT_FIELDS.forEach((field) => {
    if (req.body[field] !== undefined) data[field] = req.body[field];
  });

  if (data.semester) data.semester = Number(data.semester);
  if (data.dob) data.dob = new Date(data.dob);
  if (data.admissionDate) data.admissionDate = new Date(data.admissionDate);
  if (data.totalFeeAssigned) data.totalFeeAssigned = Number(data.totalFeeAssigned);

  if (req.file) {
    const uploaded = await uploadBufferToCloudinary(req.file.buffer, 'students');
    data.photoUrl = uploaded.url;
    data.photoPublicId = uploaded.publicId;
    // Clean up the old Cloudinary image now that the new one is uploaded
    if (existing.photoPublicId) await deleteFromCloudinary(existing.photoPublicId);
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

  if (existing.photoPublicId) await deleteFromCloudinary(existing.photoPublicId);

  res.status(200).json(new ApiResponse(200, null, 'Student deleted successfully'));
});

// @desc    Get distinct filter options (departments, courses, branches, sessions)
// @route   GET /api/students/meta/filters
// @access  Private
const getFilterOptions = asyncHandler(async (req, res) => {
  const settings = await getOrCreateSettings();
  const where = { institutionType: settings.institutionType };

  const [departments, courses, branches, grades, streams, sessions] = await Promise.all([
    prisma.student.findMany({ where, distinct: ['department'], select: { department: true } }),
    prisma.student.findMany({ where, distinct: ['course'], select: { course: true } }),
    prisma.student.findMany({ where, distinct: ['branch'], select: { branch: true } }),
    prisma.student.findMany({ where, distinct: ['grade'], select: { grade: true } }),
    prisma.student.findMany({ where, distinct: ['stream'], select: { stream: true } }),
    prisma.student.findMany({ where, distinct: ['academicSession'], select: { academicSession: true } }),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      departments: departments.map((d) => d.department).filter(Boolean),
      courses: courses.map((c) => c.course).filter(Boolean),
      branches: branches.map((b) => b.branch).filter(Boolean),
      grades: grades.map((g) => g.grade).filter(Boolean),
      streams: streams.map((s) => s.stream).filter(Boolean),
      sessions: sessions.map((s) => s.academicSession).filter(Boolean),
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
