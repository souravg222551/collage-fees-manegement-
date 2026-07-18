import React, { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Wallet } from 'lucide-react';
import { feeApi } from '../../api/services';
import { Card, Field, Spinner } from '../ui/Primitives';
import { formatCurrency } from '../../utils/format';
import StudentSelect from './StudentSelect';

const FEE_TYPES = ['TUITION', 'EXAM', 'HOSTEL', 'TRANSPORT', 'LIBRARY', 'LAB', 'MISCELLANEOUS', 'ADMISSION', 'OTHER'];
const PAYMENT_MODES = ['CASH', 'CARD', 'UPI', 'NET_BANKING', 'CHEQUE', 'BANK_TRANSFER'];

const CollectFeePanel = ({ presetStudent, onCollected }) => {
  const queryClient = useQueryClient();
  const [student, setStudent] = useState(presetStudent || null);

  const { register, control, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      feeType: 'TUITION',
      academicSession: '2025-2026',
      semester: student?.semester || 1,
      totalAmount: '',
      amountPaid: '',
      discount: 0,
      scholarship: 0,
      fine: 0,
      paymentMode: 'CASH',
      transactionRef: '',
      remarks: '',
    },
  });

  useEffect(() => {
    if (student) reset((prev) => ({ ...prev, semester: student.semester, academicSession: student.academicSession }));
  }, [student, reset]);

  const [totalAmount, amountPaid, discount, scholarship, fine] = watch([
    'totalAmount',
    'amountPaid',
    'discount',
    'scholarship',
    'fine',
  ]);

  const balance = useMemo(() => {
    const net = Number(totalAmount || 0) + Number(fine || 0) - Number(discount || 0) - Number(scholarship || 0);
    return Math.max(net - Number(amountPaid || 0), 0);
  }, [totalAmount, amountPaid, discount, scholarship, fine]);

  const mutation = useMutation({
    mutationFn: feeApi.collect,
    onSuccess: () => {
      toast.success('Fee payment recorded successfully');
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      reset();
      setStudent(null);
      onCollected?.();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to record payment'),
  });

  const onSubmit = (values) => {
    if (!student) {
      toast.error('Please select a student first');
      return;
    }
    mutation.mutate({ ...values, studentId: student.id });
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Wallet size={16} className="text-brand-600" />
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Collect Fee Payment</h3>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Student" required>
          <StudentSelect value={student} onChange={setStudent} />
        </Field>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Fee Type">
            <select className="input" {...register('feeType')}>
              {FEE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Semester" required error={errors.semester?.message}>
            <input type="number" min="1" max="12" className="input" {...register('semester', { required: true, valueAsNumber: true })} />
          </Field>
          <Field label="Academic Session" required>
            <input className="input" {...register('academicSession', { required: true })} />
          </Field>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Total Amount (₹)" required error={errors.totalAmount?.message}>
            <input type="number" step="0.01" className="input" {...register('totalAmount', { required: 'Required', min: 0 })} />
          </Field>
          <Field label="Amount Paid Now (₹)" error={errors.amountPaid?.message}>
            <input type="number" step="0.01" className="input" {...register('amountPaid', { min: 0 })} />
          </Field>
          <Field label="Fine (₹)">
            <input type="number" step="0.01" className="input" {...register('fine', { min: 0 })} />
          </Field>
          <Field label="Discount (₹)">
            <input type="number" step="0.01" className="input" {...register('discount', { min: 0 })} />
          </Field>
          <Field label="Scholarship (₹)">
            <input type="number" step="0.01" className="input" {...register('scholarship', { min: 0 })} />
          </Field>
          <Field label="Payment Mode">
            <select className="input" {...register('paymentMode')}>
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
            <input className="input" {...register('transactionRef')} />
          </Field>
          <Field label="Remarks (optional)">
            <input className="input" {...register('remarks')} />
          </Field>
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-xs text-slate-500">Calculated Balance Due</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">{formatCurrency(balance)}</p>
          </div>
          <button type="submit" disabled={isSubmitting || mutation.isPending} className="btn-primary">
            {(isSubmitting || mutation.isPending) && <Spinner className="w-4 h-4" />}
            Record Payment
          </button>
        </div>
      </form>
    </Card>
  );
};

export default CollectFeePanel;
