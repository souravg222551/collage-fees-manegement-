import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Wallet, CheckSquare, Square } from 'lucide-react';
import { feeApi, feeStructureApi } from '../../api/services';
import { Card, Field, Spinner } from '../ui/Primitives';
import { formatCurrency } from '../../utils/format';
import { FEE_TYPES, FEE_TYPE_LABELS, FREQUENCY_LABELS } from '../../utils/feeConstants';
import StudentSelect from './StudentSelect';

const PAYMENT_MODES = ['CASH', 'CARD', 'UPI', 'NET_BANKING', 'CHEQUE', 'BANK_TRANSFER'];

const CollectFeePanel = ({ presetStudent, onCollected }) => {
  const queryClient = useQueryClient();
  const [student, setStudent] = useState(presetStudent || null);
  const [mode, setMode] = useState('structure'); // 'structure' | 'custom'

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['fee-structure', 'summary', student?.id],
    queryFn: () => feeStructureApi.studentSummary(student.id),
    enabled: Boolean(student?.id),
  });
  const summary = summaryData?.data?.data;

  // Auto-pick the right mode once we know whether this student has a structure
  useEffect(() => {
    if (summary) setMode(summary.hasStructure ? 'structure' : 'custom');
  }, [summary]);

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Wallet size={16} className="text-brand-600" />
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Collect Fee Payment</h3>
      </div>

      <Field label="Student" required>
        <StudentSelect value={student} onChange={setStudent} />
      </Field>

      {student && (
        <>
          <div className="flex gap-2 text-xs mt-4 mb-2">
            <button
              className={`px-3 py-1.5 rounded-lg font-medium ${mode === 'structure' ? 'bg-brand-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}
              onClick={() => setMode('structure')}
            >
              Pay from Fee Structure
            </button>
            <button
              className={`px-3 py-1.5 rounded-lg font-medium ${mode === 'custom' ? 'bg-brand-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}
              onClick={() => setMode('custom')}
            >
              Custom / One-off Payment
            </button>
          </div>

          {summaryLoading ? (
            <div className="py-6 flex justify-center">
              <Spinner className="w-5 h-5 text-brand-600" />
            </div>
          ) : mode === 'structure' ? (
            <StructurePayForm student={student} summary={summary} onCollected={() => { queryClient.invalidateQueries(); setStudent(null); onCollected?.(); }} />
          ) : (
            <CustomPayForm student={student} onCollected={() => { queryClient.invalidateQueries(); setStudent(null); onCollected?.(); }} />
          )}
        </>
      )}
    </Card>
  );
};

