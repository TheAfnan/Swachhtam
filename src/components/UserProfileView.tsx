import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  User, 
  Award, 
  ShieldCheck, 
  Clock, 
  PlusCircle, 
  CheckCircle2, 
  Flame, 
  Sparkles,
  MapPin,
  ExternalLink,
  Users,
  Target,
  Volume2,
  Settings
} from 'lucide-react';
import { CivicReport } from '../types';
import { 
  getUserReputation, 
  getWeeklyMissions, 
  getHeroRecognitions
} from '../lib/gamification';
import { useLanguage } from '../lib/LanguageContext';

interface UserProfileProps {
  user: any;
  reports: CivicReport[];
  onSelectReportId: (id: string) => void;
  onNavigateTab: (tab: string) => void;
  onTrackReport: (report: CivicReport) => void;
}

export default function UserProfileView({ user, reports, onSelectReportId, onNavigateTab, onTrackReport }: UserProfileProps) {
  const { language, setLanguage, isSimpleMode, setIsSimpleMode, t, speakText } = useLanguage();
  
  const [journeySummary, setJourneySummary] = useState<string>('');
  const [loadingAI, setLoadingAI] = useState<boolean>(false);

  // Filter user reports and verifications
  const myReports = reports.filter(r => r.createdBy.uid === user.uid && !r.isDuplicateMerged);
  const myVerifications = reports.filter(r => r.verifications?.some(v => v.uid === user.uid));

  // Compute reputation scores, streaks, etc.
  const reputation = getUserReputation(user, reports);
  const missions = getWeeklyMissions(user, reports);
  const recognitions = getHeroRecognitions(user, reports);

  // Load / generate AI legacy story
  useEffect(() => {
    const cached = localStorage.getItem(`legacy_story_${user.uid}`);
    if (cached) {
      setJourneySummary(cached);
    } else {
      fetchJourneySummary();
    }
  }, [user.uid]);

  const fetchJourneySummary = async () => {
    setLoadingAI(true);
    try {
      const response = await fetch('/api/gamification/legacy-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: user.displayName,
          points: user.points,
          reportsCreatedCount: myReports.length,
          verificationsCount: myVerifications.length,
          activeArea: 'Gomti Nagar Sector'
        })
      });
      const data = await response.json();
      if (data.summary) {
        setJourneySummary(data.summary);
        localStorage.setItem(`legacy_story_${user.uid}`, data.summary);
      }
    } catch (err) {
      console.warn("Failed to generate AI legacy summary, using fallback.", err);
      const fallback = `${user.displayName} is a distinguished civic anchor in Gomti Nagar, Lucknow. By contributing ${user.points} community points, filing ${myReports.length} reports, and validating ${myVerifications.length} peer hazards, they have safeguarded local roads, optimized infrastructure compliance, and set a pristine standard for collaborative urban stewardship.`;
      setJourneySummary(fallback);
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className={`max-w-4xl mx-auto space-y-6 text-slate-100 ${isSimpleMode ? 'px-2' : ''}`}>
      
      {/* Visual Header Card */}
      <div className="p-6 rounded-3xl bg-[#0c1017] border-2 border-slate-800 flex flex-col md:flex-row items-center md:items-start justify-between gap-6 shadow-xl relative overflow-hidden text-left">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/[0.02] rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-center space-y-3.5 sm:space-y-0 sm:space-x-5 text-center sm:text-left">
          {/* User initials bubble */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 font-black text-3xl flex items-center justify-center shadow-lg border border-emerald-400/20">
            {user.displayName.charAt(0)}
          </div>
          <div className="space-y-1">
            <h1 className={`font-black text-white ${isSimpleMode ? 'text-2xl' : 'text-xl'}`}>{user.displayName}</h1>
            <p className="text-xs text-slate-400 font-mono">{user.email}</p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="inline-block py-0.5 px-2 bg-emerald-500/10 text-emerald-400 rounded text-[10px] font-bold font-mono uppercase border border-emerald-500/20">
                {t('citizenTrustScore')}: {reputation.trustScore}%
              </span>
            </div>
          </div>
        </div>

        {/* Loyalty points card */}
        <div className="p-4 rounded-2xl bg-[#111621] border-2 border-slate-800 text-center md:text-right min-w-[170px]">
          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Your Helpful Points</span>
          <span className="block text-3xl font-black text-emerald-400 font-mono mt-1">{user.points} pts</span>
          <span className="text-[10px] text-slate-500 block mt-1">Keep reporting to help your neighborhood!</span>
        </div>
      </div>

      {/* NEW: DEDICATED PREFERENCES & SETTINGS MODULE */}
      <div className="p-6 rounded-3xl bg-[#0c1017] border-2 border-slate-800 text-left space-y-4 shadow-xl">
        <h3 className={`font-black text-white flex items-center gap-2 ${isSimpleMode ? 'text-xl' : 'text-sm'}`}>
          <Settings className="w-4.5 h-4.5 text-emerald-400" /> App Settings & Accessibility (सेटिंग्स और भाषा चयन)
        </h3>
        <p className={`text-slate-400 ${isSimpleMode ? 'text-base font-semibold' : 'text-xs'}`}>
          Configure your preferred language and turn on Simple Mode (larger buttons and audio assistance).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Language selection block */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 block">Select Language / भाषा चुनें</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { code: 'en', name: 'English' },
                { code: 'hi', name: 'हिंदी' },
                { code: 'ta', name: 'தமிழ்' },
                { code: 'te', name: 'తెలుగు' },
                { code: 'kn', name: 'ಕನ್ನಡ' },
                { code: 'mr', name: 'मराठी' }
              ].map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code as any);
                    speakText(lang.code === 'hi' ? 'हिंदी भाषा चुनी गई' : `Language updated to ${lang.name}`);
                  }}
                  className={`py-3.5 px-1 rounded-xl border-2 font-black text-xs transition-all cursor-pointer ${
                    language === lang.code 
                      ? 'border-emerald-500 bg-emerald-950/20 text-emerald-400' 
                      : 'border-slate-800 bg-transparent hover:bg-slate-900/40 text-slate-400 hover:text-white'
                  }`}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </div>

          {/* Simple Mode Toggle block */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 block">Special Accessibility Mode / आसान मोड</label>
            <button
              onClick={() => {
                const updated = !isSimpleMode;
                setIsSimpleMode(updated);
                speakText(updated ? "Easy mode is now turned on. Buttons are larger and easier to read." : "Standard mode active.");
              }}
              className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between text-left transition-all cursor-pointer ${
                isSimpleMode 
                  ? 'border-emerald-500 bg-emerald-950/30 text-emerald-400 font-bold' 
                  : 'border-slate-800 bg-transparent text-slate-400'
              }`}
            >
              <div>
                <span className="block text-sm font-black text-white flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-400" /> Elder & Simple Mode (आसान मोड)
                </span>
                <span className="block text-[11px] text-slate-500 mt-0.5 leading-tight">Larger text, bigger buttons, simple icons, and auto voice narration.</span>
              </div>
              <div className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors ${isSimpleMode ? 'bg-emerald-500' : 'bg-slate-800'}`}>
                <div className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${isSimpleMode ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Legacy Stats Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
        {/* Trust score card */}
        <div className="p-4 rounded-2xl bg-[#0c1017] border-2 border-slate-800 space-y-3.5">
          <div className="flex items-center space-x-2 text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider">{t('citizenTrustScore')}</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-[11px] text-slate-400">Score Rating</span>
              <span className="text-sm font-black font-mono text-white">{reputation.trustScore}%</span>
            </div>
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-700" 
                style={{ width: `${reputation.trustScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* Streaks */}
        <div className="p-4 rounded-2xl bg-[#0c1017] border-2 border-slate-800 space-y-3.5">
          <div className="flex items-center space-x-2 text-slate-300">
            <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">Active reporting streak</span>
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-xl bg-[#111621] border border-slate-800">
              <span className="block text-base font-bold text-orange-400">{reputation.streaks.daily}d</span>
              <span className="text-[9px] text-slate-500 block uppercase">Daily</span>
            </div>
            <div className="p-2 rounded-xl bg-[#111621] border border-slate-800">
              <span className="block text-base font-bold text-teal-400">{reputation.streaks.weekly}w</span>
              <span className="text-[9px] text-slate-500 block uppercase">Weekly</span>
            </div>
            <div className="p-2 rounded-xl bg-[#111621] border border-slate-800">
              <span className="block text-base font-bold text-emerald-400">{reputation.streaks.monthly}m</span>
              <span className="text-[9px] text-slate-500 block uppercase">Monthly</span>
            </div>
          </div>
        </div>

        {/* Impact */}
        <div className="p-4 rounded-2xl bg-[#0c1017] border-2 border-slate-800 space-y-3.5">
          <div className="flex items-center space-x-2 text-slate-300">
            <Users className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider">Help Score (कम्युनिटी मदद)</span>
          </div>

          <div className="space-y-1">
            <span className="block text-[10px] text-slate-500 uppercase">Estimated Residents Benefitted</span>
            <span className="block text-xl font-black text-emerald-400">~{reputation.citizensHelped} neighbors</span>
          </div>
        </div>
      </div>

      {/* AI Journey Legacy Summary */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0c1017] via-[#0d131f] to-[#0c1017] border-2 border-slate-800 text-left space-y-3 shadow-xl relative">
        <div className="absolute top-3 right-3">
          <span className="flex items-center space-x-1 text-[8px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded px-2 py-0.5 font-bold">
            GEMINI INTEGRATED
          </span>
        </div>
        
        <h3 className="text-xs font-bold uppercase text-slate-400 flex items-center">
          <Sparkles className="w-4 h-4 mr-1.5 text-emerald-400" /> Your Civic Journey Legacy Story
        </h3>

        {loadingAI ? (
          <div className="py-4 flex items-center space-x-3 text-xs text-slate-400">
            <div className="w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            <span>Consulting your neighborhood assistant to write your helper journey...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-300 leading-relaxed italic p-4 bg-slate-950/40 rounded-2xl border border-slate-800">
              "{journeySummary}"
            </p>
            <div className="flex justify-end">
              <button
                onClick={fetchJourneySummary}
                className="px-3.5 py-2 text-xs font-black text-emerald-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
              >
                <span>Regenerate My Story</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Weekly Community Missions & Hero Recognition Titles */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-left">
        
        {/* Weekly Community Missions Column */}
        <div className="md:col-span-6 p-5 bg-[#0c1017] border-2 border-slate-800 rounded-3xl space-y-4 shadow-xl">
          <div className="flex justify-between items-center border-b border-slate-850 pb-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-tight flex items-center">
              <Target className="w-4 h-4 mr-1.5 text-teal-400" /> Active Weekly Missions
            </h3>
            <span className="text-[9px] text-slate-400">UPDATES EVERY MON</span>
          </div>

          <div className="space-y-3.5">
            {missions.map((m) => (
              <div key={m.id} className="p-3.5 rounded-2xl border border-slate-800/60 bg-[#111621]/40 space-y-2.5">
                <div className="flex justify-between items-start text-xs font-bold">
                  <div className="space-y-0.5">
                    <span className="block text-slate-200">{m.title}</span>
                    <span className="block text-[10px] text-slate-400 font-light leading-tight">{m.description}</span>
                  </div>
                  <span className="text-[10px] text-teal-400 flex-shrink-0">+{m.points} pts</span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Progress</span>
                    <span>{m.progress} / {m.target}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden p-0.5">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${m.completed ? 'bg-emerald-500' : 'bg-teal-500'}`} 
                      style={{ width: `${Math.min(100, (m.progress / m.target) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Hero Recognition Column */}
        <div className="md:col-span-6 p-5 bg-[#0c1017] border-2 border-slate-800 rounded-3xl space-y-4 shadow-xl">
          <div className="flex justify-between items-center border-b border-slate-850 pb-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-tight flex items-center">
              <Sparkles className="w-4 h-4 mr-1.5 text-emerald-400" /> AI Hero Recognition Awards
            </h3>
            <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/15 font-bold">MONTHLY</span>
          </div>

          <div className="space-y-3.5">
            {recognitions.map((r) => (
              <div key={r.id} className="p-3.5 rounded-2xl border border-slate-850 bg-[#111621]/50 space-y-2 text-left relative overflow-hidden">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-emerald-400 tracking-wider flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>{r.title}</span>
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-light leading-relaxed">
                  {r.personalizedReason}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* History Complaints Log Section */}
      <div className="p-5 rounded-3xl bg-[#0c1017] border-2 border-slate-800 space-y-4 shadow-xl text-left">
        <h3 className="text-sm font-bold text-white uppercase tracking-tight border-b border-slate-850 pb-2 flex items-center">
          <Clock className="w-4 h-4 mr-1.5 text-slate-400" /> Public Report History ({myReports.length})
        </h3>

        {myReports.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-slate-800 rounded-2xl max-w-sm mx-auto" id="profile-history-empty">
            <PlusCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-400">No active complaints logged by this session.</p>
            <button 
              onClick={() => onNavigateTab('report')}
              className="text-xs text-emerald-400 hover:underline mt-1 block font-bold cursor-pointer"
            >
              Log your first smart claim now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1">
            {myReports.map((r) => (
              <div 
                key={r.id} 
                id={`profile-history-item-${r.id}`}
                onClick={() => onSelectReportId(r.id)}
                className="p-3.5 rounded-2xl border border-slate-800 hover:border-emerald-500/40 bg-[#111621]/30 hover:bg-[#111621]/60 cursor-pointer transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase border ${
                      r.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      r.status === 'verified' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      'bg-orange-500/10 text-orange-400 border-orange-500/20'
                    }`}>
                      {r.status}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">ID: {r.id.toUpperCase().slice(0, 8)}</span>
                  </div>
                  <h4 className="text-xs font-black text-slate-100 line-clamp-1">{r.title}</h4>
                  <span className="block text-[10px] text-slate-400 font-mono flex items-center truncate">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-slate-500" /> {r.location.address || 'Lucknow Ward'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[10px] border-t border-slate-800 pt-2.5 gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTrackReport(r);
                    }}
                    className="text-blue-400 font-black flex items-center gap-1 uppercase hover:underline cursor-pointer bg-transparent border-none p-0"
                  >
                    Track Progress
                  </button>
                  <span className="text-emerald-400 font-black flex items-center gap-1">
                    VIEW ON MAP <ExternalLink className="w-3 h-3" />
                  </span>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
