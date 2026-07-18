import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal, Spinner } from './Primitives';

const ConfirmDialog = ({ open, title, description, confirmLabel = 'Confirm', danger, loading, onCancel, onConfirm }) => (
  <Modal open={open} onClose={onCancel} title={title} maxWidth="max-w-sm">
    <div className="flex gap-3">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
          danger ? 'bg-red-50 text-red-600 dark:bg-red-500/10' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10'
        }`}
      >
        <AlertTriangle size={16} />
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
    </div>
    <div className="flex justify-end gap-3 mt-6">
      <button className="btn-secondary" onClick={onCancel}>
        Cancel
      </button>
      <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} disabled={loading}>
        {loading && <Spinner className="w-4 h-4" />}
        {confirmLabel}
      </button>
    </div>
  </Modal>
);

export default ConfirmDialog;
