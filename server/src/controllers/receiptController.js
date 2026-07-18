const asyncHandler = require('express-async-handler');
const PDFDocument = require('pdfkit');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { getOrCreateSettings } = require('../utils/idGenerator');
const path = require('path');
const fs = require('fs');

// @desc    Get receipt details (JSON) for on-screen preview
// @route   GET /api/receipts/:id
// @access  Private
const getReceipt = asyncHandler(async (req, res) => {
  const receipt = await prisma.receipt.findUnique({
    where: { id: req.params.id },
    include: {
      feePayment: {
        include: { student: true, collectedBy: { select: { name: true } } },
      },
    },
  });
  if (!receipt) throw new ApiError(404, 'Receipt not found');

  const settings = await getOrCreateSettings();

  res.status(200).json(new ApiResponse(200, { receipt, settings }));
});

// @desc    List receipts (with search/pagination)
// @route   GET /api/receipts
// @access  Private
const getReceipts = asyncHandler(async (req, res) => {
  const { search = '', page = 1, limit = 20 } = req.query;

  const where = search
    ? {
        OR: [
          { receiptNumber: { contains: search, mode: 'insensitive' } },
          { feePayment: { student: { firstName: { contains: search, mode: 'insensitive' } } } },
          { feePayment: { student: { lastName: { contains: search, mode: 'insensitive' } } } },
          { feePayment: { student: { studentId: { contains: search, mode: 'insensitive' } } } },
        ],
      }
    : {};

  const take = Math.min(Number(limit), 100);
  const skip = (Number(page) - 1) * take;

  const [receipts, total] = await Promise.all([
    prisma.receipt.findMany({
      where,
      orderBy: { issuedAt: 'desc' },
      skip,
      take,
      include: { feePayment: { include: { student: true } } },
    }),
    prisma.receipt.count({ where }),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      receipts,
      pagination: { total, page: Number(page), limit: take, totalPages: Math.ceil(total / take) },
    })
  );
});

// @desc    Download receipt as a printable A4 PDF
// @route   GET /api/receipts/:id/pdf
// @access  Private
const downloadReceiptPdf = asyncHandler(async (req, res) => {
  const receipt = await prisma.receipt.findUnique({
    where: { id: req.params.id },
    include: {
      feePayment: {
        include: { student: true, collectedBy: { select: { name: true } } },
      },
    },
  });
  if (!receipt) throw new ApiError(404, 'Receipt not found');

  const settings = await getOrCreateSettings();
  const { feePayment: payment } = receipt;
  const { student } = payment;

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename=${receipt.receiptNumber}.pdf`);
  doc.pipe(res);

  // Header
  if (settings.logoUrl) {
    const logoPath = path.join(__dirname, '..', '..', settings.logoUrl);
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 45, { width: 60 });
    }
  }
  doc
    .fontSize(18)
    .font('Helvetica-Bold')
    .text(settings.collegeName, 120, 50, { align: 'left' });
  doc
    .fontSize(9)
    .font('Helvetica')
    .text(settings.collegeAddress || '', 120, 72)
    .text(
      [settings.collegePhone, settings.collegeEmail].filter(Boolean).join('  |  '),
      120,
      86
    );

  doc.moveTo(50, 115).lineTo(545, 115).stroke();

  doc.fontSize(14).font('Helvetica-Bold').text('FEE PAYMENT RECEIPT', 50, 128, { align: 'center' });

  doc
    .fontSize(10)
    .font('Helvetica')
    .text(`Receipt No: ${receipt.receiptNumber}`, 50, 155)
    .text(`Date: ${new Date(receipt.issuedAt).toLocaleDateString('en-IN')}`, 400, 155);

  // Student details box
  let y = 180;
  doc.font('Helvetica-Bold').fontSize(11).text('Student Details', 50, y);
  y += 18;
  doc.font('Helvetica').fontSize(10);
  const studentRows = [
    ['Name', `${student.firstName} ${student.lastName}`],
    ['Student ID', student.studentId],
    ['Roll No.', student.rollNumber],
    ['Department', student.department],
    ['Course / Branch', `${student.course} / ${student.branch}`],
    ['Semester', `Sem ${payment.semester} - Section ${student.section}`],
    ['Academic Session', payment.academicSession],
  ];
  studentRows.forEach(([label, value]) => {
    doc.text(`${label}:`, 50, y, { continued: false });
    doc.text(String(value), 200, y);
    y += 16;
  });

  y += 10;
  doc.font('Helvetica-Bold').fontSize(11).text('Fee Breakdown', 50, y);
  y += 18;

  const tableTop = y;
  const rows = [
    ['Fee Type', payment.feeType],
    ['Total Amount', formatCurrency(payment.totalAmount)],
    ['Fine', formatCurrency(payment.fine)],
    ['Discount', `- ${formatCurrency(payment.discount)}`],
    ['Scholarship', `- ${formatCurrency(payment.scholarship)}`],
    ['Amount Paid', formatCurrency(payment.amountPaid)],
    ['Balance Due', formatCurrency(payment.balance)],
  ];

  doc.font('Helvetica').fontSize(10);
  rows.forEach(([label, value], idx) => {
    const rowY = tableTop + idx * 20;
    doc.rect(50, rowY - 4, 495, 20).stroke('#e5e7eb');
    doc.text(label, 60, rowY);
    doc.text(String(value), 350, rowY);
  });

  y = tableTop + rows.length * 20 + 20;

  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .text(`Payment Mode: ${payment.paymentMode}`, 50, y)
    .text(`Status: ${payment.status}`, 300, y);

  if (payment.transactionRef) {
    y += 16;
    doc.font('Helvetica').text(`Transaction Ref: ${payment.transactionRef}`, 50, y);
  }

  // QR Code
  if (receipt.qrCodeData) {
    const base64Data = receipt.qrCodeData.split(',')[1];
    const qrBuffer = Buffer.from(base64Data, 'base64');
    doc.image(qrBuffer, 445, y - 10, { width: 90 });
  }

  y += 60;
  doc.moveTo(50, y).lineTo(545, y).stroke('#e5e7eb');
  y += 30;

  doc.fontSize(9).font('Helvetica').text('This is a system-generated receipt.', 50, y);
  doc.text(
    `Collected by: ${payment.collectedBy?.name || 'System'}`,
    50,
    y + 14
  );

  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('_____________________', 400, y)
    .text(settings.authorizedSignatory, 400, y + 14);

  doc.end();
});

const formatCurrency = (amount) => `Rs. ${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

module.exports = { getReceipt, getReceipts, downloadReceiptPdf };
