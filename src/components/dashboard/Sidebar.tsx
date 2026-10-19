import React from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, FileText, Trophy, BarChart3, Award, Settings, LogOut, X, PlusCircle, ShieldCheck, Compass, Bell, Lock, Wallet, RotateCcw } from 'lucide-react';
import TestoriaxLogo from '../ui/TestoriaxLogo';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onSignOut: () => void;
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  onSignOut,
  isOpen,
  onClose,
  userRole,
}) => {
  const menuItems = [
    { id: 'overview', name: 'Overview', icon: <LayoutDashboard size={20} /> },
    { id: 'notifications', name: 'Notifications', icon: <Bell size={20} /> },
    { id: 'practice', name: 'Practice', icon: <Compass size={20} /> },
    { id: 'create-test', name: 'Create Test', icon: <PlusCircle size={20} /> },
    { id: 'tests', name: 'My Tests', icon: <FileText size={20} /> },
    { id: 'competitions', name: 'Competitions', icon: <Trophy size={20} /> },
    { id: 'earnings', name: 'Earnings & Payouts', icon: <Wallet size={20} /> },
    { id: 'refunds', name: 'Refunds & Disputes', icon: <RotateCcw size={20} /> },
    { id: 'performance', name: 'Performance', icon: <BarChart3 size={20} /> },
    { id: 'proctoring', name: 'AI Proctoring', icon: <ShieldCheck size={20} /> },
    { id: 'certificates', name: 'Certificates', icon: <Award size={20} /> },
    ...(userRole === 'admin' ? [{ id: 'admin', name: 'Admin Panel', icon: <Lock size={20} /> }] : []),
    { id: 'settings', name: 'Settings', icon: <Settings size={20} /> },
  ];

  return (
    <>
      {/* Mobile Sidebar overlay backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm lg:hidden transition-all duration-300"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white border-r border-slate-100 shadow-sm transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header containing Logo & close toggle for mobile */}
        <div className="flex items-center justify-between px-6 py-5.5 border-b border-slate-50">
          <TestoriaxLogo showText={true} textColor="text-[#401567]" lightMode={true} />
          
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 flex flex-col gap-1.5">
          {menuItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  onClose();
                }}
                className={`flex items-center gap-3.5 px-4.5 py-3 rounded-xl text-base font-bold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-lilac-50 text-lilac-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                }`}
              >
                <span className={`${isActive ? 'text-lilac-600' : 'text-slate-400'}`}>
                  {item.icon}
                </span>
                <span>{item.name}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeSidebarIndicator"
                    className="ml-auto w-1.5 h-5 bg-lilac-600 rounded-full"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer containing Sign Out link */}
        <div className="p-4 border-t border-slate-50">
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3.5 px-4.5 py-3 rounded-xl text-base font-extrabold text-red-500 hover:bg-red-50/50 transition-all duration-200 cursor-pointer"
          >
            <LogOut size={20} className="shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
