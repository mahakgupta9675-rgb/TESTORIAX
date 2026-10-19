import React, { useState, useEffect } from 'react';
import { 
  Users, Clock, ChevronRight, BookOpen, Loader2
} from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { socialService } from '../../services/socialService';

interface FollowingFeedViewProps {
  onNavigate: (view: any, param?: string) => void;
}

export const FollowingFeedView: React.FC<FollowingFeedViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFeed = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      try {
        const { data, error } = await socialService.getFollowingFeed(user.id);
        if (!error && data) {
          setFeedItems(data);
        }
      } catch (err) {
        console.error("Failed to load following feed:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFeed();
  }, [user]);

  const handleTestClick = (testId: string) => {
    onNavigate('test-details', testId);
  };

  const handleCreatorClick = (e: React.MouseEvent, creatorId: string) => {
    e.stopPropagation();
    onNavigate('creator-profile', creatorId);
  };

  if (!user) {
    return (
      <div className="w-full font-sans select-none antialiased min-h-screen bg-[#fffafb] pt-20 flex flex-col items-center justify-center">
        <Users size={48} className="text-slate-300 mb-4" />
        <h2 className="text-lg font-bold text-slate-700">Login Required</h2>
        <p className="text-xs text-slate-500 mt-2">Log in to see tests published by creators you follow.</p>
        <button 
          onClick={() => onNavigate('login')}
          className="mt-6 px-6 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl text-xs font-bold"
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="w-full font-sans select-none antialiased min-h-screen bg-[#fffafb] pt-20 pb-20 relative">
      <div className="max-w-[1000px] mx-auto px-4 md:px-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded border border-purple-100 bg-purple-50 text-[9px] font-black uppercase tracking-wider text-purple-600">
                Your Network
              </span>
            </div>
            <h1 className="font-display font-black text-2xl md:text-3xl text-slate-800 tracking-tight leading-none mt-2">
              Following Feed
            </h1>
            <p className="text-xs text-slate-500 font-semibold mt-2">
              Discover the latest tests from creators you follow.
            </p>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="w-full flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-purple-500" size={32} />
          </div>
        ) : feedItems.length === 0 ? (
          <div className="w-full py-20 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-3xl bg-white/50">
            <BookOpen size={40} className="text-slate-300 mb-4" />
            <h3 className="text-sm font-bold text-slate-700">No recent activity</h3>
            <p className="text-xs text-slate-400 mt-2 max-w-sm text-center">
              The creators you follow haven't published any new tests recently, or you aren't following anyone yet.
            </p>
            <button 
              onClick={() => onNavigate('discovery')}
              className="mt-6 px-6 py-2 border border-slate-200 text-slate-600 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-slate-50 transition-colors"
            >
              Explore Discovery
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in zoom-in-98 duration-300">
            {feedItems.map((test) => (
              <GlassCard 
                key={test.id} 
                className="p-5 border-slate-100 bg-white flex flex-col justify-between hover:-translate-y-1 transition-transform cursor-pointer shadow-sm hover:shadow-md group"
                onClick={() => handleTestClick(test.id)}
                hoverEffect={false}
              >
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="px-2 py-0.5 rounded border border-indigo-100 bg-indigo-50 text-[8px] font-black uppercase tracking-wider text-indigo-600">
                      {test.category || 'General'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                      test.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      test.difficulty === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                      'bg-rose-50 text-rose-600 border-rose-100'
                    }`}>
                      {test.difficulty || 'medium'}
                    </span>
                  </div>

                  <h3 className="font-display font-black text-sm text-slate-800 leading-snug line-clamp-2 mb-2 group-hover:text-purple-700 transition-colors">
                    {test.title}
                  </h3>
                  
                  <div 
                    onClick={(e) => handleCreatorClick(e, test.creator_id)}
                    className="flex items-center gap-2 mt-3 cursor-pointer w-fit hover:opacity-80 transition-opacity"
                  >
                    <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-purple-400 to-indigo-400 flex items-center justify-center overflow-hidden shrink-0">
                      {test.creator?.avatar_url ? (
                        <img src={test.creator.avatar_url} alt="creator" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[8px] font-black text-white">{test.creator?.full_name?.substring(0, 2) || 'C'}</span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 line-clamp-1">{test.creator?.full_name}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-slate-50 pt-3.5 mt-4 text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock size={11} />
                    <span>{test.duration}m</span>
                  </span>
                  
                  <button className="flex items-center justify-center w-6 h-6 rounded-md bg-purple-50 text-purple-600 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                    <ChevronRight size={12} />
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default FollowingFeedView;
