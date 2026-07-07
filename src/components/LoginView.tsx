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
      

      
      {/* HEADER SECTION */}
      <header className="w-full max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200/60 dark:border-slate-800/40">
        {/* Left: Brand logo */}
        <div className="flex items-center space-x-3 shrink-0">
          <Logo size={44} />
          <BrandWordmark size="md" />
        </div>

        {/* Right: Label row + Role cards + Theme toggle */}
        <div className="flex flex-col items-start md:items-end gap-2">
          {/* Top row: Label badge + Theme toggle */}
          <div className="flex items-center gap-3">
            {/* Highlighted role selector label */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider text-[10px]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              {t('roleSelectTitle')}
            </span>
            {/* Inline Theme Toggle — no longer absolute/overlapping */}
            {onToggleDarkMode && (
              <motion.button
                type="button"
                onClick={onToggleDarkMode}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-sm cursor-pointer transition-colors duration-200 font-bold text-[10px]"
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {darkMode ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                    <span className="hidden sm:inline">Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-slate-500" />
                    <span className="hidden sm:inline">Dark Mode</span>
                  </>
                )}
              </motion.button>
            )}
          </div>

          {/* Role cards row */}
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">

            {/* Citizen Hero Card */}
            <motion.button
              type="button"
              id="role-btn-citizen"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
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
                  ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.2)] text-slate-900 dark:text-white'
                  : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className={`p-1.5 rounded-lg transition-colors duration-200 ${
                role === 'citizen'
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
              }`}>
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`text-xs font-bold transition-colors duration-200 ${
                  role === 'citizen' ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'
                }`}>{t('citizenHeroTitle')}</h3>
                <p className="text-[9px] text-slate-500 mt-0.5 leading-none">{t('citizenHeroDesc')}</p>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 ml-1 transition-all duration-200 ${
                role === 'citizen' ? 'text-emerald-500 translate-x-0.5' : 'text-slate-400 dark:text-slate-600'
              }`} />
            </motion.button>

            {/* Municipal Authority Card */}
            <motion.button
              type="button"
              id="role-btn-authority"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
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
                  ? 'bg-blue-500/10 dark:bg-blue-500/20 border-blue-500 shadow-[0_0_14px_rgba(59,130,246,0.2)] text-slate-900 dark:text-white'
                  : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className={`p-1.5 rounded-lg transition-colors duration-200 ${
                role === 'authority'
                  ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
              }`}>
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`text-xs font-bold transition-colors duration-200 ${
                  role === 'authority' ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'
                }`}>{t('municipalAuthorityTitle')}</h3>
                <p className="text-[9px] text-slate-500 mt-0.5 leading-none">{t('municipalAuthorityDesc')}</p>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 ml-1 transition-all duration-200 ${
                role === 'authority' ? 'text-blue-500 translate-x-0.5' : 'text-slate-400 dark:text-slate-600'
              }`} />
            </motion.button>

            {/* System Admin Card */}
            <motion.button
              type="button"
              id="role-btn-admin"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
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
                  ? 'bg-violet-500/10 dark:bg-violet-500/20 border-violet-500 shadow-[0_0_14px_rgba(139,92,246,0.2)] text-slate-900 dark:text-white'
                  : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className={`p-1.5 rounded-lg transition-colors duration-200 ${
                role === 'admin'
                  ? 'bg-violet-500/20 text-violet-600 dark:text-violet-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
              }`}>
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`text-xs font-bold transition-colors duration-200 ${
                  role === 'admin' ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'
                }`}>{t('systemAdminTitle')}</h3>
                <p className="text-[9px] text-slate-500 mt-0.5 leading-none">{t('systemAdminDesc')}</p>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 ml-1 transition-all duration-200 ${
                role === 'admin' ? 'text-violet-500 translate-x-0.5' : 'text-slate-400 dark:text-slate-600'
              }`} />
            </motion.button>

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

            {/* Three Feature Cards — animated with flow arrows */}
            <motion.div
              className="flex flex-col sm:flex-row items-start sm:items-center gap-0 pt-6 border-t border-slate-200 dark:border-slate-800/50"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.15 } } }}
            >
              {/* Report */}
              <motion.div
                variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } } }}
                whileHover={{ y: -4, scale: 1.03 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="flex items-start space-x-3 sm:space-x-0 sm:flex-col sm:space-y-2 p-3 rounded-xl hover:bg-emerald-500/5 dark:hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 transition-all duration-200 cursor-default group flex-1"
              >
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-shadow duration-300"
                >
                  <FileText className="w-4 h-4" />
                </motion.div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-200">{t('reportFeature')}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">{t('reportFeatureDesc')}</p>
                </div>
              </motion.div>

              {/* Arrow 1: Report → Track */}
              <motion.div
                variants={{ hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0, transition: { duration: 0.4, delay: 0.3 } } }}
                className="hidden sm:flex flex-col items-center shrink-0 px-1 self-start pt-4"
              >
                <div className="flex items-center gap-0.5">
                  <motion.div
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="h-px w-8 bg-gradient-to-r from-emerald-400/40 to-blue-400/40"
                  />
                  <motion.div
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.1 }}
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
                  </motion.div>
                </div>
              </motion.div>

              {/* Track */}
              <motion.div
                variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } } }}
                whileHover={{ y: -4, scale: 1.03 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="flex items-start space-x-3 sm:space-x-0 sm:flex-col sm:space-y-2 p-3 rounded-xl hover:bg-blue-500/5 dark:hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 transition-all duration-200 cursor-default group flex-1"
              >
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
                  className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20 flex items-center justify-center shrink-0 group-hover:shadow-[0_0_12px_rgba(59,130,246,0.3)] transition-shadow duration-300"
                >
                  <Clock className="w-4 h-4" />
                </motion.div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">{t('trackFeature')}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">{t('trackFeatureDesc')}</p>
                </div>
              </motion.div>

              {/* Arrow 2: Track → Resolve */}
              <motion.div
                variants={{ hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0, transition: { duration: 0.4, delay: 0.6 } } }}
                className="hidden sm:flex flex-col items-center shrink-0 px-1 self-start pt-4"
              >
                <div className="flex items-center gap-0.5">
                  <motion.div
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                    className="h-px w-8 bg-gradient-to-r from-blue-400/40 to-violet-400/40"
                  />
                  <motion.div
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
                  </motion.div>
                </div>
              </motion.div>

              {/* Resolve */}
              <motion.div
                variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } } }}
                whileHover={{ y: -4, scale: 1.03 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="flex items-start space-x-3 sm:space-x-0 sm:flex-col sm:space-y-2 p-3 rounded-xl hover:bg-violet-500/5 dark:hover:bg-violet-500/10 border border-transparent hover:border-violet-500/20 transition-all duration-200 cursor-default group flex-1"
              >
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 1.6 }}
                  className="w-9 h-9 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-500/20 flex items-center justify-center shrink-0 group-hover:shadow-[0_0_12px_rgba(139,92,246,0.3)] transition-shadow duration-300"
                >
                  <Shield className="w-4 h-4" />
                </motion.div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors duration-200">{t('resolveFeature')}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">{t('resolveFeatureDesc')}</p>
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* 3D Isometric City — animated & highly structured */}
          <div className="pt-6 relative overflow-hidden w-full select-none">
            <div style={{ perspective: '1000px' }}>
              <motion.div
                animate={{ rotateY: [-4, 4, -4], y: [0, -6, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transformStyle: 'preserve-3d', transformOrigin: 'center center' }}
                className="w-full flex justify-center items-center"
              >
                {(() => {
                  const S = 15, SH = 7.5, SV = 16, cx = 280, cy = 135;
                  const iso = (x: number, z: number, h: number = 0) => ({
                    x: (x - z) * S + cx,
                    y: (x + z - 6) * SH + cy - h * SV,
                  });
                  const pts = (...coords: {x:number;y:number}[]) => coords.map(p=>`${Math.round(p.x)},${Math.round(p.y)}`).join(' ');

                  // Colors: High visibility in both Light and Dark mode
                  // Light Mode: Vibrant emeralds, teal, and slate with high contrast borders
                  // Dark Mode: Dark metallic blue-slate with neon emerald glows
                  const bL  = darkMode ? '#1e293b' : '#10b981'; // Left Face
                  const bR  = darkMode ? '#0f172a' : '#047857'; // Right Face
                  const bT  = darkMode ? '#334155' : '#a7f3d0'; // Top Face
                  const eg  = darkMode ? 'rgba(16,185,129,0.35)' : 'rgba(6,95,70,0.8)'; // Edges
                  const egB = darkMode ? 'rgba(16,185,129,0.8)'  : 'rgba(6,95,70,1)';   // Strong highlights
                  const winC    = darkMode ? '#34d399' : '#047857'; // Window lights
                  const treeC   = darkMode ? '#059669' : '#065f46'; // Trees
                  const groundC = darkMode ? 'rgba(15,23,42,0.9)' : '#e2e8f0'; // Ground base plate
                  const roadC   = darkMode ? 'rgba(2,6,23,0.95)' : '#475569';  // Roads
                  const roadMark = darkMode ? '#10b981' : '#f8fafc'; // Road lane marks
                  const solarC  = darkMode ? '#0284c7' : '#0369a1'; // Solar panel color
                  const fadeBg  = darkMode ? '#05070a' : '#f8fafc';

                  // High-fidelity structured building list [gx, gz, gw, gd, gh, type]
                  // sorted back-to-front (gx + gz)
                  const bldgs: [number, number, number, number, number, string][] = [
                    // Back Row (Skyline)
                    [-5,   3,   1.2, 1.2, 2.5, 'standard'],
                    [-3.5, 3.5, 1.5, 1.5, 4,   'standard'],
                    [-1.5, 3.2, 1.2, 1.2, 3,   'standard'],
                    [0.5,  3.5, 1.8, 1.8, 5,   'solar'],     // Eco tower with solar roof
                    [2.8,  3.5, 2,   2,   7,   'main'],      // Smart Swachhtam Centerpiece
                    [5.5,  3.5, 1.5, 1.5, 4.5, 'turbine'],   // Wind turbine tower
                    [7.5,  3,   1.2, 1.2, 3,   'standard'],
                    [9,    3,   1,   1,   2,   'standard'],

                    // Mid Row (Residential / Offices)
                    [-4.5, 1.5, 1.2, 1.2, 2,   'standard'],
                    [-2.5, 1.8, 1.5, 1.5, 3.2, 'solar'],
                    [-0.5, 1.5, 1.2, 1.2, 2.8, 'standard'],
                    [1.5,  1.8, 1.4, 1.4, 3.5, 'standard'],
                    [5,    1.5, 1.6, 1.6, 3,   'solar'],
                    [7,    1.8, 1.2, 1.2, 2.5, 'standard'],

                    // Front Row (Low-rise / Parks / Eco Hubs)
                    [-3,   0.5, 1,   1,   1.5, 'standard'],
                    [0,    0.5, 1.2, 1.2, 1.8, 'solar'],
                    [3.5,  0.5, 1.2, 1.2, 1.5, 'standard'],
                    [6,    0.5, 1,   1,   1.2, 'standard']
                  ];

                  // Ground coordinates for the main block base plate
                  const gnd = pts(iso(-6.5, 5), iso(11.5, 5), iso(11.5, -0.5), iso(-6.5, -0.5));

                  // Main streets (Grid lines & Asphalt)
                  const road1 = pts(iso(-6.5, 1.2), iso(11.5, 1.2), iso(11.5, 0.4), iso(-6.5, 0.4)); // Mid street
                  const road2 = pts(iso(-6.5, 3.0), iso(11.5, 3.0), iso(11.5, 2.3), iso(-6.5, 2.3)); // Back street
                  const roadCross = pts(iso(2.2, 5), iso(2.7, 5), iso(2.7, -0.5), iso(2.2, -0.5));   // Vertical cross road

                  // Trees at specific coordinates
                  const trees = [
                    [-5.5, 0.8], [-1.5, 0.8], [2, 0.8], [5, 0.8], [8.5, 0.8], // Front line
                    [-3.5, 2.0], [4, 2.0], [6.5, 2.0],                        // Mid line
                    [-6, 4], [9.5, 4]                                         // Back line
                  ];

                  return (
                    <svg viewBox="0 0 560 190" className="w-full max-w-[560px]" fill="none" overflow="visible" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <radialGradient id="isoGlw" cx="50%" cy="75%" r="50%">
                          <stop offset="0%" stopColor={darkMode ? 'rgba(16,185,129,0.22)' : 'rgba(16,185,129,0.15)'} />
                          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                        </radialGradient>
                        <linearGradient id="iFL" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor={fadeBg} />
                          <stop offset="100%" stopColor={fadeBg+'00'} />
                        </linearGradient>
                        <linearGradient id="iFR" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor={fadeBg+'00'} />
                          <stop offset="100%" stopColor={fadeBg} />
                        </linearGradient>
                      </defs>

                      {/* Ground block */}
                      <polygon points={gnd} fill={groundC} stroke={eg} strokeWidth="0.5" />

                      {/* Green Park Grass patches */}
                      <polygon points={pts(iso(-6, 2.2), iso(-3.5, 2.2), iso(-3.5, 1.6), iso(-6, 1.6))} fill={darkMode ? '#064e3b' : '#d1fae5'} />
                      <polygon points={pts(iso(4, 2.2), iso(6.5, 2.2), iso(6.5, 1.6), iso(4, 1.6))} fill={darkMode ? '#064e3b' : '#d1fae5'} />

                      {/* Roads networks */}
                      <polygon points={road1} fill={roadC} />
                      <polygon points={road2} fill={roadC} />
                      <polygon points={roadCross} fill={roadC} />

                      {/* Road Lane Markings */}
                      {[-5, -3, -1, 1, 4, 6, 8, 10].map((gx, i) => {
                        const a1 = iso(gx, 0.8), b1 = iso(gx + 0.8, 0.8);
                        const a2 = iso(gx, 2.65), b2 = iso(gx + 0.8, 2.65);
                        return (
                          <g key={i}>
                            <line x1={a1.x} y1={a1.y} x2={b1.x} y2={b1.y} stroke={roadMark} strokeWidth="0.8" strokeDasharray="3,3" opacity="0.6" />
                            <line x1={a2.x} y1={a2.y} x2={b2.x} y2={b2.y} stroke={roadMark} strokeWidth="0.8" strokeDasharray="3,3" opacity="0.6" />
                          </g>
                        );
                      })}

                      {/* Animated Moving Cars (Isometric blocks sliding on roads) */}
                      {/* Car 1: Left to Right on Front Road */}
                      <g>
                        <path d="M-100,-100" fill="none">
                          <animateMotion
                            path={`M ${iso(-6.5, 0.8).x} ${iso(-6.5, 0.8).y} L ${iso(11.5, 0.8).x} ${iso(11.5, 0.8).y}`}
                            dur="8s"
                            repeatCount="indefinite"
                          />
                        </path>
                        {/* Red Electric Car */}
                        <polygon points="-4,-2 4,-6 8,-4 0,0" fill="#ef4444" />
                        <polygon points="-4,-4 -4,-2 0,0 0,-2" fill="#b91c1c" />
                        <polygon points="0,0 8,-4 8,-6 0,-2" fill="#dc2626" />
                      </g>

                      {/* Car 2: Right to Left on Mid Road */}
                      <g>
                        <path d="M-100,-100" fill="none">
                          <animateMotion
                            path={`M ${iso(11.5, 2.65).x} ${iso(11.5, 2.65).y} L ${iso(-6.5, 2.65).x} ${iso(-6.5, 2.65).y}`}
                            dur="10s"
                            repeatCount="indefinite"
                          />
                        </path>
                        {/* Blue Electric Car */}
                        <polygon points="-4,-2 4,-6 8,-4 0,0" fill="#3b82f6" />
                        <polygon points="-4,-4 -4,-2 0,0 0,-2" fill="#1d4ed8" />
                        <polygon points="0,0 8,-4 8,-6 0,-2" fill="#2563eb" />
                      </g>

                      {/* Ground glow under buildings */}
                      <ellipse cx="280" cy="172" rx="230" ry="12" fill="url(#isoGlw)" />

                      {/* Rendering Buildings */}
                      {bldgs.map(([gx, gz, gw, gd, gh, type], i) => {
                        const b1 = iso(gx, gz + gd);
                        const b2 = iso(gx + gw, gz + gd);
                        const b3 = iso(gx + gw, gz);
                        const t1 = iso(gx, gz + gd, gh);
                        const t2 = iso(gx + gw, gz + gd, gh);
                        const t3 = iso(gx + gw, gz, gh);
                        const t4 = iso(gx, gz, gh);

                        const lf = pts(b1, t1, t2, b2);
                        const rf = pts(b2, t2, t3, b3);
                        const tf = pts(t1, t2, t3, t4);

                        const isMain = type === 'main';
                        const isTurbine = type === 'turbine';
                        const isSolar = type === 'solar';

                        const strokeW = isMain ? '1.0' : '0.6';

                        return (
                          <g key={i}>
                            {/* Left Face */}
                            <polygon points={lf} fill={bL} stroke={eg} strokeWidth={strokeW} />
                            {/* Right Face */}
                            <polygon points={rf} fill={bR} stroke={eg} strokeWidth={strokeW} />
                            {/* Top Face */}
                            <polygon points={tf} fill={bT} stroke={eg} strokeWidth={strokeW} />

                            {/* Windows / Lighting details */}
                            {gh >= 2.5 && !isTurbine && (
                              <g opacity="0.85">
                                {/* Windows on Left Face */}
                                {Array.from({ length: Math.floor(gh) }).map((_, wIdx) => {
                                  const wY = b1.y - (wIdx + 0.5) * SV - 3;
                                  const wX1 = b1.x + (gw * S * 0.3);
                                  const wX2 = b1.x + (gw * S * 0.7);
                                  return (
                                    <g key={wIdx}>
                                      <circle cx={wX1} cy={wY} r="1.5" fill={winC} />
                                      <circle cx={wX2} cy={wY} r="1.5" fill={winC} />
                                    </g>
                                  );
                                })}
                              </g>
                            )}

                            {/* Solar Panels on Top of Solar Buildings */}
                            {isSolar && (
                              <g>
                                {/* Mini Solar Panel Placed on Top Roof */}
                                <polygon
                                  points={pts(
                                    { x: t1.x + 3, y: t1.y + 2 },
                                    { x: t2.x - 3, y: t2.y + 2 },
                                    { x: t3.x - 3, y: t3.y - 2 },
                                    { x: t4.x + 3, y: t4.y - 2 }
                                  )}
                                  fill={solarC}
                                  stroke={egB}
                                  strokeWidth="0.5"
                                />
                                <line x1={t1.x + 4} y1={t1.y + 2} x2={t3.x - 4} y2={t3.y - 2} stroke={egB} strokeWidth="0.4" />
                                <line x1={t2.x - 4} y1={t2.y + 2} x2={t4.x + 4} y2={t4.y - 2} stroke={egB} strokeWidth="0.4" />
                              </g>
                            )}

                            {/* Main Centerpiece details (HQ green dome/antenna) */}
                            {isMain && (
                              <g>
                                {/* Dome on top roof */}
                                <path
                                  d={`M ${t1.x + 4} ${t1.y} A 10 10 0 0 1 ${t3.x - 4} ${t3.y} Z`}
                                  fill={darkMode ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.3)'}
                                  stroke={egB}
                                  strokeWidth="0.8"
                                />
                                {/* Main Antenna spire */}
                                <line x1={t2.x} y1={t2.y - 4} x2={t2.x} y2={t2.y - 22} stroke={egB} strokeWidth="1.2" />
                                <circle cx={t2.x} cy={t2.y - 22} r="2.5" fill={egB} />
                                <circle cx={t2.x} cy={t2.y - 22} r="5" fill={egB} opacity="0.4">
                                  <animate attributeName="r" values="2.5;7;2.5" dur="2s" repeatCount="indefinite" />
                                </circle>
                              </g>
                            )}

                            {/* Wind Turbine on Turbine Tower */}
                            {isTurbine && (
                              <g>
                                {/* Turbine shaft */}
                                <line x1={t2.x} y1={t2.y} x2={t2.x} y2={t2.y - 18} stroke={egB} strokeWidth="1.5" />
                                {/* Rotating Blades */}
                                <g transform={`translate(${t2.x}, ${t2.y - 18})`}>
                                  <g>
                                    <animateTransform
                                      attributeName="transform"
                                      type="rotate"
                                      from="0"
                                      to="360"
                                      dur="4s"
                                      repeatCount="indefinite"
                                    />
                                    <line x1="0" y1="0" x2="0" y2="-12" stroke={egB} strokeWidth="1" />
                                    <line x1="0" y1="0" x2="10" y2="6" stroke={egB} strokeWidth="1" />
                                    <line x1="0" y1="0" x2="-10" y2="6" stroke={egB} strokeWidth="1" />
                                  </g>
                                </g>
                              </g>
                            )}
                          </g>
                        );
                      })}

                      {/* Trees Placement */}
                      {trees.map(([gx, gz], i) => {
                        const p = iso(gx, gz);
                        return (
                          <g key={i}>
                            {/* Trunk */}
                            <line x1={p.x} y1={p.y} x2={p.x} y2={p.y - 8} stroke="#78350f" strokeWidth="1.2" />
                            {/* Leafy Green Cone */}
                            <polygon points={`${p.x},${p.y - 20} ${p.x - 5},${p.y - 10} ${p.x + 5},${p.y - 10}`} fill={treeC} />
                            <polygon points={`${p.x},${p.y - 15} ${p.x - 6},${p.y - 7} ${p.x + 6},${p.y - 7}`} fill={treeC} opacity="0.9" />
                          </g>
                        );
                      })}

                      {/* Ambient streetlights */}
                      {[[0.5, 0.4], [5.5, 0.4], [9.5, 0.4]].map(([gx, gz], i) => {
                        const p = iso(gx, gz);
                        return (
                          <g key={i}>
                            <line x1={p.x} y1={p.y} x2={p.x} y2={p.y - 10} stroke={eg} strokeWidth="1" />
                            <circle cx={p.x} cy={p.y - 10} r="2" fill={winC} />
                            {/* Light beam projection */}
                            <polygon points={`${p.x},${p.y - 10} ${p.x - 4},${p.y} ${p.x + 4},${p.y}`} fill={darkMode ? 'rgba(52,211,153,0.15)' : 'rgba(16,185,129,0.2)'} />
                          </g>
                        );
                      })}

                      {/* Boundary dashed line */}
                      <line x1="30" y1="172" x2="530" y2="172" stroke={eg} strokeWidth="1.2" strokeDasharray="4,6" />

                      {/* Smooth edge gradient blends */}
                      <rect x="0" y="0" width="55" height="190" fill="url(#iFL)" />
                      <rect x="505" y="0" width="55" height="190" fill="url(#iFR)" />
                    </svg>
                  );
                })()}
              </motion.div>
            </div>
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
