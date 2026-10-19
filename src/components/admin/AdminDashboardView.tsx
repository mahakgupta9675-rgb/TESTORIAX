import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, Users, FileText, AlertTriangle, Send, History,
  Search, ShieldCheck, CheckCircle2, RefreshCw,
  Lock, Loader2, Sparkles, Award, Wallet, RotateCcw, XCircle
} from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import { useAuth } from '../../context/AuthContext';
import adminService, {
  type PlatformStats, type AdminUserRecord, type ContentReport, type AdminAuditLog
} from '../../services/adminService';
import testsService from '../../services/testsService';
import paymentService from '../../services/paymentService';

type AdminTab = 'overview' | 'users' | 'tests' | 'reports' | 'broadcast' | 'logs' | 'settlements' | 'refunds';

export const AdminDashboardView: React.FC = () => {
  const { profile } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Data states
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [tests, setTests] = useState<any[]>([]);
  const [testSearch, setTestSearch] = useState('');
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<any[]>([]);
  const [refundRequests, setRefundRequests] = useState<any[]>([]);
  const [processingRefundId, setProcessingRefundId] = useState<string | null>(null);

  // Payout Settlement Action State
  const [selectedPayout, setSelectedPayout] = useState<any | null>(null);
  const [payoutRefInput, setPayoutRefInput] = useState('');
  const [processingPayout, setProcessingPayout] = useState(false);

  // Broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);

  // Moderation state
  const [unpublishReason, setUnpublishReason] = useState('');
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadAdminData = async () => {
    // Client check + server RPC verification
    if (profile && profile.role !== 'admin') {
      setUnauthorized(true);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [statsRes, usersRes, reportsRes, logsRes, testsRes, payoutsRes, refundsRes] = await Promise.all([
        adminService.getPlatformStats(),
        adminService.listUsers(),
        adminService.getReports(),
        adminService.getAuditLogs(),
        testsService.getPublicTests(),
        adminService.getPayoutRequests(),
        paymentService.fetchAdminRefunds()
      ]);

      if (statsRes.error) {
        if (statsRes.error.code === '42501' || statsRes.error.message?.includes('Access Denied')) {
          setUnauthorized(true);
        }
      } else {
        setStats(statsRes.data);
      }

      if (usersRes.data) setUsers(usersRes.data);
      if (reportsRes.data) setReports(reportsRes.data);
      if (logsRes.data) setAuditLogs(logsRes.data);
      if (testsRes.data) setTests(testsRes.data);
      if (payoutsRes.data) setPayoutRequests(payoutsRes.data);
      if (refundsRes.data) setRefundRequests(refundsRes.data);

    } catch (err: any) {
      console.error('Failed to load admin panel data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePayoutStatus = async (
    payoutId: string,
    nextStatus: 'PROCESSING' | 'PAID' | 'CANCELLED' | 'FAILED',
    refId?: string,
    reason?: string
  ) => {
    try {
      setProcessingPayout(true);
      const res = await adminService.updatePayoutStatus(payoutId, nextStatus, refId, reason);
      if (res.error) {
        triggerToast(`Payout action error: ${res.error.message || res.error}`);
      } else {
        triggerToast(`Payout status updated to ${nextStatus}`);
        setSelectedPayout(null);
        setPayoutRefInput('');
        loadAdminData();
      }
    } finally {
      setProcessingPayout(false);
    }
  };

  const handleReviewRefund = async (id: string, action: 'approve' | 'reject', rejectionReason?: string) => {
    try {
      setProcessingRefundId(id);
      const res = await paymentService.reviewAdminRefund(id, action, rejectionReason);
      if (res.error) {
        triggerToast(`Refund action error: ${res.error.message || res.error}`);
      } else {
        triggerToast(action === 'approve' ? 'Refund approved and executed successfully!' : 'Refund request rejected.');
        loadAdminData();
      }
    } finally {
      setProcessingRefundId(null);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [profile]);

  // User Actions
  const handleUserStatusToggle = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const { error } = await adminService.updateUserStatus(userId, nextStatus);
    if (error) {
      triggerToast(`Error: ${error.message}`);
    } else {
      triggerToast(`User status updated to ${nextStatus.toUpperCase()}`);
      loadAdminData();
    }
  };

  const handleUserRoleToggle = async (userId: string, currentRole: string) => {
    const nextRole = currentRole === 'admin' ? 'user' : 'admin';
    const { error } = await adminService.updateUserRole(userId, nextRole);
    if (error) {
      triggerToast(`Error: ${error.message}`);
    } else {
      triggerToast(`User role updated to ${nextRole.toUpperCase()}`);
      loadAdminData();
    }
  };

  // Test Actions
  const handleUnpublishTest = async () => {
    if (!selectedTestId) return;
    const { error } = await adminService.unpublishTest(selectedTestId, unpublishReason || 'Policy Violation');
    if (error) {
      triggerToast(`Unpublish error: ${error.message}`);
    } else {
      triggerToast('Assessment draft state restored. Test unpublished successfully.');
      setSelectedTestId(null);
      setUnpublishReason('');
      loadAdminData();
    }
  };

  // Report Actions
  const handleResolveReport = async (reportId: string, action: 'dismissed' | 'actioned') => {
    const { error } = await adminService.resolveReport(reportId, action);
    if (error) {
      triggerToast(`Report resolution error: ${error.message}`);
    } else {
      triggerToast(`Report marked as ${action.toUpperCase()}`);
      loadAdminData();
    }
  };

  // Broadcast Action
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMsg) return;

    try {
      setBroadcasting(true);
      const { data, error } = await adminService.broadcastNotification(broadcastTitle, broadcastMsg);
      if (error) {
        triggerToast(`Broadcast error: ${error.message}`);
      } else {
        triggerToast(`Announcement dispatched to ${data?.recipients || 0} active users!`);
        setBroadcastTitle('');
        setBroadcastMsg('');
        loadAdminData();
      }
    } finally {
      setBroadcasting(false);
    }
  };

  // Filtered computed lists
  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredTests = tests.filter(t => 
    t.title?.toLowerCase().includes(testSearch.toLowerCase()) ||
    t.category?.toLowerCase().includes(testSearch.toLowerCase())
  );

  // Unauthorized Screen
  if (unauthorized) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center text-center p-6 bg-white/60 border border-red-100 rounded-3xl shadow-sm">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-4 border border-red-100 shadow-sm">
          <Lock size={32} />
        </div>
        <h2 className="font-display font-black text-xl text-slate-850">403 Unauthorized Access</h2>
        <p className="text-xs text-slate-500 font-medium max-w-md mt-2 leading-relaxed">
          Administrator privileges are strictly enforced on the server. Your current account does not have permission to access the Testora Platform Management console.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6">

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-55 px-5 py-2.5 bg-slate-900/95 backdrop-blur-md text-white font-bold text-xs rounded-xl shadow-xl flex items-center gap-2"
          >
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Strip */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-900 to-purple-950 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-purple-500/20 text-purple-300 border border-purple-400/30 text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-widest">
              SUPERUSER CONSOLE
            </span>
            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
              <ShieldCheck size={12} /> Server-Authorized Session
            </span>
          </div>
          <h1 className="font-display font-black text-xl md:text-2xl text-white">Platform Administration & Moderation</h1>
          <p className="text-xs text-purple-200/80 mt-1 font-medium">Manage user accounts, moderate public tests, inspect audit logs, and broadcast announcements.</p>
        </div>

        <button
          onClick={loadAdminData}
          disabled={loading}
          className="relative z-10 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/15 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-all active:scale-97"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Admin Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200/80">
        {[
          { id: 'overview', label: 'Platform Overview', icon: <Sparkles size={14} /> },
          { id: 'settlements', label: 'Payout Settlements', icon: <Wallet size={14} /> },
          { id: 'refunds', label: 'Refunds & Disputes', icon: <RotateCcw size={14} /> },
          { id: 'users', label: 'User Management', icon: <Users size={14} /> },
          { id: 'tests', label: 'Test Moderation', icon: <FileText size={14} /> },
          { id: 'reports', label: 'Flagged Content & Reports', icon: <AlertTriangle size={14} /> },
          { id: 'broadcast', label: 'System Broadcast', icon: <Send size={14} /> },
          { id: 'logs', label: 'Audit Security Logs', icon: <History size={14} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as AdminTab)}
            className={`px-4 py-2.5 rounded-xl font-display font-bold text-xs flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-white/60 text-slate-600 hover:bg-white hover:text-slate-900 border border-slate-100'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* MAIN TAB CONTENT */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 size={36} className="animate-spin text-purple-600" />
        </div>
      ) : (
        <div className="w-full">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[
                  { label: 'Registered Platform Users', value: stats?.total_users || 0, sub: 'Total registered profiles', icon: <Users className="text-purple-600" size={18} /> },
                  { label: 'Published Assessments', value: stats?.published_tests || 0, sub: `Out of ${stats?.total_tests || 0} total tests`, icon: <FileText className="text-indigo-600" size={18} /> },
                  { label: 'Proctored Submissions', value: stats?.total_attempts || 0, sub: 'Completed student attempts', icon: <CheckCircle2 className="text-emerald-600" size={18} /> },
                  { label: 'Verified Certificates', value: stats?.total_certificates || 0, sub: 'Issued credentials', icon: <Award className="text-amber-500" size={18} /> },
                  { label: 'Pending Reports', value: stats?.pending_reports || 0, sub: 'Awaiting moderation review', icon: <AlertTriangle className="text-rose-500" size={18} /> },
                  { label: 'Platform Status', value: 'HEALTHY', sub: 'All services operational', icon: <ShieldCheck className="text-emerald-500" size={18} /> }
                ].map((item, idx) => (
                  <GlassCard key={idx} className="p-5 border-slate-100 bg-white">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.label}</span>
                      <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl">{item.icon}</div>
                    </div>
                    <div className="mt-3">
                      <span className="font-display font-black text-2xl text-slate-900">{item.value}</span>
                      <span className="text-[10px] text-slate-400 font-bold block mt-0.5">{item.sub}</span>
                    </div>
                  </GlassCard>
                ))}
              </div>

              {/* Quick Actions Panel */}
              <GlassCard className="p-6 bg-white border-slate-100 rounded-3xl">
                <h3 className="font-display font-bold text-sm text-slate-800 mb-4">Quick Administrator Operations</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button
                    onClick={() => setActiveTab('users')}
                    className="p-4 bg-purple-50 hover:bg-purple-100/80 border border-purple-100 rounded-2xl text-left transition-all cursor-pointer group"
                  >
                    <Users className="text-purple-600 mb-2 group-hover:scale-110 transition-transform" size={20} />
                    <span className="font-display font-bold text-xs text-purple-900 block">Manage Users</span>
                    <span className="text-[10px] text-purple-600/80 font-medium">Suspend accounts or adjust roles</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('tests')}
                    className="p-4 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-100 rounded-2xl text-left transition-all cursor-pointer group"
                  >
                    <FileText className="text-indigo-600 mb-2 group-hover:scale-110 transition-transform" size={20} />
                    <span className="font-display font-bold text-xs text-indigo-900 block">Moderate Tests</span>
                    <span className="text-[10px] text-indigo-600/80 font-medium">Review & unpublish public tests</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('broadcast')}
                    className="p-4 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-100 rounded-2xl text-left transition-all cursor-pointer group"
                  >
                    <Send className="text-emerald-600 mb-2 group-hover:scale-110 transition-transform" size={20} />
                    <span className="font-display font-bold text-xs text-emerald-900 block">System Broadcast</span>
                    <span className="text-[10px] text-emerald-600/80 font-medium">Send global notifications</span>
                  </button>
                </div>
              </GlassCard>
            </div>
          )}

          {/* TAB 2: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <GlassCard className="p-6 bg-white border-slate-100 rounded-3xl flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <div>
                  <h3 className="font-display font-black text-base text-slate-900">Registered Platform Users</h3>
                  <p className="text-xs text-slate-500 font-medium">Search accounts, manage user status (active/suspended), or change user roles.</p>
                </div>

                <div className="w-full sm:max-w-xs relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                  <Search size={14} className="text-slate-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-800 outline-none w-full"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 pb-2">
                      <th className="py-3 px-3">User</th>
                      <th className="py-3 px-3">Email</th>
                      <th className="py-3 px-3">Role</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Joined</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 flex items-center gap-2.5">
                          <img
                            src={u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.full_name}`}
                            alt=""
                            className="w-8 h-8 rounded-full bg-slate-100 object-cover border border-slate-200"
                          />
                          <span className="font-extrabold text-slate-850">{u.full_name || 'Anonymous User'}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">{u.email}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            u.role === 'admin' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            u.status === 'suspended' ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-400 text-[10px]">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-3 text-right flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleUserStatusToggle(u.id, u.status)}
                            className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg border transition-all cursor-pointer ${
                              u.status === 'active'
                                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {u.status === 'active' ? 'Suspend' : 'Restore'}
                          </button>

                          <button
                            onClick={() => handleUserRoleToggle(u.id, u.role)}
                            className="px-2.5 py-1 text-[10px] font-extrabold rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 transition-all cursor-pointer"
                          >
                            {u.role === 'admin' ? 'Demote to User' : 'Make Admin'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}

          {/* TAB 3: TEST MODERATION */}
          {activeTab === 'tests' && (
            <GlassCard className="p-6 bg-white border-slate-100 rounded-3xl flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <div>
                  <h3 className="font-display font-black text-base text-slate-900">Public Test Moderation</h3>
                  <p className="text-xs text-slate-500 font-medium">Inspect active assessments, review question safety, or unpublish non-compliant tests.</p>
                </div>

                <div className="w-full sm:max-w-xs relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                  <Search size={14} className="text-slate-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search tests..."
                    value={testSearch}
                    onChange={(e) => setTestSearch(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-800 outline-none w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTests.map((test) => (
                  <div key={test.id} className="p-4 border border-slate-150 rounded-2xl bg-slate-50/50 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[9px] font-black uppercase bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-100">
                          {test.category || 'General'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          Marks: {test.total_marks || 100}
                        </span>
                      </div>
                      <h4 className="font-display font-extrabold text-sm text-slate-850">{test.title}</h4>
                      <p className="text-xs text-slate-500 font-medium line-clamp-2 mt-1">{test.description || 'No description provided.'}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-medium">ID: {test.id}</span>
                      <button
                        onClick={() => setSelectedTestId(test.id)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer"
                      >
                        Unpublish Test
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Unpublish Modal */}
              <AnimatePresence>
                {selectedTestId && (
                  <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-70 flex items-center justify-center p-6">
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="max-w-md w-full bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 flex flex-col gap-4"
                    >
                      <h3 className="font-display font-black text-base text-slate-900 flex items-center gap-2">
                        <AlertTriangle className="text-rose-500" size={18} />
                        <span>Unpublish Assessment</span>
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Unpublishing will revert this test to draft state so candidates can no longer register or attempt it.
                      </p>

                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Reason for Unpublishing</label>
                        <textarea
                          value={unpublishReason}
                          onChange={(e) => setUnpublishReason(e.target.value)}
                          placeholder="e.g. Copyright violation, offensive content, or improper formatting..."
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-rose-400 min-h-[80px]"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          onClick={() => setSelectedTestId(null)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleUnpublishTest}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
                        >
                          Confirm Unpublish
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </GlassCard>
          )}

          {/* TAB 4: REPORTS */}
          {activeTab === 'reports' && (
            <GlassCard className="p-6 bg-white border-slate-100 rounded-3xl flex flex-col gap-4">
              <h3 className="font-display font-black text-base text-slate-900">Flagged Content Reports</h3>
              <p className="text-xs text-slate-500 font-medium">Review reports submitted by students regarding questions, tests, or cheating activity.</p>

              {reports.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {reports.map((r) => (
                    <div key={r.id} className="p-4 border border-slate-150 rounded-2xl bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded ${
                            r.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {r.status}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">Reporter: {r.reporter_name}</span>
                        </div>
                        <h4 className="font-display font-bold text-xs text-slate-800">Reason: {r.reason}</h4>
                        <p className="text-xs text-slate-600 font-medium mt-0.5">{r.details || 'No additional details provided.'}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {r.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleResolveReport(r.id, 'dismissed')}
                              className="px-3 py-1.5 bg-slate-150 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-xl cursor-pointer"
                            >
                              Dismiss
                            </button>
                            <button
                              onClick={() => handleResolveReport(r.id, 'actioned')}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] rounded-xl shadow-sm cursor-pointer"
                            >
                              Mark Actioned
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <CheckCircle2 size={32} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-bold">No content reports pending moderation.</p>
                </div>
              )}
            </GlassCard>
          )}

          {/* TAB 5: BROADCAST */}
          {activeTab === 'broadcast' && (
            <GlassCard className="p-6 bg-white border-slate-100 rounded-3xl max-w-2xl">
              <h3 className="font-display font-black text-base text-slate-900 mb-1">Global System Announcement</h3>
              <p className="text-xs text-slate-500 font-medium mb-5">Broadcast a real-time notification to all active candidates across the Testora platform.</p>

              <form onSubmit={handleSendBroadcast} className="flex flex-col gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Announcement Title</label>
                  <input
                    type="text"
                    required
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="e.g. Scheduled Platform Maintenance or System Update"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Announcement Body</label>
                  <textarea
                    required
                    rows={4}
                    value={broadcastMsg}
                    onChange={(e) => setBroadcastMsg(e.target.value)}
                    placeholder="Type the message that will be delivered to every candidate's notification inbox..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-purple-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={broadcasting}
                  className="py-3 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-display font-black text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-97"
                >
                  {broadcasting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>Dispatch System Announcement</span>
                </button>
              </form>
            </GlassCard>
          )}

          {/* TAB 6: AUDIT LOGS */}
          {activeTab === 'logs' && (
            <GlassCard className="p-6 bg-white border-slate-100 rounded-3xl flex flex-col gap-4">
              <h3 className="font-display font-black text-base text-slate-900">Administrator Security Audit Logs</h3>
              <p className="text-xs text-slate-500 font-medium">Immutable record of all administrator interventions and moderation activities.</p>

              <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-3">
                      <ShieldAlert size={16} className="text-purple-600 shrink-0" />
                      <div>
                        <span className="font-extrabold text-slate-850 uppercase">{log.action.replace(/_/g, ' ')}</span>
                        <span className="text-[10px] text-slate-500 block font-normal">
                          Admin: {log.admin_email || log.admin_id} | Target ({log.target_type}): {log.target_id}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold shrink-0">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* TAB 7: PAYOUT SETTLEMENTS */}
          {activeTab === 'settlements' && (
            <GlassCard className="p-6 bg-white border-slate-100 rounded-3xl flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="font-display font-black text-base text-slate-900 flex items-center gap-2">
                    <Wallet className="text-lilac-600" size={20} />
                    <span>Creator Payout Settlement Requests</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Review, approve, process, or complete creator withdrawal requests with full security auditing.</p>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 pb-2">
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Creator</th>
                      <th className="py-3 px-3">Method & Details</th>
                      <th className="py-3 px-3 text-right">Amount (INR)</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {payoutRequests.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-bold">
                          No payout requests submitted yet.
                        </td>
                      </tr>
                    ) : (
                      payoutRequests.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                            {new Date(p.requested_at).toLocaleDateString('en-IN', {
                              day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="font-black text-slate-850 block">{p.creator_name || 'Creator'}</span>
                            <span className="text-[10px] text-slate-400 font-mono block">{p.creator_email}</span>
                          </td>
                          <td className="py-3.5 px-3 text-[11px]">
                            <span className="font-bold text-slate-800 uppercase block">{p.payout_method}</span>
                            {p.payout_details && (
                              <span className="text-[10px] text-slate-500 font-normal block">
                                {p.payout_details.account_holder_name} • {p.payout_details.account_number_masked || p.payout_details.upi_id_masked}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-right font-extrabold text-slate-900 text-sm">
                            ₹{(Number(p.amount_paise || 0) / 100).toFixed(2)}
                          </td>
                          <td className="py-3.5 px-3 text-center whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              p.status === 'PAID'
                                ? 'bg-emerald-100 text-emerald-700'
                                : p.status === 'PROCESSING'
                                ? 'bg-indigo-100 text-indigo-700'
                                : p.status === 'REQUESTED'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            {p.status === 'REQUESTED' && (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleUpdatePayoutStatus(p.id, 'PROCESSING')}
                                  disabled={processingPayout}
                                  className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all"
                                >
                                  Mark Processing
                                </button>
                                <button
                                  onClick={() => setSelectedPayout(p)}
                                  disabled={processingPayout}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-extrabold cursor-pointer shadow-sm transition-all"
                                >
                                  Complete Payout
                                </button>
                                <button
                                  onClick={() => handleUpdatePayoutStatus(p.id, 'CANCELLED', undefined, 'Rejected by administrator')}
                                  disabled={processingPayout}
                                  className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                            {p.status === 'PROCESSING' && (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setSelectedPayout(p)}
                                  disabled={processingPayout}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-extrabold cursor-pointer shadow-sm transition-all"
                                >
                                  Complete Payout
                                </button>
                                <button
                                  onClick={() => handleUpdatePayoutStatus(p.id, 'CANCELLED', undefined, 'Cancelled during processing')}
                                  disabled={processingPayout}
                                  className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all"
                                >
                                  Cancel Request
                                </button>
                              </div>
                            )}
                            {p.status === 'PAID' && (
                              <span className="text-[10px] font-mono text-emerald-600 font-bold block">
                                Ref: {p.reference_id || 'Completed'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Complete Payout Modal */}
              <AnimatePresence>
                {selectedPayout && (
                  <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-70 flex items-center justify-center p-6">
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="max-w-md w-full bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 flex flex-col gap-4"
                    >
                      <h3 className="font-display font-black text-base text-slate-900 flex items-center gap-2">
                        <CheckCircle2 className="text-emerald-500" size={20} />
                        <span>Confirm Payout Settlement</span>
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Confirming payout of <strong className="text-slate-900">₹{(selectedPayout.amount_paise / 100).toFixed(2)}</strong> to <strong className="text-slate-900">{selectedPayout.creator_name}</strong>.
                      </p>

                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                          Bank / UTR Reference Transaction ID *
                        </label>
                        <input
                          type="text"
                          required
                          value={payoutRefInput}
                          onChange={(e) => setPayoutRefInput(e.target.value)}
                          placeholder="e.g. UTR123456789 or BANK_REF_9876"
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          onClick={() => setSelectedPayout(null)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleUpdatePayoutStatus(selectedPayout.id, 'PAID', payoutRefInput || `UTR_${Date.now()}`)}
                          disabled={processingPayout || !payoutRefInput.trim()}
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                        >
                          {processingPayout ? 'Completing...' : 'Confirm Paid'}
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </GlassCard>
          )}

          {activeTab === 'refunds' && (
            <GlassCard className="p-6 border-slate-100/60 flex flex-col gap-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-display font-black text-lg text-slate-900 flex items-center gap-2">
                    <RotateCcw className="text-purple-600" size={20} />
                    <span>Refund & Dispute Management</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Review student refund claims, trigger server-verified Razorpay refunds, and resolve payment disputes.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-purple-50 text-purple-700 font-bold text-xs rounded-xl border border-purple-100">
                    Total Requests: {refundRequests.length}
                  </span>
                </div>
              </div>

              {/* Table of Refund Requests */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Test Title</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                    {refundRequests.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <RotateCcw className="mx-auto mb-2 opacity-40" size={32} />
                          No refund requests found.
                        </td>
                      </tr>
                    ) : (
                      refundRequests.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-extrabold text-slate-900 block">{r.profiles?.full_name || 'Student'}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{r.profiles?.email || 'N/A'}</span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">
                            {r.tests?.title || 'Unknown Test'}
                          </td>
                          <td className="py-3 px-4 font-extrabold text-slate-900">
                            ₹{r.amount_inr ? Number(r.amount_inr).toFixed(2) : (r.amount_paise / 100).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            <span className="font-bold text-slate-800 block capitalize">{r.reason}</span>
                            {r.explanation && (
                              <span className="text-[10px] text-slate-400 block truncate" title={r.explanation}>
                                {r.explanation}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                r.status === 'approved'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : r.status === 'rejected'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {r.status}
                            </span>
                            {r.razorpay_refund_id && (
                              <span className="block text-[9px] font-mono text-slate-400 mt-0.5">
                                ID: {r.razorpay_refund_id}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {r.status === 'requested' || r.status === 'under_review' ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleReviewRefund(r.id, 'approve')}
                                  disabled={processingRefundId === r.id}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-extrabold cursor-pointer shadow-sm transition-all flex items-center gap-1 disabled:opacity-50"
                                >
                                  {processingRefundId === r.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                  <span>Approve & Refund</span>
                                </button>
                                <button
                                  onClick={() => {
                                    const reason = prompt('Enter rejection reason for candidate:');
                                    if (reason !== null) handleReviewRefund(r.id, 'reject', reason);
                                  }}
                                  disabled={processingRefundId === r.id}
                                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all flex items-center gap-1"
                                >
                                  <XCircle size={12} />
                                  <span>Reject</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium">
                                Reviewed {r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString() : ''}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}

        </div>
      )}

    </div>
  );
};

export default AdminDashboardView;
