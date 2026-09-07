'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Modal, Button, Input } from '@/components/ui';
import {
  Sparkles,
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Send,
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    authModalOptions,
    closeAuthModal,
    signInWithOAuth,
    signInWithPassword,
    signUpWithPassword,
    signInWithOtp,
    hasMasterResume,
  } = useApp();

  const [authTab, setAuthTab] = useState<'sso' | 'password' | 'magic'>('sso');
  const [passwordMode, setPasswordMode] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const returnUrl = authModalOptions?.returnUrl || (typeof window !== 'undefined' ? window.location.pathname : '/resume');
  const modalTitle = authModalOptions?.title || 'Save & Sync Your Work';
  const modalDescription =
    authModalOptions?.description ||
    'Sign in or create an account in seconds. Your master resume, tailored versions, and applications will automatically migrate to your cloud account with PostgreSQL Row-Level Security.';

  const handleOAuth = async (provider: 'google' | 'github') => {
    setErrorMsg(null);
    setOauthLoading(provider);
    try {
      const { error } = await signInWithOAuth(provider, returnUrl);
      if (error) {
        setErrorMsg(error.message || `Failed to sign in with ${provider}.`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || `OAuth sign-in failed.`);
    } finally {
      setOauthLoading(null);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const { error } = await signInWithOtp(email, returnUrl);
      if (error) {
        setErrorMsg(error.message || 'Failed to send magic link.');
      } else {
        setSuccessMsg(`Magic login link sent to ${email}! Check your inbox to sign in.`);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (passwordMode === 'signin') {
        const { error } = await signInWithPassword(email, password);
        if (error) {
          setErrorMsg(error.message || 'Invalid email or password.');
        } else {
          setSuccessMsg('Signed in! Migrating your guest work…');
          setTimeout(() => {
            closeAuthModal();
            if (authModalOptions?.onSuccess) authModalOptions.onSuccess();
          }, 800);
        }
      } else {
        if (!fullName.trim()) {
          setErrorMsg('Please enter your full name.');
          setIsLoading(false);
          return;
        }
        const { error } = await signUpWithPassword(email, password, fullName);
        if (error) {
          setErrorMsg(error.message || 'Failed to create account.');
        } else {
          setSuccessMsg('Account created! Check your email to confirm sign-up, or sign in.');
          setPasswordMode('signin');
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-b from-indigo-50/50 dark:from-indigo-950/20 to-transparent">
          <button
            type="button"
            onClick={closeAuthModal}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-100/80 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold mb-2">
            <Sparkles className="w-3 h-3 text-indigo-500" />
            <span>Frictionless Cloud Sync</span>
          </div>

          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {modalTitle}
          </h2>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            {modalDescription}
          </p>

          {hasMasterResume && (
            <div className="mt-3 flex items-center gap-2 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Active guest resume detected &bull; Will be saved to your account</span>
            </div>
          )}
        </div>

        {/* Tab Selection */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setAuthTab('sso');
                setErrorMsg(null);
              }}
              className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                authTab === 'sso'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              One-Click SSO
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab('magic');
                setErrorMsg(null);
              }}
              className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                authTab === 'magic'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Magic Link
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab('password');
                setErrorMsg(null);
              }}
              className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                authTab === 'password'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Password
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: ONE-CLICK SSO */}
          {authTab === 'sso' && (
            <div className="space-y-3 pt-1">
              <button
                type="button"
                onClick={() => handleOAuth('google')}
                disabled={Boolean(oauthLoading)}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-xs font-bold text-slate-800 dark:text-slate-200 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {oauthLoading === 'google' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                )}
                <span>Continue with Google Single Sign-On</span>
              </button>

              <button
                type="button"
                onClick={() => handleOAuth('github')}
                disabled={Boolean(oauthLoading)}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-xs font-bold text-slate-800 dark:text-slate-200 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {oauthLoading === 'github' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    />
                  </svg>
                )}
                <span>Continue with GitHub</span>
              </button>
            </div>
          )}

          {/* TAB 2: MAGIC LINK */}
          {authTab === 'magic' && (
            <form onSubmit={handleMagicLink} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isLoading || !email.trim()}
                className="w-full py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Magic Link…</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Passwordless Login Link</span>
                  </>
                )}
              </Button>
            </form>
          )}

          {/* TAB 3: PASSWORD */}
          {authTab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setPasswordMode(passwordMode === 'signin' ? 'signup' : 'signin')}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                >
                  {passwordMode === 'signin' ? 'Need an account? Sign up' : 'Already registered? Sign in'}
                </button>
              </div>

              {passwordMode === 'signup' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Full Name
                  </label>
                  <Input
                    type="text"
                    placeholder="Your Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={passwordMode === 'signup'}
                    leftIcon={<User className="w-4 h-4 text-slate-400" />}
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                className="w-full py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing…</span>
                  </>
                ) : (
                  <>
                    <span>{passwordMode === 'signin' ? 'Sign In & Migrate' : 'Create Account & Sync'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Footer security disclaimer */}
          <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Encrypted with PostgreSQL Row-Level Security</span>
          </div>
        </div>
      </div>
    </div>
  );
};
