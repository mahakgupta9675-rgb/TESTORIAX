import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Clock, Award, Globe, Lock, Trash2, Edit3, Plus, 
  Loader2, RefreshCw, Share2, RotateCcw, AlertTriangle, Trophy,
  Star, Compass
} from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import testsService from '../../services/testsService';
import type { TestData } from '../../services/testsService';
import CreatorResultsDashboard from './CreatorResultsDashboard';

interface MyTestsViewProps {
  onNavigate: (view: any, param?: string) => void;
}

const TestAnalyticsTray: React.FC<{ testId: string }> = ({ testId }) => {
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await testsService.getCreatorTestAnalytics(testId);
        if (!error && data) {
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to load stats for test:', testId, err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [testId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-2 mt-2 border-t border-dashed border-slate-100">
        <Loader2 size={12} className="animate-spin text-purple-650" />
        <span className="text-[9px] text-slate-400 ml-1.5 font-bold">Loading metrics...</span>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-4 gap-2 text-slate-500 font-semibold text-[9px]">
      <div className="flex flex-col">
        <span className="text-[7.5px] font-black text-slate-400 uppercase">Views</span>
        <span className="text-slate-800 font-extrabold text-xs mt-0.5">{stats.views}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-[7.5px] font-black text-slate-400 uppercase">Regs</span>
        <span className="text-slate-800 font-extrabold text-xs mt-0.5">{stats.registrations}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-[7.5px] font-black text-slate-400 uppercase">Attempts</span>
        <span className="text-slate-800 font-extrabold text-xs mt-0.5">{stats.attempts}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-[7.5px] font-black text-slate-400 uppercase">Compl %</span>
        <span className="text-slate-800 font-extrabold text-xs mt-0.5">{stats.completionRate}%</span>
      </div>
      <div className="flex flex-col mt-1.5">
        <span className="text-[7.5px] font-black text-slate-400 uppercase">Avg Score</span>
        <span className="text-slate-800 font-extrabold text-xs mt-0.5">{stats.avgScore}%</span>
      </div>
      <div className="flex flex-col mt-1.5">
        <span className="text-[7.5px] font-black text-slate-400 uppercase">Saved</span>
        <span className="text-slate-800 font-extrabold text-xs mt-0.5">{stats.bookmarks}</span>
      </div>
      <div className="flex flex-col mt-1.5">
        <span className="text-[7.5px] font-black text-slate-400 uppercase">Rating</span>
        <span className="text-slate-805 font-black text-xs mt-0.5 flex items-center gap-0.5">
          <Star size={9} className="fill-amber-400 stroke-amber-500" />
          <span>{stats.rating}</span>
        </span>
      </div>
      <div className="flex flex-col mt-1.5">
        <span className="text-[7.5px] font-black text-slate-400 uppercase">Reviews</span>
        <span className="text-slate-800 font-extrabold text-xs mt-0.5">{stats.reviewCount}</span>
      </div>
    </div>
  );
};

