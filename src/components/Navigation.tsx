import React from 'react';
import { 
  BarChart3, 
  Map, 
  PlusCircle, 
  History, 
  Trophy, 
  MessageSquareCode, 
  ShieldCheck, 
  User, 
  LogOut, 
  Sun, 
  Moon,
  Home,
  Menu,
  X,
  Cpu,
  Globe,
  CheckCircle,
  Volume2,
  Users,
  Sliders
} from 'lucide-react';
import { CurrentUser } from '../lib/firebase';
import { useLanguage } from '../lib/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../lib/translations';
import Logo, { BrandWordmark } from './Logo';

interface NavigationProps {
  user: CurrentUser;
  currentTab: string;
  onChangeTab: (tab: string) => void;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function Navigation({ 
  user, 
  currentTab, 
  onChangeTab, 
  onLogout, 
  darkMode, 
  onToggleDarkMode 
}: NavigationProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [showLangMenu, setShowLangMenu] = React.useState(false);
  const { language, setLanguage, isSimpleMode, setIsSimpleMode, t, speakText, isSpeaking, stopSpeaking } = useLanguage();

  const getTabs = () => {
    const list = [
      { id: 'profile', name: t('profile'), icon: User },
      { id: 'dashboard', name: t('dashboard'), icon: Home },
      { id: 'report', name: t('reportIssue'), icon: PlusCircle },
      { id: 'map', name: t('map'), icon: Map },
      { id: 'feed', name: t('feed'), icon: History },
      { id: 'leaderboard', name: t('leaderboard'), icon: Trophy }
    ];

    if (user.role === 'authority') {
      list.push({ id: 'government', name: t('government'), icon: ShieldCheck });
      list.push({ id: 'analytics', name: t('analytics'), icon: BarChart3 });
    } else if (user.role === 'admin') {
      list.push({ id: 'admin', name: t('admin'), icon: Sliders });
      list.push({ id: 'government', name: t('government'), icon: ShieldCheck });
      list.push({ id: 'analytics', name: t('analytics'), icon: BarChart3 });
    }

    return list;
  };

  const tabs = getTabs();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col bg-white dark:bg-[#06090e] border-r border-slate-200 dark:border-teal-950/45 z-30 transition-all ${
        isSimpleMode ? 'w-72' : 'w-64'
      } h-screen shrink-0`}>
        {/* Sidebar Header */}
        <div className="p-6 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800/80 w-full">
          <Logo size={28} />
          <BrandWordmark size="md" />
        </div>

        {/* User Profile Container */}
        <div className="p-3 border-b border-slate-200 dark:border-teal-950/40 bg-slate-50/50 dark:bg-[#080d15]/40">
          <div className="p-2.5 rounded-xl bg-white dark:bg-[#0a0f18] border border-slate-200 dark:border-slate-800/80 flex items-center space-x-3 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg text-black bg-emerald-400 shrink-0`}>
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <span className={`block font-bold text-slate-800 dark:text-slate-100 truncate ${isSimpleMode ? 'text-sm' : 'text-xs'}`}>
                {user.displayName}
              </span>
              <span className="inline-block py-0.5 px-2 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 text-[10px] rounded-lg mt-0.5">
                {user.role === 'authority' ? t('government') : 'Citizen Hero'}
              </span>
            </div>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`btn-sidebar-tab-${tab.id}`}
                onClick={() => {
                  onChangeTab(tab.id);
                  // Read out section name if simple mode enabled
                  if (isSimpleMode) {
                    speakText(tab.name);
                  }
                }}
                className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl transition-all border ${
                  isActive 
                    ? 'bg-emerald-50 dark:bg-emerald-950/45 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/40 shadow-sm scale-[1.01]' 
                    : 'text-slate-600 dark:text-slate-300 border-transparent hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/60'
                }`}
              >
                <IconComponent className={`w-5 h-5 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                <span className={`font-semibold tracking-wide ${isSimpleMode ? 'text-sm font-black' : 'text-xs'}`}>
                  {tab.name}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Accessibility & Language options */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-[#070c15] space-y-3">
          {/* Light/Dark Mode Switcher */}
          <button
            id="nav-dark-mode-toggle"
            onClick={onToggleDarkMode}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all font-bold shadow-sm cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              {darkMode ? (
                <Sun className="w-4 h-4 text-amber-500 animate-pulse" />
              ) : (
                <Moon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              )}
              <span>{darkMode ? t('lightTheme') : t('darkTheme')}</span>
            </span>
            <span className="font-mono text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-black/20 rounded text-slate-500 dark:text-slate-400">
              {darkMode ? "DARK" : "LIGHT"}
            </span>
          </button>

          {/* Easy Mode Switcher */}
          <button
            id="nav-easy-mode-toggle"
            onClick={() => setIsSimpleMode(!isSimpleMode)}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${
              isSimpleMode 
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md' 
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-900'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>{isSimpleMode ? t('standardMode') : t('accessibilityMode')}</span>
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 bg-black/20 rounded">
              {isSimpleMode ? "ON" : "OFF"}
            </span>
          </button>

          {/* Quick Language Dropdown Selector */}
          <div className="relative">
            <button
              id="nav-language-dropdown"
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:bg-slate-900 transition-all"
            >
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span>{SUPPORTED_LANGUAGES.find(l => l.code === language)?.localName || "English"}</span>
              </span>
              <span className="text-[10px] text-slate-500">▼</span>
            </button>

            {showLangMenu && (
              <div className="absolute bottom-full left-0 w-full mb-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl z-50">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setShowLangMenu(false);
                      speakText(lang.localName);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-slate-800 flex items-center justify-between ${
                      language === lang.code ? 'text-emerald-400 bg-slate-800/40' : 'text-slate-300'
                    }`}
                  >
                    <span>{lang.localName}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{lang.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Footer Log out */}
        <div className="p-4 border-t border-slate-200 dark:border-teal-950/40 bg-slate-50 dark:bg-[#04070c]">
          <button
            id="btn-sidebar-signout"
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all font-mono cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>{t('logout').toUpperCase()}</span>
          </button>
        </div>
      </aside>

      {/* Floating Mobile Header */}
      <header className="md:hidden flex justify-between items-center px-4 py-2 bg-white dark:bg-[#06090e] border-b border-slate-200 dark:border-teal-950/40 sticky top-0 z-40">
        <div className="flex items-center space-x-2.5">
          <Logo size={36} />
          <BrandWordmark size="sm" />
        </div>
        <div className="flex items-center space-x-2">
          {/* Light/Dark Mode Toggle Symbol */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-center font-bold cursor-pointer"
            title={darkMode ? t('lightTheme') : t('darkTheme')}
          >
            {darkMode ? (
              <Sun className="w-4 h-4 text-amber-500 animate-pulse" />
            ) : (
              <Moon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            )}
          </button>

          <button
            id="btn-mobile-menu-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-teal-950/40"
          >
            {mobileOpen ? <X className="w-4.5 h-4.5" /> : <Menu className="w-4.5 h-4.5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 top-[49px] bg-white/95 dark:bg-[#06090ebd]/95 backdrop-blur-md z-40 p-4 transition-all border-b border-slate-200 dark:border-teal-950/40 overflow-y-auto">
          <nav className="space-y-1.5 pb-20">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`btn-mobile-tab-${tab.id}`}
                  onClick={() => {
                    onChangeTab(tab.id);
                    setMobileOpen(false);
                    if (isSimpleMode) speakText(tab.name);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors border ${
                    isActive 
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/40 shadow-sm' 
                      : 'text-slate-600 dark:text-slate-300 border-transparent hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/60'
                  }`}
                >
                  <IconComponent className="w-5 h-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}

            {/* Simple Mode Switcher Mobile */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl mt-4 space-y-3">
              {/* Theme Toggle Mobile */}
              <button
                onClick={onToggleDarkMode}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all cursor-pointer shadow-sm"
              >
                <span className="flex items-center gap-1.5">
                  {darkMode ? (
                    <Sun className="w-4 h-4 text-amber-500 animate-pulse" />
                  ) : (
                    <Moon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  )}
                  <span>{darkMode ? t('lightTheme') : t('darkTheme')}</span>
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-black/20 rounded text-slate-500 dark:text-slate-400">
                  {darkMode ? "DARK" : "LIGHT"}
                </span>
              </button>

              <button
                onClick={() => setIsSimpleMode(!isSimpleMode)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  isSimpleMode 
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm' 
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-900'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span>{t('accessibilityMode')}</span>
                </span>
                <span>{isSimpleMode ? "ON" : "OFF"}</span>
              </button>

              {/* Language Switcher Mobile */}
              <div className="grid grid-cols-3 gap-1">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      speakText(lang.localName);
                    }}
                    className={`py-2 px-1 rounded-lg text-xs font-bold border text-center transition-all cursor-pointer ${
                      language === lang.code 
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400' 
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                    }`}
                  >
                    {lang.localName}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={onLogout}
              className="w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl text-sm text-rose-400 hover:bg-rose-950/20 border border-transparent hover:border-rose-900/30 mt-4 font-bold"
            >
              <LogOut className="w-5 h-5" />
              <span>{t('logout').toUpperCase()}</span>
            </button>
          </nav>
        </div>
      )}
    </>
  );
}
