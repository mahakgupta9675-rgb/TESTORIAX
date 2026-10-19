import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Trophy, Clock, BookOpen, Users, Star, 
  Award, ArrowRight, ChevronDown, Filter, Check, 
  Compass, ShieldCheck
} from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import { testsService } from '../../services/testsService';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../lib/supabase';

interface TestDiscoveryViewProps {
  onNavigate?: (view: any, testTitleOrId?: string) => void;
  isEmbedded?: boolean;
}



export interface LobbyItem {
  id: string;
  publish_as: 'practice' | 'competition';
  title: string;
  category: string;
  creator: {
    name: string;
    avatar: string;
    verified: boolean;
  };
  participants: number;
  duration?: number;
  difficulty: string;
  questions?: number;
  rating?: number;
  thumbnail: string;
  registered: boolean;
  prizePool?: string;
  daysLeft?: number;
  startDate?: string;
  registrationDeadline?: string;
  created_at?: string;
}

interface CreatorItem {
  id: string;
  name: string;
  avatar: string;
  followers: number;
  testsCreated: number;
  rating: number;
  specialty: string;
  isFollowing: boolean;
}

// Initial rich mock data
const INITIAL_MOCK_TESTS: any[] = [
  {
    id: 'java-mock-test',
    title: 'Java Programming Mock Test',
    category: 'Programming',
    creator: { name: 'Mahak Gupta', avatar: 'bg-gradient-to-tr from-purple-500 to-indigo-500', verified: true },
    participants: 3450,
    duration: 60,
    difficulty: 'medium',
    questions: 30,
    rating: 4.95,
    thumbnail: 'from-amber-600 to-orange-600',
    registered: false
  },
  {
    id: 'test-1',
    title: 'Python Advanced OOP Design Patterns',
    category: 'Programming',
    creator: { name: 'Dr. Aris Thorne', avatar: 'bg-gradient-to-tr from-pink-400 to-rose-400', verified: true },
    participants: 1240,
    duration: 45,
    difficulty: 'hard',
    questions: 15,
    rating: 4.9,
    thumbnail: 'from-violet-600 to-indigo-600',
    registered: false
  },
  {
    id: 'test-2',
    title: 'Quantitative Aptitude Prep: Fast Arithmetic',
    category: 'Aptitude',
    creator: { name: 'Sarah Jenkins', avatar: 'bg-gradient-to-tr from-blue-400 to-indigo-400', verified: false },
    participants: 4890,
    duration: 30,
    difficulty: 'medium',
    questions: 25,
    rating: 4.7,
    thumbnail: 'from-rose-500 to-orange-500',
    registered: false
  },
  {
    id: 'test-3',
    title: 'Logical Reasoning & Symbol Deductions',
    category: 'Reasoning',
    creator: { name: 'Testoriax Expert', avatar: 'bg-gradient-to-tr from-purple-400 to-pink-400', verified: true },
    participants: 3120,
    duration: 25,
    difficulty: 'easy',
    questions: 20,
    rating: 4.6,
    thumbnail: 'from-pink-500 to-purple-600',
    registered: true
  },
  {
    id: 'test-4',
    title: 'Calculus IV: Double Integrals & Vectors',
    category: 'Mathematics',
    creator: { name: 'Prof. Mark Vance', avatar: 'bg-gradient-to-tr from-emerald-400 to-teal-400', verified: true },
    participants: 840,
    duration: 60,
    difficulty: 'hard',
    questions: 10,
    rating: 4.8,
    thumbnail: 'from-teal-500 to-emerald-600',
    registered: false
  },
  {
    id: 'test-5',
    title: 'Global Geopolitics & World History Trivia',
    category: 'General Knowledge',
    creator: { name: 'History Channel Club', avatar: 'bg-gradient-to-tr from-yellow-400 to-orange-400', verified: false },
    participants: 2150,
    duration: 20,
    difficulty: 'easy',
    questions: 30,
    rating: 4.5,
    thumbnail: 'from-amber-500 to-rose-500',
    registered: false
  },
  {
    id: 'test-6',
    title: 'Placement Mock Prep: FAANG Technical Rounds',
    category: 'Placement Preparation',
    creator: { name: 'Coding Blocks Team', avatar: 'bg-gradient-to-tr from-red-400 to-rose-500', verified: true },
    participants: 6700,
    duration: 90,
    difficulty: 'hard',
    questions: 4,
    rating: 4.95,
    thumbnail: 'from-blue-600 to-cyan-500',
    registered: false
  }
];