export const MyTestsView: React.FC<MyTestsViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'active' | 'trash'>('active');
  const [activeTests, setActiveTests] = useState<TestData[]>([]);
  const [deletedTests, setDeletedTests] = useState<TestData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isRestoringId, setIsRestoringId] = useState<string | null>(null);
  const [selectedTestIdForManagement, setSelectedTestIdForManagement] = useState<string | null>(null);

  // Confirm Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    testId: string;
    title: string;
    isPermanent: boolean;
    currentStatus?: string;
  } | null>(null);

  const fetchTests = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [activeRes, deletedRes] = await Promise.all([
        testsService.getTests(user.id),
        testsService.getDeletedTests(user.id)
      ]);
      
      if (activeRes.error) throw activeRes.error;
      if (deletedRes.error) throw deletedRes.error;

      setActiveTests(activeRes.data || []);
      setDeletedTests(deletedRes.data || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch tests.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, [user]);

  const handleEdit = (test: TestData) => {
    if (!test.id) return;
    navigate('/create-test', { state: { testId: test.id } });
  };

  const handleSoftDelete = async (testId: string, currentStatus: string) => {
    setIsDeletingId(testId);
    try {
      const { error } = await testsService.deleteTest(testId, currentStatus);
      if (error) throw error;
      showToast('Test moved to trash successfully!', 'success');
      fetchTests();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete test.', 'error');
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleRestore = async (testId: string, previousStatus: string) => {
    setIsRestoringId(testId);
    try {
      const { error } = await testsService.restoreTest(testId, previousStatus);
      if (error) throw error;
      showToast('Test restored successfully!', 'success');
      fetchTests();
    } catch (err: any) {
      showToast(err.message || 'Failed to restore test.', 'error');
    } finally {
      setIsRestoringId(null);
    }
  };

  const handlePermanentDelete = async (testId: string) => {
    setIsDeletingId(testId);
    try {
      const { error } = await testsService.permanentlyDeleteTest(testId);
      if (error) throw error;
      showToast('Test permanently deleted.', 'success');
      fetchTests();
    } catch (err: any) {
      showToast(err.message || 'Failed to permanently delete test.', 'error');
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleShare = (test: TestData) => {
    if (!test.id) return;
    const shareUrl = `${window.location.origin}/lobby/join/${test.visibility === 'private' ? 'prv-39c8a9f2' : test.id}`;
    if (navigator.share) {
      navigator.share({
        title: test.title,
        text: `Take this assessment: ${test.title}`,
        url: shareUrl,
      })
      .then(() => showToast('Test shared successfully!', 'success'))
      .catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl)
        .then(() => showToast('Lobby link copied to clipboard!', 'success'))
        .catch(() => showToast('Failed to copy link.', 'error'));
    }
  };

  const currentTests = activeTab === 'active' ? activeTests : deletedTests;

  if (selectedTestIdForManagement) {
    return (
      <CreatorResultsDashboard 
        testId={selectedTestIdForManagement}
        onBack={() => setSelectedTestIdForManagement(null)}
      />
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 relative">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/60 backdrop-blur-md border border-slate-100 p-6 rounded-3xl shadow-sm">
        <div>
          <h2 className="font-display font-extrabold text-xl text-slate-900 tracking-tight">
            My Created Tests
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manage your draft and published assessments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchTests}
            disabled={isLoading}
            className="p-2.5 bg-white border border-slate-200 hover:border-slate-350 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-slate-800 disabled:opacity-50 transition-all cursor-pointer shadow-sm flex items-center justify-center"
            title="Refresh Tests List"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
          
          <button
            onClick={() => onNavigate('create-test')}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
          >
            <Plus size={14} />
            <span>Create Test</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 border-b border-slate-100 pb-2">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'active'
              ? 'bg-purple-100 text-purple-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Active Tests ({activeTests.length})
        </button>
        <button
          onClick={() => setActiveTab('trash')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'trash'
              ? 'bg-rose-100 text-rose-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Trash</span>
          <span className="bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold">
            {deletedTests.length}
          </span>
        </button>
      </div>

      {/* Tests Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {[1, 2, 3, 4].map((idx) => (
            <div key={idx} className="p-6 border border-slate-100 rounded-3xl bg-white/50 animate-pulse flex flex-col gap-4 shadow-sm">
              <div className="flex justify-between items-center">
                <div className="h-5 bg-slate-200 rounded w-1/4" />
                <div className="h-5 bg-slate-200 rounded w-16" />
              </div>
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
              <div className="h-px bg-slate-150 my-2" />
              <div className="flex gap-4">
                <div className="h-3 bg-slate-200 rounded w-12" />
                <div className="h-3 bg-slate-200 rounded w-12" />
              </div>
            </div>
          ))}
        </div>
      ) : currentTests.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <AnimatePresence>
            {currentTests.map((test) => {
              const isPublished = test.status === 'published';
              const negativeValue = test.negative_marking?.enabled 
                ? test.negative_marking.value 
                : 0;

              return (
                <motion.div
                  key={test.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <GlassCard className="p-0 overflow-hidden border-slate-150/40 bg-white hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full relative group">
                    {/* Top cover banner */}
                    <div className={`h-16 bg-gradient-to-r ${test.mock_thumbnail || 'from-purple-500 to-indigo-500'} flex items-center justify-between px-5 text-white relative`}>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-white/20 backdrop-blur-sm">
                        {activeTab === 'trash' ? 'deleted' : test.status}
                      </span>

                      <span className="text-[9px] text-white/90 font-bold">
                        {activeTab === 'trash' ? 'Deleted: ' : ''}
                        {test.updated_at ? new Date(test.updated_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        }) : ''}
                      </span>
                    </div>

                    <div className="p-5 flex flex-col justify-between flex-grow">
                      <div>
                        <h3 className="font-display font-extrabold text-base text-slate-800 tracking-tight line-clamp-1 group-hover:text-purple-655 transition-colors">
                          {test.title}
                        </h3>

                        {test.description && (
                          <p className="text-xs text-slate-500 font-semibold mt-1.5 line-clamp-2 leading-relaxed">
                            {test.description}
                          </p>
                        )}

                        {/* Stats Pills Strip */}
                        <div className="flex flex-wrap gap-2.5 mt-5">
                          <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-xl text-[10px] font-bold text-slate-655">
                            <Clock size={11} className="text-slate-450" />
                            <span>{test.duration || 0}m</span>
                          </div>

                          <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-xl text-[10px] font-bold text-slate-655">
                            <Award size={11} className="text-slate-450" />
                            <span>{test.total_marks || 0} pts</span>
                          </div>

                          <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-xl text-[10px] font-bold text-slate-655">
                            {test.visibility === 'public' ? (
                              <>
                                <Globe size={11} className="text-slate-450" />
                                <span>Public</span>
                              </>
                            ) : (
                              <>
                                <Lock size={11} className="text-slate-450" />
                                <span>Private</span>
                              </>
                            )}
                          </div>

                          {test.negative_marking?.enabled && (
                            <div className="flex items-center gap-1 bg-red-50/50 border border-red-100/50 px-2.5 py-1 rounded-xl text-[10px] font-bold text-red-650">
                              <span>-{negativeValue} Neg</span>
                            </div>
                          )}

                          {/* Mode Badge: Competition vs Practice */}
                          {test.host_competition ? (
                            <div className="flex items-center gap-1 bg-amber-50/60 border border-amber-100/60 px-2.5 py-1 rounded-xl text-[10px] font-bold text-amber-700">
                              <Trophy size={11} className="text-amber-550 fill-amber-500/20" />
                              <span>Competition</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 bg-purple-50/60 border border-purple-100/60 px-2.5 py-1 rounded-xl text-[10px] font-bold text-purple-700">
                              <Compass size={11} className="text-purple-550" />
                              <span>Practice</span>
                            </div>
                          )}
                        </div>

                        {/* Display creator analytics for public practice tests */}
                        {isPublished && test.visibility === 'public' && test.id && (
                          <TestAnalyticsTray testId={test.id} />
                        )}
                      </div>

                      {/* Actions buttons footer */}
                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-50">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <FileText size={11} />
                          <span>{test.questions?.length || 0} Questions</span>
                        </span>

                        <div className="flex items-center gap-2">
                          {activeTab === 'active' ? (
                            <>
                              {isPublished && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleShare(test)}
                                    className="p-2 bg-slate-50 hover:bg-indigo-50 text-slate-550 hover:text-indigo-650 rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-sm animate-in fade-in zoom-in duration-200"
                                    title="Share Test Lobby Link"
                                  >
                                    <Share2 size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => test.id && setSelectedTestIdForManagement(test.id)}
                                    className="p-2 bg-slate-50 hover:bg-purple-50 text-slate-550 hover:text-purple-650 rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-sm animate-in fade-in zoom-in duration-200"
                                    title="Manage Test Results"
                                  >
                                    <Trophy size={14} className="text-amber-500" />
                                  </button>
                                </>
                              )}

                              <button
                                  type="button"
                                  onClick={() => handleEdit(test)}
                                  className="p-2 bg-slate-50 hover:bg-purple-50 text-slate-555 hover:text-purple-655 rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-sm"
                                  title="Edit Test Setup"
                              >
                                <Edit3 size={14} />
                              </button>
                              
                              <button
                                  type="button"
                                  onClick={() => {
                                    if (test.id) {
                                      setModalConfig({
                                        testId: test.id,
                                        title: test.title,
                                        isPermanent: false,
                                        currentStatus: test.status
                                      });
                                      setShowConfirmModal(true);
                                    }
                                  }}
                                  disabled={isDeletingId === test.id}
                                  className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-555 hover:text-rose-600 rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-sm disabled:opacity-50"
                                  title="Delete Assessment"
                              >
                                {isDeletingId === test.id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                  type="button"
                                  onClick={() => test.id && handleRestore(test.id, test.previous_status || 'draft')}
                                  disabled={isRestoringId === test.id}
                                  className="p-2 bg-slate-50 hover:bg-purple-50 text-slate-555 hover:text-purple-655 rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-sm disabled:opacity-50"
                                  title="Restore Assessment"
                              >
                                {isRestoringId === test.id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <RotateCcw size={14} />
                                )}
                              </button>

                              <button
                                  type="button"
                                  onClick={() => {
                                    if (test.id) {
                                      setModalConfig({
                                        testId: test.id,
                                        title: test.title,
                                        isPermanent: true
                                      });
                                      setShowConfirmModal(true);
                                    }
                                  }}
                                  disabled={isDeletingId === test.id}
                                  className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-555 hover:text-rose-600 rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-sm disabled:opacity-50"
                                  title="Permanently Delete Assessment"
                              >
                                {isDeletingId === test.id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Trash2 size={14} className="text-rose-600" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <GlassCard className="border-slate-100/60 p-12 text-center max-w-sm w-full mx-auto shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-lilac-50 text-lilac-600 flex items-center justify-center mx-auto mb-6 shadow-inner">
            {activeTab === 'active' ? <FileText size={24} /> : <Trash2 size={24} className="text-rose-500" />}
          </div>
          <h3 className="font-display font-bold text-lg text-slate-900 tracking-tight">
            {activeTab === 'active' ? 'No tests found' : 'Trash is empty'}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed mt-2.5 font-medium">
            {activeTab === 'active' 
              ? "You haven't created any test templates or lobbies yet. Use the setup wizard to create your first assessment shell."
              : 'Assessments you soft-delete will appear here. You can restore them to active status or delete them permanently.'}
          </p>
          {activeTab === 'active' && (
            <button
              onClick={() => onNavigate('create-test')}
              className="mt-6 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              Create Your First Test
            </button>
          )}
        </GlassCard>
      )}

      {/* Delete/Permanent Delete Confirmation Custom Modal */}
      <AnimatePresence>
        {showConfirmModal && modalConfig && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xl max-w-md w-full relative"
            >
              <h3 className="font-display font-extrabold text-base text-slate-800 tracking-tight flex items-center gap-2">
                <AlertTriangle size={18} className="text-rose-500" />
                <span>{modalConfig.isPermanent ? 'Permanently Delete Assessment?' : 'Move to Trash?'}</span>
              </h3>
              
              <p className="text-xs text-slate-500 leading-relaxed font-semibold mt-3">
                {modalConfig.isPermanent 
                  ? 'Are you sure? This action cannot be undone and will permanently remove this test, all related questions, and candidate registrations.'
                  : `Are you sure you want to move "${modalConfig.title}" to the trash?`}
              </p>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setModalConfig(null);
                  }}
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold text-center cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    if (modalConfig.isPermanent) {
                      handlePermanentDelete(modalConfig.testId);
                    } else {
                      handleSoftDelete(modalConfig.testId, modalConfig.currentStatus || 'draft');
                    }
                    setModalConfig(null);
                  }}
                  className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold text-center cursor-pointer shadow-md"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyTestsView;
