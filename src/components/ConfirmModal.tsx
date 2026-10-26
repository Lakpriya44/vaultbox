import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  isDangerous = false,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-800 dark:text-slate-200 transition-all">
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`p-2.5 rounded-xl ${
              isDangerous ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">{title}</h3>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-5">
          {message}
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl text-white shadow-md flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 ${
              isDangerous
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950'
            }`}
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