const ADDITIONAL_MOCK_TESTS: any[] = [
  {
    id: 'test-7',
    title: 'Java Concurrency & Multi-threading Deep Dive',
    category: 'Programming',
    creator: { name: 'Java Champs Group', avatar: 'bg-gradient-to-tr from-orange-400 to-red-400', verified: true },
    participants: 1100,
    duration: 50,
    difficulty: 'hard',
    questions: 12,
    rating: 4.85,
    thumbnail: 'from-orange-600 to-amber-500',
    registered: false
  },
  {
    id: 'test-8',
    title: 'State Level Mathematics Olympiad Selection',
    category: 'College Competitions',
    creator: { name: 'Math Union', avatar: 'bg-gradient-to-tr from-blue-400 to-teal-400', verified: true },
    participants: 890,
    duration: 120,
    difficulty: 'hard',
    questions: 30,
    rating: 4.9,
    thumbnail: 'from-sky-500 to-indigo-600',
    registered: false
  },
  {
    id: 'test-9',
    title: 'Basic Grammar & Sentence Corrections',
    category: 'General Knowledge',
    creator: { name: 'English Forum', avatar: 'bg-gradient-to-tr from-green-400 to-emerald-400', verified: false },
    participants: 1450,
    duration: 15,
    difficulty: 'easy',
    questions: 20,
    rating: 4.4,
    thumbnail: 'from-emerald-400 to-teal-500',
    registered: false
  }
];

const MOCK_COMPETITIONS: any[] = [
  {
    id: 'comp-1',
    title: 'National Coding Cup: summer 2026',
    prizePool: '$5,000 USD',
    participants: 14200,
    daysLeft: 4,
    difficulty: 'hard',
    creator: 'Testoriax Official',
    thumbnail: 'from-purple-600 via-pink-600 to-rose-600'
  },
  {
    id: 'comp-2',
    title: 'Inter-College Algorithmic Showdown',
    prizePool: 'MacBook Pro + Shields',
    participants: 4120,
    daysLeft: 8,
    difficulty: 'hard',
    creator: 'IIT Algorithmic Society',
    thumbnail: 'from-indigo-600 via-blue-600 to-cyan-600'
  },
  {
    id: 'comp-3',
    title: 'Placement Marathon: Mock Round 3',
    prizePool: 'Direct FAANG Referrals',
    participants: 9100,
    daysLeft: 1,
    difficulty: 'medium',
    creator: 'Placement cell Union',
    thumbnail: 'from-rose-500 via-purple-500 to-indigo-600'
  }
];


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

