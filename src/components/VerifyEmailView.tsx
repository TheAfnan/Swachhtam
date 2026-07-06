import React, { useState } from 'react';
import { Mail, RefreshCw, LogOut, Send, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { auth, checkVerificationStatus, resendVerificationForCurrentUser, sendTestVerificationEmail, simulateLogout } from '../lib/firebase';
import Logo, { BrandWordmark } from './Logo';

interface VerifyEmailViewProps {
  user: { email: string; displayName?: string };
  onVerified: () => void;
}

export default function VerifyEmailView({ user, onVerified }: VerifyEmailViewProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleCheckStatus = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const isVerified = await checkVerificationStatus();
      if (isVerified) {
        setSuccess('Email successfully verified! Redirecting to dashboard...');
        setTimeout(() => {
          onVerified();
        }, 1500);
      } else {
        setError('Email has not been verified yet. Please click the link we sent to ' + user.email);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check verification status.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await resendVerificationForCurrentUser();
      setSuccess('Verification email resent successfully! Please check your inbox (and spam folder) for the activation link.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      console.log("[FirebaseAuth Audit] Triggering manual test email from UI...");
      const resultMessage = await sendTestVerificationEmail();
      setSuccess(resultMessage);
    } catch (err: any) {
      console.error("[FirebaseAuth Audit] UI Manual test email failed:", err);
      setError(err.message || 'Failed to send test verification email.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await simulateLogout();
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-50 dark:bg-[#020408] text-slate-900 dark:text-slate-100 overflow-hidden w-full font-sans">
      {/* Decorative Brand left panel */}
      <div className="hidden lg:flex lg:col-span-5 relative bg-white dark:bg-[#040810] p-12 flex-col justify-between overflow-hidden border-r border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-3 relative z-10">
          <Logo size={48} />
          <BrandWordmark size="md" />
        </div>

        <div className="space-y-4 relative z-10 text-left">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Community Action Portal</span>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-950 dark:text-white leading-tight">
            Verify Your Email
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
            To ensure the security and authenticity of our civic reports, all contributors must verify their email address before accessing the command boards.
          </p>
        </div>

        <div className="text-xs text-slate-500 font-semibold relative z-10 text-left">
          Swachhtam Municipal Platform
        </div>
      </div>

      {/* Main Form Panel */}
      <div className="col-span-1 lg:col-span-7 flex flex-col justify-center items-center p-6 md:p-12 bg-slate-50 dark:bg-[#020408]">
        <div className="w-full max-w-md space-y-6 text-center lg:text-left">
          
          {/* Logo header for mobile screens */}
          <div className="flex lg:hidden items-center justify-center space-x-3 mb-6">
            <Logo size={40} />
            <BrandWordmark size="md" />
          </div>

          <div className="space-y-2">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-center mx-auto lg:mx-0 mb-4 shadow-sm">
              <Mail className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Verify Your Email Address
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              We've sent a verification link to <strong className="text-slate-900 dark:text-white font-semibold">{user.email}</strong>. Please verify your email before logging in. (Check your spam folder if you don't see it!)
            </p>
          </div>

          {success && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-550/30 text-emerald-800 dark:text-emerald-400 text-xs font-medium text-left flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-500/20 text-red-800 dark:text-red-450 text-xs font-medium text-left flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3.5 pt-2">
            <button
              onClick={handleCheckStatus}
              disabled={loading}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Checking status...' : 'I have verified my email'}</span>
            </button>

            <button
              onClick={handleResendEmail}
              disabled={loading}
              className="w-full py-3.5 bg-white hover:bg-slate-50 dark:bg-slate-900/40 dark:hover:bg-slate-900/80 disabled:opacity-50 text-slate-800 dark:text-slate-200 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Resend Verification Email</span>
            </button>

            <button
              onClick={handleSendTestEmail}
              disabled={loading}
              className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/10 dark:hover:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border border-dashed border-emerald-300 dark:border-emerald-800/40 disabled:opacity-50 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Send Test Verification Email (Audit)</span>
            </button>

            <div className="relative flex py-2 items-center text-slate-400">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
              <span className="flex-shrink mx-4 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Or</span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
            </div>

            <button
              onClick={handleSignOut}
              disabled={loading}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-750"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out & Back to Login</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
