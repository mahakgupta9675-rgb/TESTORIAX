import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextProps {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-remove toast after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Icon mapping
  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />;
      case 'error':
        return <AlertCircle className="text-rose-500 shrink-0" size={18} />;
      case 'warning':
        return <AlertTriangle className="text-amber-500 shrink-0" size={18} />;
      case 'info':
      default:
        return <Info className="text-lilac-500 shrink-0" size={18} />;
    }
  };

  // Border/Shadow styles matching Testoriax style guide
  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'border-emerald-100 bg-white/95 text-slate-800 shadow-emerald-500/5';
      case 'error':
        return 'border-rose-100 bg-white/95 text-slate-800 shadow-rose-500/5';
      case 'warning':
        return 'border-amber-100 bg-white/95 text-slate-800 shadow-amber-500/5';
      case 'info':
      default:
        return 'border-lilac-100 bg-white/95 text-slate-800 shadow-lilac-500/5';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Render Toast Overlay */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0 z-[9999] flex flex-col gap-3.5 w-full max-w-sm px-6 md:px-0 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`pointer-events-auto flex items-start gap-3.5 p-4 rounded-2xl border bg-white/95 backdrop-blur-md shadow-lg border-slate-100/60 ${getToastStyles(
                toast.type
              )}`}
            >
              {getIcon(toast.type)}
              <div className="flex-1 text-xs font-semibold leading-relaxed pr-2">
                {toast.message}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-405 hover:text-slate-605 p-0.5 rounded-lg hover:bg-slate-50 transition-colors shrink-0 cursor-pointer"
                aria-label="Close notification"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
