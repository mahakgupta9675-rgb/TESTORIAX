import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheck, AlertTriangle, Calendar, Target,
  Download, Share2, ArrowLeft, Loader2, Key
} from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import TestoriaxLogo from '../ui/TestoriaxLogo';
import certificateService, { type DBUserCertificate } from '../../services/certificateService';

export const PublicCertificateVerificationView: React.FC = () => {
  const { certificateId } = useParams<{ certificateId: string }>();
  const navigate = useNavigate();

  const [cert, setCert] = useState<DBUserCertificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const verifyCert = async () => {
      if (!certificateId) {
        setError('No certificate ID provided.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error: certErr } = await certificateService.verifyCertificatePublic(certificateId);
        if (certErr || !data) {
          setError('Invalid or non-existent certificate credential code.');
        } else {
          setCert(data);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to verify credential.');
      } finally {
        setLoading(false);
      }
    };

    verifyCert();
  }, [certificateId]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#fffafb] flex flex-col font-sans select-none antialiased relative">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-sm no-print">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors text-xs font-extrabold cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </button>

        <TestoriaxLogo showText={true} textColor="text-[#401567]" lightMode={true} />

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer border border-slate-150 transition-all"
          >
            <Share2 size={14} />
            <span>{copied ? 'Link Copied!' : 'Share'}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl w-full mx-auto my-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={36} className="animate-spin text-purple-600" />
            <p className="text-xs font-bold text-slate-500">Verifying credential against Testora blockchain registry...</p>
          </div>
        ) : error || !cert ? (
          <GlassCard className="p-10 text-center max-w-lg w-full border-red-100 bg-white shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4 border border-red-100">
              <AlertTriangle size={28} />
            </div>
            <h2 className="font-display font-black text-lg text-slate-850">Invalid Credential Code</h2>
            <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
              {error || "The certificate ID provided could not be matched against any official record."}
            </p>
            <button
              onClick={() => navigate('/practice')}
              className="mt-6 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-md"
            >
              Explore Verified Assessments
            </button>
          </GlassCard>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex flex-col items-center gap-6"
          >
            {/* Status Badge Banner */}
            <div className={`px-5 py-2 rounded-full border flex items-center gap-2 shadow-sm ${
              cert.verification_status === 'verified'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              <ShieldCheck size={18} />
              <span className="font-display font-black text-xs uppercase tracking-wider">
                {cert.verification_status === 'verified' ? 'OFFICIAL VERIFIED CREDENTIAL' : 'REVOKED CREDENTIAL'}
              </span>
            </div>

            {/* Main Certificate Card (Printable) */}
            <div className="w-full bg-white border-8 border-double border-amber-500/40 p-8 md:p-14 rounded-3xl text-center flex flex-col items-center gap-6 shadow-2xl relative print:border-4 print:shadow-none">
              
              <div className="relative z-10 flex flex-col items-center w-full">
                <span className="font-display font-black text-xs md:text-sm tracking-widest text-[#401567] uppercase block">
                  Testora Verified Certificate of Excellence
                </span>
                
                <div className="w-12 h-1 bg-[#401567] rounded-full mt-2.5" />

                <h3 className="font-serif italic text-base md:text-lg text-slate-600 mt-6">
                  This official credential certifies that
                </h3>
                
                <span className="font-display font-black text-2xl md:text-3xl text-slate-900 border-b-2 border-slate-200 px-8 py-1.5 block mt-3 tracking-tight">
                  {cert.student_name}
                </span>

                <p className="text-xs md:text-sm text-slate-600 font-medium leading-relaxed max-w-xl mt-5 mx-auto">
                  has successfully passed the proctored assessment for <span className="font-extrabold text-slate-850">{cert.title}</span> with an accuracy score of <span className="font-bold text-slate-850">{cert.score}/{cert.max_score} ({cert.percentage}%)</span> on {new Date(cert.issued_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}.
                </p>

                {/* Verification Metadata Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-xl mt-8 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-left text-xs font-bold text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-purple-600 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 block font-normal uppercase">Issued On</span>
                      <span>{new Date(cert.issued_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target size={14} className="text-purple-600 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 block font-normal uppercase">Score Achieved</span>
                      <span>{cert.score} / {cert.max_score} ({cert.percentage}%)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Key size={14} className="text-purple-600 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 block font-normal uppercase">Verification Code</span>
                      <span className="font-mono text-purple-700">{cert.certificate_code}</span>
                    </div>
                  </div>
                </div>

                {/* Footer seal and verify signatures */}
                <div className="flex flex-col sm:flex-row justify-between items-center w-full max-w-lg mt-10 pt-6 border-t border-slate-100 text-[10px] font-mono text-slate-400 gap-6">
                  <div className="text-center sm:text-left">
                    <span>ISSUING AUTHORITY:</span>
                    <span className="font-serif italic text-slate-800 block mt-1 text-sm">{cert.instructor_name || 'Testora Academic Board'}</span>
                    <span className="text-[8px] text-slate-400 tracking-wider block mt-0.5">Verified Standard Assessment</span>
                  </div>

                  {/* Golden seal image */}
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
                    <span>RECORD REGISTRY:</span>
                    <span className="text-slate-800 block mt-1 text-xs font-bold uppercase tracking-wider">{cert.certificate_code}</span>
                    <span className="text-[8px] text-slate-400 tracking-wider block mt-0.5">Official Testora Credential</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-3 no-print">
              <button
                onClick={handlePrint}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-97"
              >
                <Download size={15} />
                <span>Print / Save PDF Certificate</span>
              </button>

              <button
                onClick={handleShare}
                className="px-5 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-sm active:scale-97"
              >
                <Share2 size={15} />
                <span>{copied ? 'Link Copied!' : 'Share Verification Link'}</span>
              </button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default PublicCertificateVerificationView;
