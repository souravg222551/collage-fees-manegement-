const asyncHandler = require('express-async-handler');
const prisma = require('../config/prisma');
const ApiResponse = require('../utils/ApiResponse');

const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);

// @desc    Live dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
const getStats = asyncHandler(async (req, res) => {
  const today = startOfDay();
  const monthStart = startOfMonth();

  const [
    totalStudents,
    activeStudents,
    collectedAgg,
    outstandingAgg,
    todayAgg,
    monthAgg,
    recentTransactions,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.student.count({ where: { status: 'ACTIVE' } }),
    prisma.feePayment.aggregate({ _sum: { amountPaid: true } }),
    prisma.feePayment.aggregate({ _sum: { balance: true } }),
    prisma.feePayment.aggregate({
      _sum: { amountPaid: true },
      where: { paidAt: { gte: today } },
    }),
    prisma.feePayment.aggregate({
      _sum: { amountPaid: true },
      where: { paidAt: { gte: monthStart } },
    }),
    prisma.feePayment.findMany({
      orderBy: { paidAt: 'desc' },
      take: 8,
      include: {
        student: { select: { firstName: true, lastName: true, studentId: true } },
        receipt: { select: { receiptNumber: true } },
      },
    }),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      totalStudents,
      activeStudents,
      feesCollected: Number(collectedAgg._sum.amountPaid || 0),
      outstandingFees: Number(outstandingAgg._sum.balance || 0),
      todaysCollection: Number(todayAgg._sum.amountPaid || 0),
      monthlyCollection: Number(monthAgg._sum.amountPaid || 0),
      recentTransactions,
    })
  );
});

// @desc    Monthly collection trend (last 12 months)
// @route   GET /api/dashboard/monthly-collection
// @access  Private
const getMonthlyCollection = asyncHandler(async (req, res) => {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);

  const payments = await prisma.feePayment.findMany({
    where: { paidAt: { gte: twelveMonthsAgo } },
    select: { paidAt: true, amountPaid: true },
  });

  const buckets = {};
  for (let i = 0; i < 12; i++) {
    const d = new Date(twelveMonthsAgo);
    d.setMonth(d.getMonth() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets[key] = { month: d.toLocaleString('en-US', { month: 'short' }), year: d.getFullYear(), amount: 0 };
  }

  payments.forEach((p) => {
    const d = new Date(p.paidAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (buckets[key]) buckets[key].amount += Number(p.amountPaid);
  });

  res.status(200).json(new ApiResponse(200, Object.values(buckets)));
});

// @desc    Payment status breakdown (for pie chart)
// @route   GET /api/dashboard/payment-status
// @access  Private
const getPaymentStatusBreakdown = asyncHandler(async (req, res) => {
  const grouped = await prisma.feePayment.groupBy({
    by: ['status'],
    _count: { _all: true },
  });

  res.status(200).json(
    new ApiResponse(
      200,
      grouped.map((g) => ({ status: g.status, count: g._count._all }))
    )
  );
});

// @desc    Collection by semester (for bar chart)
// @route   GET /api/dashboard/collection-by-semester
// @access  Private
const getCollectionBySemester = asyncHandler(async (req, res) => {
  const grouped = await prisma.feePayment.groupBy({
    by: ['semester'],
    _sum: { amountPaid: true },
    orderBy: { semester: 'asc' },
  });

  res.status(200).json(
    new ApiResponse(
      200,
      grouped.map((g) => ({ semester: `Sem ${g.semester}`, amount: Number(g._sum.amountPaid || 0) }))
    )
  );
});

module.exports = { getStats, getMonthlyCollection, getPaymentStatusBreakdown, getCollectionBySemester };
