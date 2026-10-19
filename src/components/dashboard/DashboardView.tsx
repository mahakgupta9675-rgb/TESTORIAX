import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import StatsCards from './StatsCards';
import QuickActions from './QuickActions';
import RecentActivity from './RecentActivity';
import OverviewHero from './OverviewHero';
import SkillProficiencyTracker from './SkillProficiencyTracker';
import MotivationInsightCard from './MotivationInsightCard';
import ProctoringDashboard from '../proctoring/ProctoringDashboard';
import PerformanceView from '../analytics/PerformanceView';
import CertificatesView from '../analytics/CertificatesView';
import SettingsView from './SettingsView';
import MyTestsView from './MyTestsView';
import CompetitionsView from './CompetitionsView';
import NotificationsView from './NotificationsView';
import AdminDashboardView from '../admin/AdminDashboardView';
import CreatorEarningsView from '../creator/CreatorEarningsView';
import StudentRefundModal from './StudentRefundModal';
import GlassCard from '../ui/GlassCard';
import { Sparkles } from 'lucide-react';
import type { AppView } from '../../App';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import supabase from '../../lib/supabaseClient';

interface DashboardViewProps {
  onNavigate: (view: AppView, param?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { user, profile, setProfile, signOut } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  // Resolve active tab based on location path
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.endsWith('/dashboard') || path.endsWith('/dashboard/')) {
      return 'overview';
    }
    const segments = path.split('/');
    return segments[segments.length - 1] || 'overview';
  };

  const activeTab = getActiveTab();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);

  const handleTabChange = (tab: string) => {
    if (tab === 'create-test') {
      onNavigate('create-test');
    } else if (tab === 'practice') {
      onNavigate('practice');
    } else if (tab === 'refunds') {
      setIsRefundModalOpen(true);
    } else {
      navigate(`/dashboard/${tab}`);
    }
  };

  // User details states for dynamic updates
  const [userName, setUserName] = useState(profile?.full_name || 'Challenger User');
  const [userEmail, setUserEmail] = useState(profile?.email || user?.email || '');
  const [userSpecialty, setUserSpecialty] = useState(profile?.specialty || 'Full-Stack Developer & Technical Writer');
  const [userBio, setUserBio] = useState(profile?.bio || 'Passionate developer, educator, and technical writer.');
  const [userAvatar, setUserAvatar] = useState(profile?.avatar_url || '');
  const [userBanner, setUserBanner] = useState(profile?.banner_url || '');

  useEffect(() => {
    if (profile) {
      setUserName(profile.full_name || '');
      setUserEmail(profile.email || user?.email || '');
      if (profile.specialty) setUserSpecialty(profile.specialty);
      if (profile.bio) setUserBio(profile.bio);
      if (profile.avatar_url) setUserAvatar(profile.avatar_url);
      if (profile.banner_url) setUserBanner(profile.banner_url);
    }
  }, [profile, user]);

  const handleSignOut = async () => {
    await signOut();
    onNavigate('landing');
  };

  return (
    <div className="min-h-screen bg-[#fffafb] flex overflow-hidden">
      {/* Sidebar navigation */}
      <Sidebar
        currentTab={activeTab}
        onTabChange={handleTabChange}
        onSignOut={handleSignOut}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        userRole={profile?.role}
      />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 min-h-screen bg-[#fffafb]">
        
        {/* Top Navbar */}
        <TopNavbar
          onMenuToggle={() => setIsSidebarOpen(true)}
          onSignOut={handleSignOut}
          onViewProfile={() => onNavigate('creator-profile', 'me')}
          onViewSettings={() => handleTabChange('settings')}
          userName={userName}
          userEmail={userEmail}
          userAvatar={userAvatar}
          userRole={userSpecialty}
        />

        {/* Tab view controller */}
        <main className="flex-grow p-6 flex flex-col gap-6 overflow-y-auto max-w-7xl w-full mx-auto relative">
          {/* Decorative background blobs */}
          <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-lilac-200/40 rounded-full glowing-blob" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-pink-200/30 rounded-full glowing-blob" />

          {activeTab === 'overview' ? (
            <>
              {/* Dynamic Overview Welcome Hero */}
              <OverviewHero
                userName={userName}
                userRole={profile?.role}
                specialty={userSpecialty}
              />

              {/* Stats KPI Cards */}
              <StatsCards />

              {/* Quick Actions */}
              <QuickActions onNavigate={onNavigate} onTabChange={handleTabChange} />

              {/* Activity Timeline & Performance Tracker Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-stretch">
                {/* Recent Activity Timeline (7/12 grid cols) */}
                <div className="lg:col-span-7 flex">
                  <RecentActivity />
                </div>

                {/* Skill Proficiency Tracker (5/12 grid cols) */}
                <div className="lg:col-span-5 flex">
                  <SkillProficiencyTracker />
                </div>
              </div>

              {/* Motivational CTA Card */}
              <MotivationInsightCard onNavigate={onNavigate} />
            </>
          ) : activeTab === 'notifications' ? (
            <NotificationsView onNavigate={onNavigate} />
          ) : activeTab === 'competitions' ? (
            <CompetitionsView onNavigate={onNavigate} />
          ) : activeTab === 'earnings' ? (
            <CreatorEarningsView />
          ) : activeTab === 'proctoring' ? (
            <ProctoringDashboard />
          ) : activeTab === 'performance' || activeTab === 'analytics' || activeTab === 'my-results' ? (
            <PerformanceView onNavigate={onNavigate} />
          ) : activeTab === 'certificates' ? (
            <CertificatesView />
          ) : activeTab === 'admin' ? (
            <AdminDashboardView />
          ) : activeTab === 'tests' ? (
            <MyTestsView onNavigate={onNavigate} />
          ) : activeTab === 'settings' ? (
            <SettingsView
              userName={userName}
              userEmail={userEmail}
              userSpecialty={userSpecialty}
              userBio={userBio}
              userAvatar={userAvatar}
              userBanner={userBanner}
              onSave={async (name, email, specialty, bio, avatarUrl, bannerUrl) => {
                if (!user) return;
                try {
                  if (bannerUrl) {
                    try { localStorage.setItem(`testora_banner_${user.id}`, bannerUrl); } catch (e) {}
                  }

                  const updates: any = {
                    full_name: name,
                    email: email,
                    specialty: specialty,
                    bio: bio,
                  };
                  if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;
                  if (bannerUrl !== undefined) updates.banner_url = bannerUrl;

                  let { error } = await supabase
                    .from('profiles')
                    .update(updates)
                    .eq('id', user.id);

                  if (error && (error.message?.includes('banner_url') || error.code === 'PGRST204')) {
                    delete updates.banner_url;
                    const res = await supabase
                      .from('profiles')
                      .update(updates)
                      .eq('id', user.id);
                    error = res.error;
                  }

                  if (error) {
                    showToast(error.message, 'error');
                  } else {
                    setUserName(name);
                    setUserEmail(email);
                    setUserSpecialty(specialty);
                    setUserBio(bio);
                    if (avatarUrl !== undefined) setUserAvatar(avatarUrl);
                    if (bannerUrl !== undefined) setUserBanner(bannerUrl);
                    setProfile((prev) =>
                      prev
                        ? { ...prev, full_name: name, email, specialty, bio, avatar_url: avatarUrl || prev.avatar_url, banner_url: bannerUrl || prev.banner_url }
                        : null
                    );
                    showToast('Profile settings saved successfully!', 'success');
                  }
                } catch (err: any) {
                  showToast(err.message || 'Failed to update profile settings.', 'error');
                }
              }}
            />
          ) : (
            /* Stand-in tab layouts */
            <div className="flex-grow flex items-center justify-center min-h-[400px]">
              <GlassCard className="border-slate-100/60 p-12 text-center max-w-sm w-full">
                <div className="w-14 h-14 rounded-2xl bg-lilac-50 text-lilac-600 flex items-center justify-center mx-auto mb-6 shadow-inner animate-pulse">
                  <Sparkles size={24} />
                </div>
                <h3 className="font-display font-bold text-lg text-slate-900 tracking-tight capitalize">
                  {activeTab} Workspace
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mt-2.5">
                  This segment will dynamically compile features during live integrations. Check the recent activity feed in Overview to practice right now!
                </p>
                <button
                  onClick={() => handleTabChange('overview')}
                  className="mt-6 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl shadow-md shadow-pink-500/10 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
                >
                  Return to Overview
                </button>
              </GlassCard>
            </div>
          )}
        </main>
      </div>

      {/* Candidate Refund Request Modal */}
      <StudentRefundModal
        isOpen={isRefundModalOpen || activeTab === 'refunds'}
        onClose={() => {
          setIsRefundModalOpen(false);
          if (activeTab === 'refunds') navigate('/dashboard/overview');
        }}
      />
    </div>
  );
};

export default DashboardView;
