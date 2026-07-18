const asyncHandler = require('express-async-handler');
const prisma = require('../config/prisma');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');

// Resolves a named period (daily/weekly/monthly) or explicit from/to into a date range
const resolveRange = ({ period, from, to }) => {
  if (from || to) {
    return { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined };
  }
  const now = new Date();
  if (period === 'daily') {
    return { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) };
  }
  if (period === 'weekly') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return { gte: d };
  }
  if (period === 'monthly') {
    return { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
  }
  return {};
};

// @desc    Generate a fee report (daily/weekly/monthly/pending/paid/discount/scholarship)
// @route   GET /api/reports
// @access  Private
const generateReport = asyncHandler(async (req, res) => {
  const { type = 'monthly', period, from, to } = req.query;

  const dateFilter = resolveRange({ period: period || type, from, to });

  let where = { paidAt: dateFilter };

  if (type === 'pending') where = { status: { in: ['PENDING', 'OVERDUE'] } };
  if (type === 'paid') where = { ...where, status: 'PAID' };
  if (type === 'discount') where = { ...where, discount: { gt: 0 } };
  if (type === 'scholarship') where = { ...where, scholarship: { gt: 0 } };

  const payments = await prisma.feePayment.findMany({
    where,
    orderBy: { paidAt: 'desc' },
    include: {
      student: {
        select: { studentId: true, firstName: true, lastName: true, department: true, course: true, semester: true },
      },
      receipt: { select: { receiptNumber: true } },
    },
  });

  const summary = payments.reduce(
    (acc, p) => {
      acc.totalAmount += Number(p.totalAmount);
      acc.totalPaid += Number(p.amountPaid);
      acc.totalDiscount += Number(p.discount);
      acc.totalScholarship += Number(p.scholarship);
      acc.totalFine += Number(p.fine);
      acc.totalOutstanding += Number(p.balance);
      return acc;
    },
    { totalAmount: 0, totalPaid: 0, totalDiscount: 0, totalScholarship: 0, totalFine: 0, totalOutstanding: 0 }
  );

  res.status(200).json(new ApiResponse(200, { type, count: payments.length, summary, payments }));
});

// @desc    Export a report as CSV
// @route   GET /api/reports/export/csv
// @access  Private
const exportCsv = asyncHandler(async (req, res) => {
  const { type = 'monthly', period, from, to } = req.query;
  const dateFilter = resolveRange({ period: period || type, from, to });

  let where = { paidAt: dateFilter };
  if (type === 'pending') where = { status: { in: ['PENDING', 'OVERDUE'] } };
  if (type === 'paid') where = { ...where, status: 'PAID' };
  if (type === 'discount') where = { ...where, discount: { gt: 0 } };
  if (type === 'scholarship') where = { ...where, scholarship: { gt: 0 } };

  const payments = await prisma.feePayment.findMany({
    where,
    orderBy: { paidAt: 'desc' },
    include: { student: true, receipt: true },
  });

  const rows = payments.map((p) => ({
    ReceiptNo: p.receipt?.receiptNumber || '-',
    Date: new Date(p.paidAt).toLocaleDateString('en-IN'),
    StudentID: p.student.studentId,
    StudentName: `${p.student.firstName} ${p.student.lastName}`,
    Department: p.student.department,
    Course: p.student.course,
    Semester: p.semester,
    FeeType: p.feeType,
    TotalAmount: Number(p.totalAmount),
    AmountPaid: Number(p.amountPaid),
    Discount: Number(p.discount),
    Scholarship: Number(p.scholarship),
    Fine: Number(p.fine),
    Balance: Number(p.balance),
    Status: p.status,
    PaymentMode: p.paymentMode,
  }));

  const parser = new Parser();
  const csv = parser.parse(rows.length ? rows : [{ Message: 'No records found for this report' }]);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=${type}-report-${Date.now()}.csv`);
  res.status(200).send(csv);
});

// @desc    Export a report as PDF
// @route   GET /api/reports/export/pdf
// @access  Private
const exportPdf = asyncHandler(async (req, res) => {
  const { type = 'monthly', period, from, to } = req.query;
  const dateFilter = resolveRange({ period: period || type, from, to });

  let where = { paidAt: dateFilter };
  if (type === 'pending') where = { status: { in: ['PENDING', 'OVERDUE'] } };
  if (type === 'paid') where = { ...where, status: 'PAID' };
  if (type === 'discount') where = { ...where, discount: { gt: 0 } };
  if (type === 'scholarship') where = { ...where, scholarship: { gt: 0 } };

  const payments = await prisma.feePayment.findMany({
    where,
    orderBy: { paidAt: 'desc' },
    include: { student: true },
    take: 500,
  });

  const doc = new PDFDocument({ size: 'A4', margin: 40, layout: 'landscape' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${type}-report-${Date.now()}.pdf`);
  doc.pipe(res);

  doc.fontSize(16).font('Helvetica-Bold').text(`${type.toUpperCase()} FEE REPORT`, { align: 'center' });
  doc.fontSize(9).font('Helvetica').text(`Generated on ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
  doc.moveDown(1);

  const headers = ['Student', 'Dept', 'Sem', 'Type', 'Total', 'Paid', 'Discount', 'Balance', 'Status'];
  const colWidths = [140, 90, 40, 80, 70, 70, 70, 70, 70];
  let y = doc.y;
  let x = 40;

  doc.font('Helvetica-Bold').fontSize(9);
  headers.forEach((h, i) => {
    doc.text(h, x, y, { width: colWidths[i] });
    x += colWidths[i];
  });
  y += 16;
  doc.moveTo(40, y).lineTo(760, y).stroke();
  y += 6;

  doc.font('Helvetica').fontSize(8);
  payments.forEach((p) => {
    if (y > 520) {
      doc.addPage({ size: 'A4', margin: 40, layout: 'landscape' });
      y = 40;
    }
    x = 40;
    const values = [
      `${p.student.firstName} ${p.student.lastName}`,
      p.student.department,
      String(p.semester),
      p.feeType,
      Number(p.totalAmount).toFixed(2),
      Number(p.amountPaid).toFixed(2),
      Number(p.discount).toFixed(2),
      Number(p.balance).toFixed(2),
      p.status,
    ];
    values.forEach((v, i) => {
      doc.text(v, x, y, { width: colWidths[i] });
      x += colWidths[i];
    });
    y += 15;
  });

  doc.end();
});

module.exports = { generateReport, exportCsv, exportPdf };
