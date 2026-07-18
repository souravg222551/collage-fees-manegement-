import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Mail, Phone, Wallet, Plus } from 'lucide-react';
import { studentApi } from '../api/services';
import { BASE_URL } from '../api/client';
import { Card, Skeleton, StatusBadge, EmptyState } from '../components/ui/Primitives';
import { formatCurrency, formatDate, initials } from '../utils/format';

const StudentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['students', id],
    queryFn: () => studentApi.get(id),
  });

  const student = data?.data?.data;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!student) return null;

  return (
    <div className="space-y-5">
      <button onClick={() => navigate('/students')} className="btn-ghost -ml-2 px-2">
        <ArrowLeft size={16} /> Back to Students
      </button>

      <Card className="flex flex-col sm:flex-row sm:items-center gap-5">
        {student.photoUrl ? (
          <img src={`${BASE_URL}${student.photoUrl}`} alt="" className="w-20 h-20 rounded-xl object-cover" />
        ) : (
          <div className="w-20 h-20 rounded-xl bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-400 flex items-center justify-center text-2xl font-semibold">
            {initials(student.firstName, student.lastName)}
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {student.firstName} {student.lastName}
            </h2>
            <StatusBadge status={student.status} />
          </div>
          <p className="text-sm text-slate-500">
            {student.studentId} &middot; Roll No. {student.rollNumber} &middot; {student.department}
          </p>
          <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <Mail size={13} /> {student.email}
            </span>
            <span className="flex items-center gap-1.5">
              <Phone size={13} /> {student.mobile}
            </span>
          </div>
        </div>
        <Link to={`/fees?studentId=${student.id}`} className="btn-primary shrink-0">
          <Plus size={16} /> Collect Fee
        </Link>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <p className="text-xs text-slate-500">Total Fee Assigned</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-white mt-1">
            {formatCurrency(student.totalFeeAssigned)}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Total Paid</p>
          <p className="text-xl font-semibold text-emerald-600 mt-1">{formatCurrency(student.totalPaid)}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Outstanding Balance</p>
          <p className="text-xl font-semibold text-red-600 mt-1">{formatCurrency(student.totalOutstanding)}</p>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Payment History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-100 dark:border-slate-800">
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Fee Type</th>
                <th className="px-5 py-3">Semester</th>
                <th className="px-5 py-3">Total</th>
                <th className="px-5 py-3">Paid</th>
                <th className="px-5 py-3">Balance</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {student.feePayments.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState icon={Wallet} title="No fee payments yet" description="Collect the first fee payment for this student." />
                  </td>
                </tr>
              ) : (
                student.feePayments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{formatDate(p.paidAt)}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{p.feeType}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">Sem {p.semester}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{formatCurrency(p.totalAmount)}</td>
                    <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-200">
                      {formatCurrency(p.amountPaid)}
                    </td>
                    <td className="px-5 py-3 text-red-600">{formatCurrency(p.balance)}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-5 py-3">
                      {p.receipt ? (
                        <Link to={`/receipts/${p.receipt.id}`} className="text-brand-600 hover:underline text-xs font-medium">
                          {p.receipt.receiptNumber}
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default StudentDetailPage;