// ---- Mode 1: pay against the student's fee-structure components ----
const StructurePayForm = ({ student, summary, onCollected }) => {
  const outstanding = (summary?.breakdown || []).filter((row) => row.balance > 0);

  const [selected, setSelected] = useState({}); // { [rowId]: true }
  const [payNow, setPayNow] = useState({}); // { [rowId]: amount }
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [transactionRef, setTransactionRef] = useState('');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    // Default: everything outstanding is checked, pre-filled to pay in full
    const sel = {};
    const amt = {};
    outstanding.forEach((row) => {
      sel[row.id] = true;
      amt[row.id] = row.balance;
    });
    setSelected(sel);
    setPayNow(amt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary]);

  const toggle = (id) => setSelected((s) => ({ ...s, [id]: !s[id] }));

  const totalToCollect = outstanding
    .filter((row) => selected[row.id])
    .reduce((sum, row) => sum + (Number(payNow[row.id]) || 0), 0);

  const mutation = useMutation({
    mutationFn: (payload) => feeApi.collectBulk(payload),
    onSuccess: () => {
      toast.success('Fee payment recorded successfully');
      onCollected();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to record payment'),
  });

  const handleSubmit = () => {
    const items = outstanding
      .filter((row) => selected[row.id] && Number(payNow[row.id]) > 0)
      .map((row) => ({
        [row.source === 'structure' ? 'structureItemId' : 'studentFeeItemId']: row.id,
        feeType: row.feeType,
        label: row.label,
        totalAmount: row.total,
        amountPaid: Number(payNow[row.id]) || 0,
      }));

    if (items.length === 0) {
      toast.error('Select at least one fee item with an amount to collect');
      return;
    }

    mutation.mutate({
      studentId: student.id,
      academicSession: student.academicSession,
      semester: student.semester || 0,
      paymentMode,
      transactionRef,
      remarks,
      items,
    });
  };

  if (!summary?.hasStructure) {
    return (
      <p className="text-sm text-slate-500 py-4">
        No fee structure exists yet for this student's group. Switch to "Custom / One-off Payment", or ask an Admin to
        set one up in Settings → Fee Structure.
      </p>
    );
  }

  if (outstanding.length === 0) {
    return <p className="text-sm text-emerald-600 py-4">This student has no outstanding fee balance. 🎉</p>;
  }

  return (
    <div className="space-y-4">
      <div className="border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
        {outstanding.map((row) => (
          <div key={row.id} className="flex items-center gap-3 px-4 py-3">
            <button type="button" onClick={() => toggle(row.id)} className="text-brand-600 shrink-0">
              {selected[row.id] ? <CheckSquare size={18} /> : <Square size={18} className="text-slate-300" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{row.label}</p>
              <p className="text-xs text-slate-500">
                {FREQUENCY_LABELS[row.frequency]} &middot; Total {formatCurrency(row.total)} &middot; Balance{' '}
                {formatCurrency(row.balance)}
              </p>
            </div>
            <input
              type="number"
              min="0"
              max={row.balance}
              step="0.01"
              className="input w-28 shrink-0"
              disabled={!selected[row.id]}
              value={payNow[row.id] ?? ''}
              onChange={(e) => setPayNow((p) => ({ ...p, [row.id]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Payment Mode">
          <select className="input" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
            {PAYMENT_MODES.map((m) => (
              <option key={m} value={m}>
                {m.replace('_', ' ')}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Transaction Reference (optional)">
          <input className="input" value={transactionRef} onChange={(e) => setTransactionRef(e.target.value)} />
        </Field>
        <Field label="Remarks (optional)">
          <input className="input" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </Field>
      </div>

      <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
        <div>
          <p className="text-xs text-slate-500">Total to Collect Now</p>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">{formatCurrency(totalToCollect)}</p>
        </div>
        <button onClick={handleSubmit} disabled={mutation.isPending} className="btn-primary">
          {mutation.isPending && <Spinner className="w-4 h-4" />}
          Record Payment
        </button>
      </div>
    </div>
  );
};

// ---- Mode 2: classic single custom payment (fallback / one-off charges) ----
const CustomPayForm = ({ student, onCollected }) => {
  const [form, setForm] = useState({
    feeType: 'OTHER',
    academicSession: student.academicSession || '',
    semester: student.semester || 0,
    totalAmount: '',
    amountPaid: '',
    discount: 0,
    scholarship: 0,
    fine: 0,
    paymentMode: 'CASH',
    transactionRef: '',
    remarks: '',
  });

  const balance = useMemo(() => {
    const net =
      Number(form.totalAmount || 0) + Number(form.fine || 0) - Number(form.discount || 0) - Number(form.scholarship || 0);
    return Math.max(net - Number(form.amountPaid || 0), 0);
  }, [form.totalAmount, form.fine, form.discount, form.scholarship, form.amountPaid]);

  const mutation = useMutation({
    mutationFn: feeApi.collect,
    onSuccess: () => {
      toast.success('Fee payment recorded successfully');
      onCollected();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to record payment'),
  });

  const handleSubmit = () => {
    if (!form.totalAmount || Number(form.totalAmount) <= 0) {
      toast.error('Enter a total amount');
      return;
    }
    mutation.mutate({ ...form, studentId: student.id });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Field label="Fee Type">
          <select className="input" value={form.feeType} onChange={(e) => setForm({ ...form, feeType: e.target.value })}>
            {FEE_TYPES.map((t) => (
              <option key={t} value={t}>
                {FEE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Semester" required>
          <input
            type="number"
            min="0"
            max="12"
            className="input"
            value={form.semester}
            onChange={(e) => setForm({ ...form, semester: e.target.value })}
          />
        </Field>
        <Field label="Academic Session" required>
          <input className="input" value={form.academicSession} onChange={(e) => setForm({ ...form, academicSession: e.target.value })} />
        </Field>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Field label="Total Amount (₹)" required>
          <input type="number" step="0.01" className="input" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} />
        </Field>
        <Field label="Amount Paid Now (₹)">
          <input type="number" step="0.01" className="input" value={form.amountPaid} onChange={(e) => setForm({ ...form, amountPaid: e.target.value })} />
        </Field>
        <Field label="Fine (₹)">
          <input type="number" step="0.01" className="input" value={form.fine} onChange={(e) => setForm({ ...form, fine: e.target.value })} />
        </Field>
        <Field label="Discount (₹)">
          <input type="number" step="0.01" className="input" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
        </Field>
        <Field label="Scholarship (₹)">
          <input type="number" step="0.01" className="input" value={form.scholarship} onChange={(e) => setForm({ ...form, scholarship: e.target.value })} />
        </Field>
        <Field label="Payment Mode">
          <select className="input" value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}>
            {PAYMENT_MODES.map((m) => (
              <option key={m} value={m}>
                {m.replace('_', ' ')}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Transaction Reference (optional)">
          <input className="input" value={form.transactionRef} onChange={(e) => setForm({ ...form, transactionRef: e.target.value })} />
        </Field>
        <Field label="Remarks (optional)">
          <input className="input" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
        </Field>
      </div>

      <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
        <div>
          <p className="text-xs text-slate-500">Calculated Balance Due</p>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">{formatCurrency(balance)}</p>
        </div>
        <button onClick={handleSubmit} disabled={mutation.isPending} className="btn-primary">
          {mutation.isPending && <Spinner className="w-4 h-4" />}
          Record Payment
        </button>
      </div>
    </div>
  );
};

export default CollectFeePanel;
