import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Modal, Field, Spinner } from '../ui/Primitives';
import { feeApi } from '../../api/services';
import { formatCurrency } from '../../utils/format';

const PAYMENT_MODES = ['CASH', 'CARD', 'UPI', 'NET_BANKING', 'CHEQUE', 'BANK_TRANSFER'];

const EditPaymentModal = ({ open, onClose, payment }) => {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, watch, formState: { isSubmitting } } = useForm();

  useEffect(() => {
    if (payment) {
      reset({
        totalAmount: payment.totalAmount,
        amountPaid: payment.amountPaid,
        discount: payment.discount,
        scholarship: payment.scholarship,
        fine: payment.fine,
        paymentMode: payment.paymentMode,
        transactionRef: payment.transactionRef || '',
        remarks: payment.remarks || '',
      });
    }
  }, [payment, reset]);

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
    mutationFn: (values) => feeApi.update(payment.id, values),
    onSuccess: () => {
      toast.success('Payment updated');
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update payment'),
  });

  if (!payment) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Edit Payment — ${payment.student?.firstName} ${payment.student?.lastName}`}>
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Total Amount (₹)">
            <input type="number" step="0.01" className="input" {...register('totalAmount', { min: 0 })} />
          </Field>
          <Field label="Amount Paid (₹)">
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
        <Field label="Transaction Reference">
          <input className="input" {...register('transactionRef')} />
        </Field>
        <Field label="Remarks">
          <input className="input" {...register('remarks')} />
        </Field>

        <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-xs text-slate-500">Recalculated Balance</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">{formatCurrency(balance)}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting || mutation.isPending} className="btn-primary">
            {(isSubmitting || mutation.isPending) && <Spinner className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditPaymentModal;
