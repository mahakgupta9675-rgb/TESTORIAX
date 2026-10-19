import React, { useState, useEffect } from 'react';
import { User, Mail, Key, Bell, Sparkles, Check, Image as ImageIcon, Upload } from 'lucide-react';
import GlassCard from '../ui/GlassCard';

interface SettingsViewProps {
  userName: string;
  userEmail: string;
  userSpecialty: string;
  userBio: string;
  userAvatar?: string;
  userBanner?: string;
  onSave: (name: string, email: string, specialty: string, bio: string, avatarUrl?: string, bannerUrl?: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  userName,
  userEmail,
  userSpecialty,
  userBio,
  userAvatar = '',
  userBanner = '',
  onSave,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'security' | 'notifications'>('profile');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState(userName);
  const [email, setEmail] = useState(userEmail);
  const [specialty, setSpecialty] = useState(userSpecialty);
  const [bio, setBio] = useState(userBio);
  const [avatarUrl, setAvatarUrl] = useState(userAvatar);
  const [bannerUrl, setBannerUrl] = useState(userBanner);

  // Password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Preference states
  const [scoreNotifications, setScoreNotifications] = useState(true);
  const [tournamentsNotifications, setTournamentsNotifications] = useState(true);
  const [warningEmails, setWarningEmails] = useState(false);

  useEffect(() => {
    setName(userName);
    setEmail(userEmail);
    setSpecialty(userSpecialty);
    setBio(userBio);
    setAvatarUrl(userAvatar);
    setBannerUrl(userBanner);
  }, [userName, userEmail, userSpecialty, userBio, userAvatar, userBanner]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      triggerToast('Name and Email are required.');
      return;
    }
    onSave(name, email, specialty, bio, avatarUrl, bannerUrl);
    triggerToast('Profile updated successfully!');
  };

