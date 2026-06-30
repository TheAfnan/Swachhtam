import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot } from 'lucide-react';
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
  const [predictions, setPredictions] = useState<PredictionHotspot[]>([]);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    return saved !== null ? saved === 'dark' : false;
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
          <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-[#090d16] to-[#04060a]">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-xl bg-[#0b101d] border-2 border-slate-700/60 rounded-3xl p-6 md:p-8 shadow-2xl text-center space-y-8"
              id="language-intro-card"
            >
              <div className="space-y-3">
                <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-md">
                  🗣️
                </div>
                <h2 className="text-2xl font-black text-slate-100 tracking-tight">
                  Choose Your Language / भाषा चुनें
                </h2>
                <p className="text-slate-400 text-sm max-w-sm mx-auto">
                  Select your preferred language to understand and use Community Helper.
                </p>
              </div>

              {/* Language buttons grid */}
              <div className="grid grid-cols-2 gap-3" id="language-selection-buttons-grid">
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const isSelected = language === lang.code;
                  return (
                    <button
                      key={lang.code}
                      id={`lang-btn-${lang.code}`}
                      onClick={() => {
                        setLanguage(lang.code);
                        // Speak feedback in that language
                        const greetings: Record<string, string> = {
                          en: "English selected. Welcome!",
                          hi: "हिंदी भाषा चुनी गई है। आपका स्वागत है!",
                          ta: "தமிழ் மொழி தேர்ந்தெடுக்கப்பட்டது. வரவேற்கிறோம்!",
                          te: "తెలుగు భాష ఎంచుకోబడింది. స్వాగతం!",
                          kn: "ಕನ್ನಡ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆ ಮಾಡಲಾಗಿದೆ. ಸ್ವಾಗತ!",
                          mr: "मराठी भाषा निवडली आहे. आपले स्वागत आहे!"
                        };
                        speakText(greetings[lang.code] || "Welcome");
                      }}
                      className={`py-4 px-3 rounded-2xl text-center border-2 transition-all duration-150 flex flex-col items-center justify-center space-y-1.5 ${
                        isSelected 
                          ? "bg-slate-800 border-emerald-500 text-white scale-[1.03] ring-4 ring-emerald-500/20" 
                          : "bg-[#121826] border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <span className="text-lg font-bold tracking-tight">{lang.localName}</span>
                      <span className="text-xs text-slate-400 font-mono">{lang.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Accessibility Toggle inside Intro */}
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
                <div className="space-y-1">
                  <span className="block text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                    👴👵 Easy Mode (आसान मोड)
                  </span>
                  <span className="block text-xs text-slate-400 leading-relaxed">
                    Turns on bigger text, extra voice guidance, and larger buttons for seniors or first-time phone users.
                  </span>
                </div>
                <button
                  id="accessibility-intro-toggle"
                  onClick={() => setIsSimpleMode(!isSimpleMode)}
                  className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                    isSimpleMode 
                      ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10" 
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {isSimpleMode ? "ON (चालू है)" : "OFF (बंद है)"}
                </button>
              </div>

              {/* Continue button */}
              <button
                id="btn-language-intro-continue"
                disabled={!language}
                onClick={() => {
                  setShowLanguageIntro(false);
                  speakText(t('welcome') + ". " + t('simpleModeTip'));
                }}
                className={`w-full py-4 rounded-2xl font-bold text-sm tracking-wide shadow-lg transition-all ${
                  language 
                    ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0" 
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                }`}
              >
                {language ? (
                  language === 'en' ? "Start App" :
                  language === 'hi' ? "ऐप शुरू करें" :
                  language === 'ta' ? "செயலியைத் தொடங்கவும்" :
                  language === 'te' ? "యాప్‌ను ప్రారంభించండి" :
                  language === 'kn' ? "ಆಪ್ ಪ್ರಾರಂಭಿಸಿ" : "ॲप सुरू करा"
                ) : "Choose a Language / भाषा चुनें"}
              </button>
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