export const TestDiscoveryView: React.FC<TestDiscoveryViewProps> = ({ onNavigate, isEmbedded = false }) => {
  const { user } = useAuth();
  const currentUserId = user?.id || null;

  const [, setTests] = useState<any[]>(INITIAL_MOCK_TESTS);
  const [competitions] = useState<any[]>(MOCK_COMPETITIONS);
  
  // Filtering & Sorting State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedContentType, setSelectedContentType] = useState('All');
  const [sortBy, setSortBy] = useState('Most Popular');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  
  // Loading & Scroll state
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [allLoaded, setAllLoaded] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected Test Details Modal
  const [selectedTestDetails, setSelectedTestDetails] = useState<LobbyItem | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const [feedItems, setFeedItems] = useState<LobbyItem[]>([]);
  const [topCreators, setTopCreators] = useState<CreatorItem[]>([]);

  useEffect(() => {
    const loadPublicFeed = async () => {
      try {
        const [testsRes, compsRes] = await Promise.all([
          testsService.getPublicPracticeTests(),
          testsService.getPublicCompetitions()
        ]);
        
        const testsData = testsRes.data || [];
        const compsData = compsRes.data || [];

        const unifiedFeed: LobbyItem[] = [];

        // Map tests
        for (const t of testsData) {
          unifiedFeed.push({
            id: t.id,
            publish_as: 'practice',
            title: t.title,
            category: 'Programming', // fallback
            creator: { 
              name: t.profiles?.full_name || 'Verified Creator', 
              avatar: t.profiles?.avatar_url || 'bg-gradient-to-tr from-purple-500 to-indigo-500', 
              verified: true 
            },
            participants: 0,
            duration: t.duration || 60,
            difficulty: 'medium',
            questions: Array.isArray(t.questions) ? t.questions.length : 0,
            rating: 4.8,
            thumbnail: t.mock_thumbnail || 'from-pink-500 to-rose-500',
            registered: false,
            created_at: t.created_at
          });
        }

        // Map competitions
        for (const c of compsData) {
          const daysLeft = Math.max(0, Math.ceil((new Date(c.registration_deadline).getTime() - new Date().getTime()) / (1000 * 3600 * 24)));
          unifiedFeed.push({
            id: c.id,
            publish_as: 'competition',
            title: c.title || c.competition_title,
            category: 'Competitions',
            creator: { 
              name: c.profiles?.full_name || 'Organizer', 
              avatar: c.profiles?.avatar_url || 'bg-gradient-to-tr from-purple-500 to-indigo-500', 
              verified: true 
            },
            participants: 0,
            difficulty: 'hard',
            thumbnail: c.banner_theme || c.banner_image || 'from-indigo-500 to-cyan-500',
            registered: false,
            prizePool: c.prize_details || 'TBD',
            daysLeft,
            startDate: c.start_time || c.start_datetime,
            registrationDeadline: c.registration_deadline,
            created_at: c.created_at
          });
        }

        // Calculate participants & registered state
        const allTestIds = unifiedFeed.filter(f => f.publish_as === 'practice').map(f => f.id);
        const allCompIds = unifiedFeed.filter(f => f.publish_as === 'competition').map(f => f.id);

        const [testRegsRes, compRegsRes] = await Promise.all([
          allTestIds.length > 0 ? testsService.getRegistrationsForTests(allTestIds) : Promise.resolve({ data: [] }),
          allCompIds.length > 0 ? supabase.from('test_registrations').select('*').in('competition_id', allCompIds) : Promise.resolve({ data: [] })
        ]);

        const testRegs = testRegsRes.data || [];
        const compRegs = compRegsRes.data || [];

        unifiedFeed.forEach(item => {
          if (item.publish_as === 'practice') {
            const regs = testRegs.filter((r: any) => r.test_id === item.id);
            item.participants = regs.length;
            item.registered = currentUserId ? regs.some((r: any) => r.user_id === currentUserId) : false;
          } else {
            const regs = compRegs.filter((r: any) => r.competition_id === item.id);
            item.participants = regs.length;
            item.registered = currentUserId ? regs.some((r: any) => r.user_id === currentUserId) : false;
          }
        });



        setFeedItems(unifiedFeed);

        // Simple Creator Spotlight mapping based on who has most tests
        const creatorMap = new Map<string, CreatorItem>();
        testsData.forEach((t: any) => {
           if (t.profiles) {
             if (!creatorMap.has(t.creator_id)) {
               creatorMap.set(t.creator_id, {
                 id: t.creator_id,
                 name: t.profiles.full_name || 'Creator',
                 avatar: t.profiles.avatar_url || 'bg-gradient-to-tr from-purple-500 to-indigo-500',
                 followers: Math.floor(Math.random() * 1000) + 100,
                 testsCreated: 1,
                 rating: 4.8,
                 specialty: t.profiles.specialty || 'General',
                 isFollowing: false
               });
             } else {
                creatorMap.get(t.creator_id)!.testsCreated += 1;
             }
           }
        });
        setTopCreators(Array.from(creatorMap.values()).sort((a,b) => b.testsCreated - a.testsCreated).slice(0, 5));

      } catch (err) {
        console.error('Error loading public feed:', err);
      }
    };
    
    loadPublicFeed();

    // Supabase Realtime Subscriptions
    const testsChannel = supabase.channel('public-lobby-tests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tests' }, () => {
        loadPublicFeed();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competitions' }, () => {
        loadPublicFeed();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(testsChannel);
    };
  }, [currentUserId]);

  const handleRegister = (itemId: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    
    if (!currentUserId) {
      triggerToast("Please log in to register.");
      setTimeout(() => {
        if (onNavigate) onNavigate('login');
      }, 800);
      return;
    }

    const item = feedItems.find(f => f.id === itemId);
    if (!item) return;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemId);
    if (isUuid) {
      if (onNavigate) {
        onNavigate('test-details', itemId);
      }
      return;
    }
    
    setFeedItems(prev => prev.map(t => {
      if (t.id === itemId) {
        const nextState = !t.registered;
        triggerToast(nextState ? `Successfully registered for "${t.title}"!` : `Cancelled registration for "${t.title}".`);
        return { ...t, registered: nextState };
      }
      return t;
    }));
  };


  const handleFollowCreator = (creatorId: string) => {
    setTopCreators(prev => prev.map((c: CreatorItem) => {
      if (c.id === creatorId) {
        const nextState = !c.isFollowing;
        triggerToast(nextState ? `Following ${c.name}!` : `Unfollowed ${c.name}.`);
        return { ...c, isFollowing: nextState };
      }
      return c;
    }));
  };

  const handleLoadMore = () => {
    if (isLoadingMore || allLoaded) return;
    setIsLoadingMore(true);
    
    setTimeout(() => {
      setTests(prev => [...prev, ...ADDITIONAL_MOCK_TESTS]);
      setIsLoadingMore(false);
      setAllLoaded(true);
      triggerToast('Loaded 3 additional mock tests.');
    }, 1200);
  };

  // Filter & Sort computation
  const filteredTests = feedItems.filter(item => {
    const titleMatch = (item.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    const catMatch = (item.category || '').toLowerCase().includes(searchQuery.toLowerCase());
    const creatorMatch = (item.creator?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSearch = titleMatch || catMatch || creatorMatch;
    const matchesCategory = selectedCategory === 'All Categories' || item.category === selectedCategory;
    const matchesContentType = selectedContentType === 'All' || 
                              (selectedContentType === 'Practice Tests' && item.publish_as === 'practice') ||
                              (selectedContentType === 'Competitions' && item.publish_as === 'competition');
    return matchesSearch && matchesCategory && matchesContentType;
  }).sort((a, b) => {
    if (sortBy === 'Most Popular') return b.participants - a.participants;
    if (sortBy === 'Newest') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    if (sortBy === 'Highest Rated') return (b.rating || 0) - (a.rating || 0);
    if (sortBy === 'Most Attempted') return b.participants - a.participants; // stand-in
    return 0;
  });

  return (
    <div className={`w-full font-sans select-none antialiased min-h-screen relative flex flex-col ${
      isEmbedded ? 'p-0 bg-transparent' : 'bg-[#fffafb] pt-20'
    }`}>
      
      {/* Top Banner toast */}
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

      {/* HERO DISCOVERY HEADER */}
      <div className={`relative overflow-hidden rounded-3xl mb-8 flex flex-col items-center text-center p-8 md:p-12 bg-white/60 border border-slate-100 shadow-sm ${
        isEmbedded ? 'mt-0' : 'mx-6 mt-6'
      }`}>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-100/20 via-pink-100/10 to-transparent pointer-events-none" />
        
        {/* Glow particles */}
        <div className="absolute -top-10 -left-10 w-48 h-48 bg-purple-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-pink-200/30 rounded-full blur-3xl pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative z-10 max-w-2xl w-full"
        >
          <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
            <Compass size={11} className="text-purple-600 animate-spin-slow" />
            <span>Discover Public Lobby</span>
          </span>
          
          <h1 className="font-display font-extrabold text-2xl md:text-3xl text-slate-800 tracking-tight mt-3">
            Compete, Challenge, and Prove Your Skills
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-2 max-w-md mx-auto leading-relaxed">
            Register for university tournaments, attempt verified certifications, and challenge mock tests created by experts worldwide.
          </p>

          {/* Search Bar Input */}
          <div className="max-w-md w-full mx-auto relative mt-6 flex items-center bg-white border border-slate-200/90 rounded-2xl px-4 py-2.5 shadow-sm focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-200/50 transition-all">
            <Search size={16} className="text-slate-450 mr-2.5" />
            <input
              type="text"
              placeholder="Search tests, topics, coding challenges, or creators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-grow bg-transparent text-xs font-semibold text-slate-800 outline-none placeholder-slate-400"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')} 
                className="text-[10px] text-slate-400 font-bold hover:text-slate-655"
              >
                Clear
              </button>
            )}
          </div>

          {/* Trending Searches Tags */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Trending:</span>
            {['FAANG Prep', 'Arithmetic', 'Python OOP', 'Calculus'].map((tag) => (
              <button
                key={tag}
                onClick={() => setSearchQuery(tag)}
                className="text-[9px] font-bold text-slate-600 bg-slate-50 border border-slate-100 hover:border-purple-200 hover:text-purple-600 px-2.5 py-0.5 rounded-full transition-all cursor-pointer"
              >
                #{tag}
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* VIEW LAYOUT CONTEXT */}
      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch ${
        isEmbedded ? 'px-0' : 'px-6 pb-24'
      }`}>
        
        {/* Left Column: Filters, Sorting, Test Cards (8/12 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6 lg:border-r border-slate-100/50 lg:pr-8">
          
                    {/* Content Type Pill Filters */}
          <div className="flex flex-col gap-2.5 mb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 flex items-center gap-1.5">
              <Compass size={12} className="text-slate-400" />
              <span>Content Type</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {['All', 'Practice Tests', 'Competitions'].map((type) => {
                const isSel = selectedContentType === type;
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedContentType(type)}
                    className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
                      isSel 
                        ? 'border-purple-500 bg-purple-50/20 text-purple-700 font-extrabold shadow-sm' 
                        : 'border-slate-100 bg-white text-slate-450 hover:border-slate-200 hover:text-slate-700'
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

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
                        : 'border-slate-100 bg-white text-slate-450 hover:border-slate-200 hover:text-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid control bar (Sort option dropdown) */}
          <div className="flex justify-between items-center bg-white/40 p-3 rounded-2xl border border-slate-100/60 mt-1">
            <span className="text-[10px] font-bold text-slate-450">
              Showing {filteredTests.length} verified test{filteredTests.length === 1 ? '' : 's'}
            </span>

            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 hover:border-purple-250 flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>Sort by: {sortBy}</span>
                <ChevronDown size={12} className="text-slate-400" />
              </button>

              <AnimatePresence>
                {showSortDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-1.5 w-40 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-30"
                  >
                    {['Most Popular', 'Newest', 'Highest Rated', 'Most Attempted'].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          setSortBy(opt);
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-[10px] font-bold transition-colors cursor-pointer ${
                          sortBy === opt ? 'bg-purple-50 text-purple-700' : 'text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Test Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredTests.length > 0 ? (
              filteredTests.map((test) => (
                <GlassCard
                  key={test.id}
                  onClick={() => setSelectedTestDetails(test as any)}
                  className="p-5 border-slate-100/80 hover:border-purple-300 hover:shadow-md cursor-pointer flex flex-col justify-between transition-all duration-300 bg-white relative overflow-hidden group"
                >
                  <div>
                    {/* Card Cover Banner Placeholder */}
                    <div className={`h-28 rounded-2xl bg-gradient-to-r ${test.thumbnail} p-4 text-white flex flex-col justify-between relative mb-4 overflow-hidden`}>
                      <div className="absolute inset-0 bg-black/10 mix-blend-multiply" />
                      <div className="flex justify-between items-start relative z-10">
                        <span className={`text-[9px] font-bold bg-white/20 backdrop-blur-md px-2 py-0.5 rounded uppercase tracking-wider ${test.publish_as === 'competition' ? 'border border-amber-300/50 text-amber-50 bg-amber-500/30' : ''}`}>
                          {test.publish_as === 'competition' ? '🏆 Competition' : test.category}
                        </span>
                        {test.publish_as === 'practice' && (
                          <span className="text-[9px] font-bold text-yellow-400 bg-slate-900/60 backdrop-blur-md px-2 py-0.5 rounded flex items-center gap-0.5">
                            <Star size={9} className="fill-yellow-400 stroke-transparent" />
                            <span>{test.rating}</span>
                          </span>
                        )}
                      </div>
                      
                      <div className="relative z-10">
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          test.difficulty === 'easy' ? 'bg-emerald-500 text-white' :
                          test.difficulty === 'medium' ? 'bg-amber-500 text-white' :
                          'bg-rose-500 text-white'
                        }`}>
                          {test.difficulty}
                        </span>
                      </div>
                    </div>

                    <h3 className="font-display font-extrabold text-sm text-slate-800 line-clamp-1 group-hover:text-purple-600 transition-colors">
                      {test.title}
                    </h3>
                    
                    {/* Creator detail row */}
                    {test.publish_as === 'practice' && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className={`w-5 h-5 rounded-full ${test.creator.avatar} shrink-0`} />
                        <span className="text-[10px] font-bold text-slate-500 truncate flex items-center gap-1">
                          <span>by {test.creator.name}</span>
                          {test.creator.verified && <ShieldCheck size={10} className="text-purple-500" />}
                        </span>
                      </div>
                    )}

                    {test.publish_as === 'competition' && (
                      <div className="flex items-center gap-2 mt-2">
                         <span className="text-[10px] font-bold text-slate-500 truncate flex items-center gap-1">
                          Organized by {test.creator.name}
                        </span>
                      </div>
                    )}

                    {/* Stats strip */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-50 text-[10px] font-bold text-slate-400">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[8px] uppercase font-semibold text-slate-350">Participants</span>
                        <span className="text-slate-700 flex items-center gap-1 font-extrabold">
                          <Users size={11} className="text-slate-400" />
                          <span>{test.participants.toLocaleString()}</span>
                        </span>
                      </div>
                      {test.publish_as === 'practice' ? (
                        <>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[8px] uppercase font-semibold text-slate-350">Duration</span>
                            <span className="text-slate-700 flex items-center gap-1 font-extrabold">
                              <Clock size={11} className="text-slate-400" />
                              <span>{test.duration} m</span>
                            </span>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[8px] uppercase font-semibold text-slate-350">Questions</span>
                            <span className="text-slate-700 flex items-center gap-1 font-extrabold">
                              <BookOpen size={11} className="text-slate-400" />
                              <span>{test.questions} Qs</span>
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                           <div className="flex flex-col gap-0.5">
                            <span className="text-[8px] uppercase font-semibold text-slate-350">Time Left</span>
                            <span className="text-rose-500 flex items-center gap-1 font-extrabold">
                              <Clock size={11} />
                              <span>{test.daysLeft}d left</span>
                            </span>
                          </div>
                           <div className="flex flex-col gap-0.5">
                            <span className="text-[8px] uppercase font-semibold text-slate-350">Prize</span>
                            <span className="text-amber-500 flex items-center gap-1 font-extrabold truncate pr-1">
                              <Trophy size={11} />
                              <span className="truncate">{test.prizePool}</span>
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Buttons footer */}
                  <div className="grid grid-cols-2 gap-3 mt-5 pt-3.5 border-t border-slate-50">
                    <button
                      type="button"
                      onClick={(e) => {
                         e.stopPropagation();
                          if (onNavigate) {
                            onNavigate('test-details', test.id);
                          }
                      }}
                      className="py-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-600 transition-all text-center cursor-pointer"
                    >
                      View Details
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleRegister(test.id, e)}
                      className={`py-2 rounded-xl text-[10px] font-extrabold transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                        test.registered 
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold'
                          : (test.publish_as === 'competition' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-900 hover:bg-slate-850 text-white')
                      }`}
                    >
                      {test.registered ? (
                        <>
                          <Check size={11} strokeWidth={3} />
                          <span>Registered</span>
                        </>
                      ) : (
                        <span>{test.publish_as === 'competition' ? 'Join Competition' : 'Register Now'}</span>
                      )}
                    </button>
                  </div>
                </GlassCard>
              ))
            ) : (
              <div className="col-span-2 py-12 text-center bg-white/40 border border-slate-150 rounded-2xl">
                <Compass size={36} className="text-slate-300 mx-auto mb-3" />
                <h4 className="font-display font-bold text-slate-800 text-sm">No assessments found</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                  Try checking another filter category or adjusting your search spelling query.
                </p>
              </div>
            )}
          </div>

          {/* Load More Trigger (Infinite Scroll Simulation) */}
          {!allLoaded && filteredTests.length > 0 && (
            <div className="flex flex-col items-center gap-3 mt-4">
              {isLoadingMore ? (
                /* Skeleton Loader Shimmer UI */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
                  {[1, 2].map((idx) => (
                    <div key={idx} className="p-5 border border-slate-100 rounded-2xl bg-white/50 animate-pulse flex flex-col gap-4">
                      <div className="h-28 rounded-xl bg-slate-100" />
                      <div className="h-4 bg-slate-100 rounded w-3/4" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                      <div className="h-8 bg-slate-100 rounded-xl" />
                    </div>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleLoadMore}
                  className="px-6 py-2.5 border border-slate-200 hover:border-purple-300 text-purple-650 rounded-2xl text-xs font-bold bg-white shadow-sm transition-all hover:scale-[1.01] cursor-pointer"
                >
                  Load More Tests
                </button>
              )}
            </div>
          )}

          {allLoaded && filteredTests.length > 0 && (
            <span className="text-[10px] text-slate-400 font-semibold text-center mt-6 block">
              ✓ All public assessments have been loaded.
            </span>
          )}

        </div>

        {/* Right Column: Trending Competitions & Creator Spotlight (4/12 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6.5">
          
          {/* Section: Trending Competitions */}
          <div className="flex flex-col gap-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 flex items-center gap-1.5">
              <Trophy size={14} className="text-amber-500" />
              <span>Trending Competitions</span>
            </span>

            <div className="flex flex-col gap-4.5">
              {competitions.map((comp) => (
                <div 
                  key={comp.id}
                  className="relative rounded-2xl border border-slate-100 bg-white p-4.5 shadow-sm overflow-hidden flex flex-col justify-between min-h-[140px] group hover:border-purple-300 transition-all"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50/40 rounded-full blur-2xl pointer-events-none" />
                  
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded uppercase">Tournament</span>
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
                      onClick={() => triggerToast(`Joined tournament ${comp.title}!`)}
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
          <div className="bg-white/50 border border-slate-100/50 p-5 rounded-3xl flex flex-col gap-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 flex items-center gap-1.5">
              <Award size={14} className="text-purple-600" />
              <span>Creator Spotlights</span>
            </span>

            <div className="divide-y divide-slate-100/60">
                            {topCreators.length > 0 ? topCreators.map((c) => (
                <div key={c.id} className="py-3 first:pt-0 last:pb-0 flex items-start gap-3 justify-between">
                  <button
                    onClick={() => onNavigate && onNavigate('creator-profile', c.id)}
                    className="flex items-start gap-2.5 text-left hover:opacity-85 cursor-pointer focus:outline-none group/creator min-w-0 flex-grow"
                  >
                    <div className={`w-8 h-8 rounded-xl ${c.avatar} shrink-0 flex items-center justify-center text-white font-extrabold text-[10px] shadow-sm`}>
                      {c.name.split(' ').map(n=>n[0]).join('')}
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-[11px] font-extrabold text-slate-800 truncate leading-snug group-hover/creator:text-lilac-600 transition-colors">{c.name}</h5>
                      <p className="text-[9px] text-slate-400 truncate mt-0.5">{c.specialty}</p>
                      
                      <div className="flex items-center gap-2 mt-1.5 text-[8px] font-bold text-slate-450">
                        <span>{c.testsCreated} Tests</span>
                        <span>•</span>
                        <span className="text-yellow-600 flex items-center gap-0.5">
                          <Star size={8} className="fill-yellow-600 stroke-transparent" />
                          <span>{c.rating}</span>
                        </span>
                      </div>
                    </div>
                  </button>

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
              )) : (
                 <div className="text-xs text-slate-400 py-4 text-center">No active creators found</div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* COMPREHENSIVE CARD DETAILS MODAL WINDOW */}
      <AnimatePresence>
        {selectedTestDetails && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xl max-w-md w-full relative"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${selectedTestDetails.publish_as === 'competition' ? 'text-amber-600 bg-amber-50' : 'text-purple-600 bg-purple-50'}`}>
                    {selectedTestDetails.publish_as === 'competition' ? 'Competition' : selectedTestDetails.category}
                  </span>
                  <h3 className="font-display font-extrabold text-base text-slate-800 mt-1.5 leading-snug">
                    {selectedTestDetails.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedTestDetails(null)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-655"
                >
                  <Check size={18} className="text-slate-600" />
                </button>
              </div>

              <p className="text-xs text-slate-450 leading-relaxed font-semibold">
                {selectedTestDetails.publish_as === 'competition' ? 
                  `This is a featured competition. Prize pool: ${selectedTestDetails.prizePool}. Register before ${new Date(selectedTestDetails.registrationDeadline || '').toLocaleDateString()}.` : 
                  `This assessment is open to all qualified Testoriax users. It includes standardized question metrics calibrated for ${selectedTestDetails.difficulty} level execution.`
                }
              </p>

              <div className="grid grid-cols-2 gap-3 mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-600">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] uppercase text-slate-400">{selectedTestDetails.publish_as === 'competition' ? 'Days Left' : 'Total Duration'}</span>
                  <span className="text-slate-800 font-extrabold">{selectedTestDetails.publish_as === 'competition' ? `${selectedTestDetails.daysLeft} Days` : `${selectedTestDetails.duration} Minutes`}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] uppercase text-slate-400">{selectedTestDetails.publish_as === 'competition' ? 'Prize Pool' : 'Total Questions'}</span>
                  <span className="text-slate-800 font-extrabold">{selectedTestDetails.publish_as === 'competition' ? selectedTestDetails.prizePool : `${selectedTestDetails.questions} Qs`}</span>
                </div>
                <div className="flex flex-col gap-0.5 mt-2">
                  <span className="text-[8px] uppercase text-slate-400">{selectedTestDetails.publish_as === 'competition' ? 'Participants' : 'Rating'}</span>
                  {selectedTestDetails.publish_as === 'competition' ? (
                     <span className="text-slate-800 font-extrabold">{selectedTestDetails.participants}</span>
                  ) : (
                    <span className="text-yellow-600 font-extrabold flex items-center gap-0.5">
                      <Star size={10} className="fill-yellow-600 stroke-transparent" />
                      <span>{selectedTestDetails.rating} out of 5</span>
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-0.5 mt-2">
                  <span className="text-[8px] uppercase text-slate-400">Difficulty Scale</span>
                  <span className="text-slate-800 font-extrabold capitalize">{selectedTestDetails.difficulty}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-5">
                <div className={`w-6 h-6 rounded-full ${selectedTestDetails.creator.avatar}`} />
                <div className="text-[10px] font-bold text-slate-550 leading-tight">
                  <span className="block text-slate-800">{selectedTestDetails.publish_as === 'competition' ? 'Organized by' : 'Created by'} {selectedTestDetails.creator.name}</span>
                  <span className="text-slate-400">Verified Testoriax Profile</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={() => setSelectedTestDetails(null)}
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold text-center cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleRegister(selectedTestDetails.id);
                    setSelectedTestDetails(null);
                  }}
                  className={`py-2.5 rounded-xl text-xs font-extrabold text-center cursor-pointer ${
                    selectedTestDetails.registered
                      ? 'bg-emerald-50 border border-emerald-250 text-emerald-700 font-extrabold'
                      : (selectedTestDetails.publish_as === 'competition' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-900 hover:bg-slate-850 text-white')
                  }`}
                >
                  {selectedTestDetails.registered ? 'Cancel Registration' : (selectedTestDetails.publish_as === 'competition' ? 'Join Competition' : 'Register Now')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default TestDiscoveryView;
