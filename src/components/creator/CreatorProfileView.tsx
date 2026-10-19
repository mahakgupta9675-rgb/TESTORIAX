import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, ShieldCheck, BookOpen, Clock, 
  Plus, Check, Loader2, Users, UserCheck, X, Image, Settings,
  Camera, ChevronRight, Bell, Lock, LogOut, User as UserIcon, Sparkles, Mail, Upload
} from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { testsService } from '../../services/testsService';
import { socialService } from '../../services/socialService';
import type { UserProfileSummary } from '../../services/socialService';

interface CreatorTest {
  id: string;
  title: string;
  category: string;
  attempts: number;
  rating: number;
  duration: number; // in mins
  difficulty: 'easy' | 'medium' | 'hard';
}

interface CreatorProfile {
  id: string;
  name: string;
  username: string;
  email?: string;
  avatar: string; 
  banner: string;  
  specialty: string;
  bio?: string;
  followers: number;
  following: number;
  testsCount: number;
  publishedTests: CreatorTest[];
  avatarIsCustomImage?: boolean;
  bannerIsCustomImage?: boolean;
}

interface CreatorProfileViewProps {
  onNavigate: (view: any, param?: string) => void;
  creatorId: string | null;
  prevView?: any;
}

export const CreatorProfileView: React.FC<CreatorProfileViewProps> = ({ onNavigate, creatorId, prevView }) => {
  const { user, profile: authProfile, loading: authLoading, refreshProfile, signOut } = useAuth();
  
  // Resolve profile target ID
  const effectiveCreatorId = (creatorId === 'me' || !creatorId || creatorId === 'undefined') 
    ? (user?.id || null) 
    : creatorId;
  const isMe = effectiveCreatorId === user?.id || creatorId === 'me';

  const [isLoading, setIsLoading] = useState(true);
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  // View state: 'profile' (main view) vs 'edit' (dedicated Edit Profile screen)
  const [screenMode, setScreenMode] = useState<'profile' | 'edit'>('profile');

  // Modal states
  const [activeModal, setActiveModal] = useState<'followers' | 'following' | 'editBanner' | null>(null);
  const [modalUsers, setModalUsers] = useState<UserProfileSummary[]>([]);
  const [isModalLoading, setIsModalLoading] = useState(false);

  // Edit Profile Form state
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editSpecialty, setEditSpecialty] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editBannerUrl, setEditBannerUrl] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      triggerToast('Image size must be less than 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      setEditAvatarUrl(dataUrl);
      if (user) {
        try {
          const { data, error } = await socialService.updateProfile(user.id, { avatar_url: dataUrl });
          if (!error && data) {
            setCreator(prev => prev ? { ...prev, avatar: data.avatar_url || dataUrl, avatarIsCustomImage: true } : prev);
            await refreshProfile();
            triggerToast('Profile photo updated!');
          }
        } catch (err) {
          console.error(err);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBannerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      triggerToast('Image size must be less than 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      setEditBannerUrl(dataUrl);
      if (user) {
        try {
          const { data, error } = await socialService.updateProfile(user.id, { banner_url: dataUrl });
          if (!error && data) {
            setCreator(prev => prev ? { ...prev, banner: data.banner_url || dataUrl, bannerIsCustomImage: true } : prev);
            await refreshProfile();
            triggerToast('Banner image updated!');
          }
        } catch (err) {
          console.error(err);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const fetchCreatorData = async () => {
      if (authLoading) return;

      const targetId = effectiveCreatorId || (creatorId === 'me' ? user?.id : null);
      
      if (!targetId) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      try {
        // Fetch base profile from DB
        const { data: profiles } = await testsService.getCreatorProfiles([targetId]);
        const prof = profiles?.[0];
        
        if (!prof && !isMe && !user) {
          setCreator(null);
          setIsLoading(false);
          return;
        }

        const pAny = prof as any;
        const name = prof?.full_name || (isMe ? (authProfile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Challenger User') : 'Testora Creator');
        const username = pAny?.username || `@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        const email = pAny?.email || (isMe ? (authProfile?.email || user?.email || '') : '');
        const specialty = prof?.specialty || (isMe ? (authProfile?.specialty || 'Full-Stack Educator & Engineer') : 'Assessment Specialist');
        const bio = pAny?.bio || (isMe ? (authProfile?.bio || 'Passionate about engineering education and interactive learning.') : '');
        const avatarUrl = prof?.avatar_url || (isMe ? (authProfile?.avatar_url || '') : '');
        const localBanner = typeof window !== 'undefined' ? localStorage.getItem(`testora_banner_${targetId}`) : null;
        const bannerUrl = pAny?.banner_url || localBanner || (isMe ? (authProfile?.banner_url || '') : '');

        // Fetch stats
        const stats = await socialService.getCreatorStats(targetId);
        
        // Fetch published tests
        const { data: testsData } = await testsService.getPublicTestsByCreator(targetId);
        const mappedTests: CreatorTest[] = (testsData || []).map(t => ({
          id: t.id,
          title: t.title,
          category: t.category || 'General',
          attempts: 0, 
          rating: 4.5,
          duration: t.duration,
          difficulty: t.difficulty || 'medium'
        }));

        const newCreator: CreatorProfile = {
          id: targetId,
          name: name,
          username: username,
          email: email,
          specialty: specialty,
          bio: bio,
          avatar: avatarUrl || 'from-purple-600 to-indigo-600',
          banner: bannerUrl || 'from-slate-900 via-lilac-950 to-indigo-950',
          avatarIsCustomImage: !!avatarUrl,
          bannerIsCustomImage: !!bannerUrl,
          followers: stats.followers,
          following: stats.following,
          testsCount: stats.publishedTestsCount,
          publishedTests: mappedTests
        };

        setCreator(newCreator);

        // Pre-fill edit form
        setEditName(name);
        setEditUsername(username.replace(/^@/, ''));
        setEditSpecialty(specialty);
        setEditBio(bio);
        setEditAvatarUrl(avatarUrl);
        setEditBannerUrl(bannerUrl);

        // Check follow status if viewing another user
        if (user && !isMe && targetId !== user.id) {
          const { isFollowing: followStatus } = await socialService.getFollowStatus(user.id, targetId);
          setIsFollowing(followStatus);
        }
        
      } catch (err: any) {
        console.error('Failed to load profile:', err);
        triggerToast('Failed to load profile.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCreatorData();
  }, [effectiveCreatorId, creatorId, user, isMe, authProfile, authLoading]);

  const handleToggleFollow = async () => {
    if (!user) {
      triggerToast('Please log in to follow creators.');
      setTimeout(() => onNavigate('login'), 800);
      return;
    }
    if (isMe) {
      triggerToast('You cannot follow yourself.');
      return;
    }
    if (!effectiveCreatorId || !creator) return;

    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        await socialService.unfollowUser(user.id, effectiveCreatorId);
        setIsFollowing(false);
        setCreator(prev => prev ? { ...prev, followers: Math.max(0, prev.followers - 1) } : prev);
        triggerToast(`Unfollowed ${creator.name}`);
      } else {
        const { error } = await socialService.followUser(user.id, effectiveCreatorId);
        if (error) throw error;
        setIsFollowing(true);
        setCreator(prev => prev ? { ...prev, followers: prev.followers + 1 } : prev);
        triggerToast(`Following ${creator.name}`);
      }
    } catch (err: any) {
      triggerToast(err.message || 'Follow request failed');
    } finally {
      setIsFollowLoading(false);
    }
  };

  const openSocialListModal = async (type: 'followers' | 'following') => {
    const targetId = effectiveCreatorId || user?.id;
    if (!targetId) return;
    setActiveModal(type);
    setIsModalLoading(true);
    try {
      if (type === 'followers') {
        const { data } = await socialService.getFollowersList(targetId);
        setModalUsers(data || []);
      } else {
        const { data } = await socialService.getFollowingList(targetId);
        setModalUsers(data || []);
      }
    } catch (err) {
      console.error('Error fetching social list:', err);
    } finally {
      setIsModalLoading(false);
    }
  };

  const handleSaveEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isMe) return;
    if (!editName.trim()) {
      triggerToast('Full Name is required.');
      return;
    }

    setIsSavingProfile(true);
    try {
      const formattedUsername = editUsername.trim() ? `@${editUsername.trim().replace(/^@/, '')}` : `@${editName.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}`;

      const { data, error } = await socialService.updateProfile(user.id, {
        full_name: editName.trim(),
        username: formattedUsername,
        specialty: editSpecialty.trim(),
        bio: editBio.trim(),
        avatar_url: editAvatarUrl.trim(),
        banner_url: editBannerUrl.trim()
      });

      if (error) throw error;

      setCreator(prev => prev ? {
        ...prev,
        name: data.full_name,
        username: formattedUsername,
        specialty: data.specialty || '',
        bio: data.bio || '',
        avatar: data.avatar_url || 'from-purple-600 to-indigo-600',
        banner: data.banner_url || 'from-slate-900 via-lilac-950 to-indigo-950',
        avatarIsCustomImage: !!data.avatar_url,
        bannerIsCustomImage: !!data.banner_url
      } : prev);

      await refreshProfile();
      triggerToast('Profile updated successfully!');
      setScreenMode('profile');
    } catch (err: any) {
      triggerToast(err.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLogOut = async () => {
    try {
      await signOut();
      onNavigate('login');
    } catch (err: any) {
      triggerToast('Failed to sign out');
    }
  };

  const handleTestClick = (testId: string) => {
    onNavigate('test-details', testId);
  };

  const handleBack = () => {
    if (screenMode === 'edit') {
      setScreenMode('profile');
      return;
    }
    if (prevView) {
      onNavigate(prevView);
    } else {
      onNavigate('discovery');
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-[#fffafb] flex items-center justify-center pt-20">
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-[#fffafb] flex flex-col items-center justify-center pt-20">
        <p className="text-slate-500 text-sm font-bold">Profile not found</p>
        <button onClick={handleBack} className="mt-4 text-purple-600 font-bold text-xs hover:underline cursor-pointer">
          Go Back
        </button>
      </div>
    );
  }

  // ====================================================
  // SCREEN MODE 2: DEDICATED EDIT PROFILE VIEW (REFERENCE 2ND SCREEN)
  // ====================================================
  if (screenMode === 'edit' && isMe) {
    return (
      <div className="w-full font-sans select-none antialiased min-h-screen bg-[#fffafb] pt-16 pb-24 px-4 sm:px-8 lg:px-12 flex flex-col items-center">
        
        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-900/95 backdrop-blur-md text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        <div className="max-w-2xl w-full bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden my-auto">
          
          {/* Header Bar matching reference */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <button 
              onClick={() => setScreenMode('profile')}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
            <h2 className="font-display font-black text-base text-slate-800">
              Edit Profile
            </h2>
            <button 
              onClick={handleSaveEditProfile}
              disabled={isSavingProfile}
              className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 flex items-center justify-center cursor-pointer transition-colors"
              title="Save Changes"
            >
              {isSavingProfile ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            </button>
          </div>

          <form onSubmit={handleSaveEditProfile} className="p-6 sm:p-8 flex flex-col gap-5">
            
            {/* Profile Photo Uploader section */}
            <div className="flex flex-col items-center justify-center gap-2 my-2">
              <div 
                onClick={() => avatarFileInputRef.current?.click()}
                className="relative group cursor-pointer"
                title="Click to upload photo from computer"
              >
                <div className={`w-28 h-28 rounded-full border-4 border-white shadow-xl overflow-hidden ${!editAvatarUrl ? `bg-gradient-to-tr ${creator.avatar}` : 'bg-slate-100'} flex items-center justify-center`}>
                  {editAvatarUrl ? (
                    <img src={editAvatarUrl} alt={creator.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-display font-black text-white text-3xl uppercase">
                      {editName.substring(0, 2) || 'US'}
                    </span>
                  )}
                </div>
                <div className="absolute bottom-0 right-0 w-8 h-8 bg-purple-600 rounded-full border-2 border-white text-white flex items-center justify-center shadow-md hover:bg-purple-700">
                  <Camera size={14} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => avatarFileInputRef.current?.click()}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-purple-50 text-purple-700 text-xs font-extrabold rounded-xl border border-purple-200/60 transition-all flex items-center gap-1.5 cursor-pointer mt-1"
              >
                <Upload size={13} />
                <span>Upload Photo from Computer</span>
              </button>
            </div>

            {/* Field 1: Full Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider pl-1">Full Name</label>
              <div className="flex items-center bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 focus-within:bg-white focus-within:border-purple-500 transition-all">
                <UserIcon size={16} className="text-slate-400 mr-2.5 shrink-0" />
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-transparent text-xs font-bold text-slate-800 outline-none"
                  placeholder="Enter full name"
                />
              </div>
            </div>

            {/* Field 2: Username / Handle */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider pl-1">Username Handle</label>
              <div className="flex items-center bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 focus-within:bg-white focus-within:border-purple-500 transition-all">
                <span className="text-xs font-black text-purple-600 mr-1">@</span>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full bg-transparent text-xs font-bold text-slate-800 outline-none"
                  placeholder="username"
                />
              </div>
            </div>

            {/* Field 3: Email Address */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider pl-1">Email Address</label>
              <div className="flex items-center bg-slate-100/70 border border-slate-200/60 rounded-2xl px-4 py-3 cursor-not-allowed">
                <Mail size={16} className="text-slate-400 mr-2.5 shrink-0" />
                <input
                  type="email"
                  disabled
                  value={creator.email || user?.email || ''}
                  className="w-full bg-transparent text-xs font-bold text-slate-500 outline-none cursor-not-allowed"
                />
              </div>
            </div>

            {/* Field 4: Specialty / Headline */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider pl-1">Specialty / Heading</label>
              <div className="flex items-center bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 focus-within:bg-white focus-within:border-purple-500 transition-all">
                <Sparkles size={16} className="text-slate-400 mr-2.5 shrink-0" />
                <input
                  type="text"
                  value={editSpecialty}
                  onChange={(e) => setEditSpecialty(e.target.value)}
                  className="w-full bg-transparent text-xs font-bold text-slate-800 outline-none"
                  placeholder="e.g. Senior Software Educator"
                />
              </div>
            </div>

            {/* Field 5: Profile Photo URL */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider pl-1">Avatar Image (File or URL)</label>
              <div className="flex items-center gap-2">
                <div className="flex-grow flex items-center bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 focus-within:bg-white focus-within:border-purple-500 transition-all">
                  <Image size={16} className="text-slate-400 mr-2.5 shrink-0" />
                  <input
                    type="url"
                    value={editAvatarUrl}
                    onChange={(e) => setEditAvatarUrl(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-slate-800 outline-none"
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => avatarFileInputRef.current?.click()}
                  className="px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-2xl border border-purple-200 shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload size={14} />
                  <span>Browse</span>
                </button>
              </div>
            </div>

            {/* Field 6: Banner Cover URL */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider pl-1">Cover Banner (File or URL)</label>
              <div className="flex items-center gap-2">
                <div className="flex-grow flex items-center bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 focus-within:bg-white focus-within:border-purple-500 transition-all">
                  <Image size={16} className="text-slate-400 mr-2.5 shrink-0" />
                  <input
                    type="url"
                    value={editBannerUrl}
                    onChange={(e) => setEditBannerUrl(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-slate-800 outline-none"
                    placeholder="https://example.com/banner.jpg"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => bannerFileInputRef.current?.click()}
                  className="px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-2xl border border-purple-200 shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload size={14} />
                  <span>Browse</span>
                </button>
              </div>
            </div>

            {/* Field 7: Bio */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider pl-1">Biography</label>
              <textarea
                rows={3}
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-purple-500 transition-all resize-none"
                placeholder="Share a short bio with your learners..."
              />
            </div>

            {/* Save Buttons */}
            <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setScreenMode('profile')}
                className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-7 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSavingProfile && <Loader2 size={14} className="animate-spin" />}
                <span>Save Profile</span>
              </button>
            </div>

          </form>
        </div>

      </div>
    );
  }

  // ====================================================
  // SCREEN MODE 1: TESTORA PROFILE DASHBOARD (REFERENCE 1ST SCREEN + RESPONSIVE DESKTOP)
  // ====================================================
  return (
    <div className="w-full font-sans select-none antialiased min-h-screen relative flex flex-col bg-[#fffafb] pt-16 pb-24">
      
      {/* Hidden file inputs for direct computer upload */}
      <input
        type="file"
        ref={avatarFileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleAvatarFileUpload}
      />
      <input
        type="file"
        ref={bannerFileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleBannerFileUpload}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-900/95 backdrop-blur-md text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-top-5">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Navigation */}
      <div className="w-full px-4 sm:px-8 lg:px-12 mb-4 flex items-center justify-between">
        <button 
          onClick={handleBack}
          className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span className="uppercase tracking-widest">Back</span>
        </button>
        <span className="font-display font-black text-sm text-slate-800">
          {isMe ? 'My Profile' : 'Creator Profile'}
        </span>
        {isMe ? (
          <button 
            onClick={() => onNavigate('dashboard', 'settings')}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
            title="Account Settings"
          >
            <Settings size={15} />
          </button>
        ) : <div className="w-8"></div>}
      </div>

      {/* FULL-WIDTH RESPONSIVE DASHBOARD LAYOUT */}
      <div className="w-full px-4 sm:px-8 lg:px-12 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: PROFILE CARD, IDENTITY & MENU LIST (Lg: 5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6 w-full">
          
          {/* PROFILE IDENTITY CARD */}
          <div className="w-full bg-white rounded-3xl border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.03)] overflow-hidden relative">
            
            {/* Elegant Banner Background */}
            <div className="w-full h-32 sm:h-40 relative overflow-hidden bg-slate-900">
              {creator.bannerIsCustomImage ? (
                <img src={creator.banner} alt="Banner" className="w-full h-full object-cover opacity-90" />
              ) : (
                <div className={`w-full h-full bg-gradient-to-r ${creator.banner} relative`}>
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent"></div>
                </div>
              )}

              {/* Edit Banner Button (Owner only) */}
              {isMe && (
                <button
                  onClick={() => bannerFileInputRef.current?.click()}
                  className="absolute top-3 right-3 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-900 text-white border border-white/20 rounded-xl text-[10px] font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer backdrop-blur-sm"
                >
                  <Image size={12} />
                  <span>Upload Banner</span>
                </button>
              )}
            </div>

            {/* Profile Avatar & Info */}
            <div className="px-6 pb-6 relative flex flex-col items-center text-center">
              
              {/* Avatar overlapping banner */}
              <div className="relative -mt-16 sm:-mt-20 mb-3 group">
                <div 
                  onClick={() => isMe && avatarFileInputRef.current?.click()}
                  className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-xl overflow-hidden shrink-0 ${!creator.avatarIsCustomImage ? `bg-gradient-to-tr ${creator.avatar}` : 'bg-slate-100'} flex items-center justify-center ${isMe ? 'cursor-pointer' : ''}`}
                  title={isMe ? 'Upload Photo from Computer' : ''}
                >
                  {creator.avatarIsCustomImage ? (
                    <img src={creator.avatar} alt={creator.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-display font-black text-white text-3xl sm:text-4xl uppercase tracking-tighter mix-blend-overlay opacity-90">
                      {creator.name.substring(0,2)}
                    </span>
                  )}
                </div>

                {isMe && (
                  <button 
                    onClick={() => avatarFileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-purple-600 rounded-full border-2 border-white text-white flex items-center justify-center shadow-md hover:bg-purple-700 cursor-pointer"
                    title="Upload Photo from Computer"
                  >
                    <Camera size={13} />
                  </button>
                )}
              </div>

              {/* Name & Handle */}
              <h1 className="font-display font-black text-xl sm:text-2xl text-slate-900 tracking-tight flex items-center gap-1.5 justify-center">
                <span>{creator.name}</span>
                <ShieldCheck size={18} className="text-emerald-500" />
              </h1>
              <p className="text-xs font-extrabold text-purple-600 mt-0.5">
                {creator.username}
              </p>

              {/* Specialty & Bio */}
              <span className="mt-2 text-[10px] font-bold text-slate-600 bg-slate-100 rounded-lg px-2.5 py-1">
                {creator.specialty}
              </span>
              
              {creator.bio && (
                <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-md mt-2">
                  {creator.bio}
                </p>
              )}

              {/* Action Button: Edit Profile (owner) or Follow (other) */}
              <div className="w-full mt-5">
                {isMe ? (
                  <button
                    onClick={() => setScreenMode('edit')}
                    className="w-full py-2.5 rounded-2xl font-display font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 active:scale-95"
                  >
                    <span>Edit Profile</span>
                  </button>
                ) : (
                  <button
                    onClick={handleToggleFollow}
                    disabled={isFollowLoading}
                    className={`w-full py-2.5 rounded-2xl font-display font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 ${
                      isFollowing 
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-500/25 hover:shadow-purple-500/40'
                    }`}
                  >
                    {isFollowLoading ? <Loader2 className="animate-spin" size={16} /> : isFollowing ? <Check size={16} /> : <Plus size={16} />}
                    <span>{isFollowing ? 'Following' : 'Follow Creator'}</span>
                  </button>
                )}
              </div>

              {/* Stats Bar (Tests, Followers, Following) */}
              <div className="grid grid-cols-3 w-full gap-2 mt-6 pt-4 border-t border-slate-100">
                <div className="flex flex-col items-center">
                  <span className="font-display font-black text-lg text-slate-900 leading-none">{creator.testsCount}</span>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-1">Tests</span>
                </div>

                <button 
                  onClick={() => openSocialListModal('followers')}
                  className="flex flex-col items-center group cursor-pointer"
                >
                  <span className="font-display font-black text-lg text-slate-900 leading-none group-hover:text-purple-600 transition-colors">
                    {creator.followers.toLocaleString()}
                  </span>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-1 group-hover:text-purple-600 transition-colors flex items-center gap-0.5">
                    <span>Followers</span>
                  </span>
                </button>

                <button 
                  onClick={() => openSocialListModal('following')}
                  className="flex flex-col items-center group cursor-pointer"
                >
                  <span className="font-display font-black text-lg text-slate-900 leading-none group-hover:text-purple-600 transition-colors">
                    {creator.following.toLocaleString()}
                  </span>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-1 group-hover:text-purple-600 transition-colors flex items-center gap-0.5">
                    <span>Following</span>
                  </span>
                </button>
              </div>

            </div>
          </div>

          {/* REFERENCE-STYLE MENU ROWS */}
          <div className="w-full bg-white rounded-3xl border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.03)] overflow-hidden p-2 flex flex-col gap-1">
            
            {/* Row 1: Published Tests */}
            <div 
              onClick={() => {
                const el = document.getElementById('published-tests-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="p-3.5 hover:bg-slate-50 rounded-2xl flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <BookOpen size={16} />
                </div>
                <span className="text-xs font-bold text-slate-800">Published Tests</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{creator.publishedTests.length}</span>
                <ChevronRight size={16} className="text-slate-400" />
              </div>
            </div>

            {/* Row 2: Followers */}
            <div 
              onClick={() => openSocialListModal('followers')}
              className="p-3.5 hover:bg-slate-50 rounded-2xl flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Users size={16} />
                </div>
                <span className="text-xs font-bold text-slate-800">Followers</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{creator.followers}</span>
                <ChevronRight size={16} className="text-slate-400" />
              </div>
            </div>

            {/* Row 3: Following */}
            <div 
              onClick={() => openSocialListModal('following')}
              className="p-3.5 hover:bg-slate-50 rounded-2xl flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <UserCheck size={16} />
                </div>
                <span className="text-xs font-bold text-slate-800">Following</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{creator.following}</span>
                <ChevronRight size={16} className="text-slate-400" />
              </div>
            </div>

            {/* Owner-only Navigation Rows */}
            {isMe && (
              <>
                {/* Row 4: Notifications */}
                <div 
                  onClick={() => onNavigate('dashboard')}
                  className="p-3.5 hover:bg-slate-50 rounded-2xl flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Bell size={16} />
                    </div>
                    <span className="text-xs font-bold text-slate-800">Notifications</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-400" />
                </div>

                {/* Row 5: Account Settings */}
                <div 
                  onClick={() => onNavigate('dashboard', 'settings')}
                  className="p-3.5 hover:bg-slate-50 rounded-2xl flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Settings size={16} />
                    </div>
                    <span className="text-xs font-bold text-slate-800">Account Settings</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-400" />
                </div>

                {/* Row 6: Security & Password */}
                <div 
                  onClick={() => onNavigate('dashboard', 'settings')}
                  className="p-3.5 hover:bg-slate-50 rounded-2xl flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                      <Lock size={16} />
                    </div>
                    <span className="text-xs font-bold text-slate-800">Security & Password</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-400" />
                </div>

                {/* Row 7: Log Out */}
                <div 
                  onClick={handleLogOut}
                  className="p-3.5 hover:bg-rose-50 rounded-2xl flex items-center justify-between cursor-pointer transition-colors text-rose-600 mt-1 border-t border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                      <LogOut size={16} />
                    </div>
                    <span className="text-xs font-black">Log Out</span>
                  </div>
                  <ChevronRight size={16} className="text-rose-400" />
                </div>
              </>
            )}

          </div>

        </div>

        {/* RIGHT COLUMN: PUBLISHED TESTS GRID & CONTENT (Lg: 7 cols) */}
        <div id="published-tests-section" className="lg:col-span-7 flex flex-col gap-6 w-full">
          
          <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.03)] p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookOpen size={22} className="text-purple-600" />
                <h2 className="font-display font-black text-lg text-slate-900 tracking-tight">
                  Published Tests ({creator.publishedTests.length})
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {creator.publishedTests.map((test) => (
                <GlassCard 
                  key={test.id} 
                  className="p-5 border-slate-100 bg-slate-50/60 hover:bg-white flex flex-col justify-between hover:-translate-y-1 transition-all cursor-pointer shadow-none hover:shadow-md rounded-2xl" 
                  onClick={() => handleTestClick(test.id)} 
                  hoverEffect={false}
                >
                  <div>
                    <div className="flex justify-between items-center mb-2.5">
                      <span className="px-2.5 py-0.5 rounded-lg border border-indigo-100 bg-indigo-50 text-[9px] font-black uppercase tracking-wider text-indigo-600">
                        {test.category}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                        test.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        test.difficulty === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        'bg-rose-50 text-rose-600 border-rose-100'
                      }`}>
                        {test.difficulty}
                      </span>
                    </div>

                    <h3 className="font-display font-black text-sm text-slate-900 leading-snug line-clamp-2">
                      {test.title}
                    </h3>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-200/60 pt-3.5 mt-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Clock size={12} />
                      <span>{test.duration} mins</span>
                    </span>
                    <span className="text-purple-600 hover:underline">View Test →</span>
                  </div>
                </GlassCard>
              ))}

              {creator.publishedTests.length === 0 && (
                <div className="col-span-full py-16 text-center text-slate-400 text-xs font-bold bg-slate-50/50 rounded-2xl border border-slate-100">
                  No public tests published yet.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* ====================================================
          MODAL 1: EDIT BANNER MODAL
         ==================================================== */}
      {activeModal === 'editBanner' && isMe && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <Image size={18} className="text-purple-600" />
                <h3 className="font-display font-black text-sm text-slate-800">
                  Update Cover Banner
                </h3>
              </div>
              <button 
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!user) return;
              try {
                const { data, error } = await socialService.updateProfile(user.id, { banner_url: editBannerUrl.trim() });
                if (error) throw error;
                setCreator(prev => prev ? { ...prev, banner: data.banner_url || '', bannerIsCustomImage: !!data.banner_url } : prev);
                await refreshProfile();
                triggerToast('Banner updated!');
                setActiveModal(null);
              } catch (err: any) {
                triggerToast('Failed to update banner');
              }
            }} className="p-6 flex flex-col gap-4">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase pl-1">Banner Image (File or URL)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={editBannerUrl}
                    onChange={(e) => setEditBannerUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-purple-500 transition-all"
                    placeholder="https://images.unsplash.com/photo-..."
                  />
                  <button
                    type="button"
                    onClick={() => bannerFileInputRef.current?.click()}
                    className="px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-2xl border border-purple-200 shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload size={14} />
                    <span>Browse</span>
                  </button>
                </div>
              </div>

              {/* Image Preview */}
              {editBannerUrl && (
                <div className="flex flex-col gap-1 mt-2">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">Banner Preview</span>
                  <div className="w-full h-32 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                    <img src={editBannerUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-4 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-2"
                >
                  <span>Save Banner</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL 2 & 3: FOLLOWERS / FOLLOWING LIST MODAL
         ==================================================== */}
      {activeModal && (activeModal === 'followers' || activeModal === 'following') && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                {activeModal === 'followers' ? <Users size={18} className="text-purple-600" /> : <UserCheck size={18} className="text-purple-600" />}
                <h3 className="font-display font-black text-sm text-slate-800 capitalize">
                  {activeModal} ({modalUsers.length})
                </h3>
              </div>
              <button 
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-grow flex flex-col gap-3">
              {isModalLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="animate-spin text-purple-600" size={24} />
                </div>
              ) : modalUsers.length > 0 ? (
                modalUsers.map((u) => (
                  <div 
                    key={u.id}
                    onClick={() => {
                      setActiveModal(null);
                      onNavigate('creator-profile', u.id);
                    }}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-100 rounded-2xl flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-black text-xs shrink-0 overflow-hidden">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt={u.full_name} className="w-full h-full object-cover" />
                        ) : (
                          u.full_name.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-extrabold text-xs text-slate-800 block truncate">{u.full_name}</span>
                        <span className="text-[10px] text-slate-400 font-semibold block truncate">{u.specialty || 'Challenger'}</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-purple-600 bg-purple-50 border border-purple-100 px-2.5 py-1 rounded-lg uppercase shrink-0">
                      View
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-slate-400 text-xs font-bold">
                  No users found in this list.
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default CreatorProfileView;
