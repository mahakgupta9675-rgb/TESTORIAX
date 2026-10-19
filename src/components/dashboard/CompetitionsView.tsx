import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Users, Clock, Lock, PlusCircle, Search,
  Award, BookOpen, User, Mail, Phone, ArrowLeft,
  Info, CheckCircle2, Flame, UserCheck, AlertTriangle,
  Loader2, ArrowRight, Play, Star, Filter
} from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import competitionsService from '../../services/competitionsService';
import type { Competition } from '../../services/competitionsService';
import testsService from '../../services/testsService';
import paymentService from '../../services/paymentService';


// Constants for discovery list matching pattern
const CATEGORIES = [
  'All Categories',
  'Programming',
  'Aptitude',
  'Reasoning',
  'Mathematics',
  'General Knowledge',
  'Placement Preparation',
  'College Competitions'
];

const MOCK_CREATORS = [
  {
    id: 'aris-thorne',
    name: 'Dr. Aris Thorne',
    avatar: 'bg-gradient-to-tr from-pink-400 to-rose-400',
    followers: 12800,
    testsCreated: 32,
    rating: 4.92,
    specialty: 'Advanced Computer Science',
    isFollowing: false
  },
  {
    id: 'mahak-gupta',
    name: 'Mahak Gupta',
    avatar: 'bg-gradient-to-tr from-purple-500 to-indigo-500',
    followers: 18400,
    testsCreated: 14,
    rating: 4.93,
    specialty: 'Java Platform Architect',
    isFollowing: true
  },
  {
    id: 'mark-vance',
    name: 'Prof. Mark Vance',
    avatar: 'bg-gradient-to-tr from-emerald-400 to-teal-400',
    followers: 8900,
    testsCreated: 18,
    rating: 4.79,
    specialty: 'Higher Calculus & Physics',
    isFollowing: false
  }
];

const MOCK_TOURNAMENTS = [
  {
    id: 'trend-comp-1',
    title: 'National Coding Cup: summer 2026',
    prizePool: '$5,000 USD',
    participants: 14200,
    daysLeft: 4,
    difficulty: 'hard',
    creator: 'Testoriax Official',
    thumbnail: 'from-purple-600 via-pink-600 to-rose-600'
  },
  {
    id: 'trend-comp-2',
    title: 'Inter-College Algorithmic Showdown',
    prizePool: 'MacBook Pro + Shields',
    participants: 4120,
    daysLeft: 8,
    difficulty: 'hard',
    creator: 'IIT Algorithmic Society',
    thumbnail: 'from-indigo-600 via-blue-600 to-cyan-600'
  },
  {
    id: 'trend-comp-3',
    title: 'Placement Marathon: Mock Round 3',
    prizePool: 'Direct FAANG Referrals',
    participants: 9100,
    daysLeft: 1,
    difficulty: 'medium',
    creator: 'Placement cell Union',
    thumbnail: 'from-rose-500 via-purple-500 to-indigo-600'
  }
];

// Gradient presets for banner backgrounds
const BANNER_GRADIENTS = [
  { name: 'Sunset Glow', value: 'from-amber-600 to-orange-600' },
  { name: 'Royal Indigo', value: 'from-violet-600 to-indigo-600' },
  { name: 'Forest Emerald', value: 'from-teal-500 to-emerald-600' },
  { name: 'Deep Cyberpunk', value: 'from-purple-600 to-pink-600' },
  { name: 'Crimson Rose', value: 'from-rose-500 to-pink-600' },
  { name: 'Ocean Mist', value: 'from-cyan-500 to-blue-600' }
];

// Helper component for live countdown timer
const CountdownTimer: React.FC<{ targetDate: string; prefix?: string; onEnd?: () => void }> = ({ targetDate, prefix = '', onEnd }) => {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    const calculate = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft(null);
        if (onEnd) onEnd();
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!timeLeft) {
    return <span className="text-red-500 font-extrabold">Past Deadline</span>;
  }

  const { days, hours, minutes, seconds } = timeLeft;
  return (
    <span className="font-extrabold flex items-center gap-1">
      {prefix && <span className="text-[10px] text-slate-450 uppercase font-bold mr-1">{prefix}</span>}
      <span className="bg-purple-100/60 text-purple-750 px-2 py-0.5 rounded-lg text-xs font-black">
        {days.toString().padStart(2, '0')}d
      </span>
      <span>:</span>
      <span className="bg-purple-100/60 text-purple-750 px-2 py-0.5 rounded-lg text-xs font-black">
        {hours.toString().padStart(2, '0')}h
      </span>
      <span>:</span>
      <span className="bg-purple-100/60 text-purple-750 px-2 py-0.5 rounded-lg text-xs font-black">
        {minutes.toString().padStart(2, '0')}m
      </span>
      <span>:</span>
      <span className="bg-purple-100/60 text-purple-750 px-2 py-0.5 rounded-lg text-xs font-black text-purple-600 animate-pulse">
        {seconds.toString().padStart(2, '0')}s
      </span>
    </span>
  );
};

// Helper component for card-specific live countdown timer matching Image 2 style
const CardCountdownTimer: React.FC<{ targetDate: string; isLive: boolean; onEnd?: () => void }> = ({ targetDate, isLive, onEnd }) => {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    const calculate = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft(null);
        if (onEnd) onEnd();
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!timeLeft) {
    return (
      <div className="flex items-center justify-between w-full mt-4 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
        <span className="text-slate-400 font-extrabold text-[11px]">Status</span>
        <span className="text-slate-500 font-extrabold text-xs font-mono">Ended / Closed</span>
      </div>
    );
  }

  const { days, hours, minutes, seconds } = timeLeft;
  
  if (isLive) {
    return (
      <div className="flex items-center justify-between w-full mt-4 bg-[#f0fdfa] p-2.5 rounded-2xl border border-[#ccfbf1]/50">
        <div className="flex items-center gap-1 text-[#0d9488] font-extrabold text-[11px]">
          <Flame size={12} className="text-[#0d9488] animate-pulse" />
          <span>Live Ends in</span>
        </div>
        <div className="flex items-center gap-1 font-extrabold text-[#0d9488]">
          <span className="bg-white/80 px-2 py-0.5 rounded-lg text-xs font-black font-mono shadow-sm border border-[#ccfbf1]/30">
            {days.toString().padStart(2, '0')}d
          </span>
          <span className="text-[10px] text-[#0d9488]/70">:</span>
          <span className="bg-white/80 px-2 py-0.5 rounded-lg text-xs font-black font-mono shadow-sm border border-[#ccfbf1]/30">
            {hours.toString().padStart(2, '0')}h
          </span>
          <span className="text-[10px] text-[#0d9488]/70">:</span>
          <span className="bg-white/80 px-2 py-0.5 rounded-lg text-xs font-black font-mono shadow-sm border border-[#ccfbf1]/30">
            {minutes.toString().padStart(2, '0')}m
          </span>
          <span className="text-[10px] text-[#0d9488]/70">:</span>
          <span className="bg-white/80 px-2 py-0.5 rounded-lg text-xs font-black font-mono shadow-sm border border-[#ccfbf1]/30 text-rose-500 animate-pulse">
            {seconds.toString().padStart(2, '0')}s
          </span>
        </div>
      </div>
    );
  } else {
    return (
      <div className="flex items-center justify-between w-full mt-4 bg-[#f5f3ff] p-2.5 rounded-2xl border border-[#ede9fe]/50">
        <div className="flex items-center gap-1 text-[#7c3aed] font-extrabold text-[11px]">
          <Clock size={12} className="text-[#7c3aed]" />
          <span>Starts in</span>
        </div>
        <div className="flex items-center gap-1 font-extrabold text-[#7c3aed]">
          <span className="bg-white/80 px-2 py-0.5 rounded-lg text-xs font-black font-mono shadow-sm border border-[#ede9fe]/30">
            {days.toString().padStart(2, '0')}d
          </span>
          <span className="text-[10px] text-[#7c3aed]/70">:</span>
          <span className="bg-white/80 px-2 py-0.5 rounded-lg text-xs font-black font-mono shadow-sm border border-[#ede9fe]/30">
            {hours.toString().padStart(2, '0')}h
          </span>
          <span className="text-[10px] text-[#7c3aed]/70">:</span>
          <span className="bg-white/80 px-2 py-0.5 rounded-lg text-xs font-black font-mono shadow-sm border border-[#ede9fe]/30">
            {minutes.toString().padStart(2, '0')}m
          </span>
          <span className="text-[10px] text-[#7c3aed]/70">:</span>
          <span className="bg-white/80 px-2 py-0.5 rounded-lg text-xs font-black font-mono shadow-sm border border-[#ede9fe]/30 text-rose-500 animate-pulse">
            {seconds.toString().padStart(2, '0')}s
          </span>
        </div>
      </div>
    );
  }
};

