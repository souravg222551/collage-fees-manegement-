import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Card = ({ children, className = '', ...props }) => (
  <div className={`card p-5 ${className}`} {...props}>
    {children}
  </div>
);

export const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded-md bg-slate-200 dark:bg-slate-800 ${className}`} />
);

const STATUS_STYLES = {
  PAID: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  PARTIAL: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  PENDING: 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400',
  OVERDUE: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  CANCELLED: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500',
  REFUNDED: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
  ACTIVE: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  INACTIVE: 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400',
  GRADUATED: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
  DROPPED: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
};

export const StatusBadge = ({ status }) => (
  <span className={`badge ${STATUS_STYLES[status] || STATUS_STYLES.PENDING}`}>{status}</span>
);

export const Modal = ({ open, onClose, title, children, maxWidth = 'max-w-lg' }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          className={`relative w-full ${maxWidth} card p-6 max-h-[90vh] overflow-y-auto`}
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.18 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
            <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
              <X size={18} />
            </button>
          </div>
          {children}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-16 px-4">
    {Icon && (
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        <Icon size={22} className="text-slate-400" />
      </div>
    )}
    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h4>
    {description && <p className="text-sm text-slate-500 mt-1 max-w-sm">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const Pagination = ({ page, totalPages, onChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-1 pt-4">
      <p className="text-xs text-slate-500">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <button
          className="btn-secondary px-3 py-1.5 text-xs"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Previous
        </button>
        <button
          className="btn-secondary px-3 py-1.5 text-xs"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export const Field = ({ label, error, children, required }) => (
  <div>
    <label className="label">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {error && <p className="error-text">{error}</p>}
  </div>
);

export const Spinner = ({ className = 'w-5 h-5' }) => (
  <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);
