import React, { useState, useRef } from 'react';
import { 
  Lock, 
  Mail, 
  User, 
  Eye, 
  EyeOff, 
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Users,
  Building2,
  FileText,
  Clock,
  Shield,
  AlertCircle,
  Sun,
  Moon,
  Sliders
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { loginWithEmail, registerWithEmail, loginWithGoogle, resendVerificationEmail, resetPassword } from '../lib/firebase';
import Logo, { BrandWordmark } from './Logo';
import { useLanguage } from '../lib/LanguageContext';

interface LoginViewProps {
  onLoginSuccess: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export default function LoginView({ 
  onLoginSuccess,
  darkMode = false,
  onToggleDarkMode
}: LoginViewProps) {
  const authCardRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();
  const [role, setRole] = useState<'citizen' | 'authority' | 'admin'>('citizen');
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please fill in your email address above first, then click "Forgot Password?".');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await resetPassword(email);
      setSuccess('A password reset link has been sent to your email address.');
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await loginWithGoogle();
      onLoginSuccess();
    } catch (err: any) {
      console.warn("Google authentication error:", err);
      if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please enable popups or open the app in a new tab to sign in.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError(`This dynamic preview domain (${window.location.hostname}) is not yet authorized in your Firebase console. To fix this, add ${window.location.hostname} to 'Authorized domains' under Authentication > Settings in your Firebase Console. Alternatively, click the 'Demo Citizen Account' below to sign in instantly with one click!`);
      } else {
        setError(err.message || 'Google Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email || !password) {
      setError('Please enter your email and password to resend the verification email.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await resendVerificationEmail(email, password);
      setSuccess('Verification email resent successfully! Please check your inbox (and spam folder) for the activation link.');
      setShowResend(false);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email.');
    } finally {
      setLoading(false);
    }
  };

  const handleStandardAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setShowResend(false);

    if (!email || !password || (role === 'citizen' && isRegister && !name)) {
      setError('Please fill in all fields.');
      setLoading(false);
      return;
    }

    if (role === 'citizen' && isRegister && password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      if (role === 'citizen' && isRegister) {
        await registerWithEmail(email, password, name, 'citizen');
        onLoginSuccess();
      } else {
        // For citizen flow, check if they used the demo citizen credentials.
        // Auto-register them if they don't exist in Firebase Auth yet.
        if (role === 'citizen' && email === 'citizen@swachhtam.demo' && password === 'Demo@123') {
          try {
            await loginWithEmail(email, password, rememberMe);
            onLoginSuccess();
            return;
          } catch (loginErr: any) {
            if (
              loginErr.code === 'auth/user-not-found' || 
              loginErr.code === 'auth/invalid-credential' ||
              loginErr.message?.includes('user-not-found') ||
              loginErr.message?.includes('invalid-credential')
            ) {
              try {
                await registerWithEmail(email, password, 'Mohd Afnan (Demo)', 'citizen');
                await loginWithEmail(email, password, rememberMe);
                onLoginSuccess();
                return;
              } catch (regErr) {
                console.warn("Auto-creation of citizen demo account failed:", regErr);
              }
            }
            throw loginErr;
          }
        }

        // For authority flow, let's check if they used the demo credentials.
        // If the demo user does not exist in Firebase Auth, let's auto-register them
        // using registerWithEmail, then log them in. This guarantees the demo account
        // works completely seamlessly on Firebase Authentication out of the box!
        if (role === 'authority' && email === 'authority@swachhtam.demo' && password === 'Demo@123') {
          try {
            await loginWithEmail(email, password, rememberMe);
            onLoginSuccess();
            return;
          } catch (loginErr: any) {
            if (
              loginErr.code === 'auth/user-not-found' || 
              loginErr.code === 'auth/invalid-credential' ||
              loginErr.message?.includes('user-not-found') ||
              loginErr.message?.includes('invalid-credential')
            ) {
              try {
                await registerWithEmail(email, password, 'Supervisor Vance (Demo)', 'authority');
                await loginWithEmail(email, password, rememberMe);
                onLoginSuccess();
                return;
              } catch (regErr) {
                console.warn("Auto-creation of authority demo account failed:", regErr);
              }
            }
            throw loginErr;
          }
        }

        // For admin flow, let's check if they used the demo credentials.
        // If the admin user does not exist in Firebase Auth, let's auto-register them
        // using registerWithEmail, then log them in. This guarantees the demo account
        // works completely seamlessly on Firebase Authentication out of the box!
        if (role === 'admin' && email === 'admin@swachhtam.demo' && password === 'Demo@123') {
          try {
            await loginWithEmail(email, password, rememberMe);
            onLoginSuccess();
            return;
          } catch (loginErr: any) {
            if (
              loginErr.code === 'auth/user-not-found' || 
              loginErr.code === 'auth/invalid-credential' ||
              loginErr.message?.includes('user-not-found') ||
              loginErr.message?.includes('invalid-credential')
            ) {
              try {
                await registerWithEmail(email, password, 'Municipal Admin (Demo)', 'admin');
                await loginWithEmail(email, password, rememberMe);
                onLoginSuccess();
                return;
              } catch (regErr) {
                console.warn("Auto-creation of admin demo account failed:", regErr);
              }
            }
            throw loginErr;
          }
        }

        await loginWithEmail(email, password, rememberMe);
        onLoginSuccess();
      }
    } catch (err: any) {
      if (err.code === 'auth/email-not-verified') {
        setError('Please verify your email first.');
        setShowResend(true);
        setLoading(false);
        return;
      }

      console.warn("Firebase Auth failed:", err);
      let errMsg = 'Something went wrong. Please try again.';
      
      if (err.code === 'auth/weak-password') {
        errMsg = 'Password must be at least 6 characters.';
      } else if (err.code === 'auth/email-already-in-use') {
        errMsg = 'This email is already registered.';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = 'Invalid email address.';
      } else if (err.code === 'auth/wrong-password') {
        errMsg = 'Incorrect password.';
      } else if (err.code === 'auth/user-not-found') {
        errMsg = 'Account not found.';
      } else if (err.code === 'auth/invalid-credential') {
        errMsg = 'Incorrect password or account not found.';
      } else if (err.code === 'auth/too-many-requests') {
        errMsg = 'Too many login attempts. Please try again later.';
      } else if (err.message) {
        errMsg = err.message;
      }
      
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: '', color: 'bg-slate-850' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[0-9]/.test(pass)) score += 1;
    
    if (score === 1) return { score: 1, text: 'Weak', color: 'bg-red-500' };
    if (score === 2) return { score: 2, text: 'Medium', color: 'bg-amber-500' };
    if (score === 3) return { score: 3, text: 'Strong', color: 'bg-emerald-500' };
    return { score: 1, text: 'Weak', color: 'bg-red-500' };
  };

  const pStrength = getPasswordStrength(password);

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-slate-50 dark:bg-[#05070a] text-slate-800 dark:text-slate-100 p-4 sm:p-6 md:p-8 lg:px-16 lg:py-8 font-sans overflow-y-auto overflow-x-hidden relative">
      
      {/* Top Right Corner Theme Toggle */}
      {onToggleDarkMode && (
        <button
          type="button"
          onClick={onToggleDarkMode}
          className="absolute top-4 right-4 md:top-6 md:right-8 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/80 shadow-md hover:shadow-lg hover:scale-105 cursor-pointer transition-all duration-200 z-50 flex items-center justify-center gap-2 font-bold text-xs"
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? (
            <>
              <Sun className="w-4 h-4 text-amber-500 animate-pulse" />
              <span className="hidden sm:inline">Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Dark Mode</span>
            </>
          )}
        </button>
      )}
      
      {/* HEADER SECTION */}
      <header className="w-full max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-slate-800/40">
        {/* Left: Brand logo */}
        <div className="flex items-center space-x-3">
          <Logo size={44} />
          <BrandWordmark size="md" />
        </div>

        {/* Right: Role selector */}
        <div className="flex flex-col items-start md:items-end gap-2">
          <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
            {t('roleSelectTitle')}
          </span>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {/* Citizen Hero Card */}
            <button
              type="button"
              id="role-btn-citizen"
              onClick={() => {
                setRole('citizen');
                setIsRegister(true);
                setError('');
                setSuccess('');
                setTimeout(() => {
                  authCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
              }}
              className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl border transition-all duration-200 text-left cursor-pointer ${
                role === 'citizen'
                  ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.15)] text-slate-900 dark:text-white'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-500 dark:text-slate-400'
              }`}
            >
              <div className={`p-1.5 rounded-lg ${
                role === 'citizen' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-800 text-slate-400 dark:text-slate-500'
              }`}>
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`text-xs font-bold ${role === 'citizen' ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>{t('citizenHeroTitle')}</h3>
                <p className="text-[9px] text-slate-500 mt-0.5 leading-none">
                  {t('citizenHeroDesc')}
                </p>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 ml-1 transition-transform ${
                role === 'citizen' ? 'text-emerald-600 dark:text-emerald-400 translate-x-0.5' : 'text-slate-400 dark:text-slate-600'
              }`} />
            </button>

            {/* Municipal Authority Card */}
            <button
              type="button"
              id="role-btn-authority"
              onClick={() => {
                setRole('authority');
                setIsRegister(false);
                setError('');
                setSuccess('');
                setTimeout(() => {
                  authCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
              }}
              className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl border transition-all duration-200 text-left cursor-pointer ${
                role === 'authority'
                  ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.15)] text-slate-900 dark:text-white'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-500 dark:text-slate-400'
              }`}
            >
              <div className={`p-1.5 rounded-lg ${
                role === 'authority' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-800 text-slate-400 dark:text-slate-500'
              }`}>
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`text-xs font-bold ${role === 'authority' ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>{t('municipalAuthorityTitle')}</h3>
                <p className="text-[9px] text-slate-500 mt-0.5 leading-none">
                  {t('municipalAuthorityDesc')}
                </p>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 ml-1 transition-transform ${
                role === 'authority' ? 'text-emerald-600 dark:text-emerald-400 translate-x-0.5' : 'text-slate-400 dark:text-slate-600'
              }`} />
            </button>

            {/* System Admin Card */}
            <button
              type="button"
              id="role-btn-admin"
              onClick={() => {
                setRole('admin');
                setIsRegister(false);
                setError('');
                setSuccess('');
                setTimeout(() => {
                  authCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
              }}
              className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl border transition-all duration-200 text-left cursor-pointer ${
                role === 'admin'
                  ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.15)] text-slate-900 dark:text-white'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-500 dark:text-slate-400'
              }`}
            >
              <div className={`p-1.5 rounded-lg ${
                role === 'admin' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-800 text-slate-400 dark:text-slate-500'
              }`}>
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`text-xs font-bold ${role === 'admin' ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>{t('systemAdminTitle')}</h3>
                <p className="text-[9px] text-slate-500 mt-0.5 leading-none">
                  {t('systemAdminDesc')}
                </p>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 ml-1 transition-transform ${
                role === 'admin' ? 'text-emerald-600 dark:text-emerald-400 translate-x-0.5' : 'text-slate-400 dark:text-slate-600'
              }`} />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN SECTION */}
      <main className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center py-8 lg:py-12 my-auto">
        
        {/* Left Column: Key info and tagline */}
        <div className="lg:col-span-6 space-y-8 text-left">
          <div className="space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-emerald-500" />
              <span>{t('appName')}</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white leading-tight tracking-tight">
              {t('landingHeading')} <span className="text-emerald-600 dark:text-emerald-400">{t('landingHeadingTogether')}</span>
            </h1>
            
            <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base leading-relaxed">
              {t('landingSubheading')}
            </p>

            {/* Three Feature Cards with green circles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-slate-200 dark:border-slate-800/50">
              <div className="flex items-start space-x-3 sm:space-x-0 sm:flex-col sm:space-y-2">
                <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{t('reportFeature')}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">{t('reportFeatureDesc')}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 sm:space-x-0 sm:flex-col sm:space-y-2">
                <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{t('trackFeature')}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">{t('trackFeatureDesc')}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 sm:space-x-0 sm:flex-col sm:space-y-2">
                <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{t('resolveFeature')}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">{t('resolveFeatureDesc')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* City skyline SVG graphic */}
          <div className="pt-4 opacity-50 relative">
            <svg viewBox="0 0 500 130" className="w-full text-emerald-500/15 dark:text-emerald-400/20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M0,120 L40,120 L40,65 L80,65 L80,95 L110,95 L110,40 L140,40 L140,80 L170,80 L170,105 L210,105 L210,30 L260,30 L260,85 L290,85 L290,60 L340,60 L340,95 L370,95 L370,50 L410,50 L410,120 L500,120"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M20,120 L60,120 L60,80 L95,80 L95,105 L130,105 L130,55 L160,55 L160,95 L200,95 L200,115 L230,115 L230,50 L280,50 L280,100 L310,100 L310,75 L360,75 L360,110 L390,110 L390,70 L430,70 L430,120"
                stroke="currentColor"
                strokeWidth="1"
                strokeOpacity="0.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="20" cy="115" r="4" className="fill-[var(--bg-card)] stroke-[var(--border-secondary)]" strokeWidth="1" />
              <line x1="20" y1="115" x2="20" y2="120" stroke="currentColor" strokeWidth="1" />
              <circle cx="95" cy="113" r="6" className="fill-emerald-500/10 stroke-emerald-500/30" strokeWidth="1" />
              <line x1="95" y1="113" x2="95" y2="120" stroke="currentColor" strokeWidth="1" />
              <circle cx="310" cy="115" r="4" className="fill-[var(--bg-card)] stroke-[var(--border-secondary)]" strokeWidth="1" />
              <line x1="310" y1="115" x2="310" y2="120" stroke="currentColor" strokeWidth="1" />
              <line x1="0" y1="120" x2="500" y2="120" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
        </div>

        {/* Right Column: Beautiful auth card */}
        <div className="lg:col-span-6 flex justify-center lg:justify-end w-full" ref={authCardRef}>
          <div className="w-full max-w-[420px] bg-[#090d16]/70 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-slate-800/80 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${role}-${isRegister}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.18 }}
                className="space-y-5"
              >
                {/* Header text inside auth card */}
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-bold tracking-tight text-white font-sans" id="login-title">
                    {role === 'authority' 
                      ? t('welcomeBack') 
                      : (isRegister ? t('createCitizenAccount') : t('welcomeBack'))}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {t('signInDesc')}
                  </p>
                </div>

                {/* Google Sign-In Option for Citizen Hero only */}
                {role === 'citizen' && (
                  <div className="space-y-4">
                    <button
                      type="button"
                      id="google-signin-btn"
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                      className="w-full py-2.5 px-4 text-xs font-semibold text-slate-200 bg-slate-900/20 hover:bg-slate-900/60 active:scale-[0.99] border border-slate-800 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2.5 shadow-xs disabled:opacity-50"
                    >
                      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#EA4335"
                          d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582l3.51-3.51C17.642 1.091 14.974 0 12 0 7.354 0 3.307 2.682 1.353 6.623l3.913 3.142z"
                        />
                        <path
                          fill="#4285F4"
                          d="M16.04 15.345c-1.127.755-2.5 1.205-4.04 1.205-2.827 0-5.223-1.91-6.077-4.482l-3.955 3.064C3.905 19.827 7.732 24 12 24c3.11 0 5.923-1.036 7.95-2.818l-3.91-3.837z"
                        />
                        <path
                          fill="#34A853"
                          d="M5.923 12.068a7.12 7.12 0 0 1 0-2.304l-3.913-3.142C1.036 8.5 0 10.182 0 12s1.036 3.5 2.01 5.378l3.913-3.31z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M23.523 12.273c0-.818-.082-1.609-.227-2.364H12v4.51h6.47c-.28 1.482-1.12 2.74-2.38 3.59l3.91 3.837c2.28-2.1 3.523-5.19 3.523-7.573z"
                        />
                      </svg>
                      <span>{isRegister ? t('googleSignUp') : t('googleSignIn')}</span>
                    </button>

                    <div className="relative flex py-1 items-center text-slate-550">
                      <div className="flex-grow border-t border-slate-800/50" />
                      <span className="flex-shrink mx-3 text-[10px] font-bold uppercase tracking-widest text-slate-550">{t('orUseEmail')}</span>
                      <div className="flex-grow border-t border-slate-800/50" />
                    </div>
                  </div>
                )}

                {/* Main Auth Form */}
                <form onSubmit={handleStandardAuth} className="space-y-4 text-left">
                  
                  {/* Action Success Alert */}
                  {success && (
                    <div id="login-success-alert" className="p-3 text-xs bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 rounded-xl font-medium leading-relaxed flex items-start gap-2 animate-fade-in">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span>{success}</span>
                    </div>
                  )}

                  {/* Action Error / Recovery Alert */}
                  {error && (
                    <div className="space-y-2">
                      <div id="login-error-alert" className="p-3 text-xs bg-red-50 dark:bg-red-950/10 border border-red-200 dark:border-red-900/30 text-red-800 dark:text-red-400 rounded-xl font-medium leading-relaxed flex items-start gap-2 animate-fade-in">
                        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                      {showResend && (
                        <button
                          type="button"
                          onClick={handleResendVerification}
                          className="w-full py-2 px-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-800/40 rounded-xl cursor-pointer hover:bg-emerald-100/40 dark:hover:bg-emerald-950/20 transition-all flex items-center justify-center gap-2"
                        >
                          Resend Verification Email
                        </button>
                      )}
                    </div>
                  )}

                  {/* Full Name Field (Citizen Registration only) */}
                  {role === 'citizen' && isRegister && (
                    <div className="space-y-1.5 animate-fade-in">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-300">{t('fullNameLabel')}</label>
                      <div id="wrapper-input-name" className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                        <input
                          type="text"
                          id="input-name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder={t('fullNamePlaceholder')}
                          required
                          className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#070b13] border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-500 text-slate-100 transition-all duration-200 placeholder-slate-400 dark:placeholder-slate-600 font-sans"
                        />
                      </div>
                    </div>
                  )}

                  {/* Email Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-300">{t('emailLabel')}</label>
                    <div id="wrapper-input-email" className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                      <input
                        type="email"
                        id="input-email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('emailPlaceholder')}
                        required
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#070b13] border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-500 text-slate-100 transition-all duration-200 placeholder-slate-400 dark:placeholder-slate-600 font-sans"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-300">{t('passwordLabel')}</label>
                      {!isRegister && (
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline cursor-pointer"
                        >
                          {t('forgotPasswordLink')}
                        </button>
                      )}
                    </div>
                    <div id="wrapper-input-password" className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                      <input
                        type={showPassword ? "text" : "password"}
                        id="input-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={role === 'citizen' && isRegister ? "Create a strong password" : "••••••••"}
                        required
                        className="w-full pl-10 pr-10 py-2.5 text-sm bg-[#070b13] border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-500 text-slate-100 transition-all duration-200 placeholder-slate-400 dark:placeholder-slate-600 font-sans"
                      />
                      <button
                        type="button"
                        id="btn-toggle-password-visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password (Citizen Registration only) */}
                  {role === 'citizen' && isRegister && (
                    <div className="space-y-1.5 animate-fade-in">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-300">{t('confirmPasswordLabel')}</label>
                      <div id="wrapper-input-confirm-password" className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          id="input-confirm-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder={t('confirmPasswordPlaceholder')}
                          required
                          className="w-full pl-10 pr-10 py-2.5 text-sm bg-[#070b13] border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-500 text-slate-100 transition-all duration-200 placeholder-slate-400 dark:placeholder-slate-600 font-sans"
                        />
                        <button
                          type="button"
                          id="btn-toggle-confirm-password-visibility"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Password Strength Meter (Citizen Registration only) */}
                  {role === 'citizen' && isRegister && password && (
                    <div className="space-y-1 animate-fade-in">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-500">Password strength:</span>
                        <span className={`font-bold ${
                          pStrength.score === 1 ? 'text-red-500' : pStrength.score === 2 ? 'text-amber-500' : 'text-emerald-500'
                        }`}>
                          {pStrength.text}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div className={`h-1.5 rounded-full transition-colors duration-350 ${pStrength.score >= 1 ? pStrength.color : 'bg-slate-800'}`} />
                        <div className={`h-1.5 rounded-full transition-colors duration-350 ${pStrength.score >= 2 ? pStrength.color : 'bg-slate-800'}`} />
                        <div className={`h-1.5 rounded-full transition-colors duration-350 ${pStrength.score >= 3 ? pStrength.color : 'bg-slate-800'}`} />
                      </div>
                    </div>
                  )}

                  {/* Remember Me Checkbox (Sign-in flows only) */}
                  {!isRegister && (
                    <div className="flex items-center space-x-2 py-0.5">
                      <input
                        type="checkbox"
                        id="remember-me"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 bg-[#070b13] cursor-pointer"
                      />
                      <label htmlFor="remember-me" className="text-xs font-bold text-slate-500 cursor-pointer select-none">
                        {t('rememberMeLabel')}
                      </label>
                    </div>
                  )}

                  {/* Auth Submit Button */}
                  <button
                    type="submit"
                    id="btn-auth-submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer font-sans"
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>{isRegister ? t('creatingAccountBtn') : t('signingInBtn')}</span>
                      </div>
                    ) : (
                      <span>{isRegister ? t('createAccountBtn') : t('signInBtn')}</span>
                    )}
                  </button>
                </form>

                {/* Bottom Toggle Area for Citizen hero only */}
                {role === 'citizen' && (
                  <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800/60">
                    <div className="text-center">
                      <p className="text-xs text-slate-400">
                        {isRegister ? (
                          <>
                            {t('alreadyHaveAccount')}{' '}
                            <button
                              type="button"
                              id="btn-toggle-auth-mode"
                              onClick={() => {
                                setIsRegister(false);
                                setError('');
                                setSuccess('');
                              }}
                              className="font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline cursor-pointer transition-colors"
                            >
                              {t('signInLink')}
                            </button>
                          </>
                        ) : (
                          <>
                            {t('dontHaveAccount')}{' '}
                            <button
                              type="button"
                              id="btn-toggle-auth-mode"
                              onClick={() => {
                                setIsRegister(true);
                                setError('');
                                setSuccess('');
                              }}
                              className="font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline cursor-pointer transition-colors"
                            >
                              {t('signUpLink')}
                            </button>
                          </>
                        )}
                      </p>
                    </div>

                    {/* Citizen Demo Credential Card for quick setup/bypass */}
                    {!isRegister && (
                      <div 
                        onClick={() => {
                          setEmail('citizen@swachhtam.demo');
                          setPassword('Demo@123');
                          setError('');
                          setSuccess('Demo Citizen credentials auto-filled! Click Sign In to authenticate.');
                        }}
                        className="p-3.5 rounded-xl bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-2 cursor-pointer hover:border-emerald-500/50 hover:bg-slate-100 dark:hover:bg-slate-900/85 transition-all text-left"
                        title="Click to auto-fill"
                      >
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                          <span>Demo Citizen Account</span>
                          <span className="text-[9px] font-normal text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Click to auto-fill ⚡</span>
                        </h4>
                        <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Email:</span>
                            <span className="font-mono select-all font-semibold">citizen@swachhtam.demo</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Password:</span>
                            <span className="font-mono select-all font-semibold font-bold">Demo@123</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Authority specific messages and credentials */}
                {role === 'authority' && (
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800/60 space-y-4">
                    <p className="text-xs text-slate-400 leading-relaxed text-center font-medium">
                      Only authorized municipal officials can access this portal. Authority accounts are created by the system administrator.
                    </p>
                    
                    <div 
                      onClick={() => {
                        setEmail('authority@swachhtam.demo');
                        setPassword('Demo@123');
                        setError('');
                        setSuccess('Demo Credentials auto-filled! Click Sign In to authenticate.');
                      }}
                      className="p-3.5 rounded-xl bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-2 cursor-pointer hover:border-emerald-500/50 hover:bg-slate-100 dark:hover:bg-slate-900/85 transition-all text-left"
                      title="Click to auto-fill"
                    >
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                        <span>Demo Authority Account</span>
                        <span className="text-[9px] font-normal text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Click to auto-fill ⚡</span>
                      </h4>
                      <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Email:</span>
                          <span className="font-mono select-all font-semibold">authority@swachhtam.demo</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Password:</span>
                          <span className="font-mono select-all font-semibold font-bold">Demo@123</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 italic leading-tight text-center pt-1.5 border-t border-slate-200 dark:border-slate-800/40 font-medium">
                        This account is provided only for hackathon evaluation.
                      </p>
                    </div>
                  </div>
                )}

                {/* System Admin specific messages and credentials */}
                {role === 'admin' && (
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800/60 space-y-4">
                    <p className="text-xs text-slate-400 leading-relaxed text-center font-medium">
                      Administrative credentials allow configuration of system parameters, city profiles, and category configurations.
                    </p>
                    
                    <div 
                      onClick={() => {
                        setEmail('admin@swachhtam.demo');
                        setPassword('Demo@123');
                        setError('');
                        setSuccess('Demo Admin Credentials auto-filled! Click Sign In to authenticate.');
                      }}
                      className="p-3.5 rounded-xl bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-2 cursor-pointer hover:border-emerald-500/50 hover:bg-slate-100 dark:hover:bg-slate-900/85 transition-all text-left"
                      title="Click to auto-fill"
                    >
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                        <span>Demo Admin Account</span>
                        <span className="text-[9px] font-normal text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Click to auto-fill ⚡</span>
                      </h4>
                      <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Email:</span>
                          <span className="font-mono select-all font-semibold">admin@swachhtam.demo</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Password:</span>
                          <span className="font-mono select-all font-semibold font-bold">Demo@123</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 italic leading-tight text-center pt-1.5 border-t border-slate-200 dark:border-slate-800/40 font-medium">
                        This account is provided only for hackathon evaluation.
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

      </main>

      {/* FOOTER SECTION */}
      <footer className="w-full max-w-7xl mx-auto flex items-center justify-center space-x-2 py-6 border-t border-slate-200 dark:border-slate-800/40 mt-auto text-xs text-slate-500">
        <ShieldCheck className="w-4 h-4 text-emerald-500/80" />
        <span>Your data is secure and private. Powered by Firebase.</span>
      </footer>

    </div>
  );
}