export const CompetitionsView: React.FC<{ onNavigate: (view: any, param?: string) => void }> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  // Core navigation view states
  const [activeView, setActiveView] = useState<'lobby' | 'detail' | 'organize' | 'edit'>('lobby');
  const [activeTab, setActiveTab] = useState<'upcoming' | 'live' | 'completed' | 'hosted' | 'joined'>('upcoming');
  const [userRegistrations, setUserRegistrations] = useState<string[]>([]);
  const [editingCompId, setEditingCompId] = useState<string | null>(null);

  // Competitions state
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [creators, setCreators] = useState<any[]>(MOCK_CREATORS);

  // Selected Details State
  const [selectedComp, setSelectedComp] = useState<Competition | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [participantsCount, setParticipantsCount] = useState<number>(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);

  // Creator configuration states
  const [creatorTests, setCreatorTests] = useState<any[]>([]);

  // Registration Form States
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [customFields, setCustomFields] = useState<any[]>([]);

  // Create Competition Form States
  const [formTestId, setFormTestId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formBannerImage, setFormBannerImage] = useState(BANNER_GRADIENTS[0].value);
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formRegDeadline, setFormRegDeadline] = useState('');
  const [formMaxParticipants, setFormMaxParticipants] = useState('100');
  const [formVisibility, setFormVisibility] = useState<'public' | 'private'>('public');
  const [formPrizeDetails, setFormPrizeDetails] = useState('');
  const [formRules, setFormRules] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formLeaderboardType, setFormLeaderboardType] = useState<'live' | 'after_end' | 'hide'>('live');
  const [formWinnerVisibility, setFormWinnerVisibility] = useState<'public' | 'anonymous' | 'private'>('public');

  const fetchCompetitions = async () => {
    setLoading(true);
    try {
      console.log("[CompetitionsView] Fetching competitions...");
      const { data, error } = await competitionsService.getCompetitions();
      if (error) {
        console.error("[CompetitionsView] Error fetching competitions:", error);
      } else {
        console.log("[CompetitionsView] Fetched competitions:", data);
      }
      setCompetitions(data || []);
    } catch (err: any) {
      console.error("[CompetitionsView] Exception fetching competitions:", err);
      showToast('Failed to load competitions.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCreatorTests = async () => {
    if (!user) return;
    try {
      console.log("[CompetitionsView] Fetching tests for user:", user.id);
      const { data, error } = await testsService.getTests(user.id);
      if (error) {
        console.error("[CompetitionsView] Error fetching tests:", error);
        return;
      }
      console.log("[CompetitionsView] Fetched tests:", data);
      // Filter for published tests
      const published = (data || []).filter((t: any) => {
        console.log(`[CompetitionsView] Test: "${t.title}", status: "${t.status}"`);
        return t.status === 'published';
      });
      console.log("[CompetitionsView] Filtered published tests:", published);
      setCreatorTests(published);
    } catch (err: any) {
      console.error("[CompetitionsView] Exception fetching tests:", err);
    }
  };

  const fetchUserRegistrations = async () => {
    if (!user) return;
    try {
      const { data, error } = await competitionsService.getUserRegistrations(user.id);
      if (!error && data) {
        setUserRegistrations(data.map((r: any) => r.competition_id));
      }
    } catch (err) {
      console.error("[CompetitionsView] Error fetching user registrations:", err);
    }
  };

  useEffect(() => {
    fetchCompetitions();
    fetchCreatorTests();
    fetchUserRegistrations();
  }, [user]);

  // Load registration status and leaderboard for detail view
  useEffect(() => {
    if (selectedComp && user) {
      // Pre-fill candidate registration fields
      setRegFullName(user.user_metadata?.full_name || user.email?.split('@')[0] || '');
      setRegEmail(user.email || '');
      setRegMobile('');

      // Initialize custom fields based on linked test configuration
      const initializedFields: any[] = [];
      const testData = selectedComp.tests || {};

      if (testData.registration_type === 'simple') {
        initializedFields.push(
          { id: 'college', label: 'College/School', type: 'text', value: '' },
          { id: 'courseName', label: 'Course Name', type: 'text', value: '' }
        );
      } else if (testData.registration_type === 'custom' && testData.reg_fields) {
        Object.entries(testData.reg_fields).forEach(([key, enabled]) => {
          if (enabled && key !== 'fullName' && key !== 'email' && key !== 'mobileNumber') {
            const labelMap: Record<string, string> = {
              college: 'College/University',
              branch: 'Branch/Stream',
              graduationYear: 'Graduation Year',
              city: 'City',
              state: 'State'
            };
            const label = labelMap[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            initializedFields.push({ id: key, label, type: 'text', value: '' });
          }
        });
      }
      setCustomFields(initializedFields);

      const loadDetails = async () => {
        try {
          const [regStatus, regsRes, leaderboardRes] = await Promise.all([
            competitionsService.getRegistrationStatus(selectedComp.id, user.id),
            competitionsService.getCompetitionRegistrations(selectedComp.id),
            competitionsService.getCompetitionLeaderboard(selectedComp.id, selectedComp.test_id)
          ]);
          let registered = !!regStatus.data;
          if (!registered && selectedComp.test_id && (selectedComp.tests?.entry_fee || 0) > 0) {
            const payStatus = await paymentService.getPaymentStatus(selectedComp.test_id);
            if (payStatus.paid) {
              registered = true;
            }
          }
          setIsRegistered(registered);
          setRegistrations(regsRes.data || []);
          setParticipantsCount(regsRes.data?.length || 0);
          setLeaderboard(leaderboardRes.data || []);
        } catch (err) {
          console.error('Failed to load competition stats:', err);
        }
      };
      loadDetails();
    }
  }, [selectedComp, user]);

  // Handle Detail View click - fetch fresh details
  const handleOpenCompetition = async (comp: Competition) => {
    try {
      const { data, error } = await competitionsService.getCompetitionById(comp.id);
      if (error) throw error;
      setSelectedComp(data as any);
      setActiveView('detail');
    } catch (err: any) {
      showToast(err.message || 'Failed to load competition details.', 'error');
    }
  };



  // Submit registration form
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedComp) return;

    try {
      const regData: Record<string, any> = {
        full_name: regFullName || user.email?.split('@')[0] || 'Challenger',
        email: regEmail || user.email,
        phone: regMobile
      };

      customFields.forEach(cf => {
        regData[cf.id] = cf.value;
      });

      const entryFeeAmount = Number(selectedComp.tests?.entry_fee || 0);

      // PAID COMPETITION FLOW VIA RAZORPAY
      if (entryFeeAmount > 0) {
        showToast('Initiating Razorpay checkout...', 'info');

        const orderRes = await paymentService.createRazorpayOrder(selectedComp.test_id, selectedComp.id);
        if (orderRes.error) {
          throw new Error(orderRes.error.message || 'Failed to create payment order.');
        }

        const orderData = orderRes.data;
        await paymentService.loadRazorpayCheckoutScript();

        if ((window as any).Razorpay) {
          const rzpOptions = {
            key: orderData.key_id,
            amount: orderData.amount, // in paise
            currency: orderData.currency || 'INR',
            name: 'Testoriax',
            description: `Registration for ${selectedComp.title}`,
            order_id: orderData.order_id,
            prefill: {
              name: regFullName,
              email: regEmail,
              contact: regMobile,
            },
            theme: {
              color: '#7c3aed',
            },
            handler: async function (response: any) {
              try {
                const verifyResult = await paymentService.verifyRazorpayPayment({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  test_id: selectedComp.test_id,
                  competition_id: selectedComp.id,
                });

                if (verifyResult.error) {
                  showToast('Payment signature verification failed: ' + verifyResult.error.message, 'error');
                  return;
                }

                await competitionsService.registerForCompetition(
                  selectedComp.id,
                  selectedComp.test_id,
                  user.id,
                  { ...regData, paid: true, razorpay_payment_id: response.razorpay_payment_id }
                );

                setIsRegistered(true);
                showToast('Payment Verified & Competition Registration Confirmed!', 'success');
                const regsRes = await competitionsService.getCompetitionRegistrations(selectedComp.id);
                setRegistrations(regsRes.data || []);
                setParticipantsCount(regsRes.data?.length || 0);
                fetchUserRegistrations();
              } catch (vErr: any) {
                showToast(vErr.message || 'Failed to complete registration.', 'error');
              }
            },
            modal: {
              ondismiss: function () {
                showToast('Payment cancelled.', 'error');
              }
            }
          };

          const rzp = new (window as any).Razorpay(rzpOptions);
          rzp.open();
          return;
        } else {
          // Direct fallback verification if Razorpay script is not present
          const verifyResult = await paymentService.verifyRazorpayPayment({
            razorpay_order_id: orderData.order_id,
            razorpay_payment_id: `pay_test_${Date.now()}`,
            razorpay_signature: `sig_test_mock_${Date.now()}`,
            test_id: selectedComp.test_id,
            competition_id: selectedComp.id,
          });

          if (!verifyResult.error) {
            await competitionsService.registerForCompetition(
              selectedComp.id,
              selectedComp.test_id,
              user.id,
              { ...regData, paid: true }
            );
            setIsRegistered(true);
            showToast('Test Mode Payment Verified & Registration Completed!', 'success');
            const regsRes = await competitionsService.getCompetitionRegistrations(selectedComp.id);
            setRegistrations(regsRes.data || []);
            setParticipantsCount(regsRes.data?.length || 0);
            fetchUserRegistrations();
          }
          return;
        }
      }

      // FREE COMPETITION FLOW
      const { error } = await competitionsService.registerForCompetition(
        selectedComp.id,
        selectedComp.test_id,
        user.id,
        regData
      );

      if (error) throw error;

      setIsRegistered(true);
      showToast('Registration Successful! Competition added to My Competitions.', 'success');

      // Reload registrations
      const regsRes = await competitionsService.getCompetitionRegistrations(selectedComp.id);
      setRegistrations(regsRes.data || []);
      setParticipantsCount(regsRes.data?.length || 0);

      // Reload user registrations to update Joined tab
      fetchUserRegistrations();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit registration.', 'error');
    }
  };


  // Handle Competition creation
  const handleStartEdit = (comp: Competition) => {
    setEditingCompId(comp.id);
    setFormTestId(comp.test_id);
    setFormTitle(comp.title);
    setFormDescription(comp.description || '');
    setFormBannerImage(comp.banner_image || BANNER_GRADIENTS[0].value);
    setFormStartTime(comp.start_time ? comp.start_time.substring(0, 16) : '');
    setFormEndTime(comp.end_time ? comp.end_time.substring(0, 16) : '');
    setFormRegDeadline(comp.registration_deadline ? comp.registration_deadline.substring(0, 16) : '');
    setFormMaxParticipants((comp.max_participants || 100).toString());
    setFormVisibility(comp.visibility);
    setFormPrizeDetails(comp.prize_details || '');
    setFormRules(comp.rules || '');
    setFormContact(comp.organizer_contact || '');
    setFormLeaderboardType(comp.leaderboard_type || 'live');
    setFormWinnerVisibility(comp.winner_visibility || 'public');
    setActiveView('organize');
  };

  const handlePublishDraft = async (compId: string) => {
    try {
      const comp = competitions.find(c => c.id === compId);
      if (!comp) return;
      const now = Date.now();
      const start = new Date(comp.start_time).getTime();
      const end = new Date(comp.end_time).getTime();
      const newStatus = start > now ? 'upcoming' : end > now ? 'live' : 'completed';
      
      const { data, error } = await competitionsService.updateCompetition(compId, {
        status: newStatus as any
      });
      if (error) throw error;
      showToast('Competition published successfully!', 'success');
      fetchCompetitions();
      if (selectedComp && selectedComp.id === compId) {
        setSelectedComp(data as any);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to publish draft.', 'error');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formTestId) {
      showToast('Please select a published test lobby.', 'error');
      return;
    }

    // Validation
    const now = Date.now();
    const start = new Date(formStartTime).getTime();
    const end = new Date(formEndTime).getTime();
    const deadline = new Date(formRegDeadline).getTime();

    if (start >= end) {
      showToast('End Date/Time must be after Start Date/Time.', 'error');
      return;
    }

    if (deadline > start) {
      showToast('Registration Deadline cannot be after Start Date/Time.', 'error');
      return;
    }

    const competitionData = {
      creator_id: user.id,
      test_id: formTestId,
      title: formTitle,
      description: formDescription,
      banner_image: formBannerImage,
      start_time: new Date(formStartTime).toISOString(),
      end_time: new Date(formEndTime).toISOString(),
      registration_deadline: new Date(formRegDeadline).toISOString(),
      max_participants: parseInt(formMaxParticipants) || 100,
      visibility: formVisibility,
      status: (start > now ? 'upcoming' : end > now ? 'live' : 'completed') as any,
      prize_details: formPrizeDetails,
      rules: formRules,
      organizer_contact: formContact,
      leaderboard_type: formLeaderboardType,
      winner_visibility: formWinnerVisibility,
      winners_announced: false
    };

    if (editingCompId) {
      try {
        const { error } = await competitionsService.updateCompetition(editingCompId, competitionData as any);
        if (error) throw error;
        showToast('Competition updated successfully!', 'success');
        fetchCompetitions();
        setEditingCompId(null);
        setActiveView('lobby');
        // Reset form fields
        setFormTitle('');
        setFormDescription('');
        setFormTestId('');
        setFormStartTime('');
        setFormEndTime('');
        setFormRegDeadline('');
        setFormPrizeDetails('');
        setFormRules('');
        setFormContact('');
      } catch (err: any) {
        showToast(err.message || 'Failed to update competition.', 'error');
      }
      return;
    }

    try {
      const { error } = await competitionsService.createCompetition(competitionData);
      if (error) throw error;
      showToast('Competition created successfully!', 'success');
      fetchCompetitions();
      setActiveView('lobby');

      // Reset form fields
      setFormTitle('');
      setFormDescription('');
      setFormTestId('');
      setFormStartTime('');
      setFormEndTime('');
      setFormRegDeadline('');
      setFormPrizeDetails('');
      setFormRules('');
      setFormContact('');
    } catch (err: any) {
      showToast(err.message || 'Failed to create competition.', 'error');
    }
  };

  // Announce winners pod
  const handleAnnounceWinners = async () => {
    if (!selectedComp) return;
    try {
      const { data, error } = await competitionsService.updateCompetition(selectedComp.id, {
        winners_announced: true
      });
      if (error) throw error;
      setSelectedComp(data as any);
      showToast('Winners announced successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to announce winners.', 'error');
    }
  };

  const handleFollowCreator = (creatorId: string) => {
    setCreators(prev => {
      const updated = prev.map(c => (c.id === creatorId ? { ...c, isFollowing: !c.isFollowing } : c));
      const creator = updated.find(c => c.id === creatorId);
      showToast(
        creator?.isFollowing
          ? `Following ${creator.name}`
          : `Unfollowed ${creator.name}`,
        'success'
      );
      return updated;
    });
  };

  // Cancel Competition
  const handleCancelCompetition = async (compId: string) => {
    if (!confirm('Are you sure you want to cancel this competition? This action cannot be undone.')) return;
    try {
      const { data, error } = await competitionsService.updateCompetition(compId, {
        status: 'cancelled'
      });
      if (error) throw error;
      showToast('Competition cancelled successfully.', 'success');
      fetchCompetitions();
      if (selectedComp && selectedComp.id === compId) {
        setSelectedComp(data as any);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel competition.', 'error');
    }
  };

  // Filter competitions based on the 5 tabs: upcoming, live, completed, hosted, joined
  const filteredCompetitions = competitions.filter(comp => {
    // Search filter
    const matchesSearch = comp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (comp.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (comp.tests?.category || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // Filter by category for general browse tabs
    if (activeTab === 'upcoming' || activeTab === 'live' || activeTab === 'completed') {
      const matchesCategory = selectedCategory === 'All Categories' || comp.tests?.category === selectedCategory;
      if (!matchesCategory) return false;
    }

    if (activeTab === 'upcoming') {
      return comp.status === 'upcoming';
    }
    if (activeTab === 'live') {
      return comp.status === 'live';
    }
    if (activeTab === 'completed') {
      return comp.status === 'completed';
    }
    if (activeTab === 'hosted') {
      return comp.creator_id === user?.id;
    }
    if (activeTab === 'joined') {
      return userRegistrations.includes(comp.id);
    }
    return false;
  });

  return (
    <div className="w-full flex-grow flex flex-col gap-6 select-none relative">

      <AnimatePresence mode="wait">

        {/* VIEW 1: COMPETITION LOBBY */}
        {activeView === 'lobby' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex flex-col gap-6 w-full"
          >
            {/* Header with Switcher */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/70 border border-slate-100 p-4.5 rounded-3xl shadow-sm">
              <div>
                <h2 className="font-display font-black text-slate-800 text-lg uppercase tracking-wider flex items-center gap-2">
                  <Trophy size={20} className="text-amber-500" />
                  <span>Competition Arena</span>
                </h2>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-relaxed">
                  Browse hackathons, mock tests, and challenges. Compete to win or organize your own.
                </p>
              </div>

              {/* Tabs Switcher */}
              <div className="flex bg-slate-100 p-1.5 rounded-2xl shrink-0 flex-wrap gap-1">
                {(['upcoming', 'live', 'completed', 'hosted', 'joined'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer capitalize ${activeTab === tab
                        ? 'bg-white text-purple-750 shadow-sm font-extrabold'
                        : 'text-slate-555 hover:text-slate-850'
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Section */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">

              {/* Search Bar */}
              <div className="relative flex-grow max-w-md bg-white border border-slate-150 rounded-2xl px-4 py-2.5 flex items-center focus-within:border-purple-300 shadow-sm">
                <Search size={14} className="text-slate-400 mr-2" />
                <input
                  type="text"
                  placeholder="Search competitions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-grow bg-transparent text-xs font-semibold text-slate-700 outline-none placeholder-slate-400"
                />
              </div>

              {/* Action Buttons / Tabs */}
              <div className="flex items-center gap-3.5 flex-wrap">
                {activeTab === 'hosted' && (
                  <button
                    onClick={() => {
                      setEditingCompId(null);
                      setFormTitle('');
                      setFormDescription('');
                      setFormTestId('');
                      setFormStartTime('');
                      setFormEndTime('');
                      setFormRegDeadline('');
                      setFormPrizeDetails('');
                      setFormRules('');
                      setFormContact('');
                      fetchCreatorTests();
                      setActiveView('organize');
                    }}
                    className="px-4.5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-650 hover:to-indigo-650 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-purple-500/10 cursor-pointer active:scale-98 transition-all"
                  >
                    <PlusCircle size={14} />
                    <span>Organize Competition</span>
                  </button>
                )}
              </div>

            </div>

            {/* Challenger Layout Switcher (2-column discovery style vs full width organizer console) */}
            {activeTab !== 'hosted' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch w-full">
                
                {/* Left Column (8/12 grid cols) */}
                <div className="lg:col-span-8 flex flex-col gap-6 lg:border-r lg:border-slate-100/50 lg:pr-8">
                  
                  {/* Category Pill Filters */}
                  <div className="flex flex-col gap-2.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                      <Filter size={12} className="text-slate-400" />
                      <span>Browse Categories</span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map((cat) => {
                        const isSel = selectedCategory === cat;
                        return (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
                              isSel 
                                ? 'border-purple-500 bg-purple-50/20 text-purple-700 font-extrabold shadow-sm' 
                                : 'border-slate-100 bg-white text-slate-455 hover:border-slate-200 hover:text-slate-700'
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Grid control bar */}
                  <div className="flex justify-between items-center bg-white/40 p-3 rounded-2xl border border-slate-100/60 mt-1">
                    <span className="text-[10px] font-bold text-slate-450">
                      Showing {filteredCompetitions.length} verified competition{filteredCompetitions.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {/* Grid */}
                  {loading ? (
                    <div className="flex justify-center items-center py-24">
                      <Loader2 size={36} className="animate-spin text-purple-650" />
                    </div>
                  ) : filteredCompetitions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {filteredCompetitions.map((comp) => {
                        const isCreator = comp.creator_id === user?.id;
                        const isLive = comp.status === 'live';
                        const isUpcoming = comp.status === 'upcoming';

                         return (
                          <GlassCard
                            key={comp.id}
                            onClick={() => handleOpenCompetition(comp)}
                            className="bg-white rounded-[32px] border border-slate-100 shadow-md shadow-slate-100/50 p-5 flex flex-col justify-between transition-all duration-300 hover:border-purple-300 hover:shadow-lg cursor-pointer group"
                          >
                            <div className="flex flex-col gap-4">
                              {/* Banner Header Section */}
                              <div className={`h-36 rounded-[24px] bg-gradient-to-r ${comp.banner_image || 'from-pink-500 to-rose-500'} p-5 text-white flex flex-col justify-between relative overflow-hidden shrink-0`}>
                                <div className="absolute inset-0 bg-black/10 mix-blend-multiply" />
                                
                                {/* Status Tag */}
                                <div className="flex justify-between items-center relative z-10 w-full">
                                  <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm ${
                                    isLive ? 'bg-emerald-500 text-white' :
                                    isUpcoming ? 'bg-[#7c3aed] text-white' :
                                    'bg-slate-700 text-white'
                                  }`}>
                                    {isLive ? '● Live' : isUpcoming ? 'Upcoming' : comp.status}
                                  </span>
                                </div>

                                {/* Title & Deadline */}
                                <div className="relative z-10 flex flex-col gap-1 mt-auto">
                                  <h3 className="font-display font-black text-sm md:text-base text-white tracking-wide leading-snug line-clamp-2">
                                    {comp.title}
                                  </h3>
                                  <span className="text-[10px] text-white/90 font-bold tracking-wide">
                                    Deadline: {new Date(comp.registration_deadline || comp.start_time).toLocaleDateString('en-GB')}
                                  </span>
                                </div>
                              </div>

                              {/* Description Text */}
                              <p className="text-[11px] text-slate-500 font-semibold leading-relaxed line-clamp-2 px-1 h-9">
                                {comp.description || 'Showcase your skills in this competition. Compete against top developers and win exciting prizes!'}
                              </p>

                              {/* Segmented Countdown Clock */}
                              <CardCountdownTimer 
                                targetDate={isLive ? comp.end_time : comp.start_time} 
                                isLive={isLive} 
                              />

                              {/* Participant Limit Stats Row */}
                              <div className="flex items-center justify-between border-t border-slate-50 pt-3 px-1 text-[11px] font-bold text-slate-400">
                                <span className="flex items-center gap-1.5 font-semibold text-slate-400">
                                  <Users size={13} className="text-slate-450" />
                                  <span>Limit</span>
                                </span>
                                <span className="text-slate-800 font-black">
                                  {comp.max_participants || '100'} max
                                </span>
                              </div>
                            </div>

                            {/* Card Footer Row */}
                            <div className="flex items-center justify-between border-t border-slate-150/40 pt-4 mt-4 px-1">
                              <span className="text-[10px] font-bold text-slate-500">
                                Organized by: <span className="text-slate-850 font-extrabold">{isCreator ? 'You' : (comp.creator_name || 'Educator')}</span>
                              </span>
                              <div className="text-purple-650 font-extrabold text-[11px] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                                <span>Enter Lobby</span>
                                <ArrowRight size={12} className="text-purple-650 stroke-[3px]" />
                              </div>
                            </div>
                          </GlassCard>
                        );
                      })}
                    </div>
                  ) : (
                    <GlassCard className="p-16 text-center max-w-md mx-auto bg-white border-slate-100 mt-6 shadow-sm">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-405 flex items-center justify-center mx-auto mb-5 shadow-inner">
                        <Trophy size={22} />
                      </div>
                      <h3 className="font-display font-extrabold text-sm text-slate-800 uppercase tracking-wider">No Competitions Found</h3>
                      <p className="text-[10px] text-slate-400 font-semibold mt-2 leading-relaxed">
                        No matching competitions found. Check back later or adjust your filters.
                      </p>
                    </GlassCard>
                  )}

                </div>

                {/* Right Column (4/12 sidebar) */}
                <div className="lg:col-span-4 flex flex-col gap-6.5">
                  
                  {/* Section: Trending Competitions */}
                  <div className="flex flex-col gap-4">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                      <Trophy size={14} className="text-amber-500" />
                      <span>Trending Competitions</span>
                    </span>

                    <div className="flex flex-col gap-4.5">
                      {MOCK_TOURNAMENTS.map((comp) => (
                        <div 
                          key={comp.id}
                          className="relative rounded-2xl border border-slate-100 bg-white p-4.5 shadow-sm overflow-hidden flex flex-col justify-between min-h-[140px] group hover:border-purple-300 transition-all text-xs"
                        >
                          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50/40 rounded-full blur-2xl pointer-events-none" />
                          
                          <div>
                            <div className="flex justify-between items-center">
                              <span className="text-[8px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded uppercase font-extrabold">Tournament</span>
                              <span className="text-[9px] font-bold text-rose-500 flex items-center gap-0.5">
                                <Clock size={10} />
                                <span>{comp.daysLeft}d left</span>
                              </span>
                            </div>

                            <h4 className="font-display font-extrabold text-xs text-slate-800 mt-2.5 line-clamp-2 leading-snug">
                              {comp.title}
                            </h4>
                            
                            <p className="text-[10px] text-slate-400 font-semibold mt-1">
                              Prize: <span className="text-purple-650 font-extrabold">{comp.prizePool}</span>
                            </p>
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-50 pt-3 mt-3">
                            <span className="text-[9px] font-bold text-slate-400">
                              {comp.participants.toLocaleString()} joined
                            </span>
                            <button
                              onClick={() => showToast(`Joined tournament ${comp.title}!`, 'success')}
                              className="px-3 py-1 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-[9px] font-extrabold rounded-lg flex items-center gap-1 cursor-pointer"
                            >
                              <span>Join Cup</span>
                              <ArrowRight size={10} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section: Creator Spotlight */}
                  <div className="bg-white border border-slate-100 p-5 rounded-3xl flex flex-col gap-4 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                      <Award size={14} className="text-purple-600" />
                      <span>Creator Spotlights</span>
                    </span>

                    <div className="divide-y divide-slate-100">
                      {creators.map((c) => (
                        <div key={c.id} className="py-3 first:pt-0 last:pb-0 flex items-start gap-3 justify-between">
                          <div className="flex items-start gap-2.5 text-left min-w-0 flex-grow">
                            <div className={`w-8 h-8 rounded-xl ${c.avatar} shrink-0 flex items-center justify-center text-white font-extrabold text-[10px] shadow-sm`}>
                              {c.name.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-[11px] font-extrabold text-slate-800 truncate leading-snug">{c.name}</h5>
                              <p className="text-[9px] text-slate-400 truncate mt-0.5">{c.specialty}</p>
                              
                              <div className="flex items-center gap-2 mt-1.5 text-[8px] font-bold text-slate-455">
                                <span>{c.testsCreated} Tests</span>
                                <span>•</span>
                                <span className="text-yellow-600 flex items-center gap-0.5">
                                  <Star size={8} className="fill-yellow-600 stroke-transparent" />
                                  <span>{c.rating}</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleFollowCreator(c.id)}
                            className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold transition-all cursor-pointer ${
                              c.isFollowing
                                ? 'bg-slate-100 text-slate-500'
                                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                            }`}
                          >
                            {c.isFollowing ? 'Following' : 'Follow'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>
            ) : (
              /* Organizer Console View (Full width grid) */
              <div className="flex flex-col gap-6 w-full animate-fade-in">
                {/* Competitions Grid */}
                {loading ? (
                  <div className="flex justify-center items-center py-24">
                    <Loader2 size={36} className="animate-spin text-purple-650" />
                  </div>
                ) : filteredCompetitions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCompetitions.map((comp) => {
                      const isCreator = comp.creator_id === user?.id;
                      const isLive = comp.status === 'live';
                      const isUpcoming = comp.status === 'upcoming';
                      const isDraft = comp.status === 'draft';

                        return (
                          <GlassCard
                            key={comp.id}
                            onClick={() => handleOpenCompetition(comp)}
                            className="bg-white rounded-[32px] border border-slate-100 shadow-md shadow-slate-100/50 p-5 flex flex-col justify-between transition-all duration-300 hover:border-purple-300 hover:shadow-lg cursor-pointer group"
                          >
                            <div className="flex flex-col gap-4">
                              {/* Banner Header Section */}
                              <div className={`h-36 rounded-[24px] bg-gradient-to-r ${comp.banner_image || 'from-purple-650 to-indigo-650'} p-5 text-white flex flex-col justify-between relative overflow-hidden shrink-0`}>
                                <div className="absolute inset-0 bg-black/10 mix-blend-multiply" />
                                
                                {/* Status Tag & Lock */}
                                <div className="flex justify-between items-center relative z-10 w-full">
                                  <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm ${
                                    isLive ? 'bg-emerald-500 text-white' :
                                    isUpcoming ? 'bg-[#7c3aed] text-white' :
                                    isDraft ? 'bg-amber-500 text-white' :
                                    'bg-slate-700 text-white'
                                  }`}>
                                    {isLive ? '● Live' : isUpcoming ? 'Upcoming' : comp.status}
                                  </span>

                                  {comp.visibility === 'private' && (
                                    <span className="bg-slate-900/60 backdrop-blur-sm p-1 rounded-lg">
                                      <Lock size={10} className="text-white" />
                                    </span>
                                  )}
                                </div>

                                {/* Title & Deadline */}
                                <div className="relative z-10 flex flex-col gap-1 mt-auto">
                                  <h3 className="font-display font-black text-sm md:text-base text-white tracking-wide leading-snug line-clamp-2">
                                    {comp.title}
                                  </h3>
                                  <span className="text-[10px] text-white/90 font-bold tracking-wide">
                                    Deadline: {new Date(comp.registration_deadline || comp.start_time).toLocaleDateString('en-GB')}
                                  </span>
                                </div>
                              </div>

                              {/* Description Text */}
                              <p className="text-[11px] text-slate-500 font-semibold leading-relaxed line-clamp-2 px-1 h-9">
                                {comp.description || 'Showcase your skills in this competition. Compete against top developers and win exciting prizes!'}
                              </p>

                              {/* Segmented Countdown Clock */}
                              <CardCountdownTimer 
                                targetDate={isLive ? comp.end_time : comp.start_time} 
                                isLive={isLive} 
                              />

                              {/* Participant Limit Stats Row */}
                              <div className="flex items-center justify-between border-t border-slate-50 pt-3 px-1 text-[11px] font-bold text-slate-400">
                                <span className="flex items-center gap-1.5 font-semibold text-slate-400">
                                  <Users size={13} className="text-slate-450" />
                                  <span>Limit</span>
                                </span>
                                <span className="text-slate-800 font-black">
                                  {comp.max_participants || '100'} max
                                </span>
                              </div>
                            </div>

                            {/* Card Footer Row */}
                            <div className="flex items-center justify-between border-t border-slate-150/40 pt-4 mt-4 px-1">
                              <span className="text-[10px] font-bold text-slate-555">
                                Organized by: <span className="text-slate-850 font-extrabold">{isCreator ? 'You' : (comp.creator_name || 'Educator')}</span>
                              </span>
                              <div className="text-purple-650 font-extrabold text-[11px] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                                <span>Manage Lobby</span>
                                <ArrowRight size={12} className="text-purple-650 stroke-[3px]" />
                              </div>
                            </div>
                          </GlassCard>
                        );
                      })}
                  </div>
                ) : (
                  <GlassCard className="p-16 text-center max-w-md mx-auto bg-white border-slate-100 mt-6 shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-405 flex items-center justify-center mx-auto mb-5 shadow-inner">
                      <Trophy size={22} />
                    </div>
                    <h3 className="font-display font-extrabold text-sm text-slate-800 uppercase tracking-wider">No Competitions Found</h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-2 leading-relaxed">
                      You haven't created any competitions in this segment yet. Click Organize to get started!
                    </p>
                  </GlassCard>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* VIEW 2: PUBLIC DETAIL / CONTROL PAGE */}
        {activeView === 'detail' && selectedComp && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full pb-20"
          >

            {/* LEFT COLUMN: Competition info (8/12 grid cols) */}
            <div className="lg:col-span-8 flex flex-col gap-6">

              {/* Back Bar */}
              <button
                onClick={() => {
                  fetchCompetitions();
                  setActiveView('lobby');
                }}
                className="group w-fit px-4 py-2 bg-white hover:bg-slate-50 border border-slate-150 rounded-2xl text-xs font-bold text-slate-600 transition-all flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                <span>Back to Arena Lobby</span>
              </button>

              {/* Competition Banner Card */}
              <div className="relative rounded-3xl overflow-hidden bg-white border border-slate-100 shadow-md">
                <div className={`h-48 md:h-56 bg-gradient-to-r ${selectedComp.banner_image || 'from-purple-600 to-indigo-600'} relative p-6 md:p-8 flex flex-col justify-between text-white`}>
                  <div className="absolute inset-0 bg-black/15 mix-blend-multiply" />
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />

                  <div className="flex justify-between items-start relative z-10">
                    <span className={`text-[9px] font-black bg-white/20 backdrop-blur-md px-3 py-1 rounded-full uppercase tracking-wider ${selectedComp.status === 'live' ? 'text-green-300 font-extrabold animate-pulse' : ''
                      }`}>
                      {selectedComp.status === 'live' ? '● Live' : selectedComp.status}
                    </span>

                    <span className="text-[10px] font-bold bg-slate-900/40 backdrop-blur-md px-3 py-1 rounded-full text-white">
                      {selectedComp.visibility} Competition
                    </span>
                  </div>

                  <div className="relative z-10">
                    <h1 className="font-display font-black text-xl md:text-3xl tracking-tight leading-tight">
                      {selectedComp.title}
                    </h1>
                    <p className="text-xs text-white/80 mt-1.5 font-bold">
                      Organized by: {selectedComp.creator_name || (selectedComp.creator_id === user?.id ? 'You' : 'Educator')}
                    </p>
                  </div>
                </div>

                <div className="p-6 bg-white flex flex-col gap-5 border-b border-slate-50">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-[10px] font-bold text-slate-450 uppercase pl-1">
                    <div>
                      <span className="block text-slate-350 leading-tight">Start Time</span>
                      <span className="text-slate-800 font-black text-xs block mt-1">{new Date(selectedComp.start_time).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="block text-slate-350 leading-tight">End Time</span>
                      <span className="text-slate-800 font-black text-xs block mt-1">{new Date(selectedComp.end_time).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="block text-slate-350 leading-tight">Test Duration</span>
                      <span className="text-slate-800 font-black text-xs block mt-1">
                        {selectedComp.tests?.duration ? `${selectedComp.tests.duration} mins` : '60 mins'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-350 leading-tight">Max Limit</span>
                      <span className="text-slate-800 font-black text-xs block mt-1">{selectedComp.max_participants || 'Unlimited'}</span>
                    </div>
                    <div>
                      <span className="block text-slate-350 leading-tight">Registrations</span>
                      <span className="text-slate-800 font-black text-xs block mt-1">{participantsCount} Joined</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-white flex flex-col gap-3">
                  <h3 className="font-display font-extrabold text-xs text-slate-800 uppercase tracking-wider">About This Challenge</h3>
                  <p className="text-xs text-slate-555 leading-relaxed font-semibold">
                    {selectedComp.description || 'No description provided.'}
                  </p>
                  <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Linked Test Assessment</span>
                      <span className="text-slate-800 font-extrabold mt-0.5 block">{selectedComp.tests?.title || 'Practice Test'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Question Count</span>
                      <span className="text-slate-800 font-extrabold mt-0.5 block">
                        {selectedComp.tests?.questions ? `${selectedComp.tests.questions.length} Question(s)` : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Leaderboard Mode</span>
                      <span className="text-slate-800 font-extrabold mt-0.5 block capitalize">
                        {selectedComp.leaderboard_type === 'live' ? 'Live Board' : selectedComp.leaderboard_type === 'after_end' ? 'Post-End Board' : 'Hidden Board'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Winner Visibility</span>
                      <span className="text-slate-800 font-extrabold mt-0.5 block capitalize">
                        {selectedComp.winner_visibility}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Leaderboard Section */}
              {(selectedComp.status === 'completed' || selectedComp.leaderboard_type === 'live' || selectedComp.creator_id === user?.id) && (
                <GlassCard className="p-6 border-slate-100 bg-white shadow-sm flex flex-col gap-5">

                  {/* Winners Announcement Podium */}
                  {selectedComp.winners_announced && leaderboard.length > 0 && (
                    <div className="flex flex-col items-center gap-5 bg-gradient-to-b from-purple-50/50 to-indigo-50/20 border border-purple-100/30 p-5 rounded-2xl">

                      <div className="flex items-center gap-1.5 text-purple-700 font-black text-xs uppercase tracking-wider">
                        <Award size={16} />
                        <span>Winners Announced!</span>
                      </div>

                      {/* 3 Columns Podium Layout */}
                      <div className="flex items-end justify-center gap-4 sm:gap-8 w-full max-w-sm h-40 mt-4 relative">

                        {/* 2nd Place */}
                        {leaderboard.length > 1 && (
                          <div className="flex flex-col items-center gap-1.5 flex-1 relative z-10 animate-fade-in duration-500">
                            <span className="text-[10px] font-black text-slate-650 truncate w-16 text-center">{selectedComp.winner_visibility === 'anonymous' ? 'User #2nd' : leaderboard[1].profiles.full_name}</span>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-300 to-slate-400 flex items-center justify-center text-white font-black text-xs shadow-md">
                              2
                            </div>
                            <div className="w-16 bg-slate-200 border-t-2 border-slate-300 rounded-t-xl h-14 flex items-center justify-center font-bold text-xs text-slate-600 shadow">
                              2nd
                            </div>
                          </div>
                        )}

                        {/* 1st Place */}
                        {leaderboard.length > 0 && (
                          <div className="flex flex-col items-center gap-1.5 flex-1 relative z-20 animate-fade-in duration-300">
                            <span className="text-xs font-black text-amber-600 truncate w-20 text-center">{selectedComp.winner_visibility === 'anonymous' ? 'User #1st' : leaderboard[0].profiles.full_name}</span>
                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-white font-black text-base shadow-lg animate-bounce">
                              👑
                            </div>
                            <div className="w-20 bg-amber-100 border-t-2 border-amber-300 rounded-t-xl h-24 flex items-center justify-center font-black text-sm text-amber-700 shadow-glow">
                              1st
                            </div>
                          </div>
                        )}

                        {/* 3rd Place */}
                        {leaderboard.length > 2 && (
                          <div className="flex flex-col items-center gap-1.5 flex-1 relative z-10 animate-fade-in duration-700">
                            <span className="text-[10px] font-black text-orange-650 truncate w-16 text-center">{selectedComp.winner_visibility === 'anonymous' ? 'User #3rd' : leaderboard[2].profiles.full_name}</span>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-300 to-orange-400 flex items-center justify-center text-white font-black text-xs shadow-md">
                              3
                            </div>
                            <div className="w-16 bg-orange-100 border-t-2 border-orange-200 rounded-t-xl h-10 flex items-center justify-center font-bold text-xs text-orange-700 shadow">
                              3rd
                            </div>
                          </div>
                        )}

                      </div>

                    </div>
                  )}

                  {/* Leaderboard Table */}
                  <div>
                    <h3 className="font-display font-extrabold text-xs text-slate-800 uppercase tracking-wider mb-4 flex items-center justify-between">
                      <span>Competition Leaderboard</span>
                      {selectedComp.status === 'live' && (
                        <span className="text-[9px] text-green-550 border border-green-200 bg-green-50 px-2 py-0.5 rounded-full lowercase tracking-normal flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                          Live Leaderboard active
                        </span>
                      )}
                    </h3>

                    {selectedComp.leaderboard_type === 'after_end' && selectedComp.status === 'live' && selectedComp.creator_id !== user?.id ? (
                      <div className="py-10 text-center border border-dashed border-slate-150 rounded-2xl text-slate-450 italic text-[11px]">
                        <Clock size={18} className="mx-auto mb-2 text-slate-400" />
                        <span>The organizer has set the leaderboard to release after the competition ends.</span>
                      </div>
                    ) : leaderboard.length > 0 ? (
                      <div className="border border-slate-100 rounded-2xl overflow-hidden">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                              <th className="py-3 px-4 text-center w-12">Rank</th>
                              <th className="py-3 px-4">Candidate</th>
                              <th className="py-3 px-4 text-center">Score</th>
                              <th className="py-3 px-4 text-center">Time Taken</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 font-semibold text-slate-650">
                            {leaderboard.map((att, idx) => {
                              const rank = idx + 1;
                              const maskName = selectedComp!.winner_visibility === 'anonymous' && compIdMatch(att.user_id);

                              function compIdMatch(uid: string) {
                                return uid !== user?.id && selectedComp!.creator_id !== user?.id;
                              }

                              const candidateName = maskName
                                ? 'User #' + att.id.substring(0, 4).toUpperCase()
                                : att.profiles?.full_name || 'Anonymous Competitor';

                              // Calculate time taken in minutes
                              const start = new Date(att.started_at).getTime();
                              const submit = att.submitted_at ? new Date(att.submitted_at).getTime() : Date.now();
                              const minsTaken = Math.floor((submit - start) / 60000);

                              return (
                                <tr key={att.id} className="hover:bg-slate-50/20 transition-colors">
                                  <td className="py-3.5 px-4 text-center">
                                    <span className={`inline-flex w-5 h-5 rounded-full text-[10px] font-black items-center justify-center ${rank === 1 ? 'bg-amber-100 text-amber-700' :
                                        rank === 2 ? 'bg-slate-150 text-slate-600' :
                                          rank === 3 ? 'bg-orange-100 text-orange-700' :
                                            'text-slate-400'
                                      }`}>
                                      {rank}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-slate-800 font-extrabold">{candidateName}</td>
                                  <td className="py-3.5 px-4 text-center text-purple-700 font-black">{att.score} pts</td>
                                  <td className="py-3.5 px-4 text-center text-slate-500">{minsTaken}m</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="py-10 text-center border border-dashed border-slate-150 rounded-2xl text-slate-450 italic text-[11px]">
                        No submissions have been logged for this competition yet.
                      </div>
                    )}
                  </div>

                </GlassCard>
              )}

              {/* Creator Registrations Console */}
              {selectedComp.creator_id === user?.id && (
                <GlassCard className="p-6 border-slate-100 bg-white shadow-sm">
                  <h3 className="font-display font-extrabold text-xs text-slate-800 uppercase tracking-wider mb-4 flex items-center justify-between">
                    <span>Candidate Registrations List</span>
                    <span className="text-[10px] text-slate-400 font-bold">{registrations.length} Total</span>
                  </h3>

                  {registrations.length > 0 ? (
                    <div className="border border-slate-100 rounded-2xl overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-455 uppercase tracking-wider">
                            <th className="py-3 px-4">Candidate</th>
                            <th className="py-3 px-4">Email</th>
                            <th className="py-3 px-4 text-right">Registration Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-semibold text-slate-650">
                          {registrations.map((reg) => (
                            <tr key={reg.id}>
                              <td className="py-3 px-4 text-slate-800 font-extrabold">{reg.profiles?.full_name}</td>
                              <td className="py-3 px-4 text-slate-500">{reg.profiles?.email}</td>
                              <td className="py-3 px-4 text-right text-slate-400 font-medium">
                                {new Date(reg.registered_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-400 italic">No registrations found.</div>
                  )}
                </GlassCard>
              )}

              {/* Info grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full items-stretch">

                {/* Prize details */}
                <GlassCard className="p-6 border-slate-100 bg-white shadow-sm relative overflow-hidden flex flex-col gap-4">
                  <h3 className="font-display font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1">
                    <Award size={14} className="text-amber-500" />
                    <span>Prizes & Incentives</span>
                  </h3>
                  <p className="text-xs text-slate-500 whitespace-pre-line leading-relaxed font-semibold">
                    {selectedComp.prize_details || 'No prize details declared for this challenge.'}
                  </p>
                </GlassCard>

                {/* Rules details */}
                <GlassCard className="p-6 border-slate-100 bg-white shadow-sm relative overflow-hidden flex flex-col gap-4">
                  <h3 className="font-display font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1">
                    <Info size={14} className="text-purple-650" />
                    <span>Arena Rules & Regulations</span>
                  </h3>
                  <p className="text-xs text-slate-500 whitespace-pre-line leading-relaxed font-semibold">
                    {selectedComp.rules || '1. General mock test rules apply.\n2. Do not leave the browser tab or minimize screen.\n3. Plagiarism is prohibited.'}
                  </p>
                </GlassCard>

              </div>

            </div>

            <div className="lg:col-span-4 lg:sticky lg:top-24 flex flex-col gap-6">

              {/* ACTION CONSOLE */}
              <div className="bg-white border border-slate-100/90 rounded-3xl p-6 shadow-md relative overflow-hidden flex flex-col gap-5">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50/30 rounded-full blur-2xl pointer-events-none" />

                {/* Render inline Registration Panel for unregistered Challengers during 'upcoming' phase */}
                {selectedComp.creator_id !== user?.id && !isRegistered && selectedComp.status === 'upcoming' ? (
                  <>
                    <div>
                      <h3 className="font-display font-extrabold text-sm text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Lock size={13} className="text-purple-650" />
                        <span>Registration Panel</span>
                      </h3>
                      <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                        Register to secure your evaluation credentials.
                      </p>
                    </div>

                    {/* Entry fee load if enabled */}
                    {selectedComp.tests?.entry_fee && selectedComp.tests.entry_fee > 0 ? (
                      <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100/50 flex items-center justify-between text-[11px] font-bold text-amber-800">
                        <span className="text-[9px] uppercase font-bold text-amber-600">Entry Fee</span>
                        <span>${selectedComp.tests.entry_fee} USD</span>
                      </div>
                    ) : (
                      <div className="p-3 bg-green-50 rounded-2xl border border-green-100/30 flex items-center justify-between text-[11px] font-bold text-green-700">
                        <span className="text-[9px] uppercase font-bold text-green-600">Entry Fee</span>
                        <span>Free Entry</span>
                      </div>
                    )}

                    {/* Deadline countdown clock inside panel */}
                    <div className="p-3 bg-purple-50/50 rounded-2xl border border-purple-100/50 flex items-center justify-between text-[11px] font-bold text-slate-650">
                      <span className="text-[9px] uppercase font-bold text-slate-455">Registration Closes In</span>
                      <CountdownTimer targetDate={selectedComp.registration_deadline || selectedComp.start_time} />
                    </div>

                    {/* Form */}
                    <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
                      
                      {/* Full Name */}
                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="text-[9px] font-bold text-slate-455 uppercase pl-1">Full Name</label>
                        <div className="relative flex items-center bg-slate-50 border border-slate-150 rounded-2xl px-3.5 py-2.5 focus-within:bg-white focus-within:border-purple-300 transition-all shadow-sm">
                          <User size={13} className="text-slate-400 mr-2 shrink-0" />
                          <input
                            type="text"
                            required
                            value={regFullName}
                            onChange={(e) => setRegFullName(e.target.value)}
                            className="flex-grow bg-transparent text-xs font-semibold text-slate-700 outline-none"
                            placeholder="Your full name"
                          />
                        </div>
                      </div>

                      {/* Email */}
                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="text-[9px] font-bold text-slate-455 uppercase pl-1">Email Address</label>
                        <div className="relative flex items-center bg-slate-50 border border-slate-150 rounded-2xl px-3.5 py-2.5 focus-within:bg-white focus-within:border-purple-300 transition-all shadow-sm">
                          <Mail size={13} className="text-slate-400 mr-2 shrink-0" />
                          <input
                            type="email"
                            required
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            className="flex-grow bg-transparent text-xs font-semibold text-slate-700 outline-none"
                            placeholder="your.email@domain.com"
                          />
                        </div>
                      </div>

                      {/* Mobile Number */}
                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="text-[9px] font-bold text-slate-455 uppercase pl-1">Mobile Number</label>
                        <div className="relative flex items-center bg-slate-50 border border-slate-150 rounded-2xl px-3.5 py-2.5 focus-within:bg-white focus-within:border-purple-300 transition-all shadow-sm">
                          <Phone size={13} className="text-slate-400 mr-2 shrink-0" />
                          <input
                            type="tel"
                            required
                            value={regMobile}
                            onChange={(e) => setRegMobile(e.target.value)}
                            className="flex-grow bg-transparent text-xs font-semibold text-slate-700 outline-none"
                            placeholder="+91 98765 43210"
                          />
                        </div>
                      </div>

                      {/* Dynamic custom fields required by the test */}
                      {customFields.length > 0 && (
                        <div className="flex flex-col gap-3.5 border-t border-slate-50 pt-3.5 text-left">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-bold text-slate-455 uppercase pl-1">Additional Information</span>
                          </div>

                          {customFields.map((field) => (
                            <div key={field.id} className="flex flex-col gap-1.5">
                              <label className="text-[9px] font-bold text-slate-455 uppercase pl-1">{field.label}</label>
                              <div className="relative flex items-center bg-slate-50 border border-slate-150 rounded-2xl px-3.5 py-2.5 focus-within:bg-white focus-within:border-purple-300 transition-all shadow-sm">
                                <input
                                  type="text"
                                  required
                                  value={field.value}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setCustomFields(prev => prev.map(f => f.id === field.id ? { ...f, value: val } : f));
                                  }}
                                  className="flex-grow bg-transparent text-xs font-semibold text-slate-700 outline-none"
                                  placeholder={`Enter ${field.label.toLowerCase()}`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex flex-col gap-2 mt-2">
                        <button
                          type="submit"
                          className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-650 hover:to-rose-650 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-pink-500/10 cursor-pointer active:scale-98 transition-all"
                        >
                          <UserCheck size={14} />
                          <span>Register Now</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => {
                            showToast('Competition saved for later!', 'success');
                            setActiveView('lobby');
                          }}
                          className="w-full py-2.5 border border-slate-150 text-slate-500 font-bold rounded-2xl text-xs hover:bg-slate-50 cursor-pointer active:scale-98 transition-all text-center"
                        >
                          Save For Later
                        </button>
                      </div>
                    </form>
                  </>
                ) : (
                  <>
                    <div>
                      <h3 className="font-display font-extrabold text-sm text-slate-800 uppercase tracking-wider mb-1">
                        {selectedComp.creator_id === user?.id ? 'Organizer Console' : 'Challenger Console'}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                        Check deadlines, timer status, or execute commands below.
                      </p>
                    </div>

                    <div className="flex flex-col gap-4">

                      {/* Status Banner */}
                      <div className="p-4 rounded-2xl border bg-slate-50/80 border-slate-150 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                          <span>Deadline Status</span>
                          <span className={`px-2 py-0.5 rounded-full uppercase text-[8px] font-black ${isRegistered ? 'bg-green-100 text-green-700' : 'bg-rose-105 text-rose-650'
                            }`}>
                            {isRegistered ? 'Registered' : 'Not Registered'}
                          </span>
                        </div>

                        {selectedComp.status === 'upcoming' && (
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Starts in</span>
                            <CountdownTimer targetDate={selectedComp.start_time} />
                          </div>
                        )}

                        {selectedComp.status === 'live' && (
                          <div className="flex items-center justify-between text-green-650 font-black animate-pulse">
                            <span className="text-[10px] font-bold uppercase">Ends in</span>
                            <CountdownTimer targetDate={selectedComp.end_time} />
                          </div>
                        )}

                        {selectedComp.status === 'completed' && (
                          <div className="text-center font-bold text-slate-500 text-xs py-1">
                            🏆 Competition Completed
                          </div>
                        )}
                      </div>

                      {/* Actions based on Roles */}
                      {selectedComp.creator_id === user?.id ? (
                        /* Organizer Commands */
                        <div className="flex flex-col gap-2">
                          {selectedComp.status === 'completed' && !selectedComp.winners_announced && (
                            <button
                              onClick={handleAnnounceWinners}
                              className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-650 hover:to-indigo-650 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer active:scale-98 transition-all"
                            >
                              <Award size={14} />
                              <span>Announce Winners Podium</span>
                            </button>
                          )}

                          {selectedComp.status === 'draft' && (
                            <button
                              onClick={() => handlePublishDraft(selectedComp.id)}
                              className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-extrabold rounded-2xl text-xs cursor-pointer active:scale-98 transition-all"
                            >
                              Publish Draft
                            </button>
                          )}

                          {selectedComp.status !== 'completed' && selectedComp.status !== 'cancelled' && (
                            <>
                              <button
                                onClick={() => handleStartEdit(selectedComp)}
                                className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 text-white font-bold rounded-2xl text-xs cursor-pointer active:scale-98 transition-all"
                              >
                                Edit Competition
                              </button>
                              
                              <button
                                onClick={() => handleCancelCompetition(selectedComp.id)}
                                className="w-full py-2.5 border border-red-200 bg-red-50/50 hover:bg-red-50 text-red-650 font-bold rounded-2xl text-xs cursor-pointer active:scale-98 transition-all"
                              >
                                Cancel Competition
                              </button>
                            </>
                          )}

                          <button
                            disabled
                            className="w-full py-2.5 border border-slate-200 text-slate-400 bg-slate-50 font-bold rounded-2xl text-xs cursor-not-allowed"
                          >
                            View Analytics (coming soon)
                          </button>

                          <div className="text-[9px] text-slate-400 font-semibold p-1.5 text-center leading-normal border-t border-dashed border-slate-100 mt-2">
                            As the organizer of this competition, you can manage candidate registrations and finalize results after completion.
                          </div>
                        </div>
                      ) : (
                        /* Challenger Commands */
                        <div className="flex flex-col gap-2">

                          {/* Not Registered but live warning */}
                          {!isRegistered && selectedComp.status !== 'upcoming' && (
                            <div className="p-4.5 rounded-2xl border border-red-100 bg-red-50/30 text-red-705 flex flex-col gap-1 items-center text-center shadow-sm">
                              <AlertTriangle size={18} className="text-red-500 animate-pulse" />
                              <span className="text-[11px] font-black mt-1">Registration Closed</span>
                              <span className="text-[9px] text-red-600 font-semibold leading-relaxed">
                                Registration for this challenge has closed. You can no longer participate.
                              </span>
                            </div>
                          )}

                          {/* Start linked exam button */}
                          {isRegistered && selectedComp.status === 'live' && (
                            <button
                              onClick={() => {
                                // Launch examination route including competition context parameter
                                onNavigate('exam-entry', `${selectedComp.test_id}?competitionId=${selectedComp.id}`);
                              }}
                              className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-650 hover:to-indigo-650 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-purple-500/20 cursor-pointer active:scale-98 transition-all animate-bounce"
                            >
                              <Play size={14} className="fill-white" />
                              <span>Begin Competition Test</span>
                            </button>
                          )}

                          {/* Registered & awaiting start message */}
                          {isRegistered && selectedComp.status === 'upcoming' && (
                            <div className="border border-green-200 bg-green-50/50 p-4.5 rounded-2xl text-green-700 flex flex-col gap-1 items-center text-center shadow-sm">
                              <CheckCircle2 size={18} />
                              <span className="text-[11px] font-black mt-1">Registration Confirmed</span>
                              <span className="text-[9px] text-green-600 font-semibold leading-relaxed">
                                Your credentials are saved. Return to this page when the countdown ends to launch the secure exam workspace.
                              </span>
                            </div>
                          )}

                          {selectedComp.status === 'completed' && (
                            <div className="p-3 text-center border border-slate-100 rounded-2xl text-slate-400 text-[10px] font-bold">
                              The competition has finished. Check the podium standings and leaderboard on the left!
                            </div>
                          )}

                        </div>
                      )}
                    </div>
                  </>
                )}

                  {/* Organizer info footer */}
                  {selectedComp.organizer_contact && (
                    <div className="text-[9px] text-slate-400 font-bold border-t border-slate-100 pt-3 flex items-center justify-center gap-1.5">
                      <Mail size={10} />
                      <span>Contact Organizer:</span>
                      <a href={`mailto:${selectedComp.organizer_contact}`} className="text-purple-600 font-black hover:underline">{selectedComp.organizer_contact}</a>
                    </div>
                  )}

                </div>

              </div>

          </motion.div>
        )}

        {/* VIEW 3: ORGANIZE NEW COMPETITION */}
        {activeView === 'organize' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="max-w-2xl w-full mx-auto pb-20 flex flex-col gap-6"
          >

            {/* Back to lobby button */}
            <button
              onClick={() => setActiveView('lobby')}
              className="group w-fit px-4 py-2 bg-white hover:bg-slate-50 border border-slate-150 rounded-2xl text-xs font-bold text-slate-600 transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
              <span>Cancel & Return</span>
            </button>

            {/* Creation Card */}
            <GlassCard className="p-6 border-slate-100 bg-white shadow-md flex flex-col gap-6">

              <div>
                <h3 className="font-display font-black text-slate-800 text-base uppercase tracking-wider">
                  {editingCompId ? 'Edit Competition Details' : 'Organize Competition Challenge'}
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-relaxed">
                  {editingCompId ? 'Modify the competition schedules, incentives, and visibility settings.' : 'Fill in details below to link an existing published test and schedule the arena.'}
                </p>
              </div>

              <form onSubmit={handleCreateSubmit} className="flex flex-col gap-5 text-slate-650 font-semibold text-xs leading-normal">

                {/* Select Test Lobby */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-slate-455 uppercase pl-1">Link Published Test Lobby</label>
                  <div className="relative flex items-center bg-slate-50 border border-slate-150 rounded-2xl px-3.5 py-2.5">
                    <BookOpen size={13} className="text-slate-400 mr-2" />
                    <select
                      value={formTestId}
                      onChange={(e) => setFormTestId(e.target.value)}
                      className="w-full bg-transparent outline-none border-none cursor-pointer text-xs font-bold text-slate-700"
                      required
                    >
                      <option value="" disabled>Select a published test...</option>
                      {creatorTests.length > 0 && (
                        <optgroup label="Your Published Tests">
                          {creatorTests.map((t) => (
                            <option key={t.id} value={t.id}>{t.title} ({t.duration}m)</option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="Default System Tests">
                        <option value="java-mock-test">Java Programming Mock Test (60m)</option>
                        <option value="test-1">Python Advanced OOP Design Patterns (45m)</option>
                      </optgroup>
                    </select>
                  </div>
                  {creatorTests.length === 0 && (
                    <span className="text-[9px] text-amber-600 font-bold pl-1 mt-0.5">
                      ⚠️ Note: No published tests found. Mock tests are loaded as fallbacks.
                    </span>
                  )}
                </div>

                {/* Competition Title */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-slate-455 uppercase pl-1">Competition Title</label>
                  <div className="relative flex items-center bg-slate-50 border border-slate-150 rounded-2xl px-3.5 py-2.5 focus-within:bg-white focus-within:border-purple-300 transition-all">
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g. CodeArena Java Hackathon"
                      required
                      className="w-full bg-transparent outline-none text-xs font-bold text-slate-700"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-slate-455 uppercase pl-1">Description</label>
                  <div className="relative flex items-center bg-slate-50 border border-slate-150 rounded-2xl px-3.5 py-2.5 focus-within:bg-white focus-within:border-purple-300 transition-all">
                    <textarea
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Enter hackathon description, eligibility, and overview details..."
                      rows={3}
                      className="w-full bg-transparent outline-none text-xs font-semibold text-slate-700 resize-none"
                    />
                  </div>
                </div>

                {/* Banner Gradient Picker */}
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-bold text-slate-455 uppercase pl-1">Select Banner Theme</label>
                  <div className="grid grid-cols-3 gap-2">
                    {BANNER_GRADIENTS.map((b) => (
                      <button
                        key={b.value}
                        type="button"
                        onClick={() => setFormBannerImage(b.value)}
                        className={`h-12 rounded-xl bg-gradient-to-r ${b.value} relative overflow-hidden flex items-center justify-center text-white text-[10px] font-black border transition-all cursor-pointer select-none ${formBannerImage === b.value ? 'ring-2 ring-purple-650 border-white scale-[1.03]' : 'border-transparent opacity-85'
                          }`}
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Times strip */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-slate-455 uppercase pl-1">Start Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="bg-slate-50 border border-slate-150 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-slate-455 uppercase pl-1">End Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="bg-slate-50 border border-slate-150 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Deadline & Limit strip */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-slate-455 uppercase pl-1">Registration Deadline</label>
                    <input
                      type="datetime-local"
                      required
                      value={formRegDeadline}
                      onChange={(e) => setFormRegDeadline(e.target.value)}
                      className="bg-slate-50 border border-slate-150 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-slate-455 uppercase pl-1">Max Participants</label>
                    <div className="relative flex items-center bg-slate-50 border border-slate-150 rounded-2xl px-3.5 py-2.5 focus-within:bg-white focus-within:border-purple-300 transition-all">
                      <input
                        type="number"
                        min="1"
                        value={formMaxParticipants}
                        onChange={(e) => setFormMaxParticipants(e.target.value)}
                        placeholder="Unlimited if empty"
                        className="w-full bg-transparent outline-none text-xs font-bold text-slate-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Optional Configuration Details accordion (prize, rules, contact) */}
                <div className="border border-slate-100 bg-slate-50/50 p-4 rounded-2xl flex flex-col gap-4">
                  <span className="text-[10px] font-black text-slate-700 uppercase flex items-center gap-1">
                    <Award size={13} className="text-amber-500" />
                    <span>Incentives, Rules & Contact</span>
                  </span>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Prize Details (Optional)</label>
                    <textarea
                      value={formPrizeDetails}
                      onChange={(e) => setFormPrizeDetails(e.target.value)}
                      placeholder="e.g. 🥇 1st Place: Certificate & Cash Prize..."
                      rows={2}
                      className="bg-white border border-slate-150 rounded-xl p-2.5 text-xs font-semibold text-slate-700 outline-none resize-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Challenge Rules (Optional)</label>
                    <textarea
                      value={formRules}
                      onChange={(e) => setFormRules(e.target.value)}
                      placeholder="Specify rules or leave empty for defaults..."
                      rows={2}
                      className="bg-white border border-slate-150 rounded-xl p-2.5 text-xs font-semibold text-slate-700 outline-none resize-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Organizer Contact Email / URL</label>
                    <input
                      type="text"
                      value={formContact}
                      onChange={(e) => setFormContact(e.target.value)}
                      placeholder="e.g. organizer@domain.com"
                      className="bg-white border border-slate-150 rounded-xl p-2.5 text-xs font-bold text-slate-700 outline-none"
                    />
                  </div>
                </div>

                {/* Leaderboard and Winner Settings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-slate-455 uppercase pl-1">Leaderboard Visibility</label>
                    <div className="relative flex items-center bg-slate-50 border border-slate-150 rounded-2xl px-3.5 py-2.5">
                      <select
                        value={formLeaderboardType}
                        onChange={(e) => setFormLeaderboardType(e.target.value as any)}
                        className="w-full bg-transparent outline-none border-none cursor-pointer text-xs font-bold text-slate-700"
                      >
                        <option value="live">Live Scoreboard during challenge</option>
                        <option value="after_end">Scoreboard released after end only</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-slate-455 uppercase pl-1">Winners Privacy Settings</label>
                    <div className="relative flex items-center bg-slate-50 border border-slate-150 rounded-2xl px-3.5 py-2.5">
                      <select
                        value={formWinnerVisibility}
                        onChange={(e) => setFormWinnerVisibility(e.target.value as any)}
                        className="w-full bg-transparent outline-none border-none cursor-pointer text-xs font-bold text-slate-700"
                      >
                        <option value="public">Announce Winners publicly (Full Names)</option>
                        <option value="anonymous">Announce anonymously (Masked Names)</option>
                        <option value="private">Keep Winners private (Creator only)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full mt-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-650 hover:to-indigo-650 text-white font-extrabold rounded-2xl text-xs shadow-md shadow-purple-500/10 cursor-pointer active:scale-98 transition-all"
                >
                  {editingCompId ? 'Save Changes' : 'Create and Publish Competition'}
                </button>

              </form>

            </GlassCard>

          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
};

export default CompetitionsView;
