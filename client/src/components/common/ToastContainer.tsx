import React from 'react';
import { useToast } from '../../context/ToastContext';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    // aria-live faz leitores de tela anunciarem os avisos, que antes passavam em silêncio.
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-4 right-4 z-[120] flex flex-col gap-2.5 max-w-[calc(100vw-2rem)] sm:max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        const bg = isSuccess
          ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200'
          : isError
          ? 'bg-red-950/90 border-red-500/30 text-red-200'
          : isWarning
          ? 'bg-amber-950/90 border-amber-500/30 text-amber-200'
          : 'bg-blue-950/90 border-blue-500/30 text-blue-200';

        const icon = isSuccess ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        ) : isError ? (
          <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
        ) : isWarning ? (
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
        ) : (
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />
        );

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl border backdrop-blur-md shadow-2xl animate-fade-in text-sm font-medium ${bg}`}
          >
            <div className="flex items-center gap-2.5">
              {icon}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="opacity-60 hover:opacity-100 transition p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
