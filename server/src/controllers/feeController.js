const asyncHandler = require('express-async-handler');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { generateReceiptNumber } = require('../utils/idGenerator');
const QRCode = require('qrcode');

// Computes balance and status from the raw monetary fields.
// balance = totalAmount + fine - discount - scholarship - amountPaid
const computeDerivedFields = ({ totalAmount, amountPaid, discount, scholarship, fine }) => {
  const net = Number(totalAmount) + Number(fine || 0) - Number(discount || 0) - Number(scholarship || 0);
  const balance = Math.max(net - Number(amountPaid || 0), 0);

  let status;
  if (balance <= 0) status = 'PAID';
  else if (Number(amountPaid || 0) > 0) status = 'PARTIAL';
  else status = 'PENDING';

  return { balance, status };
};

// @desc    Collect a fee payment (creates FeePayment + Receipt)
// @route   POST /api/fees
// @access  Private
const collectFee = asyncHandler(async (req, res) => {
  const {
    studentId,
    feeType,
    academicSession,
    semester,
    totalAmount,
    amountPaid,
    discount = 0,
    scholarship = 0,
    fine = 0,
    paymentMode,
    transactionRef,
    remarks,
    dueDate,
  } = req.body;

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new ApiError(404, 'Student not found');

  const { balance, status } = computeDerivedFields({ totalAmount, amountPaid, discount, scholarship, fine });

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.feePayment.create({
      data: {
        studentId,
        feeType: feeType || 'TUITION',
        academicSession,
        semester: Number(semester),
        totalAmount: Number(totalAmount),
        amountPaid: Number(amountPaid || 0),
        discount: Number(discount),
        scholarship: Number(scholarship),
        fine: Number(fine),
        balance,
        status,
        paymentMode: paymentMode || 'CASH',
        transactionRef,
        remarks,
        dueDate: dueDate ? new Date(dueDate) : null,
        collectedById: req.admin.id,
      },
    });

    let receipt = null;
    if (Number(amountPaid || 0) > 0) {
      const receiptNumber = await generateReceiptNumber();
      const qrPayload = JSON.stringify({ receiptNumber, studentId: student.studentId, amount: amountPaid });
      const qrCodeData = await QRCode.toDataURL(qrPayload);

      receipt = await tx.receipt.create({
        data: { receiptNumber, feePaymentId: payment.id, qrCodeData },
      });
    }

    return { payment, receipt };
  });

  res.status(201).json(new ApiResponse(201, result, 'Fee payment recorded successfully'));
});

// @desc    List fee payments with filters and pagination
// @route   GET /api/fees
// @access  Private
const getFeePayments = asyncHandler(async (req, res) => {
  const {
    studentId,
    status,
    feeType,
    academicSession,
    semester,
    from,
    to,
    page = 1,
    limit = 20,
  } = req.query;

  const where = {
    AND: [
      studentId ? { studentId } : {},
      status ? { status } : {},
      feeType ? { feeType } : {},
      academicSession ? { academicSession } : {},
      semester ? { semester: Number(semester) } : {},
      from || to
        ? {
            paidAt: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          }
        : {},
    ],
  };

  const take = Math.min(Number(limit), 100);
  const skip = (Number(page) - 1) * take;

  const [payments, total] = await Promise.all([
    prisma.feePayment.findMany({
      where,
      orderBy: { paidAt: 'desc' },
      skip,
      take,
      include: {
        student: {
          select: { id: true, studentId: true, firstName: true, lastName: true, department: true, course: true },
        },
        receipt: true,
        collectedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.feePayment.count({ where }),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      payments,
      pagination: { total, page: Number(page), limit: take, totalPages: Math.ceil(total / take) },
    })
  );
});

// @desc    Get single fee payment
// @route   GET /api/fees/:id
// @access  Private
const getFeePaymentById = asyncHandler(async (req, res) => {
  const payment = await prisma.feePayment.findUnique({
    where: { id: req.params.id },
    include: { student: true, receipt: true, collectedBy: { select: { id: true, name: true } } },
  });
  if (!payment) throw new ApiError(404, 'Fee payment not found');
  res.status(200).json(new ApiResponse(200, payment));
});

// @desc    Edit a fee payment (recomputes balance/status; issues receipt if newly paid)
// @route   PUT /api/fees/:id
// @access  Private
const updateFeePayment = asyncHandler(async (req, res) => {
  const existing = await prisma.feePayment.findUnique({ where: { id: req.params.id }, include: { receipt: true } });
  if (!existing) throw new ApiError(404, 'Fee payment not found');

  const merged = {
    totalAmount: req.body.totalAmount ?? existing.totalAmount,
    amountPaid: req.body.amountPaid ?? existing.amountPaid,
    discount: req.body.discount ?? existing.discount,
    scholarship: req.body.scholarship ?? existing.scholarship,
    fine: req.body.fine ?? existing.fine,
  };
  const { balance, status } = computeDerivedFields(merged);

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.feePayment.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        ...(req.body.totalAmount !== undefined && { totalAmount: Number(req.body.totalAmount) }),
        ...(req.body.amountPaid !== undefined && { amountPaid: Number(req.body.amountPaid) }),
        ...(req.body.discount !== undefined && { discount: Number(req.body.discount) }),
        ...(req.body.scholarship !== undefined && { scholarship: Number(req.body.scholarship) }),
        ...(req.body.fine !== undefined && { fine: Number(req.body.fine) }),
        balance,
        status,
      },
    });

    // Issue a receipt if the payment is now paid/partial but had no receipt yet
    let receipt = existing.receipt;
    if (!receipt && Number(merged.amountPaid) > 0) {
      const receiptNumber = await generateReceiptNumber();
      const qrPayload = JSON.stringify({ receiptNumber, feePaymentId: payment.id });
      const qrCodeData = await QRCode.toDataURL(qrPayload);
      receipt = await tx.receipt.create({ data: { receiptNumber, feePaymentId: payment.id, qrCodeData } });
    }

    return { payment, receipt };
  });

  res.status(200).json(new ApiResponse(200, result, 'Fee payment updated successfully'));
});

// @desc    Delete a fee payment
// @route   DELETE /api/fees/:id
// @access  Private
const deleteFeePayment = asyncHandler(async (req, res) => {
  const existing = await prisma.feePayment.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, 'Fee payment not found');

  await prisma.feePayment.delete({ where: { id: req.params.id } });

  res.status(200).json(new ApiResponse(200, null, 'Fee payment deleted successfully'));
});

module.exports = {
  collectFee,
  getFeePayments,
  getFeePaymentById,
  updateFeePayment,
  deleteFeePayment,
};
