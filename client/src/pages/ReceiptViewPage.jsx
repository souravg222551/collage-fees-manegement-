import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { receiptApi } from '../api/services';
import { BASE_URL } from '../api/client';
import { Card, Skeleton, Spinner } from '../components/ui/Primitives';
import { formatCurrency, formatDate } from '../utils/format';

const Row = ({ label, value }) => (
  <div className="flex justify-between py-1.5 text-sm">
    <span className="text-slate-500">{label}</span>
    <span className="font-medium text-slate-800 dark:text-slate-200">{value}</span>
  </div>
);

const ReceiptViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['receipts', id],
    queryFn: () => receiptApi.get(id),
  });

  const receipt = data?.data?.data?.receipt;
  const settings = data?.data?.data?.settings;
  const payment = receipt?.feePayment;
  const student = payment?.student;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await receiptApi.downloadPdf(id, receipt?.receiptNumber);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to download receipt');
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) return <Skeleton className="h-96 w-full max-w-2xl mx-auto" />;
  if (!receipt) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between print:hidden">
        <button onClick={() => navigate(-1)} className="btn-ghost -ml-2 px-2">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="btn-secondary">
            <Printer size={15} /> Print
          </button>
          <button onClick={handleDownload} disabled={downloading} className="btn-primary">
            {downloading ? <Spinner className="w-4 h-4" /> : <Download size={15} />} Download PDF
          </button>
        </div>
      </div>

      <Card className="max-w-2xl mx-auto p-8 print:shadow-none print:border-none" id="receipt-print">
        <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          {settings?.logoUrl && (
            <img src={`${BASE_URL}${settings.logoUrl}`} alt="" className="w-14 h-14 object-contain" />
          )}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{settings?.collegeName}</h2>
            <p className="text-xs text-slate-500">{settings?.collegeAddress}</p>
            <p className="text-xs text-slate-500">
              {[settings?.collegePhone, settings?.collegeEmail].filter(Boolean).join('  |  ')}
            </p>
          </div>
        </div>

        <div className="text-center py-4">
          <h3 className="text-base font-bold tracking-wide text-slate-900 dark:text-white">FEE PAYMENT RECEIPT</h3>
        </div>

        <div className="flex justify-between text-sm mb-4">
          <span className="text-slate-500">
            Receipt No: <span className="font-semibold text-slate-800 dark:text-slate-200">{receipt.receiptNumber}</span>
          </span>
          <span className="text-slate-500">Date: {formatDate(receipt.issuedAt)}</span>
        </div>

        <div className="grid grid-cols-2 gap-x-8 border-t border-slate-100 dark:border-slate-800 pt-4">
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Student Details</h4>
            <Row label="Name" value={`${student.firstName} ${student.lastName}`} />
            <Row label="Student ID" value={student.studentId} />
            <Row label="Roll No." value={student.rollNumber} />
            <Row label="Department" value={student.department} />
            <Row label="Course / Branch" value={`${student.course} / ${student.branch}`} />
            <Row label="Semester" value={`Sem ${payment.semester} - ${student.section}`} />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Fee Breakdown</h4>
            <Row label="Fee Type" value={payment.feeType} />
            <Row label="Total Amount" value={formatCurrency(payment.totalAmount)} />
            <Row label="Fine" value={formatCurrency(payment.fine)} />
            <Row label="Discount" value={`- ${formatCurrency(payment.discount)}`} />
            <Row label="Scholarship" value={`- ${formatCurrency(payment.scholarship)}`} />
            <Row label="Amount Paid" value={formatCurrency(payment.amountPaid)} />
            <Row label="Balance Due" value={formatCurrency(payment.balance)} />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 mt-4 pt-4">
          <div className="text-sm space-y-1">
            <p>
              <span className="text-slate-500">Payment Mode: </span>
              <span className="font-medium">{payment.paymentMode}</span>
            </p>
            <p>
              <span className="text-slate-500">Status: </span>
              <span className="font-medium">{payment.status}</span>
            </p>
            {payment.transactionRef && (
              <p>
                <span className="text-slate-500">Transaction Ref: </span>
                <span className="font-medium">{payment.transactionRef}</span>
              </p>
            )}
          </div>
          {receipt.qrCodeData && <img src={receipt.qrCodeData} alt="QR" className="w-20 h-20" />}
        </div>

        <div className="flex items-end justify-between border-t border-slate-100 dark:border-slate-800 mt-6 pt-6">
          <div className="text-xs text-slate-400">
            <p>This is a system-generated receipt.</p>
            <p>Collected by: {payment.collectedBy?.name || 'System'}</p>
          </div>
          <div className="text-center">
            <p className="border-t border-slate-400 pt-1 text-sm px-6">{settings?.authorizedSignatory}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ReceiptViewPage;