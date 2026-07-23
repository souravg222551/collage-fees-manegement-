import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Mail, Phone, Wallet, Plus, LayoutGrid, Trash2, Tag } from 'lucide-react';
import { studentApi, feeStructureApi, studentFeeItemApi } from '../api/services';
import { Card, Skeleton, StatusBadge, EmptyState, Field, Spinner } from '../components/ui/Primitives';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { formatCurrency, formatDate, initials } from '../utils/format';
import { FEE_TYPES, FEE_TYPE_LABELS, FREQUENCIES, FREQUENCY_LABELS } from '../utils/feeConstants';
import { useAuth } from '../context/AuthContext';

const StudentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { admin } = useAuth();
  const canManage = admin?.role === 'SUPER_ADMIN' || admin?.role === 'ADMIN';

  const { data, isLoading } = useQuery({
    queryKey: ['students', id],
    queryFn: () => studentApi.get(id),
  });

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['fee-structure', 'summary', id],
    queryFn: () => feeStructureApi.studentSummary(id),
    enabled: Boolean(id),
  });

  const { data: personalItemsData } = useQuery({
    queryKey: ['student-fee-items', id],
    queryFn: () => studentFeeItemApi.list(id),
    enabled: Boolean(id),
  });

  const student = data?.data?.data;
  const summary = summaryData?.data?.data;
  const personalItems = personalItemsData?.data?.data || [];

  const [showAddItem, setShowAddItem] = useState(false);
  const [deleteItemTarget, setDeleteItemTarget] = useState(null);

  const deleteItemMutation = useMutation({
    mutationFn: (itemId) => studentFeeItemApi.remove(id, itemId),
    onSuccess: () => {
      toast.success('Fee item removed');
      queryClient.invalidateQueries({ queryKey: ['student-fee-items', id] });
      queryClient.invalidateQueries({ queryKey: ['fee-structure', 'summary', id] });
      setDeleteItemTarget(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to remove fee item'),
  });

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

  const grandTotal = summary?.hasStructure ? summary.grandTotal : student.totalFeeAssigned;
  const grandPaid = summary?.hasStructure ? summary.grandPaid : student.totalPaid;
  const grandBalance = summary?.hasStructure ? summary.grandBalance : student.totalOutstanding;

  return (
    <div className="space-y-5">
      <button onClick={() => navigate('/students')} className="btn-ghost -ml-2 px-2">
        <ArrowLeft size={16} /> Back to Students
      </button>

      <Card className="flex flex-col sm:flex-row sm:items-center gap-5">
        {student.photoUrl ? (
          <img src={student.photoUrl} alt="" className="w-20 h-20 rounded-xl object-cover" />
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
            {student.studentId} &middot; Roll No. {student.rollNumber} &middot;{' '}
            {student.department || (student.grade ? `Class ${student.grade}` : '')}
            {student.aadharNumber && <> &middot; Aadhaar: {student.aadharNumber}</>}
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
          <p className="text-xs text-slate-500">Grand Total Fee</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-white mt-1">{formatCurrency(grandTotal)}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Total Paid</p>
          <p className="text-xl font-semibold text-emerald-600 mt-1">{formatCurrency(grandPaid)}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Outstanding Balance</p>
          <p className="text-xl font-semibold text-red-600 mt-1">{formatCurrency(grandBalance)}</p>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <LayoutGrid size={15} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Fee Breakdown by Category</h3>
        </div>
        {summaryLoading ? (
          <div className="p-5">
            <Skeleton className="h-24 w-full" />
          </div>
        ) : !summary?.hasStructure ? (
          <div className="p-5 text-sm text-slate-500">
            No fee structure has been set up for this student's group yet. An Admin can add fee items (Tuition, Exam,
            Transport, etc.) in <span className="font-medium">Settings → Fee Structure</span>, and this breakdown will
            appear here automatically.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-100 dark:border-slate-800">
                  <th className="px-5 py-3">Fee Category</th>
                  <th className="px-5 py-3">Frequency</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Paid</th>
                  <th className="px-5 py-3">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {summary.breakdown.map((row) => (
                  <tr key={row.id}>
                    <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-200">
                      {row.label}
                      {row.source === 'personal' && (
                        <span className="ml-2 badge bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                          Personal
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-500">{FREQUENCY_LABELS[row.frequency]}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{formatCurrency(row.total)}</td>
                    <td className="px-5 py-3 text-emerald-600">{formatCurrency(row.paid)}</td>
                    <td className="px-5 py-3 text-red-600">{formatCurrency(row.balance)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 dark:bg-slate-800/50 font-semibold">
                  <td className="px-5 py-3 text-slate-800 dark:text-slate-200" colSpan={2}>
                    Grand Total
                  </td>
                  <td className="px-5 py-3 text-slate-800 dark:text-slate-200">{formatCurrency(summary.grandTotal)}</td>
                  <td className="px-5 py-3 text-emerald-700 dark:text-emerald-400">{formatCurrency(summary.grandPaid)}</td>
                  <td className="px-5 py-3 text-red-700 dark:text-red-400">{formatCurrency(summary.grandBalance)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {canManage && (
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag size={15} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                Additional / Optional Fees for this Student
              </h3>
            </div>
            <button className="btn-secondary text-xs" onClick={() => setShowAddItem((s) => !s)}>
              <Plus size={14} /> {showAddItem ? 'Cancel' : 'Add Fee Item'}
            </button>
          </div>

          {showAddItem && (
            <AddStudentFeeItemForm
              studentId={id}
              onDone={() => {
                setShowAddItem(false);
                queryClient.invalidateQueries({ queryKey: ['student-fee-items', id] });
                queryClient.invalidateQueries({ queryKey: ['fee-structure', 'summary', id] });
              }}
            />
          )}

          {personalItems.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">
              No individual add-ons yet. Use this for things not everyone pays — e.g. Transport at this student's
              distance slab, or Hostel.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {personalItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{item.label}</p>
                    <p className="text-xs text-slate-500">
                      {FEE_TYPE_LABELS[item.feeType]} &middot; {FREQUENCY_LABELS[item.frequency]}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {formatCurrency(item.amount)}
                    </span>
                    <button
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                      onClick={() => setDeleteItemTarget(item)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

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
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{p.label || FEE_TYPE_LABELS[p.feeType] || p.feeType}</td>
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

      <ConfirmDialog
        open={Boolean(deleteItemTarget)}
        title="Remove this fee item?"
        description={`This removes "${deleteItemTarget?.label}" from this student.`}
        confirmLabel="Remove"
        danger
        loading={deleteItemMutation.isPending}
        onCancel={() => setDeleteItemTarget(null)}
        onConfirm={() => deleteItemMutation.mutate(deleteItemTarget.id)}
      />
    </div>
  );
};

const AddStudentFeeItemForm = ({ studentId, onDone }) => {
  const { data: catalogData } = useQuery({
    queryKey: ['fee-items-catalog', studentId],
    queryFn: () => studentFeeItemApi.catalog(studentId),
  });
  const catalog = catalogData?.data?.data || [];

  const [mode, setMode] = useState('catalog'); // 'catalog' | 'custom'
  const [selectedCatalogId, setSelectedCatalogId] = useState('');
  const [custom, setCustom] = useState({ feeType: 'TRANSPORT', label: '', amount: '', frequency: 'MONTHLY' });

  const mutation = useMutation({
    mutationFn: () => {
      if (mode === 'catalog') {
        const picked = catalog.find((c) => c.id === selectedCatalogId);
        if (!picked) throw new Error('Select an item from the catalog');
        return studentFeeItemApi.add(studentId, {
          feeType: picked.feeType,
          label: picked.label || picked.feeType,
          amount: picked.amount,
          frequency: picked.frequency,
        });
      }
      return studentFeeItemApi.add(studentId, custom);
    },
    onSuccess: () => {
      toast.success('Fee item added to student');
      onDone();
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message || 'Failed to add fee item'),
  });

  return (
    <div className="p-5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 space-y-3">
      <div className="flex gap-2 text-xs">
        <button
          className={`px-3 py-1.5 rounded-lg font-medium ${mode === 'catalog' ? 'bg-brand-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}
          onClick={() => setMode('catalog')}
        >
          Pick from Class Options
        </button>
        <button
          className={`px-3 py-1.5 rounded-lg font-medium ${mode === 'custom' ? 'bg-brand-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}
          onClick={() => setMode('custom')}
        >
          Custom Item
        </button>
      </div>

      {mode === 'catalog' ? (
        catalog.length === 0 ? (
          <p className="text-sm text-slate-500">
            No optional items defined for this student's class yet. An Admin can mark an item "Optional" in Settings →
            Fee Structure, or use "Custom Item" here instead.
          </p>
        ) : (
          <Field label="Select Option">
            <select className="input" value={selectedCatalogId} onChange={(e) => setSelectedCatalogId(e.target.value)}>
              <option value="">Select...</option>
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>
                  {(c.label || FEE_TYPE_LABELS[c.feeType])} — {formatCurrency(c.amount)} / {FREQUENCY_LABELS[c.frequency]}
                </option>
              ))}
            </select>
          </Field>
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Category">
            <select className="input" value={custom.feeType} onChange={(e) => setCustom({ ...custom, feeType: e.target.value })}>
              {FEE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {FEE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Label" required>
            <input
              className="input"
              placeholder="e.g. Transport Fee (3-6 km)"
              value={custom.label}
              onChange={(e) => setCustom({ ...custom, label: e.target.value })}
            />
          </Field>
          <Field label="Amount (₹)" required>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input"
              value={custom.amount}
              onChange={(e) => setCustom({ ...custom, amount: e.target.value })}
            />
          </Field>
          <Field label="Frequency">
            <select className="input" value={custom.frequency} onChange={(e) => setCustom({ ...custom, frequency: e.target.value })}>
              {FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {FREQUENCY_LABELS[f]}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}

      <button className="btn-primary" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        {mutation.isPending ? <Spinner className="w-4 h-4" /> : 'Add to Student'}
      </button>
    </div>
  );
};

export default StudentDetailPage;
