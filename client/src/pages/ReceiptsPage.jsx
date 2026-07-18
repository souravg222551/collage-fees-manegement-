import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, Receipt as ReceiptIcon, Eye, Download } from 'lucide-react';
import { receiptApi } from '../api/services';
import { Card, Skeleton, EmptyState, Pagination } from '../components/ui/Primitives';
import { formatCurrency, formatDateTime } from '../utils/format';
import useDebounce from '../hooks/useDebounce';

const ReceiptsPage = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search, 400);

  const { data, isLoading } = useQuery({
    queryKey: ['receipts', { search: debounced, page }],
    queryFn: () => receiptApi.list({ search: debounced, page, limit: 12 }),
  });

  const receipts = data?.data?.data?.receipts || [];
  const pagination = data?.data?.data?.pagination;

  return (
    <div className="space-y-5">
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9"
          placeholder="Search receipt number or student..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-100 dark:border-slate-800">
                <th className="px-5 py-3">Receipt No.</th>
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">Amount Paid</th>
                <th className="px-5 py-3">Issued</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="px-5 py-4">
                      <Skeleton className="h-8 w-full" />
                    </td>
                  </tr>
                ))
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState icon={ReceiptIcon} title="No receipts yet" description="Receipts are generated automatically when a fee payment is collected." />
                  </td>
                </tr>
              ) : (
                receipts.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-200">{r.receiptNumber}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                      {r.feePayment.student.firstName} {r.feePayment.student.lastName}
                      <span className="text-xs text-slate-400 ml-2">{r.feePayment.student.studentId}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                      {formatCurrency(r.feePayment.amountPaid)}
                    </td>
                    <td className="px-5 py-3 text-slate-500">{formatDateTime(r.issuedAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/receipts/${r.id}`}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="View"
                        >
                          <Eye size={14} />
                        </Link>
                        <a
                          href={receiptApi.pdfUrl(r.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Download PDF"
                        >
                          <Download size={14} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {pagination && (
          <div className="px-5 pb-4">
            <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={setPage} />
          </div>
        )}
      </Card>
    </div>
  );
};

export default ReceiptsPage;