  const handlePasswordSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      triggerToast('All password fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      triggerToast('New passwords do not match.');
      return;
    }
    triggerToast('Password updated successfully!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      triggerToast('Image file size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (target === 'avatar') {
        setAvatarUrl(result);
      } else {
        setBannerUrl(result);
      }
      triggerToast(`${target === 'avatar' ? 'Profile photo' : 'Banner image'} uploaded!`);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-200">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-55 px-4.5 py-2.5 bg-slate-900/95 backdrop-blur-md text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2">
          <Check size={13} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header section */}
      <div>
        <h2 className="font-display font-black text-xl md:text-2xl text-slate-800 tracking-tight">
          Account Settings
        </h2>
        <p className="text-xs text-slate-400 font-bold mt-1">
          Customize your user profile details, credentials, and notification preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Navigation Links (3 cols) */}
        <div className="lg:col-span-3 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 select-none">
          {[
            { id: 'profile', label: 'Profile Settings', icon: <User size={16} /> },
            { id: 'security', label: 'Security & Password', icon: <Key size={16} /> },
            { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
          ].map((tab) => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-lilac-500 text-white shadow-md shadow-lilac-500/25'
                    : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-100'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Side: Tab Contents (9 cols) */}
        <div className="lg:col-span-9 flex flex-col gap-6 w-full">
          
          {/* PROFILE SETTINGS TAB */}
          {activeSubTab === 'profile' && (
            <GlassCard className="p-6 border-slate-100 bg-white shadow-sm flex flex-col gap-6">
              <div>
                <h3 className="font-display font-bold text-sm text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <User size={15} className="text-lilac-550" />
                  <span>Profile Information</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                  Update your candidate credentials visible in classrooms and lobby dashboards.
                </p>
              </div>

              <form onSubmit={handleProfileSave} className="flex flex-col gap-6">
                
                {/* Visual Avatar & Banner Upload Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 border border-slate-150 rounded-2xl">
                  
                  {/* Profile Picture Upload */}
                  <div className="flex flex-col gap-3">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      Profile Picture / Avatar
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-lilac-500 to-indigo-500 flex items-center justify-center text-white font-black text-lg overflow-hidden border-2 border-white shadow-md shrink-0">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          name.substring(0, 2).toUpperCase() || 'US'
                        )}
                      </div>
                      <div className="flex flex-col gap-2 flex-grow">
                        <label className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shadow-xs w-fit">
                          <Upload size={13} className="text-lilac-600" />
                          <span>Upload Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, 'avatar')}
                            className="hidden"
                          />
                        </label>
                        <input
                          type="url"
                          value={avatarUrl}
                          onChange={(e) => setAvatarUrl(e.target.value)}
                          placeholder="Or paste image URL..."
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] font-semibold text-slate-700 outline-none focus:border-lilac-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Cover Banner Upload */}
                  <div className="flex flex-col gap-3">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      Cover Banner Image
                    </label>
                    <div className="flex flex-col gap-2">
                      <div className="w-full h-16 rounded-xl bg-slate-900 border border-slate-200 overflow-hidden relative">
                        {bannerUrl ? (
                          <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-r from-slate-900 via-lilac-950 to-indigo-950 flex items-center justify-center text-slate-400 text-[10px] font-bold">
                            Default Cover Banner
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shadow-xs shrink-0">
                          <ImageIcon size={13} className="text-lilac-600" />
                          <span>Upload Banner</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, 'banner')}
                            className="hidden"
                          />
                        </label>
                        <input
                          type="url"
                          value={bannerUrl}
                          onChange={(e) => setBannerUrl(e.target.value)}
                          placeholder="Or paste banner URL..."
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] font-semibold text-slate-700 outline-none focus:border-lilac-400"
                        />
                      </div>
                    </div>
                  </div>

                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Full Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-slate-450 uppercase pl-1">Full Name</label>
                    <div className="relative flex items-center bg-slate-50 border border-slate-150 rounded-2xl px-3.5 py-2.5 focus-within:bg-white focus-within:border-lilac-300 transition-all shadow-sm">
                      <User size={13} className="text-slate-400 mr-2 shrink-0" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="flex-grow bg-transparent text-xs font-semibold text-slate-750 outline-none"
                        placeholder="Your full name"
                      />
                    </div>
                  </div>

                  {/* Email Address */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-slate-450 uppercase pl-1">Email Address</label>
                    <div className="relative flex items-center bg-slate-50 border border-slate-150 rounded-2xl px-3.5 py-2.5 focus-within:bg-white focus-within:border-lilac-300 transition-all shadow-sm">
                      <Mail size={13} className="text-slate-400 mr-2 shrink-0" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="flex-grow bg-transparent text-xs font-semibold text-slate-750 outline-none"
                        placeholder="Your email address"
                      />
                    </div>
                  </div>
                </div>

                {/* Job Title / Specialty */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-slate-450 uppercase pl-1">Specialty / Heading</label>
                  <div className="relative flex items-center bg-slate-50 border border-slate-150 rounded-2xl px-3.5 py-2.5 focus-within:bg-white focus-within:border-lilac-300 transition-all shadow-sm">
                    <Sparkles size={13} className="text-slate-400 mr-2 shrink-0 animate-pulse" />
                    <input
                      type="text"
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      className="flex-grow bg-transparent text-xs font-semibold text-slate-750 outline-none"
                      placeholder="e.g. Full-Stack Developer & Technical Writer"
                    />
                  </div>
                </div>

                {/* Biography */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-slate-450 uppercase pl-1">Short Biography</label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 rounded-2xl p-3.5 text-xs font-semibold text-slate-750 outline-none focus:bg-white focus:border-lilac-300 transition-all shadow-sm resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                {/* Save button */}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-2xl bg-lilac-500 hover:bg-lilac-600 text-white font-display font-bold text-xs uppercase tracking-wider shadow-md shadow-lilac-500/25 transition-all cursor-pointer active:scale-95"
                  >
                    Save Profile
                  </button>
                </div>

              </form>
            </GlassCard>
          )}

          {/* SECURITY & PASSWORD TAB */}
          {activeSubTab === 'security' && (
            <GlassCard className="p-6 border-slate-100 bg-white shadow-sm flex flex-col gap-6">
              <div>
                <h3 className="font-display font-bold text-sm text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Key size={15} className="text-lilac-550" />
                  <span>Security & Credentials</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                  Update your authentication password and account safety options.
                </p>
              </div>

              <form onSubmit={handlePasswordSave} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-slate-450 uppercase pl-1">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-slate-750 outline-none focus:bg-white focus:border-lilac-300 transition-all"
                    placeholder="••••••••••••"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-slate-450 uppercase pl-1">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-150 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-slate-750 outline-none focus:bg-white focus:border-lilac-300 transition-all"
                      placeholder="••••••••••••"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-slate-450 uppercase pl-1">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-150 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-slate-750 outline-none focus:bg-white focus:border-lilac-300 transition-all"
                      placeholder="••••••••••••"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-2xl bg-lilac-500 hover:bg-lilac-600 text-white font-display font-bold text-xs uppercase tracking-wider shadow-md shadow-lilac-500/25 transition-all cursor-pointer active:scale-95"
                  >
                    Update Password
                  </button>
                </div>
              </form>
            </GlassCard>
          )}

          {/* NOTIFICATIONS PREFERENCES TAB */}
          {activeSubTab === 'notifications' && (
            <GlassCard className="p-6 border-slate-100 bg-white shadow-sm flex flex-col gap-6">
              <div>
                <h3 className="font-display font-bold text-sm text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Bell size={15} className="text-lilac-550" />
                  <span>Notification Preferences</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                  Choose what email and system alerts you receive.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <label className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-150 cursor-pointer">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">Exam Results & Score Reports</span>
                    <span className="text-[10px] text-slate-400 font-semibold">Get notified when test results and certificates are ready</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={scoreNotifications}
                    onChange={(e) => setScoreNotifications(e.target.checked)}
                    className="w-4 h-4 accent-lilac-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-150 cursor-pointer">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">Competitions & Live Tournaments</span>
                    <span className="text-[10px] text-slate-400 font-semibold">Alerts for scheduled challenges and global leaderboards</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={tournamentsNotifications}
                    onChange={(e) => setTournamentsNotifications(e.target.checked)}
                    className="w-4 h-4 accent-lilac-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-150 cursor-pointer">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">Security & Warning Alerts</span>
                    <span className="text-[10px] text-slate-400 font-semibold">Receive emails on proctoring flags and login changes</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={warningEmails}
                    onChange={(e) => setWarningEmails(e.target.checked)}
                    className="w-4 h-4 accent-lilac-500 cursor-pointer"
                  />
                </label>
              </div>
            </GlassCard>
          )}

        </div>

      </div>

    </div>
  );
};

export default SettingsView;
