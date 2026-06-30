import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  ThumbsUp, 
  ThumbsDown, 
  MapPin, 
  Search, 
  Filter, 
  Compass, 
  ChevronRight,
  UserCheck,
  Megaphone,
  Clock
} from 'lucide-react';
import { CivicReport } from '../types';
import { submitVote, submitVerification, getReportsLocal, saveReportsLocal } from '../lib/firebase';
import { useLanguage } from '../lib/LanguageContext';

interface CommunityFeedViewProps {
  reports: CivicReport[];
  user: any;
  onRefreshData: () => void;
  onSelectReportId: (id: string) => void;
  onTrackReport: (report: CivicReport) => void;
}

export default function CommunityFeedView({ reports, user, onRefreshData, onSelectReportId, onTrackReport }: CommunityFeedViewProps) {
  const { language, isSimpleMode, t, speakText } = useLanguage();
  
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReportIdForVerify, setSelectedReportIdForVerify] = useState<string | null>(null);

  // Verification states
  const [verifyComment, setVerifyComment] = useState('');
  const [verifyType, setVerifyType] = useState<'verify' | 'dispute'>('verify');
  const [loadingVerify, setLoadingVerify] = useState(false);

  // Vote handler
  const handleVote = async (reportId: string, type: 'up' | 'down') => {
    await submitVote(reportId, user.uid, type);
    onRefreshData();
    speakText(type === 'up' ? "Upvoted problem" : "Downvoted problem");
  };

  // Verification helper
  const handleVerify = async (e: React.FormEvent, reportId: string) => {
    e.preventDefault();
    setLoadingVerify(true);

    try {
      await submitVerification(reportId, {
        uid: user.uid,
        userName: user.displayName,
        type: verifyType,
        comments: verifyComment || (verifyType === 'verify' ? 'Verified on-site.' : 'Could not find problem.'),
        createdAt: Date.now()
      });

      setVerifyComment('');
      setSelectedReportIdForVerify(null);
      onRefreshData();
      speakText("Thank you! Verification saved.");
    } catch(err) {
      console.error(err);
    } finally {
      setLoadingVerify(false);
    }
  };

  // Merge duplicates helper
  const handleSimulateMergeDuplicates = (mainReportId: string, duplicateReportId: string) => {
    const rawList = getReportsLocal();
    const mainIdx = rawList.findIndex(r => r.id === mainReportId);
    const dupeIdx = rawList.findIndex(r => r.id === duplicateReportId);

    if (mainIdx !== -1 && dupeIdx !== -1) {
      rawList[dupeIdx].isDuplicateMerged = true;
      rawList[dupeIdx].mergedIntoReportId = mainReportId;
      rawList[mainIdx].communityVotes.upvotes += rawList[dupeIdx].communityVotes.upvotes + 5;
      
      saveReportsLocal(rawList);
      onRefreshData();
    }
  };

  const filteredReports = reports.filter(r => {
    if (r.isDuplicateMerged) return false;

    const matchCategory = filterCategory === 'all' || r.category === filterCategory;
    const matchSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (r.location.address && r.location.address.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchCategory && matchSearch;
  });

  return (
    <div className={`space-y-6 text-slate-100 ${isSimpleMode ? 'px-2' : ''}`}>
      
      {/* Visual Header */}
      <div className="space-y-1 text-left">
        <h1 className={`font-black text-white flex items-center gap-2 ${isSimpleMode ? 'text-3xl' : 'text-2xl'}`} id="feed-heading">
          <Megaphone className="w-5.5 h-5.5 text-emerald-400" />
          <span>{language === 'en' ? "Neighborhood Problem Board" : "पड़ोसी समस्या बोर्ड"}</span>
        </h1>
        <p className={`text-slate-400 ${isSimpleMode ? 'text-base font-semibold leading-relaxed' : 'text-xs'}`}>
          Check and confirm problems reported by people in your area. Your verification helps city teams fix them faster.
        </p>
      </div>

      {/* Search Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-[#0c1017] border-2 border-slate-800 p-4 rounded-3xl shadow-xl">
        <div className="md:col-span-7 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            id="input-feed-search"
            placeholder={language === 'hi' ? "समस्या खोजें..." : "Search keywords, streets, categories..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-3 text-xs bg-[#111621] border-2 border-slate-800 rounded-2xl focus:outline-none focus:border-emerald-500 text-slate-200 font-bold"
          />
        </div>

        <div className="md:col-span-5 relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            id="select-feed-filter"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full pl-9 pr-4 py-3 text-xs bg-[#111621] border-2 border-slate-800 rounded-2xl focus:outline-none font-bold text-slate-300"
          >
            <option value="all">ALL PROBLEMS / सभी समस्याएं</option>
            <option value="pothole">{t('pothole')}</option>
            <option value="garbage">{t('garbage')}</option>
            <option value="water_leakage">{t('water_leakage')}</option>
            <option value="street_light">{t('street_light')}</option>
            <option value="drainage">{t('drainage')}</option>
            <option value="other">{t('other')}</option>
          </select>
        </div>
      </div>

      {/* Feed List */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-slate-800 rounded-3xl max-w-sm mx-auto" id="feed-empty-state">
            <Compass className="w-10 h-10 text-slate-500 mx-auto mb-3 animate-spin" />
            <h3 className="text-sm font-bold text-slate-300">No reported problems found</h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto mt-1 font-semibold">
              Try searching a different word or changing category filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredReports.map((r) => {
              const similarDuplicateReport = reports.find(other => 
                other.id !== r.id && 
                other.category === r.category && 
                !other.isDuplicateMerged &&
                !other.resolvedAt &&
                r.id < other.id
              );

              const userVoted = r.communityVotes.userVotes[user.uid];

              return (
                <div 
                  key={r.id} 
                  id={`feed-card-${r.id}`}
                  className="p-5 bg-[#0c1017] border-2 border-slate-850 rounded-3xl shadow-xl flex flex-col justify-between space-y-4 transition-all hover:border-emerald-500/20 text-left"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase border ${
                        r.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        r.status === 'verified' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {r.status === 'reported' ? 'unresolved' : r.status}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">Date: {new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div className="flex space-x-3 pt-1 items-center">
                      <div className="w-8 h-8 rounded-full bg-[#111621] flex items-center justify-center font-bold text-xs uppercase text-emerald-400 border border-slate-800">
                        {r.createdBy.displayName.charAt(0)}
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-slate-200">
                          {r.createdBy.displayName}
                        </span>
                        <span className="block text-[10px] text-slate-500">ID: {r.id.slice(0, 8)}</span>
                      </div>
                    </div>
                  </div>

                  {r.imageUrl && (
                    <div 
                      onClick={() => onSelectReportId(r.id)}
                      className="rounded-2xl overflow-hidden aspect-video bg-[#05070a] border border-slate-800 cursor-pointer relative"
                    >
                      <img referrerPolicy="no-referrer" src={r.imageUrl} alt={r.title} className="object-cover w-full h-full" />
                    </div>
                  )}

                  {r.videoUrl && (
                    <div className="rounded-2xl overflow-hidden aspect-video bg-[#05070a] border border-slate-800 relative mt-2">
                      <video controls src={r.videoUrl} className="w-full h-full object-contain" />
                    </div>
                  )}

                  <div className="space-y-1.5 flex-1 text-left">
                    <h3 className={`font-black text-slate-100 leading-tight line-clamp-1 ${isSimpleMode ? 'text-base' : 'text-sm'}`}>{r.title}</h3>
                    <p className={`text-slate-400 leading-relaxed line-clamp-2 ${isSimpleMode ? 'text-sm font-semibold' : 'text-xs'}`}>{r.description}</p>
                    
                    <div className="flex items-center text-xs text-slate-400 pt-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 mr-1 flex-shrink-0" />
                      <span className="truncate text-slate-400">{r.location.address || 'Lucknow Suburb'}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs bg-[#111621] p-2.5 rounded-2xl border border-slate-850">
                    <span className="text-slate-500 font-bold uppercase text-[9px]">{t('severityLevel')}:</span>
                    <span className="font-black text-rose-400 uppercase font-mono">{r.severity} ({r.priorityScore} pts)</span>
                  </div>

                  <button
                    onClick={() => onTrackReport(r)}
                    id={`btn-track-journey-${r.id}`}
                    className="w-full py-2.5 rounded-2xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 text-xs font-black tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                  >
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span>Track Complaint Journey</span>
                  </button>

                  {/* AI Duplicate recommendation panel */}
                  {similarDuplicateReport && (
                    <div className="p-3 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 space-y-2 text-xs">
                      <p className="text-slate-450 leading-tight">Similar problem report was found near here.</p>
                      <button
                        id={`btn-merge-dupe-${r.id}-${similarDuplicateReport.id}`}
                        onClick={() => handleSimulateMergeDuplicates(r.id, similarDuplicateReport.id)}
                        className="py-1.5 px-3 w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl font-bold text-[10px] uppercase cursor-pointer"
                      >
                        Merge duplicates count
                      </button>
                    </div>
                  )}

                  {/* Peer Verification List */}
                  {r.verifications.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-850">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Neighbor verifications ({r.verifications.length})</span>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {r.verifications.map((v, vIdx) => (
                          <div key={vIdx} className="p-1.5 px-3 bg-[#111621]/40 rounded-xl border border-slate-850 flex justify-between items-start text-[10px]">
                            <div className="space-y-0.5 text-left">
                              <span className="font-bold text-slate-300">{v.userName}</span>
                              <span className="block text-slate-400 italic">"{v.comments}"</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                              v.type === 'verify' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}>
                              {v.type === 'verify' ? 'Confirmed' : 'Disputed'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions row: Voting + Verify toggle */}
                  <div className="flex justify-between items-center pt-3 border-t border-slate-850">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleVote(r.id, 'up')}
                        id={`btn-feed-voteup-${r.id}`}
                        className={`p-2 px-3.5 rounded-xl border-2 font-bold text-xs flex items-center space-x-1.5 cursor-pointer ${
                          userVoted === 'up'
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                            : 'bg-transparent border-slate-800 text-slate-400'
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{r.communityVotes.upvotes}</span>
                      </button>

                      <button
                        onClick={() => handleVote(r.id, 'down')}
                        id={`btn-feed-votedown-${r.id}`}
                        className={`p-2 px-3.5 rounded-xl border-2 font-bold text-xs flex items-center space-x-1.5 cursor-pointer ${
                          userVoted === 'down'
                            ? 'bg-rose-600 text-white border-rose-500'
                            : 'bg-transparent border-slate-800 text-slate-400'
                        }`}
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                        <span>{r.communityVotes.downvotes}</span>
                      </button>
                    </div>

                    {r.status !== 'resolved' && (
                      <button
                        id={`btn-feed-verify-mode-${r.id}`}
                        onClick={() => {
                          setSelectedReportIdForVerify(selectedReportIdForVerify === r.id ? null : r.id);
                        }}
                        className="text-xs text-emerald-400 font-bold hover:underline flex items-center cursor-pointer"
                      >
                        <span>Check Problem / जाँचें</span>
                        <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </button>
                    )}
                  </div>

                  {/* Peer Verify Form Drawer */}
                  {selectedReportIdForVerify === r.id && (
                    <form onSubmit={(e) => handleVerify(e, r.id)} className="space-y-3 pt-3 border-t border-slate-850 animate-fade-in text-xs">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          id={`btn-feed-type-verify-${r.id}`}
                          onClick={() => setVerifyType('verify')}
                          className={`flex-1 py-2 px-1 border-2 rounded-xl font-bold text-xs ${
                            verifyType === 'verify' 
                              ? 'border-emerald-500 bg-emerald-950/20 text-emerald-400 font-bold' 
                              : 'border-slate-800 text-slate-400'
                          }`}
                        >
                          Yes, problem is here / हाँ, समस्या है
                        </button>
                        <button
                          type="button"
                          id={`btn-feed-type-dispute-${r.id}`}
                          onClick={() => setVerifyType('dispute')}
                          className={`flex-1 py-2 px-1 border-2 rounded-xl font-bold text-xs ${
                            verifyType === 'dispute' 
                              ? 'border-rose-500 bg-rose-950/20 text-rose-455 text-rose-400 font-bold' 
                              : 'border-slate-800 text-slate-400'
                          }`}
                        >
                          No problem here / नहीं है
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          id={`input-feed-comment-${r.id}`}
                          placeholder="Explain what you see here..."
                          value={verifyComment}
                          onChange={(e) => setVerifyComment(e.target.value)}
                          className="flex-1 text-xs p-3 rounded-2xl border-2 border-slate-800 bg-[#111621] text-slate-100 focus:outline-none focus:border-emerald-500 font-semibold"
                        />
                        <button 
                          id={`btn-feed-submit-verify-${r.id}`}
                          type="submit" 
                          className="bg-emerald-500 text-slate-950 rounded-2xl px-4 text-xs font-black hover:bg-emerald-400"
                        >
                          Send
                        </button>
                      </div>
                    </form>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
