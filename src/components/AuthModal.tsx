import React, { useState } from 'react';
import { Mail, Smartphone, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NotConfiguredNotice } from './NotConfiguredNotice';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const { isConfigured, signInWithEmail, signUpWithEmail, sendPhoneOtp, verifyPhoneOtp } = useAuth();
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
        onSuccess?.();
        onClose();
      } else {
        if (!fullName.trim()) throw new Error('Full name is required.');
        const res = await signUpWithEmail(email, password, fullName, phone);
        if (res.needsEmailConfirmation) {
          setInfo('Account created. Check your inbox to confirm your email before signing in.');
        } else {
          onSuccess?.();
          onClose();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (!otpSent) {
        await sendPhoneOtp(phone);
        setOtpSent(true);
        setInfo('OTP sent to your mobile number. Enter the 6-digit code below.');
      } else {
        await verifyPhoneOtp(phone, otpCode);
        onSuccess?.();
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-[#0B1F3A]/50 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="auth-modal-title" className="font-display text-xl font-bold text-[#0B1F3A]">
              {method === 'phone'
                ? 'Sign in with Mobile OTP'
                : mode === 'signin'
                  ? 'Sign in to SHMX'
                  : 'Create SHMX Account'}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Sync your cart, save shipping addresses, and track ECE orders.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close login modal"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {!isConfigured ? (
          <div className="mt-5">
            <NotConfiguredNotice service="Supabase" />
          </div>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setMethod('email');
                  setError(null);
                  setInfo(null);
                }}
                className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-colors ${
                  method === 'email' ? 'bg-white text-[#0B1F3A] shadow-sm' : 'text-slate-600'
                }`}
              >
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                Email & Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setMethod('phone');
                  setError(null);
                  setInfo(null);
                }}
                className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-colors ${
                  method === 'phone' ? 'bg-white text-[#0B1F3A] shadow-sm' : 'text-slate-600'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
                Mobile OTP
              </button>
            </div>

            {error && (
              <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
                {error}
              </div>
            )}
            {info && (
              <div role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800">
                {info}
              </div>
            )}

            {method === 'email' ? (
              <form onSubmit={handleEmailSubmit} className="mt-4 space-y-3.5">
                {mode === 'signup' && (
                  <>
                    <div>
                      <label htmlFor="auth-fullname" className="block text-xs font-medium text-slate-700">
                        Full Name
                      </label>
                      <input
                        id="auth-fullname"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Aarav Sharma"
                        className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-[#0B1F3A] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30"
                      />
                    </div>
                    <div>
                      <label htmlFor="auth-signup-phone" className="block text-xs font-medium text-slate-700">
                        Mobile Number (optional)
                      </label>
                      <input
                        id="auth-signup-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-[#0B1F3A] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label htmlFor="auth-email" className="block text-xs font-medium text-slate-700">
                    Email Address
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-[#0B1F3A] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30"
                  />
                </div>

                <div>
                  <label htmlFor="auth-password" className="block text-xs font-medium text-slate-700">
                    Password
                  </label>
                  <input
                    id="auth-password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-[#0B1F3A] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-[#0B1F3A] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#16335B] disabled:opacity-60"
                >
                  {loading
                    ? 'Please wait...'
                    : mode === 'signin'
                      ? 'Sign In'
                      : 'Create Account'}
                </button>

                <p className="text-center text-xs text-slate-600">
                  {mode === 'signin' ? (
                    <>
                      New to SHMX?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setMode('signup');
                          setError(null);
                          setInfo(null);
                        }}
                        className="font-semibold text-[#F97316] hover:underline"
                      >
                        Create an account
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setMode('signin');
                          setError(null);
                          setInfo(null);
                        }}
                        className="font-semibold text-[#F97316] hover:underline"
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </p>
              </form>
            ) : (
              <form onSubmit={handlePhoneSubmit} className="mt-4 space-y-3.5">
                <div>
                  <label htmlFor="auth-otp-phone" className="block text-xs font-medium text-slate-700">
                    Mobile Number
                  </label>
                  <input
                    id="auth-otp-phone"
                    type="tel"
                    required
                    disabled={otpSent}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile or +91..."
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm disabled:bg-slate-50 focus:border-[#0B1F3A] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30"
                  />
                </div>

                {otpSent && (
                  <div>
                    <label htmlFor="auth-otp-code" className="block text-xs font-medium text-slate-700">
                      6-Digit SMS OTP
                    </label>
                    <input
                      id="auth-otp-code"
                      type="text"
                      required
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm tracking-widest focus:border-[#0B1F3A] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-[#0B1F3A] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#16335B] disabled:opacity-60"
                >
                  {loading ? 'Processing...' : otpSent ? 'Verify OTP & Sign In' : 'Send OTP'}
                </button>

                {otpSent && (
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpCode('');
                    }}
                    className="w-full text-center text-xs font-medium text-slate-600 hover:underline"
                  >
                    Change mobile number
                  </button>
                )}
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
