import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileBarChart, Download, FileText } from 'lucide-react';
import { reportApi } from '../api/services';
import { Card, Skeleton, EmptyState } from '../components/ui/Primitives';
import { formatCurrency, formatDate } from '../utils/format';

const REPORT_TYPES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'pending', label: 'Pending Fees' },
  { value: 'paid', label: 'Paid Fees' },
  { value: 'discount', label: 'Discount Report' },
  { value: 'scholarship', label: 'Scholarship Report' },
];

const SUMMARY_CARDS = [
  { key: 'totalAmount', label: 'Total Billed' },
  { key: 'totalPaid', label: 'Total Collected' },
  { key: 'totalDiscount', label: 'Total Discount' },
  { key: 'totalScholarship', label: 'Total Scholarship' },
  { key: 'totalFine', label: 'Total Fine' },
  { key: 'totalOutstanding', label: 'Outstanding' },
];

const ReportsPage = () => {
  const [type, setType] = useState('monthly');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const params = { type, ...(from && { from }), ...(to && { to }) };

  const { data, isLoading } = useQuery({
    queryKey: ['reports', params],
    queryFn: () => reportApi.generate(params),
  });

  const report = data?.data?.data;
  const payments = report?.payments || [];
  const summary = report?.summary;

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="label">Report Type</label>
            <select className="input min-w-[180px]" value={type} onChange={(e) => setType(e.target.value)}>
              {REPORT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">From</label>
            <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex gap-2 ml-auto">
            <a href={reportApi.csvUrl(params)} className="btn-secondary" target="_blank" rel="noreferrer">
              <Download size={15} /> CSV
            </a>
            <a href={reportApi.pdfUrl(params)} className="btn-secondary" target="_blank" rel="noreferrer">
              <FileText size={15} /> PDF
            </a>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {SUMMARY_CARDS.map((c) => (
          <Card key={c.key} className="p-4">
            <p className="text-xs text-slate-500 mb-1">{c.label}</p>
            {isLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {formatCurrency(summary?.[c.key] || 0)}
              </p>
            )}
          </Card>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {REPORT_TYPES.find((t) => t.value === type)?.label} Report
          </h3>
          <span className="text-xs text-slate-400">{report?.count ?? 0} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-100 dark:border-slate-800">
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">Dept / Course</th>
                <th className="px-5 py-3">Sem</th>
                <th className="px-5 py-3">Fee Type</th>
                <th className="px-5 py-3">Total</th>
                <th className="px-5 py-3">Paid</th>
                <th className="px-5 py-3">Balance</th>
                <th className="px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-5 py-4">
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState icon={FileBarChart} title="No records" description="No fee records match this report's criteria." />
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-200">
                      {p.student.firstName} {p.student.lastName}
                      <div className="text-xs text-slate-400 font-normal">{p.student.studentId}</div>
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                      {p.student.department} / {p.student.course}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{p.semester}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{p.feeType}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{formatCurrency(p.totalAmount)}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{formatCurrency(p.amountPaid)}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{formatCurrency(p.balance)}</td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(p.paidAt)}</td>
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

export default ReportsPage;
