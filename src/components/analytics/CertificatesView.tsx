import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Award, Trophy, Target, Download, 
  Share2, Maximize2, Search, Filter, X,
  ShieldCheck, Calendar, Key, AlertCircle, Loader2, Sparkles, ExternalLink
} from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import { useAuth } from '../../context/AuthContext';
import certificateService, { type DBUserCertificate, type UserAchievement } from '../../services/certificateService';

const CATEGORIES = ['All Categories', 'Assessment Credential', 'Programming', 'Mathematics', 'Aptitude'];

export const CertificatesView: React.FC = () => {
  const { user, profile } = useAuth();
  
  const [certs, setCerts] = useState<DBUserCertificate[]>([]);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  
  // Selection for Preview Modal
  const [selectedCert, setSelectedCert] = useState<DBUserCertificate | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchCertificatesAndAchievements = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [certRes, achRes] = await Promise.all([
        certificateService.getCertificates(user.id),
        certificateService.getAchievements(user.id)
      ]);

      if (certRes.data) setCerts(certRes.data);
      if (achRes.data) setAchievements(achRes.data);
    } catch (err: any) {
      console.error('Error loading certificates/achievements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificatesAndAchievements();
  }, [user]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDownload = (cert: DBUserCertificate) => {
    // Open clean print page or public verification URL with print prompt
    const url = `/certificate/${cert.certificate_code}`;
    window.open(url, '_blank');
  };

  const handleShare = (cert: DBUserCertificate) => {
    const url = `${window.location.origin}/verify/${cert.certificate_code}`;
    navigator.clipboard.writeText(url).catch(() => {});
    triggerToast(`Verification link copied: ${cert.certificate_code}`);
  };

  const filteredCerts = certs.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.certificate_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All Categories' || c.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const highestScore = certs.length > 0
    ? Math.max(...certs.map(c => c.percentage))
    : 0;

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* Toast popup */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-55 px-4.5 py-2.5 bg-slate-900/95 backdrop-blur-md text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2"
          >
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. CERTIFICATE & ACHIEVEMENT STATISTICS PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { label: 'Verified Certificates', value: `${certs.length} Earned`, sub: 'All credentials database-signed', icon: <Award size={16} className="text-purple-600" /> },
          { label: 'Highest Assessment Score', value: `${highestScore > 0 ? highestScore.toFixed(1) + '%' : 'N/A'}`, sub: 'Proctored terminal score', icon: <Trophy size={16} className="text-amber-500" /> },
          { label: 'Earned Badges', value: `${achievements.length} Unlocked`, sub: 'Milestone achievements', icon: <Sparkles size={16} className="text-pink-500" /> }
        ].map((stat, idx) => (
          <GlassCard key={idx} className="border-slate-100/50 p-5 flex flex-col justify-between hover:border-purple-200/50" hoverEffect={true}>
            <div className="flex justify-between items-start gap-2">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider line-clamp-1">{stat.label}</span>
              <div className="w-7 h-7 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center shrink-0">
                {stat.icon}
              </div>
            </div>
            <div className="mt-3.5">
              <span className="text-base font-black text-slate-800 block leading-tight">{stat.value}</span>
              <span className="text-[9px] text-slate-400 font-semibold mt-0.5 block">{stat.sub}</span>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* 2. ACHIEVEMENTS & BADGES ROW */}
      {achievements.length > 0 && (
        <GlassCard className="p-6 border-slate-100 bg-white rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-extrabold text-sm text-slate-800 flex items-center gap-2">
              <Trophy size={16} className="text-amber-500" />
              <span>Milestones & Achievement Badges</span>
            </h3>
            <span className="text-xs font-extrabold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100">
              {achievements.length} Badges Unlocked
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {achievements.map((ach) => (
              <div key={ach.id} className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Trophy size={20} />
                </div>
                <div>
                  <h4 className="font-display font-extrabold text-xs text-slate-800 leading-snug">{ach.badge_name}</h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-0.5">{ach.badge_description}</p>
                  <span className="text-[9px] text-slate-400 font-bold block mt-1">
                    Earned: {new Date(ach.earned_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* 3. SEARCH AND FILTERS HEADER */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white/60 p-4 rounded-2xl border border-slate-100 mt-1 shadow-sm">
        <div className="w-full sm:max-w-xs relative flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm focus-within:border-purple-400 transition-all">
          <Search size={14} className="text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search by title or credential code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-grow bg-transparent text-xs font-semibold text-slate-800 outline-none placeholder-slate-400"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
          <Filter size={13} className="text-slate-400 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white border border-slate-200 text-xs font-bold text-slate-600 rounded-xl px-3.5 py-2 focus:outline-none focus:border-purple-500 cursor-pointer shadow-sm"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. CERTIFICATE GALLERY GRID */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 size={32} className="animate-spin text-purple-600" />
        </div>
      ) : filteredCerts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCerts.map((cert) => (
            <GlassCard 
              key={cert.id}
              className="p-5.5 border-slate-100 bg-white hover:border-purple-300 hover:shadow-md flex flex-col justify-between transition-all duration-300 relative overflow-hidden group h-full"
              hoverEffect={true}
            >
              <div>
                <div className="flex justify-between items-center gap-2 mb-3.5">
                  <span className="text-[8px] font-bold bg-purple-50 border border-purple-100 text-purple-700 px-2 py-0.5 rounded uppercase tracking-wider">
                    {cert.category || 'Credential'}
                  </span>
                  <span className="text-[9px] text-emerald-600 font-extrabold flex items-center gap-0.5">
                    <ShieldCheck size={12} />
                    <span>VERIFIED</span>
                  </span>
                </div>

                <h3 className="font-display font-black text-xs md:text-sm text-slate-850 leading-snug group-hover:text-purple-600 transition-colors">
                  {cert.title}
                </h3>

                <div className="flex flex-col gap-2 mt-4 text-[10px] font-bold text-slate-400">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} className="text-slate-400" />
                      <span>Issued:</span>
                    </span>
                    <span className="text-slate-700 font-extrabold">{new Date(cert.issued_at).toLocaleDateString()}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1">
                      <Target size={11} className="text-slate-400" />
                      <span>Accuracy Score:</span>
                    </span>
                    <span className="text-slate-700 font-extrabold">{cert.score}/{cert.max_score} ({cert.percentage}%)</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1">
                      <Key size={11} className="text-slate-400" />
                      <span>ID Code:</span>
                    </span>
                    <span className="text-purple-700 font-mono font-bold">{cert.certificate_code}</span>
                  </div>
                </div>
              </div>

              {/* Card Action Buttons */}
              <div className="grid grid-cols-3 gap-2 mt-5.5 pt-3.5 border-t border-slate-50">
                <button
                  onClick={() => handleDownload(cert)}
                  className="p-2 border border-slate-150 hover:border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 hover:text-slate-900 text-[10px] font-extrabold flex items-center justify-center gap-1 transition-all cursor-pointer"
                  title="Print / Download PDF"
                >
                  <Download size={11} />
                  <span>PDF</span>
                </button>

                <button
                  onClick={() => handleShare(cert)}
                  className="p-2 border border-slate-150 hover:border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 hover:text-slate-900 text-[10px] font-extrabold flex items-center justify-center gap-1 transition-all cursor-pointer"
                  title="Copy Public Verification Link"
                >
                  <Share2 size={11} />
                  <span>Share</span>
                </button>

                <button
                  onClick={() => setSelectedCert(cert)}
                  className="p-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-[10px] font-display font-black uppercase tracking-wider flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
                  title="Open Certificate Modal Preview"
                >
                  <Maximize2 size={11} />
                  <span>Preview</span>
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center bg-white/50 border border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-6">
          <AlertCircle size={36} className="text-slate-350 mb-3" />
          <h4 className="font-display font-bold text-slate-800 text-sm">No Certificates Earned Yet</h4>
          <p className="text-xs text-slate-500 font-medium mt-1 max-w-sm mx-auto leading-relaxed">
            Complete and submit proctored assessments with a score of 50% or higher to automatically unlock database-signed credentials and badges.
          </p>
        </div>
      )}

      {/* 5. FULLSCREEN CERTIFICATE PREVIEW MODAL */}
      <AnimatePresence>
        {selectedCert && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-70 flex items-center justify-center p-6 text-slate-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-3xl w-full bg-white border-8 border-double border-amber-500/40 p-8 md:p-14 rounded-3xl text-center flex flex-col items-center gap-6 shadow-2xl relative"
            >
              <button
                onClick={() => setSelectedCert(null)}
                className="absolute top-4 right-4 p-2 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl text-slate-400 hover:text-slate-700 transition-all cursor-pointer z-20"
                title="Close Modal"
              >
                <X size={16} strokeWidth={2.5} />
              </button>

              <div className="relative z-10 flex flex-col items-center w-full">
                <span className="font-display font-black text-xs md:text-sm tracking-widest text-[#401567] uppercase block">
                  Testora Verified Certificate of Excellence
                </span>
                
                <div className="w-12 h-1 bg-[#401567] rounded-full mt-2.5" />

                <h3 className="font-serif italic text-base md:text-lg text-slate-600 mt-6">
                  This official credential certifies that
                </h3>
                
                <span className="font-display font-black text-2xl md:text-3xl text-slate-900 border-b-2 border-slate-200 px-8 py-1 block mt-3 tracking-tight">
                  {selectedCert.student_name || profile?.full_name || 'Testora Candidate'}
                </span>

                <p className="text-xs md:text-sm text-slate-600 font-medium leading-relaxed max-w-xl mt-5 mx-auto">
                  has successfully completed the assessment for <span className="font-extrabold text-slate-850">{selectedCert.title}</span>, achieving a verified score of {selectedCert.score}/{selectedCert.max_score} ({selectedCert.percentage}%) on {new Date(selectedCert.issued_at).toLocaleDateString()}.
                </p>

                <div className="flex flex-col sm:flex-row justify-between items-center w-full max-w-lg mt-10 pt-6 border-t border-slate-100 text-[10px] font-mono text-slate-400 gap-6">
                  <div className="text-center sm:text-left">
                    <span>ISSUING AUTHORITY:</span>
                    <span className="font-serif italic text-slate-800 block mt-1 text-sm">{selectedCert.instructor_name || 'Testora Academic Board'}</span>
                    <span className="text-[8px] text-slate-400 tracking-wider block mt-0.5">Verified Educator</span>
                  </div>

                  <div className="w-18 h-18 shrink-0 relative">
                    <svg viewBox="0 0 100 100" className="w-full h-full fill-amber-500/10 stroke-amber-500 stroke-[2]">
                      <polygon points="50,0 60,35 95,35 65,55 75,90 50,70 25,90 35,55 5,35 40,35" />
                      <circle cx="50" cy="50" r="25" className="fill-white stroke-amber-500 stroke-[1.5]" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center font-display font-black text-[7px] text-amber-600 uppercase tracking-tighter leading-none scale-90">
                      SEAL<br />
                      <span className="text-[5px]">VERIFIED</span>
                    </div>
                  </div>

                  <div className="text-center sm:text-right">
                    <span>CREDENTIAL VERIFICATION:</span>
                    <span className="text-slate-800 block mt-1 text-xs font-bold uppercase tracking-wider">{selectedCert.certificate_code}</span>
                    <span className="text-[8px] text-slate-400 tracking-wider block mt-0.5">Verify at testora.io/verify</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-8">
                  <button
                    onClick={() => handleDownload(selectedCert)}
                    className="py-2.5 px-5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-display font-black text-[10px] uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Download / Print PDF</span>
                  </button>

                  <button
                    onClick={() => {
                      window.open(`/verify/${selectedCert.certificate_code}`, '_blank');
                    }}
                    className="py-2.5 px-5 bg-slate-900 text-white font-display font-black text-[10px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ExternalLink size={13} />
                    <span>Open Verification Page</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CertificatesView;
