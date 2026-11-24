import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { normalizeIndianPhone } from '../lib/validators';
import type { Profile } from '../types/database';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  isConfigured: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, fullName: string, phone?: string) => Promise<{ needsEmailConfirmation: boolean }>;
  sendPhoneOtp: (phone: string) => Promise<void>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<void>;
  updateProfile: (fullName: string, phone: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);

  const loadProfile = useCallback(async (userId: string) => {
    if (!supabase) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    setProfile((data as Profile | null) ?? null);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        await loadProfile(data.session.user.id);
      }
      if (mounted) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        await loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const requireSupabase = () => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Authentication is not configured yet. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }
    return supabase;
  };

  const signInWithEmail = async (email: string, password: string) => {
    const client = requireSupabase();
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(error.message);
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string, phone?: string) => {
    const client = requireSupabase();
    const normalizedPhone = phone ? normalizeIndianPhone(phone) : undefined;
    const { data, error } = await client.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone: normalizedPhone,
        },
      },
    });
    if (error) throw new Error(error.message);
    return { needsEmailConfirmation: !data.session };
  };

  const sendPhoneOtp = async (phone: string) => {
    const client = requireSupabase();
    const normalized = normalizeIndianPhone(phone);
    if (normalized.length < 10) {
      throw new Error('Enter a valid 10-digit mobile number or E.164 format.');
    }
    const { error } = await client.auth.signInWithOtp({ phone: normalized });
    if (error) throw new Error(error.message);
  };

  const verifyPhoneOtp = async (phone: string, token: string) => {
    const client = requireSupabase();
    const normalized = normalizeIndianPhone(phone);
    const { error } = await client.auth.verifyOtp({
      phone: normalized,
      token: token.trim(),
      type: 'sms',
    });
    if (error) throw new Error(error.message);
  };

  const updateProfile = async (fullName: string, phone: string) => {
    const client = requireSupabase();
    if (!user) throw new Error('Sign in required.');
    const normalized = phone.trim() ? normalizeIndianPhone(phone) : null;
    const { data, error } = await client
      .from('profiles')
      .update({ full_name: fullName.trim(), phone: normalized })
      .eq('id', user.id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    setProfile(data as Profile);
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        isAdmin: profile?.role === 'admin',
        isConfigured: isSupabaseConfigured,
        signInWithEmail,
        signUpWithEmail,
        sendPhoneOtp,
        verifyPhoneOtp,
        updateProfile,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
