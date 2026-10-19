import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Monitor, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface SystemCheckProps {
  onComplete: (passed: boolean) => void;
}

export const SystemCheck: React.FC<SystemCheckProps> = ({ onComplete }) => {
  const [checks, setChecks] = useState({
    internet: { status: 'checking', message: 'Checking Connection...' },
    browser: { status: 'checking', message: 'Checking Browser...' },
    resolution: { status: 'checking', message: 'Checking Screen...' },
    storage: { status: 'checking', message: 'Checking Storage...' }
  });

  useEffect(() => {
    let passed = true;

    // 1. Internet Check
    const checkInternet = () => {
      const isOnline = navigator.onLine;
      setChecks(prev => ({
        ...prev,
        internet: {
          status: isOnline ? 'passed' : 'failed',
          message: isOnline ? 'Stable Internet Connection' : 'No Internet Connection'
        }
      }));
      if (!isOnline) passed = false;
    };

    // 2. Browser Check
    const checkBrowser = () => {
      const isSupported = !!window.fetch && !!window.localStorage;
      setChecks(prev => ({
        ...prev,
        browser: {
          status: isSupported ? 'passed' : 'failed',
          message: isSupported ? 'Supported Browser' : 'Unsupported Browser'
        }
      }));
      if (!isSupported) passed = false;
    };

    // 3. Resolution Check
    const checkResolution = () => {
      const width = window.screen.width;
      const isOk = width >= 1024;
      setChecks(prev => ({
        ...prev,
        resolution: {
          status: isOk ? 'passed' : 'warning',
          message: isOk ? 'Optimal Resolution' : `Low Resolution (${width}px)`
        }
      }));
      // We don't fail for resolution, just warn
    };

    // 4. Storage/Cookies
    const checkStorage = () => {
      let isOk = false;
      try {
        window.localStorage.setItem('test', '1');
        window.localStorage.removeItem('test');
        isOk = true;
      } catch (e) {
        isOk = false;
      }
      setChecks(prev => ({
        ...prev,
        storage: {
          status: isOk ? 'passed' : 'failed',
          message: isOk ? 'Local Storage Enabled' : 'Local Storage Blocked'
        }
      }));
      if (!isOk) passed = false;
    };

    setTimeout(() => checkInternet(), 500);
    setTimeout(() => checkBrowser(), 1000);
    setTimeout(() => checkResolution(), 1500);
    setTimeout(() => {
      checkStorage();
      onComplete(passed);
    }, 2000);

  }, [onComplete]);

  const getIcon = (status: string) => {
    if (status === 'checking') return <div className="w-5 h-5 border-2 border-slate-200 border-t-purple-600 rounded-full animate-spin shrink-0" />;
    if (status === 'passed') return <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />;
    if (status === 'warning') return <AlertTriangle size={20} className="text-amber-500 shrink-0" />;
    return <XCircle size={20} className="text-rose-500 shrink-0" />;
  };

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
        <Monitor className="text-purple-600" />
        System Compatibility Check
      </h3>
      <p className="text-sm text-slate-500 mb-2">We are verifying your system to ensure a smooth examination experience.</p>
      
      <div className="space-y-3">
        {Object.entries(checks).map(([key, check]) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={key} 
            className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100"
          >
            {getIcon(check.status)}
            <span className={`font-semibold ${check.status === 'checking' ? 'text-slate-500' : 'text-slate-700'}`}>
              {check.message}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
