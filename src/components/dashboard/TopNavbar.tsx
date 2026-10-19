import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, ChevronDown, User, Settings, LogOut, Info, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import notificationsService from '../../services/notificationsService';

interface TopNavbarProps {
  onMenuToggle: () => void;
  onSignOut: () => void;
  onViewProfile?: () => void;
  onViewSettings?: () => void;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  userRole?: string;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  onMenuToggle,
  onSignOut,
  onViewProfile,
  onViewSettings,
  userName: propsUserName,
  userEmail: propsUserEmail,
  userAvatar: propsUserAvatar,
  userRole: propsUserRole,
}) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [imgError, setImgError] = useState(false);

  // Dynamic user data resolution
  const displayName = propsUserName || profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const displayEmail = propsUserEmail || profile?.email || user?.email || 'user@testoriax.io';
  
  // Local storage fallback for avatar if DB column sync pending
  const localAvatar = user?.id ? localStorage.getItem(`testora_avatar_${user.id}`) : null;
  const avatarUrl = propsUserAvatar || profile?.avatar_url || localAvatar || null;

  const displayRole = propsUserRole || profile?.specialty || 'PRO CANDIDATE';

  // Compute initials dynamically from real user name
  const getInitials = (name: string) => {
    if (!name || !name.trim()) return 'US';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  const initials = getInitials(displayName);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const { data, error } = await notificationsService.getUserNotifications(user.id);
      if (!error && data) {
        setNotifications(data);
      }
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await notificationsService.markAllAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.error('Failed to mark notifications as read:', e);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between w-full h-18 px-6 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
      
      {/* Left: Sidebar trigger & Search bar */}
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors focus:outline-none cursor-pointer"
          aria-label="Open sidebar menu"
        >
          <Menu size={20} />
        </button>

        {/* Quick Search Bar */}
        <div className="hidden sm:flex items-center gap-2 max-w-xs w-full bg-slate-50 border border-slate-100 px-3.5 py-2.5 rounded-xl text-slate-400 focus-within:border-lilac-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-lilac-200/50 transition-all">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Quick search (⌘K)..."
            className="w-full bg-transparent text-slate-700 placeholder-slate-400 text-sm focus:outline-none"
          />
        </div>
      </div>

      {/* Right: Actions, Notifications & Profile Menu */}
      <div className="flex items-center gap-4 relative">
        
        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-lilac-50/50 text-slate-500 hover:text-lilac-600 transition-all relative cursor-pointer"
            aria-label="View notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4.5 h-4.5 bg-red-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center border border-white">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-100 rounded-2xl shadow-xl py-3.5 z-40">
              <div className="flex justify-between items-center px-4.5 pb-2.5 border-b border-slate-50">
                <span className="font-display font-bold text-slate-800 text-xs tracking-wider uppercase">Notifications</span>
                <span onClick={handleMarkAllRead} className="text-[10px] text-lilac-600 font-semibold cursor-pointer hover:underline">Mark all read</span>
              </div>
              <div className="flex flex-col max-h-64 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        setShowNotifications(false);
                        if (notif.id && !notif.is_read) {
                          notificationsService.markAsRead(notif.id);
                        }
                        if (notif.type === 'creator_published_test' || notif.type === 'test_registration') {
                          if (notif.reference_id) navigate(`/test-details/${notif.reference_id}`);
                          else navigate('/practice');
                        } else if (notif.type === 'result_released') {
                          navigate('/dashboard/my-results');
                        } else if (notif.type === 'certificate_available') {
                          navigate('/dashboard/certificates');
                        } else {
                          navigate('/dashboard/notifications');
                        }
                      }}
                      className={`px-4.5 py-3 hover:bg-slate-50/50 transition-colors flex gap-2.5 items-start cursor-pointer border-b border-slate-50/50 ${
                        notif.is_read ? '' : 'bg-lilac-50/15'
                      }`}
                    >
                      <Info size={14} className={`shrink-0 mt-0.5 ${notif.is_read ? 'text-slate-400' : 'text-lilac-500'}`} />
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <p className="text-xs font-bold text-slate-800 line-clamp-1">{notif.title}</p>
                        <p className="text-[11px] text-slate-600 font-medium leading-relaxed line-clamp-2">{notif.message}</p>
                        <span className="text-[9px] text-slate-400 font-semibold mt-0.5">
                          {notif.created_at ? new Date(notif.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'Just now'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4.5 py-6 text-center text-xs text-slate-400 italic">
                    No notifications yet.
                  </div>
                )}
              </div>
              <div className="p-2 border-t border-slate-50 text-center">
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    navigate('/dashboard/notifications');
                  }}
                  className="w-full py-1.5 text-xs font-extrabold text-lilac-600 hover:bg-lilac-50/50 rounded-xl transition-colors cursor-pointer"
                >
                  View All Notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown Button */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2.5 p-1 px-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
          >
            {avatarUrl && !imgError ? (
              <img
                src={avatarUrl}
                alt={displayName}
                onError={() => setImgError(true)}
                className="w-8 h-8 rounded-lg object-cover shadow-sm border border-slate-200"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-pink-500 to-indigo-500 flex items-center justify-center text-white text-xs font-extrabold shadow-sm">
                {initials}
              </div>
            )}

            <div className="hidden md:flex flex-col items-start text-left">
              <span className="text-sm font-bold text-slate-700 leading-snug">{displayName}</span>
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider leading-none mt-0.5">
                {displayRole}
              </span>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {/* User Profile Dropdown Dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-3 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl py-2 z-40">
              <div className="px-4.5 py-3 border-b border-slate-50 flex items-center gap-3">
                {avatarUrl && !imgError ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-9 h-9 rounded-xl object-cover border border-slate-100"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 to-indigo-500 flex items-center justify-center text-white text-xs font-extrabold">
                    {initials}
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-slate-800 truncate">{displayName}</span>
                  <span className="text-xs text-slate-400 truncate">{displayEmail}</span>
                </div>
              </div>
              <div className="py-1">
                <button 
                  onClick={() => {
                    setShowProfileMenu(false);
                    onViewProfile?.();
                  }}
                  className="w-full flex items-center gap-2.5 px-4.5 py-2.5 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  <User size={14} className="text-slate-400" />
                  <span>View Profile</span>
                </button>
                <button 
                  onClick={() => {
                    setShowProfileMenu(false);
                    onViewSettings?.();
                  }}
                  className="w-full flex items-center gap-2.5 px-4.5 py-2.5 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  <Settings size={14} className="text-slate-400" />
                  <span>Account Settings</span>
                </button>
                {profile?.role === 'admin' && (
                  <button 
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/dashboard/admin');
                    }}
                    className="w-full flex items-center gap-2.5 px-4.5 py-2.5 text-sm text-purple-700 font-extrabold hover:bg-purple-50 cursor-pointer"
                  >
                    <ShieldCheck size={14} className="text-purple-600" />
                    <span>Admin Console</span>
                  </button>
                )}
              </div>
              <div className="border-t border-slate-50 pt-1 mt-1">
                <button
                  onClick={onSignOut}
                  className="w-full flex items-center gap-2.5 px-4.5 py-2.5 text-sm text-red-500 hover:bg-red-50/50 font-bold cursor-pointer"
                >
                  <LogOut size={14} className="shrink-0" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};

export default TopNavbar;
