import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { Pencil, Trash2, Receipt as ReceiptIcon, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { feeApi, studentApi } from '../api/services';
import { Card, Skeleton, StatusBadge, Pagination, EmptyState } from '../components/ui/Primitives';
import { formatCurrency, formatDate } from '../utils/format';
import CollectFeePanel from '../components/fees/CollectFeePanel';
import EditPaymentModal from '../components/fees/EditPaymentModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const STATUS_OPTIONS = ['', 'PAID', 'PARTIAL', 'PENDING', 'OVERDUE', 'CANCELLED', 'REFUNDED'];

const FeesPage = () => {
  const [searchParams] = useSearchParams();
  const presetStudentId = searchParams.get('studentId');
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: presetStudentRes } = useQuery({
    queryKey: ['students', presetStudentId],
    queryFn: () => studentApi.get(presetStudentId),
    enabled: Boolean(presetStudentId),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['fees', { page, status }],
    queryFn: () => feeApi.list({ page, limit: 10, status: status || undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => feeApi.remove(id),
    onSuccess: () => {
      toast.success('Payment record deleted');
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete payment'),
  });

  const payments = data?.data?.data?.payments || [];
  const pagination = data?.data?.data?.pagination;

  return (
    <div className="space-y-5">
      <CollectFeePanel presetStudent={presetStudentRes?.data?.data} />

      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Payment History</h3>
          <select
            className="input w-40"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s || 'All Statuses'}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-100 dark:border-slate-800">
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">Fee Type</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Total</th>
                <th className="px-5 py-3">Paid</th>
                <th className="px-5 py-3">Balance</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-5 py-4">
                      <Skeleton className="h-8 w-full" />
                    </td>
                  </tr>
                ))
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState icon={Wallet} title="No fee payments found" description="Collect a payment above to see it here." />
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {p.student.firstName} {p.student.lastName}
                      </p>
                      <p className="text-xs text-slate-500">{p.student.studentId}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{p.feeType}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{formatDate(p.paidAt)}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{formatCurrency(p.totalAmount)}</td>
                    <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-200">
                      {formatCurrency(p.amountPaid)}
                    </td>
                    <td className="px-5 py-3 text-red-600">{formatCurrency(p.balance)}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {p.receipt && (
                          <Link
                            to={`/receipts/${p.receipt.id}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="View receipt"
                          >
                            <ReceiptIcon size={14} />
                          </Link>
                        )}
                        <button
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                          onClick={() => setEditTarget(p)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                          onClick={() => setDeleteTarget(p)}
                        >
                          <Trash2 size={14} />
                        </button>
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

      <EditPaymentModal open={Boolean(editTarget)} onClose={() => setEditTarget(null)} payment={editTarget} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete payment record?"
        description="This will permanently remove this fee payment and its associated receipt."
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
};

export default FeesPage;
