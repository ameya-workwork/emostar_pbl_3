import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  message: string | null;
  isError?: boolean;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, isError = false, onClose }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3800);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4 animate-in slide-in-from-bottom-5 duration-200 pointer-events-none">
      <div
        className={`pointer-events-auto rounded-xl p-4 shadow-xl flex items-center justify-between gap-3 text-sm font-medium ${
          isError ? 'bg-red-900 text-red-50' : 'bg-gray-900 text-white'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isError ? (
            <AlertCircle size={18} className="text-red-300 shrink-0" />
          ) : (
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          )}
          <span>{message}</span>
        </div>

        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1 rounded-sm shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
