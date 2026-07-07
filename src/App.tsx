import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Sun, Moon } from 'lucide-react';
import { 
  fetchReports, 
  getCurrentUser, 
  subscribeToAuth, 
  simulateLogout,
  getDigitalTwins,
  getPredictions
} from './lib/firebase';
import { CivicReport, DigitalTwinZone, PredictionHotspot } from './types';

// Importing Visual Screens
import Navigation from './components/Navigation';
import LoginView from './components/LoginView';
import DashboardView from './components/DashboardView';
import ReportIssueView from './components/ReportIssueView';
import MapView from './components/MapView';
import AnalyticsView from './components/AnalyticsView';
import CommunityFeedView from './components/CommunityFeedView';
import LeaderboardView from './components/LeaderboardView';
import GovDashboardView from './components/GovDashboardView';
import AiAssistantView from './components/AiAssistantView';
import UserProfileView from './components/UserProfileView';
import AdminDashboardView from './components/AdminDashboardView';
import IssueJourneyTracker from './components/IssueJourneyTracker';
import VerifyEmailView from './components/VerifyEmailView';
import Logo, { BrandWordmark } from './components/Logo';
import { useLanguage } from './lib/LanguageContext';
import { SUPPORTED_LANGUAGES } from './lib/translations';

export default function App() {
  const {
    language,
    setLanguage,
    isSimpleMode,
    setIsSimpleMode,
    t,
    speakText,
    stopSpeaking,
    isSpeaking,
    showLanguageIntro,
    setShowLanguageIntro
  } = useLanguage();
  
  // App States
  const [user, setUser] = useState<any>(null);
  const [reports, setReports] = useState<CivicReport[]>([]);
  const [zones, setZones] = useState<DigitalTwinZone[]>([]);
  // pendingLanguage: tracks which card is highlighted — does NOT close intro until Get Started is clicked
  const [pendingLanguage, setPendingLanguage] = useState<string>('');
  const [predictions, setPredictions] = useState<PredictionHotspot[]>([]);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    return saved !== null ? saved === 'dark' : true;
  });

  const handleToggleDarkMode = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    localStorage.setItem('theme', nextMode ? 'dark' : 'light');
  };

  // Selected report ID targeting (Dashboard clicks, Assistant navigation)
  const [selectedReportId, setSelectedReportId] = useState<string | undefined>(undefined);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [trackReport, setTrackReport] = useState<CivicReport | null>(null);

  // Load configuration and attach subscriptions
  useEffect(() => {
    // A. Intercept browser-blocked cross-origin sandboxed network noise to prevent "Script error." telemetry
    const previousOnError = window.onerror;
    window.onerror = function (message, source, lineno, colno, error) {
      const msg = String(message || '');
      if (
        msg.includes('firebase') ||
        msg.includes('firestore') ||
        msg.includes('Could not reach Cloud Firestore') ||
        msg.includes('Script error') ||
        msg.includes('google') ||
        msg.includes('maps') ||
        msg.includes('googleapis') ||
        msg === ''
      ) {
        console.warn("Gracefully suppressed cross-origin sandbox environment script error via onerror:", msg);
        return true; // prevent error bubbling/reporting
      }
      if (previousOnError) {
        return previousOnError(message, source, lineno, colno, error);
      }
      return false;
    };

    const handleGlobalError = (event: ErrorEvent) => {
      const msg = event ? (event.message || '') : '';
      if (
        !msg ||
        msg.includes('firebase') ||
        msg.includes('firestore') ||
        msg.includes('Could not reach Cloud Firestore') ||
        msg.includes('Script error') ||
        msg.includes('google') ||
        msg.includes('maps') ||
        msg.includes('googleapis')
      ) {
        console.warn("Gracefully suppressed cross-origin sandbox environment script error:", msg || "Script error");
        try {
          event.preventDefault();
          event.stopPropagation();
        } catch (_) {}
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event && event.reason ? (event.reason.message || String(event.reason)) : '';
      if (
        reason.includes('firebase') ||
        reason.includes('firestore') ||
        reason.includes('Could not reach Cloud Firestore') ||
        reason.includes('unavailable') ||
        reason.includes('timed out')
      ) {
        console.warn("Gracefully suppressed offline Firebase promise rejection:", reason);
        try {
          event.preventDefault();
          event.stopPropagation();
        } catch (_) {}
      }
    };

    window.addEventListener('error', handleGlobalError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true);

    // 1. Subscribe to Authentication changes (Citizens vs Regulatory Authority shifts)
    const unsubscribeAuth = subscribeToAuth((loggedInUser) => {
          setUser(loggedInUser);
          if (loggedInUser) {
            // Default authority to Government Command board
            if (loggedInUser.role === 'authority') {
              setCurrentTab('government');
            } else {
              setCurrentTab('dashboard');
            }
          }
        });

    // 2. Load lists
    refreshAllData();

    return () => {
      unsubscribeAuth();
      window.onerror = previousOnError;
      window.removeEventListener('error', handleGlobalError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true);
    };
  }, []);

  const refreshAllData = async () => {
    const loadedReports = await fetchReports();
    setReports(loadedReports);
    setZones(getDigitalTwins());
    setPredictions(getPredictions());
    
    setTrackReport((prev) => {
      if (!prev) return null;
      return loadedReports.find((r) => r.id === prev.id) || null;
    });
  };

  const handleLogout = () => {
    simulateLogout();
  };

  const handleSelectReportId = (id: string) => {
    setSelectedReportId(id);
    setCurrentTab('map');
  };

  const handleClearSelectedReportId = () => {
    setSelectedReportId(undefined);
  };

  // Render Screens based on active tabs routing
  const renderCurrentScreen = () => {
    const handleNavigateWithChatCheck = (tab: string) => {
      if (tab === 'chatbot') {
        setIsChatOpen(true);
      } else {
        setCurrentTab(tab);
      }
    };

    switch (currentTab) {
      case 'dashboard':
        return (
          <DashboardView 
            reports={reports} 
            zones={zones} 
            onNavigate={handleNavigateWithChatCheck} 
            onSelectReportId={handleSelectReportId} 
            onTrackReport={setTrackReport}
          />
        );
      case 'report':
        return (
          <ReportIssueView 
            user={user} 
            onReportCreated={() => {
              refreshAllData();
              setCurrentTab('dashboard');
            }} 
          />
        );
      case 'map':
        return (
          <MapView 
            reports={reports} 
            zones={zones} 
            predictions={predictions} 
            user={user} 
            onRefreshData={refreshAllData}
            selectedReportId={selectedReportId}
            onClearSelectedReport={handleClearSelectedReportId}
            onNavigate={setCurrentTab}
          />
        );
      case 'feed':
        return (
          <CommunityFeedView 
            reports={reports} 
            user={user} 
            onRefreshData={refreshAllData} 
            onSelectReportId={handleSelectReportId} 
            onTrackReport={setTrackReport}
          />
        );
      case 'leaderboard':
        return <LeaderboardView userProfile={user} reports={reports} zones={zones} />;
      case 'government':
        return (
          <GovDashboardView 
            reports={reports} 
            user={user}
            onRefreshData={refreshAllData} 
            onSelectReportId={handleSelectReportId} 
          />
        );
      case 'analytics':
        return <AnalyticsView reports={reports} zones={zones} />;
      case 'chatbot':
        return (
          <AiAssistantView 
            reports={reports} 
            onNavigateTab={handleNavigateWithChatCheck} 
            onHighlightReportId={handleSelectReportId} 
          />
        );
      case 'admin':
        return (
          <AdminDashboardView 
            user={user} 
            onRefreshData={refreshAllData} 
            onNavigateTab={handleNavigateWithChatCheck} 
          />
        );
      case 'profile':
        return (
          <UserProfileView 
            user={user} 
            reports={reports} 
            onSelectReportId={handleSelectReportId} 
            onNavigateTab={handleNavigateWithChatCheck} 
            onTrackReport={setTrackReport}
          />
        );
      default:
        return (
          <DashboardView 
            reports={reports} 
            zones={zones} 
            onNavigate={handleNavigateWithChatCheck} 
            onSelectReportId={handleSelectReportId} 
            onTrackReport={setTrackReport}
          />
        );
    }
  };

  return (
    <div className={darkMode ? "dark" : "light"}>
      <div className="min-h-screen bg-[#05070a] font-sans text-slate-100 transition-colors duration-200">
        
        {/* Language Selection Screen when app starts */}
        {showLanguageIntro ? (
          <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-50 dark:bg-[#05070a]">

            {/* Decorative ambient glow blobs */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-emerald-500/4 rounded-full blur-3xl pointer-events-none" />

            {/* Dark / Light mode toggle — top right corner */}
            <div className="absolute top-4 right-4 z-20">
              <button
                id="btn-lang-page-darkmode-toggle"
                onClick={handleToggleDarkMode}
                aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                className="flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 text-slate-600 dark:text-slate-300"
              >
                {darkMode ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="w-full max-w-lg relative z-10"
              id="language-intro-card"
            >
              {/* Hero Header */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.4, ease: "easeOut" }}
                  className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#15202b] dark:bg-[#111a26] shadow-lg mb-6"
                >
                  <Logo size={40} />
                  <BrandWordmark size="md" showTagline={true} />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28 }}
                >
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                    Choose Your Language
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    अपनी भाषा चुनें &nbsp;&bull;&nbsp; மொழியை தேர்வு
                  </p>
                </motion.div>
              </div>

              {/* Language Cards Grid */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="grid grid-cols-3 gap-3 mb-4"
                id="language-selection-buttons-grid"
              >
                {[
                  ...SUPPORTED_LANGUAGES.filter(l => l.code === 'en'),
                  ...SUPPORTED_LANGUAGES.filter(l => l.code !== 'en')
                ].map((lang, idx) => {
                  const isSelected = pendingLanguage === lang.code;
                  return (
                    <motion.button
                      key={lang.code}
                      id={`lang-btn-${lang.code}`}
                      initial={{ opacity: 0, scale: 0.88 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.38 + idx * 0.05, type: 'spring', stiffness: 300, damping: 22 }}
                      whileHover={{ y: -2, scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setPendingLanguage(lang.code);
                        speakText(lang.code === 'en' ? 'English selected. Click Get Started!' : 'Language selected!');
                      }}
                      className={`relative flex flex-col items-center justify-center gap-1.5 py-5 px-2 rounded-xl border-2 transition-all duration-200 cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-md shadow-emerald-500/15'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10'
                      }`}
                    >
                      {isSelected && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-2 right-2 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center"
                        >
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                          </svg>
                        </motion.span>
                      )}
                      <span className={`text-base font-bold leading-tight tracking-tight ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-200'}`}>
                        {lang.localName}
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                        {lang.name}
                      </span>
                    </motion.button>
                  );
                })}
              </motion.div>

              {/* Easy Mode Toggle */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex items-center justify-between gap-4 px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 mb-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl select-none" aria-label="seniors">&#128116;&#128117;</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 leading-tight">Easy Mode</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight">Larger text &amp; voice guidance</p>
                  </div>
                </div>
                <button
                  id="accessibility-intro-toggle"
                  onClick={() => setIsSimpleMode(!isSimpleMode)}
                  className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    isSimpleMode ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                  aria-label="Toggle Easy Mode"
                >
                  <motion.span
                    layout
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm ${isSimpleMode ? 'left-6' : 'left-0.5'}`}
                  />
                </button>
              </motion.div>

              {/* Get Started Button */}
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.68 }}
                id="btn-language-intro-continue"
                disabled={!pendingLanguage}
                whileHover={pendingLanguage ? { y: -1, scale: 1.01 } : {}}
                whileTap={pendingLanguage ? { scale: 0.98 } : {}}
                onClick={() => {
                  if (!pendingLanguage) return;
                  setLanguage(pendingLanguage);
                  speakText('Welcome to Swachhtam. Let us make our city better together.');
                }}
                className={`w-full py-4 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 ${
                  pendingLanguage
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20 cursor-pointer'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                {pendingLanguage ? (
                  <>
                    <span>Get Started</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </>
                ) : (
                  "Select a language above to continue"
                )}
              </motion.button>

            </motion.div>
          </div>

        ) : (
          user ? (
            (user.emailVerified === false && user.role !== 'authority' && !user.email?.endsWith('.gov') && !user.email?.endsWith('.demo')) ? (
              <VerifyEmailView 
                user={user} 
                onVerified={() => {
                  refreshAllData();
                  setUser({ ...user, emailVerified: true });
                }}
              />
            ) : (
              <div className="flex flex-col md:flex-row h-screen overflow-hidden relative">
                
                {/* Sidebar Desktop or Mobile Floating bar */}
                <Navigation 
                  user={user} 
                  currentTab={currentTab} 
                  onChangeTab={setCurrentTab} 
                  onLogout={handleLogout} 
                  darkMode={darkMode}
                  onToggleDarkMode={handleToggleDarkMode}
                />
    
                {/* Scrollable primary content panel */}
                <main className="flex-1 h-full overflow-y-auto bg-slate-50 dark:bg-[#05070a] text-slate-800 dark:text-slate-100">
                  <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
                    
                    {/* Visual Transition wrappers */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentTab}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="min-h-[80vh]"
                      >
                        {renderCurrentScreen()}
                      </motion.div>
                    </AnimatePresence>
    
                  </div>
                </main>
  
                {/* Floating Sahayata Bot Chatbot Support Widget */}
                <AnimatePresence>
                  {isChatOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 80, scale: 0.88 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 80, scale: 0.88 }}
                      transition={{ type: "spring", damping: 25, stiffness: 350 }}
                      className="fixed bottom-20 right-4 md:bottom-24 md:right-8 z-50 w-[92vw] sm:w-[410px] h-[580px] max-h-[75vh] rounded-3xl overflow-hidden border-2 border-slate-800 shadow-2xl bg-[#0c1017] flex flex-col"
                      style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85)' }}
                    >
                      <AiAssistantView 
                        reports={reports}
                        onNavigateTab={(tab) => {
                          setCurrentTab(tab);
                          setIsChatOpen(false);
                        }}
                        onHighlightReportId={handleSelectReportId}
                        onClose={() => setIsChatOpen(false)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
  
                {/* Floating Chat Bubble Button */}
                {!isChatOpen && (
                  <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    whileHover={{ scale: 1.08, y: -2 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setIsChatOpen(true)}
                    className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-50 flex items-center justify-center w-12 h-12 md:w-14 md:h-14 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-full shadow-2xl border-2 border-emerald-400/20 cursor-pointer ring-4 ring-emerald-500/10 hover:ring-emerald-500/20 transition-all group font-black animate-bounce"
                    style={{ animationDuration: '3.5s' }}
                    id="floating-sahayata-bot-bubble"
                  >
                    <Bot className="w-5 h-5 md:w-6.5 md:h-6.5 text-slate-950 stroke-[2.2]" />
                    
                    {/* Subtle pulsing green indicator dot */}
                    <span className="absolute top-0.5 right-0.5 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
                    </span>
  
                    {/* Tooltip Popup */}
                    <span className="absolute -top-11 right-0 bg-[#0c1017] text-slate-100 text-[11px] font-bold py-1.5 px-3 rounded-xl border border-slate-800 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                      {t('chatbot')}
                    </span>
                  </motion.button>
                )}
  
                {/* Immersive Issue Journey Tracker Overlay */}
                <AnimatePresence>
                  {trackReport && (
                    <IssueJourneyTracker 
                      report={trackReport} 
                      onClose={() => setTrackReport(null)} 
                      user={user} 
                      onRefreshData={refreshAllData} 
                    />
                  )}
                </AnimatePresence>
    
              </div>
            )
          ) : (
            
            // State 2: No active user logged in
            <div className="min-h-screen bg-slate-50 dark:bg-[#05070a] text-slate-800 dark:text-slate-100">
              <LoginView 
                onLoginSuccess={() => refreshAllData()} 
                darkMode={darkMode}
                onToggleDarkMode={handleToggleDarkMode}
              />
            </div>
  
          )
        )}

      </div>
    </div>
  );
}
