import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Star, Award, Clock, ArrowRight, Compass, Bookmark,
  TrendingUp, Award as BadgeAward, CheckCircle2, Layers, HelpCircle,
  Loader2, Play
} from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import { testsService } from '../../services/testsService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';

interface PracticeViewProps {
  onNavigate: (view: any, param?: string) => void;
}

export const PracticeView: React.FC<PracticeViewProps> = ({ onNavigate }) => {
  const { user, profile, signOut } = useAuth();
  const { showToast } = useToast();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Primary toggle: 'explore' or 'my-practice'
  const [activeTab, setActiveTab] = useState<'explore' | 'my-practice'>('explore');

  // Explore sub-states
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All Difficulties');
  const [selectedType, setSelectedType] = useState<string>('All Types');
  const [selectedDuration, setSelectedDuration] = useState<string>('All Durations');
  const [sortBy, setSortBy] = useState<string>('Newest');

  // My Practice subtabs: 'saved' | 'attempted' | 'completed' | 'certificates' | 'continue'
  const [myPracticeTab, setMyPracticeTab] = useState<'saved' | 'attempted' | 'completed' | 'certificates' | 'continue'>('saved');
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [userAttempts, setUserAttempts] = useState<any[]>([]);

  // Load Explore Tests
  const loadExploreTests = async () => {
    setLoading(true);
    try {
      const { data, error } = await testsService.getPublicPracticeTests();
      if (error) throw error;
      setTests(data || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load practice tests.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load Bookmarks and Attempts for My Practice Tab
  const loadUserData = async () => {
    if (!user) return;
    try {
      const [bookRes, attRes] = await Promise.all([
        testsService.getBookmarkedTests(user.id),
        testsService.getUserAttempts(user.id)
      ]);

      if (bookRes.error) throw bookRes.error;
      if (attRes.error) throw attRes.error;

      const bookmarks = bookRes.data || [];
      setBookmarkedIds(bookmarks.map((b: any) => b.test_id));
      setUserAttempts(attRes.data || []);
    } catch (err: any) {
      console.error('[PracticeView] Error loading user stats:', err);
    }
  };

  useEffect(() => {
    loadExploreTests();
  }, []);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user, activeTab]);

  // Handle Bookmarks Toggle
  const handleBookmarkToggle = async (e: React.MouseEvent, testId: string) => {
    e.stopPropagation();
    if (!user) {
      showToast('Please log in to save practice tests.', 'info');
      onNavigate('login');
      return;
    }

    const isBookmarked = bookmarkedIds.includes(testId);
    try {
      if (isBookmarked) {
        const { error } = await testsService.unbookmarkTest(user.id, testId);
        if (error) throw error;
        setBookmarkedIds(prev => prev.filter(id => id !== testId));
        showToast('Test removed from saved bookmarks.', 'success');
      } else {
        const { error } = await testsService.bookmarkTest(user.id, testId);
        if (error) throw error;
        setBookmarkedIds(prev => [...prev, testId]);
        showToast('Test bookmarked successfully!', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update bookmarks.', 'error');
    }
  };


  // Categories list
  const CATEGORIES = ['All Categories', 'Programming', 'Aptitude', 'Design', 'Data Science', 'Language'];
  
  // Tag counts
  const filteredTests = tests.filter(test => {
    const matchesSearch = test.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (test.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (test.profiles?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All Categories' || test.category === selectedCategory;
    
    const matchesDifficulty = selectedDifficulty === 'All Difficulties' || 
                              test.difficulty?.toLowerCase() === selectedDifficulty.toLowerCase();
    
    // Check if test contains the target question type
    let matchesType = true;
    if (selectedType !== 'All Types') {
      const targetType = selectedType.toLowerCase();
      matchesType = test.questions?.some((q: any) => q.type?.toLowerCase() === targetType || q.question_type?.toLowerCase() === targetType) ?? false;
    }

    // Check duration matches
    let matchesDuration = true;
    if (selectedDuration !== 'All Durations') {
      const dur = test.duration || 0;
      if (selectedDuration === '< 15 mins') matchesDuration = dur < 15;
      else if (selectedDuration === '15 - 30 mins') matchesDuration = dur >= 15 && dur <= 30;
      else if (selectedDuration === '30 - 60 mins') matchesDuration = dur > 30 && dur <= 60;
      else if (selectedDuration === '> 60 mins') matchesDuration = dur > 60;
    }

    return matchesSearch && matchesCategory && matchesDifficulty && matchesType && matchesDuration;
  }).sort((a, b) => {
    if (sortBy === 'Newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === 'Most Attempted') return (b.attempts_count || 0) - (a.attempts_count || 0);
    if (sortBy === 'Highest Rated') return (b.average_rating || 5.0) - (a.average_rating || 5.0);
    if (sortBy === 'Recently Added') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return 0;
  });

  // Calculate Featured Practice (High ratings/attempts)
  const featuredTests = [...tests]
    .filter(t => (t.average_rating || 5.0) >= 4.5 || (t.attempts_count || 0) > 10)
    .slice(0, 4);

  const renderContent = () => (
    <div className="w-full flex-grow flex flex-col gap-6 select-none relative pb-12">
      
      {/* Tab bar header switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/70 border border-slate-100 p-4.5 rounded-3xl shadow-sm">
        <div>
          <h2 className="font-display font-black text-slate-800 text-lg uppercase tracking-wider flex items-center gap-2">
            <Compass size={20} className="text-purple-650 animate-spin-slow" />
            <span>Practice Arena</span>
          </h2>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-relaxed">
            Enhance your aptitude, system design, and algorithms. No deadlines. Learn at your own pace.
          </p>
        </div>

        {/* Explore vs My Practice */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl shrink-0">
          <button
            onClick={() => setActiveTab('explore')}
            className={`px-4.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'explore'
                ? 'bg-white text-purple-705 shadow-sm font-extrabold'
                : 'text-slate-550 hover:text-slate-850'
            }`}
          >
            Explore Library
          </button>
          <button
            onClick={() => {
              if (!user) {
                showToast('Please log in to view My Practice statistics.', 'info');
                onNavigate('login');
                return;
              }
              setActiveTab('my-practice');
            }}
            className={`px-4.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'my-practice'
                ? 'bg-white text-purple-705 shadow-sm font-extrabold'
                : 'text-slate-550 hover:text-slate-850'
            }`}
          >
            My Practice
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        
        {/* EXPLORE LIBRARY VIEW */}
        {activeTab === 'explore' && (
          <motion.div
            key="explore-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex flex-col gap-6 w-full"
          >
            {/* Filter Section */}
            <div className="flex flex-col gap-4 bg-white/40 border border-slate-100 p-4.5 rounded-3xl shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
                {/* Search Bar */}
                <div className="relative flex-grow max-w-md bg-white border border-slate-150 rounded-2xl px-4 py-2.5 flex items-center focus-within:border-purple-300 shadow-sm">
                  <Search size={14} className="text-slate-400 mr-2" />
                  <input
                    type="text"
                    placeholder="Search practice tests..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-grow bg-transparent text-xs font-semibold text-slate-700 outline-none placeholder-slate-400"
                  />
                </div>

                {/* Sort dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Sort By</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-white border border-slate-150 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:border-purple-300"
                  >
                    <option>Newest</option>
                    <option>Most Attempted</option>
                    <option>Highest Rated</option>
                    <option>Recently Added</option>
                  </select>
                </div>
              </div>

              {/* Filters dropdowns row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Difficulty */}
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider pl-1">Difficulty</label>
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    className="bg-white border border-slate-150 rounded-xl px-3 py-2 text-xs font-semibold text-slate-650 outline-none"
                  >
                    <option>All Difficulties</option>
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>
                </div>

                {/* Question Type */}
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider pl-1">Question Type</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="bg-white border border-slate-150 rounded-xl px-3 py-2 text-xs font-semibold text-slate-650 outline-none"
                  >
                    <option>All Types</option>
                    <option>MCQ</option>
                    <option>Coding</option>
                    <option>Fillups</option>
                    <option>True-False</option>
                  </select>
                </div>

                {/* Duration */}
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider pl-1">Duration</label>
                  <select
                    value={selectedDuration}
                    onChange={(e) => setSelectedDuration(e.target.value)}
                    className="bg-white border border-slate-150 rounded-xl px-3 py-2 text-xs font-semibold text-slate-650 outline-none"
                  >
                    <option>All Durations</option>
                    <option>&lt; 15 mins</option>
                    <option>15 - 30 mins</option>
                    <option>30 - 60 mins</option>
                    <option>&gt; 60 mins</option>
                  </select>
                </div>

                {/* Quick reset */}
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setSelectedCategory('All Categories');
                      setSelectedDifficulty('All Difficulties');
                      setSelectedType('All Types');
                      setSelectedDuration('All Durations');
                      setSearchQuery('');
                      setSortBy('Newest');
                    }}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-655 font-bold rounded-xl text-xs cursor-pointer text-center"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            </div>

            {/* Categories pills */}
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
                        : 'border-slate-100 bg-white text-slate-455 hover:border-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* FEATURED PRACTICE SECTION */}
            {searchQuery === '' && selectedCategory === 'All Categories' && featuredTests.length > 0 && (
              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                  <TrendingUp size={12} className="text-purple-655" />
                  <span>Popular & Featured Practice</span>
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {featuredTests.map((test) => (
                    <GlassCard 
                      key={test.id} 
                      onClick={() => onNavigate('test-details', test.id)}
                      className="p-4 flex items-center gap-4 bg-white/70 border-slate-100 hover:border-purple-250 cursor-pointer transition-all hover:shadow-md"
                    >
                      <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${test.mock_thumbnail || 'from-indigo-500 to-purple-550'} shrink-0 flex items-center justify-center text-white font-display font-black text-xl`}>
                        {test.title.substring(0, 2).toUpperCase()}
                      </div>
                      
                      <div className="flex-grow min-w-0">
                        <span className="text-[8px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider bg-purple-50 text-purple-700">
                          {test.category}
                        </span>
                        <h4 className="font-display font-extrabold text-xs text-slate-800 tracking-tight mt-1 line-clamp-1">
                          {test.title}
                        </h4>
                        <p className="text-[9px] font-semibold text-slate-455 mt-0.5">
                          Created by: {test.profiles?.full_name || 'Educator'}
                        </p>
                        
                        <div className="flex items-center gap-3 mt-2 text-[10px] font-bold text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock size={11} /> {test.duration || 60}m
                          </span>
                          <span className="flex items-center gap-0.5 text-amber-500">
                            <Star size={11} className="fill-amber-400 stroke-amber-500" />
                            {test.average_rating || 5.0}
                          </span>
                          <span>{test.attempts_count || 0} attempts</span>
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              </div>
            )}

            {/* ALL PRACTICE TESTS GRID */}
            <div className="flex flex-col gap-3.5 mt-2">
              <div className="flex justify-between items-center pl-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  All Practice Tests ({filteredTests.length})
                </span>
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 size={32} className="animate-spin text-purple-650" />
                </div>
              ) : filteredTests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTests.map((test) => {
                    const isBookmarked = bookmarkedIds.includes(test.id);
                    // Extract question types
                    const questionsList = test.questions || [];
                    const hasMcq = questionsList.some((q: any) => q.type === 'mcq' || q.question_type === 'mcq');
                    const hasCoding = questionsList.some((q: any) => q.type === 'coding' || q.question_type === 'coding');
                    const hasFillups = questionsList.some((q: any) => q.type === 'fillups' || q.question_type === 'fillups');
                    const hasTf = questionsList.some((q: any) => q.type === 'true-false' || q.question_type === 'true-false');
                    const hasImage = questionsList.some((q: any) => q.imageUrl);

                    return (
                      <GlassCard
                        key={test.id}
                        onClick={() => onNavigate('test-details', test.id)}
                        className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-5 flex flex-col justify-between transition-all duration-300 hover:border-purple-300 hover:shadow-md cursor-pointer group relative overflow-hidden"
                      >
                        <div className="flex flex-col gap-4">
                          {/* Card cover banner */}
                          <div className={`h-32 rounded-[24px] bg-gradient-to-r ${test.mock_thumbnail || 'from-purple-650 to-indigo-655'} p-4.5 text-white flex flex-col justify-between relative overflow-hidden shrink-0`}>
                            <div className="absolute inset-0 bg-black/10 mix-blend-multiply" />
                            
                            <div className="flex justify-between items-center relative z-10">
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-white/20 backdrop-blur-sm">
                                {test.category}
                              </span>

                              {/* Save Bookmark trigger */}
                              <button
                                onClick={(e) => handleBookmarkToggle(e, test.id)}
                                className="p-1.5 rounded-xl bg-white/20 hover:bg-white/35 backdrop-blur-sm text-white transition-all cursor-pointer"
                              >
                                <Bookmark size={13} className={isBookmarked ? 'fill-white' : ''} />
                              </button>
                            </div>

                            <div className="relative z-10">
                              <h3 className="font-display font-extrabold text-sm tracking-tight line-clamp-1 leading-snug">
                                {test.title}
                              </h3>
                              <span className="text-[9px] text-white/80 font-bold block mt-0.5">
                                by {test.profiles?.full_name || 'Educator'}
                              </span>
                            </div>
                          </div>

                          {/* Body */}
                          <div className="flex flex-col gap-3 px-1">
                            <p className="text-xs text-slate-500 font-semibold line-clamp-2 leading-relaxed">
                              {test.description || 'Practice this mock test to evaluate your algorithms and concepts.'}
                            </p>

                            {/* Badges row for metadata */}
                            <div className="flex flex-wrap gap-2 text-[9px] font-extrabold text-slate-500 uppercase mt-1">
                              <div className="bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 flex items-center gap-1">
                                <Clock size={10} />
                                <span>{test.duration || 60} mins</span>
                              </div>
                              <div className="bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                <span>{questionsList.length} Questions</span>
                              </div>
                              <div className="bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                <span className="capitalize">{test.difficulty || 'Medium'}</span>
                              </div>
                            </div>

                            {/* Badges for question types */}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {hasMcq && <span className="text-[8px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-650 rounded">MCQ</span>}
                              {hasCoding && <span className="text-[8px] font-bold px-1.5 py-0.5 bg-pink-50 text-pink-655 rounded">Coding</span>}
                              {hasFillups && <span className="text-[8px] font-bold px-1.5 py-0.5 bg-amber-50 text-amber-655 rounded">Fillups</span>}
                              {hasTf && <span className="text-[8px] font-bold px-1.5 py-0.5 bg-teal-50 text-teal-655 rounded">True/False</span>}
                              {hasImage && <span className="text-[8px] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-655 rounded">Image</span>}
                            </div>
                          </div>
                        </div>

                        {/* Footer row */}
                        <div className="flex items-center justify-between border-t border-slate-100 pt-3.5 mt-4 px-1">
                          <div className="flex items-center gap-1 text-[10px] font-extrabold text-slate-500">
                            <Star size={11} className="fill-amber-400 stroke-amber-500" />
                            <span>{test.average_rating || 5.0}</span>
                            <span className="text-slate-350">({test.attempts_count || 0} attempts)</span>
                          </div>
                          
                          <div className="flex items-center gap-1 text-[10px] text-purple-650 font-black group-hover:translate-x-0.5 transition-all">
                            <span>Start Practice</span>
                            <ArrowRight size={11} className="stroke-[3px]" />
                          </div>
                        </div>
                      </GlassCard>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 bg-white/50 border border-slate-100 rounded-3xl">
                  <HelpCircle size={32} className="mx-auto text-slate-300" />
                  <p className="text-xs text-slate-400 font-bold mt-2.5">No practice tests match your search criteria.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* MY PRACTICE STATS & TABS */}
        {activeTab === 'my-practice' && (
          <motion.div
            key="my-practice-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex flex-col gap-6 w-full"
          >
            {/* Tabs Row */}
            <div className="flex bg-slate-55 border border-slate-150 p-1 rounded-2xl shrink-0 flex-wrap gap-1">
              {(['saved', 'attempted', 'completed', 'certificates', 'continue'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setMyPracticeTab(tab)}
                  className={`px-4 py-1.5 text-[10.5px] font-bold rounded-xl transition-all cursor-pointer capitalize ${
                    myPracticeTab === tab
                      ? 'bg-slate-900 text-white shadow-sm font-extrabold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab === 'continue' ? 'Continue Practice' : tab}
                </button>
              ))}
            </div>

            {/* Tab content renderer */}
            <div className="w-full">
              {myPracticeTab === 'saved' && (
                <div className="flex flex-col gap-4">
                  <span className="text-[10px] font-bold text-slate-500 uppercase pl-1">Saved Bookmarks</span>
                  {tests.filter(t => bookmarkedIds.includes(t.id)).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {tests.filter(t => bookmarkedIds.includes(t.id)).map(test => (
                        <GlassCard
                          key={test.id}
                          onClick={() => onNavigate('test-details', test.id)}
                          className="bg-white rounded-3xl border border-slate-100 p-5 flex flex-col justify-between cursor-pointer hover:border-purple-250 transition-all shadow-sm"
                        >
                          <div>
                            <span className="text-[8px] font-extrabold px-2 py-0.5 rounded-full bg-slate-550/10 text-slate-600 uppercase">
                              {test.category}
                            </span>
                            <h4 className="font-display font-extrabold text-sm text-slate-800 mt-2 tracking-tight">
                              {test.title}
                            </h4>
                            <p className="text-[10px] text-slate-455 mt-0.5 font-semibold">
                              by {test.profiles?.full_name}
                            </p>
                          </div>
                          
                          <div className="flex justify-between items-center mt-6 pt-3.5 border-t border-slate-50">
                            <span className="text-[9.5px] font-bold text-slate-500">
                              {test.duration} mins • {test.questions?.length || 0} Qs
                            </span>
                            <span className="text-purple-650 text-xs font-black">Practice Now</span>
                          </div>
                        </GlassCard>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-white/40 border border-dashed border-slate-200 rounded-3xl">
                      <Bookmark size={24} className="mx-auto text-slate-350" />
                      <p className="text-xs text-slate-400 font-bold mt-2">You haven't bookmarked any practice tests yet.</p>
                    </div>
                  )}
                </div>
              )}

              {myPracticeTab === 'attempted' && (
                <div className="flex flex-col gap-4">
                  <span className="text-[10px] font-bold text-slate-500 uppercase pl-1">All Attempts</span>
                  {userAttempts.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {userAttempts.map((att: any) => (
                        <div 
                          key={att.id} 
                          onClick={() => onNavigate('test-details', att.test_id)}
                          className="flex justify-between items-center bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm hover:border-purple-200 transition-all cursor-pointer"
                        >
                          <div>
                            <h4 className="font-display font-extrabold text-xs text-slate-800">{att.tests?.title}</h4>
                            <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                              Attempted on {new Date(att.started_at).toLocaleDateString()} • Status: <span className="capitalize text-slate-600 font-bold">{att.status}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-slate-800">{att.score || 0} pts</span>
                            <span className="text-[9px] text-slate-400 block font-semibold">Marks Awarded</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-white/40 border border-dashed border-slate-200 rounded-3xl">
                      <Layers size={24} className="mx-auto text-slate-350" />
                      <p className="text-xs text-slate-400 font-bold mt-2">You haven't attempted any tests yet.</p>
                    </div>
                  )}
                </div>
              )}

              {myPracticeTab === 'completed' && (
                <div className="flex flex-col gap-4">
                  <span className="text-[10px] font-bold text-slate-500 uppercase pl-1">Completed Evaluations</span>
                  {userAttempts.filter(a => a.status === 'submitted' || a.status === 'expired').length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {userAttempts.filter(a => a.status === 'submitted' || a.status === 'expired').map((att: any) => (
                        <GlassCard
                          key={att.id}
                          className="p-4 border-slate-100 bg-white shadow-sm flex flex-col justify-between"
                        >
                          <div>
                            <h4 className="font-display font-extrabold text-xs text-slate-805 line-clamp-1">{att.tests?.title}</h4>
                            <span className="text-[9px] text-slate-400 font-bold">
                              Submitted {new Date(att.submitted_at || att.started_at).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-50">
                            <div>
                              <span className="text-[8px] uppercase font-bold text-slate-400">Score</span>
                              <span className="text-xs font-black text-slate-800 block">{att.score} pts</span>
                            </div>
                            <button
                              onClick={() => onNavigate('test-details', att.test_id)}
                              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-850 text-white font-extrabold rounded-lg text-[10px]"
                            >
                              Review Answers
                            </button>
                          </div>
                        </GlassCard>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-white/40 border border-dashed border-slate-200 rounded-3xl">
                      <CheckCircle2 size={24} className="mx-auto text-slate-350" />
                      <p className="text-xs text-slate-400 font-bold mt-2">You haven't completed any mock tests yet.</p>
                    </div>
                  )}
                </div>
              )}

              {myPracticeTab === 'certificates' && (
                <div className="flex flex-col gap-4">
                  <span className="text-[10px] font-bold text-slate-500 uppercase pl-1">Earned Certificates</span>
                  {userAttempts.filter(a => (a.status === 'submitted' || a.status === 'expired') && a.score >= 50).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {userAttempts.filter(a => (a.status === 'submitted' || a.status === 'expired') && a.score >= 50).map((att: any) => (
                        <div 
                          key={att.id} 
                          className="p-5 border border-purple-100 bg-gradient-to-r from-purple-500/5 to-indigo-500/5 rounded-2xl flex items-center justify-between shadow-sm"
                        >
                          <div>
                            <div className="flex items-center gap-1 text-purple-700 font-black text-[10px] uppercase">
                              <BadgeAward size={13} />
                              <span>Verified Certificate</span>
                            </div>
                            <h4 className="font-display font-extrabold text-xs text-slate-800 mt-1">{att.tests?.title}</h4>
                            <p className="text-[9px] text-slate-455 font-semibold mt-0.5">Passing Score Achieved</p>
                          </div>
                          
                          <button
                            onClick={() => onNavigate('creator-profile', 'jane-challenger')} // mock certification showcase
                            className="px-3.5 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-650 hover:to-indigo-650 text-white font-extrabold rounded-xl text-[10px] flex items-center gap-1 cursor-pointer active:scale-98 shadow"
                          >
                            <span>Showcase</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-white/40 border border-dashed border-slate-200 rounded-3xl">
                      <Award size={24} className="mx-auto text-slate-350" />
                      <p className="text-xs text-slate-400 font-bold mt-2">Achieve a passing score of 50% or above in evaluations to earn credentials.</p>
                    </div>
                  )}
                </div>
              )}

              {myPracticeTab === 'continue' && (
                <div className="flex flex-col gap-4">
                  <span className="text-[10px] font-bold text-slate-500 uppercase pl-1">Continue In-Progress Practice</span>
                  {userAttempts.filter(a => a.status === 'in_progress').length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {userAttempts.filter(a => a.status === 'in_progress').map((att: any) => (
                        <div 
                          key={att.id} 
                          className="flex justify-between items-center bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm hover:border-purple-200 transition-all"
                        >
                          <div>
                            <h4 className="font-display font-extrabold text-xs text-slate-805">{att.tests?.title}</h4>
                            <p className="text-[9px] text-slate-455 font-semibold mt-0.5">
                              Last started on {new Date(att.started_at).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            onClick={() => onNavigate('exam-entry', att.test_id)}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl text-[10.5px] flex items-center gap-1.5 cursor-pointer shadow active:scale-98"
                          >
                            <Play size={10} className="fill-white" />
                            <span>Resume</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-white/40 border border-dashed border-slate-200 rounded-3xl">
                      <Clock size={24} className="mx-auto text-slate-350" />
                      <p className="text-xs text-slate-400 font-bold mt-2">You don't have any in-progress practice sessions.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
      
    </div>
  );

  if (user) {
    return (
      <div className="min-h-screen bg-[#fffafb] flex overflow-hidden w-full">
        <Sidebar
          currentTab="practice"
          onTabChange={(tab) => {
            if (tab === 'practice') return;
            if (tab === 'create-test') onNavigate('create-test');
            else onNavigate('dashboard', tab);
          }}
          onSignOut={async () => {
            await signOut();
            onNavigate('landing');
          }}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <div className="flex-1 flex flex-col min-w-0 lg:pl-64 min-h-screen bg-[#fffafb]">
          <TopNavbar
            onMenuToggle={() => setIsSidebarOpen(true)}
            onSignOut={async () => {
              await signOut();
              onNavigate('landing');
            }}
            onViewProfile={() => onNavigate('creator-profile', 'me')}
            onViewSettings={() => onNavigate('dashboard', 'settings')}
            userName={profile?.full_name || user?.email?.split('@')[0] || 'Challenger'}
            userEmail={user?.email || ''}
            userAvatar={profile?.avatar_url}
            userRole={profile?.specialty}
          />
          <main className="flex-grow p-6 flex flex-col gap-6 overflow-y-auto max-w-7xl w-full mx-auto relative">
            {renderContent()}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full font-sans select-none antialiased min-h-screen bg-[#fffafb] pt-24 px-6">
      <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">
        {renderContent()}
      </div>
    </div>
  );
};
