import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  TrendingUp, 
  AlertTriangle, 
  Award, 
  PlusCircle, 
  X, 
  Volume2, 
  Check, 
  User, 
  ArrowRight,
  Bot,
  Map
} from 'lucide-react';
import { CivicReport, DigitalTwinZone } from '../types';
import { useLanguage } from '../lib/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../lib/translations';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  BarChart,
  Bar,
  Cell
} from 'recharts';

interface DashboardViewProps {
  reports: CivicReport[];
  zones: DigitalTwinZone[];
  onNavigate: (tab: string) => void;
  onSelectReportId: (id: string) => void;
  onTrackReport: (report: CivicReport) => void;
}

export default function DashboardView({ reports, zones, onNavigate, onSelectReportId, onTrackReport }: DashboardViewProps) {
  const [activeReportDetail, setActiveReportDetail] = useState<CivicReport | null>(null);
  const [activeAreaId, setActiveAreaId] = useState<string>('zone_mission');
  const { language, isSimpleMode, t, speakText, isSpeaking, translateDynamicText } = useLanguage();

  // Listen to the global theme dynamically to update chart colors accordingly
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.querySelector('.dark') !== null;
    }
    return true;
  });

  React.useEffect(() => {
    setIsDark(document.querySelector('.dark') !== null);

    const observer = new MutationObserver(() => {
      setIsDark(document.querySelector('.dark') !== null);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // Translated descriptions for dynamic details
  const [translatedTitles, setTranslatedTitles] = useState<Record<string, string>>({});
  const [translatedDescs, setTranslatedDescs] = useState<Record<string, string>>({});

  // Dynamic Translate Helper for individual report detail modal
  const handleTranslateDetail = async (report: CivicReport) => {
    if (language === 'en') return;
    try {
      const translatedTitle = await translateDynamicText(report.title);
      const translatedDesc = await translateDynamicText(report.description);
      setTranslatedTitles(prev => ({ ...prev, [report.id]: translatedTitle }));
      setTranslatedDescs(prev => ({ ...prev, [report.id]: translatedDesc }));
    } catch (e) {
      console.error("Gemini detail translation failed", e);
    }
  };

  // Filter out duplicates
  const totalReportsCount = reports.filter(r => !r.isDuplicateMerged).length;
  const resolvedCount = reports.filter(r => r.status === 'resolved' && !r.isDuplicateMerged).length;
  const activeEmergencies = reports.filter(r => r.isEmergency && r.status !== 'resolved' && !r.isDuplicateMerged).length;

  // Selected area
  const currentArea = zones.find(z => z.id === activeAreaId) || zones[0] || {
    id: 'zone_mission',
    name: 'Gomti Nagar Sector',
    healthScore: 82,
    environmentalScore: 85,
    infrastructureScore: 78,
    safetyScore: 84,
    predictions: ["High Pothole Risk near bus stand"]
  };

  // Urgent problems list
  const priorityQueue = [...reports]
    .filter(r => r.status !== 'resolved' && !r.isDuplicateMerged)
    .sort((a,b) => b.priorityScore - a.priorityScore)
    .slice(0, 3);

  // Recharts Chart Category Distribution
  const categoryData = React.useMemo(() => {
    const raw: Record<string, number> = {};
    reports.forEach(r => {
      if (!r.isDuplicateMerged) {
        raw[r.category] = (raw[r.category] || 0) + 1;
      }
    });
    return Object.entries(raw).map(([key, val]) => ({
      key,
      name: t(key),
      count: val
    }));
  }, [reports, language]);

  // Voice Guidance: Reads out the dashboard summary
  const handleReadDashboard = () => {
    const summaryText = `${t('overallCondition')}. ${t('activeIssues')}: ${totalReportsCount - resolvedCount}. ${t('resolvedIssues')}: ${resolvedCount}.`;
    speakText(summaryText);
  };

  return (
    <div className={`space-y-6 text-slate-100 min-h-screen pb-16 ${isSimpleMode ? 'px-2' : ''}`}>
      
      {/* 1. Header Hero Banner */}
      <div className={`p-6 rounded-3xl bg-gradient-to-b from-[#0b1220] to-[#060a12] border-2 ${
        isSimpleMode ? 'border-emerald-500 p-8 space-y-6' : 'border-slate-800/80 space-y-3'
      } relative overflow-hidden shadow-xl text-left`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 ${
              isSimpleMode ? 'text-sm' : 'text-[11px]'
            }`}>
              <CheckCircle2 className="w-4 h-4 animate-pulse" />
              {t('civicIntelligenceDashboard').toUpperCase()}
            </span>
            <h1 className={`font-black text-slate-100 tracking-tight ${
              isSimpleMode ? 'text-3xl' : 'text-2xl'
            }`}>
              {language === 'en' ? (
                <>
                  Welcome to <span className="text-white">Swachh</span><span className="text-[var(--wordmark-tam)]">tam</span>
                </>
              ) : language === 'hi' ? (
                <>
                  <span className="text-white">Swachh</span><span className="text-[var(--wordmark-tam)]">tam</span> में आपका स्वागत है
                </>
              ) : language === 'ta' ? (
                <>
                  <span className="text-white">Swachh</span><span className="text-[var(--wordmark-tam)]">tam</span>-க்கு வரவேற்கிறோம்
                </>
              ) : language === 'te' ? (
                <>
                  <span className="text-white">Swachh</span><span className="text-[var(--wordmark-tam)]">tam</span> యాప్‌కు స్వాಗతం
                </>
              ) : language === 'kn' ? (
                <>
                  <span className="text-white">Swachh</span><span className="text-[var(--wordmark-tam)]">tam</span> ಆಪ್‌ಗೆ ಸ್ವಾಗತ
                </>
              ) : (
                <>
                  <span className="text-white">Swachh</span><span className="text-[var(--wordmark-tam)]">tam</span> मध्ये आपले स्वागत आहे
                </>
              )}
            </h1>
            <p className={`text-slate-400 ${isSimpleMode ? 'text-lg leading-relaxed' : 'text-xs'}`}>
              {language === 'en' 
                ? "This dashboard shows your neighborhood status. Read updates, report new problems, or help confirm reported issues."
                : t('simpleModeTip')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Read Aloud Assistance Button */}
            <button
              id="btn-read-aloud"
              onClick={handleReadDashboard}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black transition-all ${
                isSimpleMode 
                  ? 'bg-amber-500 text-slate-950 text-base shadow-lg ring-4 ring-amber-500/10' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs border border-slate-700'
              }`}
            >
              <Volume2 className="w-5 h-5" />
              <span>{t('readAloud')}</span>
            </button>
          </div>
        </div>

        {/* Big Action Call for Simple Mode */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button
            id="btn-report-issue"
            onClick={() => {
              speakText(t('reportNewIssue'));
              onNavigate('report');
            }}
            className={`flex items-center justify-center gap-2 rounded-2xl font-black shadow-lg transition-all ${
              isSimpleMode 
                ? 'w-full py-5 bg-emerald-500 text-slate-950 text-xl font-extrabold ring-4 ring-emerald-500/20' 
                : 'px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs tracking-wider font-bold'
            }`}
          >
            <span>{t('reportNewIssue')}</span>
            <PlusCircle className="w-5 h-5" />
          </button>

          <button
            id="btn-sahayata-bot"
            onClick={() => onNavigate('chatbot')}
            className={`flex items-center justify-center gap-2 rounded-2xl font-black transition-all ${
              isSimpleMode 
                ? 'w-full py-5 bg-teal-500 text-slate-950 text-xl font-extrabold' 
                : 'px-5 py-3 bg-[#111c30] hover:bg-slate-800 text-slate-300 text-xs border border-slate-700/60 font-bold'
            }`}
          >
            <Bot id="btn-sahayata-bot-svg" className="w-5 h-5 text-current shrink-0 stroke-[2.25]" />
            <span>{t('chatbot')}</span>
          </button>

          <button
            id="btn-area-map-action"
            onClick={() => {
              speakText(t('map'));
              onNavigate('map');
            }}
            className={`flex items-center justify-center gap-2 rounded-2xl font-black transition-all shadow-md hover:shadow-lg hover:scale-[1.02] cursor-pointer ${
              isSimpleMode 
                ? 'w-full py-5 text-xl font-extrabold' 
                : 'px-5 py-3 text-xs font-bold'
            }`}
          >
            <Map className="w-5 h-5 text-current shrink-0 stroke-[2.25]" />
            <span>{t('map')}</span>
          </button>
        </div>
      </div>

      {/* 2. Simplified/Large Metric Cards Grid */}
      <div className={`grid gap-4 ${isSimpleMode ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`} id="dashboard-metric-cards">
        
        {/* Total problems reporting */}
        <div className={`p-6 rounded-2xl bg-[#090f1d] border-2 transition-all flex items-center space-x-4 shadow-md ${
          isSimpleMode ? 'border-slate-700 p-8' : 'border-slate-800/80'
        }`}>
          <div className="p-4 rounded-xl bg-slate-850 text-amber-400 flex-shrink-0">
            <ShieldAlert className="w-6 h-6 text-amber-500" />
          </div>
          <div className="text-left space-y-1 flex-1 min-w-0">
            <span className={`block font-black text-slate-100 font-mono leading-none ${isSimpleMode ? 'text-3xl' : 'text-2xl'}`}>
              {totalReportsCount - resolvedCount}
            </span>
            <span className={`block font-bold text-slate-400 uppercase tracking-wide truncate ${isSimpleMode ? 'text-base' : 'text-[11px]'}`} title={t('activeIssues')}>
              {t('activeIssues')}
            </span>
          </div>
        </div>

        {/* Resolved Count */}
        <div className={`p-6 rounded-2xl bg-[#090f1d] border-2 transition-all flex items-center space-x-4 shadow-md ${
          isSimpleMode ? 'border-slate-700 p-8' : 'border-slate-800/80'
        }`}>
          <div className="p-4 rounded-xl bg-slate-850 text-emerald-400 flex-shrink-0">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
          <div className="text-left space-y-1 flex-1 min-w-0">
            <span className={`block font-black text-slate-100 font-mono leading-none ${isSimpleMode ? 'text-3xl' : 'text-2xl'}`}>
              {resolvedCount}
            </span>
            <span className={`block font-bold text-slate-400 uppercase tracking-wide truncate ${isSimpleMode ? 'text-base' : 'text-[11px]'}`} title={t('resolvedIssues')}>
              {t('resolvedIssues')}
            </span>
          </div>
        </div>

        {/* Urgent Problem Alert Box */}
        <div className={`p-6 rounded-2xl bg-[#090f1d] border-2 transition-all flex items-center space-x-4 shadow-md ${
          isSimpleMode ? 'border-slate-700 p-8' : 'border-red-950/40'
        } ${activeEmergencies > 0 ? 'border-rose-500/40' : ''}`}>
          <div className="p-4 rounded-xl bg-slate-850 text-rose-400 flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-rose-500 animate-pulse" />
          </div>
          <div className="text-left space-y-1 flex-1 min-w-0">
            <span className={`block font-black text-slate-100 font-mono leading-none ${isSimpleMode ? 'text-3xl' : 'text-2xl'}`}>
              {activeEmergencies}
            </span>
            <span className={`block font-bold text-slate-400 uppercase tracking-wide truncate ${isSimpleMode ? 'text-base' : 'text-[11px]'}`} title={t('critical')}>
              {t('critical')}
            </span>
          </div>
        </div>

      </div>

      {/* 3. Primary Dashboard Layout Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard-main-columns">
        
        {/* Left Side: Area Condition (was Infrastructure Health Score) */}
        <div className={`lg:col-span-8 p-6 rounded-2xl bg-[#090f1d] border-2 border-slate-800/80 space-y-5 text-left`}>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800/60 pb-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{t('infrastructureHealthScore')}</span>
              </span>
              <h3 className={`font-black text-slate-100 tracking-tight ${isSimpleMode ? 'text-xl' : 'text-lg'}`}>
                {t('overallCondition')}
              </h3>
            </div>

            {/* Area Toggle list */}
            <div className="flex flex-wrap gap-1.5">
              {zones.slice(0, 3).map((z) => (
                <button
                  key={z.id}
                  onClick={() => {
                    setActiveAreaId(z.id);
                    if (isSimpleMode) speakText(z.name);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs border-2 ${
                    z.id === activeAreaId
                      ? 'bg-slate-800 border-emerald-500 text-emerald-400'
                      : 'bg-slate-950 border-transparent text-slate-400 hover:bg-slate-900'
                  }`}
                >
                  {z.name}
                </button>
              ))}
            </div>
          </div>

          {/* Area condition status cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Condition Score Card */}
            <div className="p-5 rounded-2xl bg-[#0c1527] border border-slate-800 space-y-3">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Score</span>
              <div className="flex items-end justify-between">
                <span className="text-4xl font-black text-emerald-400 tracking-tight">{currentArea.healthScore}%</span>
                <span className="text-xs text-slate-400 font-mono">Good Condition</span>
              </div>
              <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${currentArea.healthScore}%` }}
                />
              </div>
            </div>

            {/* Future Problem Alerts Card (Predictive Analytics) */}
            <div className="p-5 rounded-2xl bg-[#0c1527] border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('predictiveAnalytics')}</span>
              </span>
              <div className="space-y-2">
                {currentArea.predictions && currentArea.predictions.length > 0 ? (
                  currentArea.predictions.map((pred, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 p-2 bg-[#080d16] border border-slate-800 rounded-xl">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-slate-300 leading-normal font-semibold">
                        {pred}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No upcoming alerts detected for this area.</p>
                )}
              </div>
            </div>

          </div>

          {/* Chart Section - Hide in simple mode to reduce sensory load for low-literacy/elderly */}
          {!isSimpleMode && (
            <div className="p-4 bg-slate-950/40 border border-slate-800/80 rounded-2xl">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Problem Category Spread</h4>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData.slice(0, 5)}>
                    <XAxis dataKey="name" stroke={isDark ? "#64748b" : "#475569"} fontSize={10} tickLine={false} />
                    <YAxis stroke={isDark ? "#64748b" : "#475569"} fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', color: isDark ? '#f1f5f9' : '#0f172a', borderRadius: '12px', border: isDark ? '1px solid #1e293b' : '1px solid #cbd5e1' }} />
                    <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]}>
                      {categoryData.slice(0, 5).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#10b981', '#06b6d4', '#f59e0b', '#ec4899', '#8b5cf6'][index % 5]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

        </div>

        {/* Right Side Sidebar: Urgent Problems list (was Priority Queue) */}
        <div className="lg:col-span-4 space-y-6 text-left">
          
          <div className="p-5 rounded-2xl bg-[#090f1d] border-2 border-slate-800/80 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                <span className="text-xs font-black tracking-wider text-slate-300 uppercase">{t('priorityQueue')}</span>
              </div>
              <button 
                onClick={() => onNavigate('feed')}
                className="text-xs font-bold text-emerald-400 hover:underline flex items-center cursor-pointer"
              >
                {t('feed')} <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>

            {priorityQueue.length === 0 ? (
              <div className="text-center py-8 rounded-xl bg-slate-950/60 p-4 border border-slate-800">
                <p className="text-sm font-bold text-emerald-400">All Clean & Safe!</p>
                <p className="text-xs text-slate-500 mt-1">Zero urgent problems reported here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {priorityQueue.map((report) => {
                  return (
                    <div 
                      key={report.id} 
                      onClick={() => {
                        setActiveReportDetail(report);
                        handleTranslateDetail(report);
                      }}
                      className={`p-3.5 rounded-xl border-2 hover:border-emerald-500/50 bg-[#0c1322] hover:bg-[#111c30] cursor-pointer space-y-2 transition-all ${
                        isSimpleMode ? 'border-slate-800 p-5' : 'border-slate-800/80'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          report.severity === 'critical' ? 'bg-red-950 text-rose-400 border border-red-500/20' :
                          report.severity === 'high' ? 'bg-amber-950 text-amber-400' :
                          'bg-slate-900 text-slate-300'
                        }`}>
                          {t(report.severity)}
                        </span>
                        <span className="text-xs font-bold text-slate-400 font-mono">
                          {report.location.areaName || 'Local area'}
                        </span>
                      </div>

                      <div>
                        <h4 className={`font-bold text-slate-100 line-clamp-1 ${
                          isSimpleMode ? 'text-base' : 'text-xs'
                        }`}>
                          {translatedTitles[report.id] || t(report.category) || report.title}
                        </h4>
                        <p className={`text-slate-400 line-clamp-2 leading-relaxed ${
                          isSimpleMode ? 'text-sm' : 'text-[11px]'
                        }`}>
                          {translatedDescs[report.id] || report.description}
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-slate-850 flex justify-between items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onTrackReport(report);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase font-black tracking-wide transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Clock className="w-3 h-3" />
                          <span>Track Progress</span>
                        </button>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {report.verifications?.length || 0} confirm
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* 4. Active Report Detail Modal with Language Switcher */}
      <AnimatePresence>
        {activeReportDetail && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl bg-[#0b111e] border-2 border-slate-700 rounded-3xl overflow-hidden shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto text-left"
            >
              
              {/* Header */}
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-500" /> {t('reportedProblems')}
                </span>
                <button
                  onClick={() => setActiveReportDetail(null)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Picture of problem if present */}
              {activeReportDetail.imageUrl && (
                <div className="w-full h-48 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 relative">
                  <img
                    referrerPolicy="no-referrer"
                    src={activeReportDetail.imageUrl}
                    alt={activeReportDetail.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Information body */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-100">
                    {translatedTitles[activeReportDetail.id] || t(activeReportDetail.category) || activeReportDetail.title}
                  </h3>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900 border border-slate-800 text-slate-300">
                      {t('severityLevel')}: <span className="text-amber-400">{t(activeReportDetail.severity)}</span>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> <span>{activeReportDetail.location.areaName || 'Local Area'}</span>
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest">Detail</span>
                  <p className="text-sm text-slate-200 leading-relaxed font-medium">
                    {translatedDescs[activeReportDetail.id] || activeReportDetail.description}
                  </p>
                </div>

                {/* Translate buttons inside the report */}
                {language !== 'en' && (
                  <button
                    onClick={() => handleTranslateDetail(activeReportDetail)}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black tracking-wide"
                  >
                    Translate Report details to {SUPPORTED_LANGUAGES.find(l => l.code === language)?.localName || "Your Language"}
                  </button>
                )}

                {/* Verification logs */}
                <div className="space-y-2.5">
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>{t('communityVerification')}</span>
                  </span>
                  {activeReportDetail.verifications && activeReportDetail.verifications.length > 0 ? (
                    <div className="space-y-2">
                      {activeReportDetail.verifications.map((v, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800/60 text-xs space-y-1">
                          <span className="font-bold text-slate-300 flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{v.userName}</span>
                          </span>
                          <span className="block text-slate-400">"{v.comments}"</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No confirmations yet. Click map tab to confirm this report!</p>
                  )}
                </div>

                {/* Speak Aloud Details Button */}
                <button
                  onClick={() => {
                    const desc = `${translatedTitles[activeReportDetail.id] || activeReportDetail.title}. ${translatedDescs[activeReportDetail.id] || activeReportDetail.description}.`;
                    speakText(desc);
                  }}
                  className="w-full py-3.5 rounded-2xl bg-slate-800 border-2 border-slate-700 hover:bg-slate-700 text-slate-100 font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Volume2 className="w-5 h-5" />
                  <span>Listen to description</span>
                </button>

                {/* Track Journey Button */}
                <button
                  onClick={() => {
                    onTrackReport(activeReportDetail);
                    setActiveReportDetail(null);
                  }}
                  className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm tracking-wide shadow-lg flex items-center justify-center gap-2 border border-blue-500/30"
                >
                  <Clock className="w-4 h-4 text-white" />
                  <span>Track Complaint Journey</span>
                </button>

                {/* Map convergence */}
                <button
                  onClick={() => {
                    onSelectReportId(activeReportDetail.id);
                    setActiveReportDetail(null);
                  }}
                  className="w-full py-4 rounded-2xl bg-emerald-500 text-slate-950 font-black text-sm tracking-wide shadow-lg flex items-center justify-center gap-2"
                >
                  <MapPin className="w-4 h-4 text-slate-950" />
                  <span>View on Area Map</span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
