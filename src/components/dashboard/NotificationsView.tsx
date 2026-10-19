import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, CheckCircle2, Sparkles, Award, Trophy, UserCheck, 
  Trash2, ExternalLink, Check, Loader2, Info, ShieldCheck
} from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import notificationsService, { type AppNotification } from '../../services/notificationsService';

interface NotificationsViewProps {
  onNavigate: (view: any, param?: string) => void;
}

type FilterType = 'all' | 'unread' | 'creator_published_test' | 'test_registration' | 'result_released' | 'certificate_available';

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await notificationsService.getUserNotifications(user.id);
      if (error) throw error;
      setNotifications(data || []);
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      showToast('Failed to load notifications.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    if (!user) return;

    // Real-time subscription to user's notifications
    const channel = notificationsService.subscribeToNotifications(user.id, (newNotif) => {
      setNotifications(prev => [newNotif, ...prev]);
      showToast(`New Notification: ${newNotif.title}`, 'info');
    });

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [user]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setProcessingId(id);
      const { error } = await notificationsService.markAsRead(id);
      if (error) throw error;
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err: any) {
      showToast('Failed to update notification status.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { error } = await notificationsService.markAllAsRead(user.id);
      if (error) throw error;
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      showToast('All notifications marked as read!', 'success');
    } catch (err: any) {
      showToast('Failed to mark all as read.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setProcessingId(id);
      const { error } = await notificationsService.deleteNotification(id);
      if (error) throw error;
      setNotifications(prev => prev.filter(n => n.id !== id));
      showToast('Notification removed.', 'info');
    } catch (err: any) {
      showToast('Failed to delete notification.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (notif.id && !notif.is_read) {
      await handleMarkAsRead(notif.id);
    }

    // Smart routing based on notification type and reference_id
    if (notif.type === 'creator_published_test' || notif.type === 'test_registration') {
      if (notif.reference_id) {
        onNavigate('test-details', notif.reference_id);
      } else {
        onNavigate('practice');
      }
    } else if (notif.type === 'result_released' || notif.type === 'result_release') {
      onNavigate('dashboard', 'my-results');
    } else if (notif.type === 'certificate_available') {
      onNavigate('dashboard', 'certificates');
    } else if (notif.type === 'competition_event') {
      onNavigate('dashboard', 'competitions');
    } else {
      onNavigate('dashboard', 'overview');
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'creator_published_test':
        return <Sparkles className="text-purple-600" size={18} />;
      case 'test_registration':
        return <UserCheck className="text-emerald-600" size={18} />;
      case 'result_released':
      case 'result_release':
        return <Award className="text-amber-500" size={18} />;
      case 'certificate_available':
        return <ShieldCheck className="text-indigo-600" size={18} />;
      case 'competition_event':
        return <Trophy className="text-pink-600" size={18} />;
      default:
        return <Info className="text-blue-500" size={18} />;
    }
  };

  const getBadgeClassForType = (type: string) => {
    switch (type) {
      case 'creator_published_test':
        return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'test_registration':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'result_released':
      case 'result_release':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'certificate_available':
        return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'competition_event':
        return 'bg-pink-50 text-pink-700 border-pink-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'unread') return !n.is_read;
    if (activeFilter === 'all') return true;
    return n.type === activeFilter;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <GlassCard className="p-6 md:p-8 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 text-white flex items-center justify-center shadow-md shrink-0">
            <Bell size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-black text-xl text-slate-800 tracking-tight">
                Notifications Center
              </h2>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-red-500 text-white">
                  {unreadCount} Unread
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Stay up-to-date with test releases, result announcements, and registration alerts.
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={loading}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all shadow-sm shrink-0"
          >
            <CheckCircle2 size={14} />
            <span>Mark All as Read</span>
          </button>
        )}
      </GlassCard>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: `All (${notifications.length})` },
          { id: 'unread', label: `Unread (${unreadCount})` },
          { id: 'creator_published_test', label: 'Test Releases' },
          { id: 'test_registration', label: 'Registrations' },
          { id: 'result_released', label: 'Results' },
          { id: 'certificate_available', label: 'Certificates' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id as FilterType)}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
              activeFilter === tab.id
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/10'
                : 'bg-white border border-slate-100 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List Container */}
      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 size={32} className="animate-spin text-pink-500" />
          </div>
        ) : filteredNotifications.length > 0 ? (
          <AnimatePresence>
            {filteredNotifications.map((notif) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => handleNotificationClick(notif)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 group ${
                  notif.is_read
                    ? 'bg-white/70 border-slate-100 hover:border-purple-200 hover:shadow-sm'
                    : 'bg-white border-pink-200 shadow-md shadow-pink-500/5 ring-1 ring-pink-100 hover:border-pink-300'
                }`}
              >
                {/* Type Icon */}
                <div className={`p-3 rounded-2xl shrink-0 ${
                  notif.is_read ? 'bg-slate-50 border border-slate-100' : 'bg-pink-50 border border-pink-100'
                }`}>
                  {getIconForType(notif.type)}
                </div>

                {/* Main Text Content */}
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${getBadgeClassForType(notif.type)}`}>
                      {notif.type.replace(/_/g, ' ')}
                    </span>
                    {!notif.is_read && (
                      <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                    )}
                    <span className="text-[10px] font-bold text-slate-400 ml-auto">
                      {notif.created_at ? new Date(notif.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'Just now'}
                    </span>
                  </div>

                  <h4 className="font-display font-extrabold text-sm text-slate-800 mt-1.5 leading-snug">
                    {notif.title}
                  </h4>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed mt-1">
                    {notif.message}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                  {!notif.is_read && notif.id && (
                    <button
                      onClick={(e) => handleMarkAsRead(notif.id!, e)}
                      title="Mark as read"
                      disabled={processingId === notif.id}
                      className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                    >
                      <Check size={16} />
                    </button>
                  )}
                  {notif.id && (
                    <button
                      onClick={(e) => handleDelete(notif.id!, e)}
                      title="Delete notification"
                      disabled={processingId === notif.id}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <ExternalLink size={16} className="text-slate-350 group-hover:text-pink-500 transition-colors ml-1" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <div className="text-center py-20 bg-white/40 border border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-6">
            <Bell size={36} className="text-slate-350 mb-3 stroke-1" />
            <h3 className="font-display font-bold text-sm text-slate-700">No Notifications</h3>
            <p className="text-xs text-slate-400 font-medium mt-1 max-w-sm text-center leading-relaxed">
              {activeFilter === 'unread'
                ? "You've read all your notifications! Great job staying updated."
                : "You don't have any notifications under this filter."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsView;
