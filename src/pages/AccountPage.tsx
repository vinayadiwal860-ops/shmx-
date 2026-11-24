import React, { useCallback, useEffect, useState } from 'react';
import { MapPin, Trash2, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { isValidPostalCode } from '../lib/validators';
import { createAddress, deleteAddress, fetchUserAddresses } from '../services/orderService';
import type { Address } from '../types/database';
import { NotConfiguredNotice } from '../components/NotConfiguredNotice';

interface AccountPageProps {
  onOpenAuth: () => void;
}

export function AccountPage({ onOpenAuth }: AccountPageProps) {
  const { user, profile, updateProfile, signOut } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [addrName, setAddrName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadAddresses = useCallback(async () => {
    if (!user || !isSupabaseConfigured) return;
    const list = await fetchUserAddresses(user.id);
    setAddresses(list);
  }, [user]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setAddrName(profile.full_name || '');
      setAddrPhone(profile.phone || '');
    }
    loadAddresses();
  }, [profile, loadAddresses]);

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="mb-6 font-display text-2xl font-bold text-[#0B1F3A]">Account</h1>
        <NotConfiguredNotice service="Supabase" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <User className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
        <h1 className="mt-4 font-display text-2xl font-bold text-[#0B1F3A]">Account & Addresses</h1>
        <p className="mt-2 text-sm text-slate-600">Sign in to manage your profile and shipping addresses.</p>
        <button
          type="button"
          onClick={onOpenAuth}
          className="mt-6 rounded-lg bg-[#F97316] px-6 py-2.5 text-sm font-semibold text-white"
        >
          Login / Sign Up
        </button>
      </div>
    );
  }

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setProfileSaved(false);
    setBusy(true);
    try {
      await updateProfile(fullName, phone);
      setProfileSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update profile.');
    } finally {
      setBusy(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValidPostalCode(postalCode)) {
      setError('Enter a valid 6-digit PIN code.');
      return;
    }
    setBusy(true);
    try {
      await createAddress(user.id, {
        full_name: addrName.trim(),
        phone: addrPhone.trim(),
        line1: line1.trim(),
        line2: line2.trim(),
        city: city.trim(),
        state: state.trim(),
        postal_code: postalCode.trim(),
        is_default: addresses.length === 0,
      });
      setLine1('');
      setLine2('');
      setCity('');
      setState('');
      setPostalCode('');
      await loadAddresses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add address.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#0B1F3A] sm:text-3xl">
            Account & Addresses
          </h1>
          <p className="mt-1 text-sm text-slate-600">{user.email || user.phone}</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-[#0B1F3A] hover:bg-slate-50"
        >
          Sign Out
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-display text-lg font-bold text-[#0B1F3A]">Profile Details</h2>
          <form onSubmit={handleProfileSave} className="mt-4 space-y-4">
            <div>
              <label htmlFor="prof-name" className="block text-xs font-medium text-slate-700">
                Full Name
              </label>
              <input
                id="prof-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="prof-phone" className="block text-xs font-medium text-slate-700">
                Mobile Number
              </label>
              <input
                id="prof-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
            </div>
            {profileSaved && (
              <p className="text-xs font-medium text-emerald-700">Profile updated successfully.</p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-[#0B1F3A] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#16335B]"
            >
              Save Profile
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
          <h2 className="font-display text-lg font-bold text-[#0B1F3A] flex items-center gap-2">
            <MapPin className="h-5 w-5 text-[#F97316]" aria-hidden="true" />
            Saved Addresses
          </h2>

          {addresses.length === 0 ? (
            <p className="text-sm text-slate-500">No saved addresses yet.</p>
          ) : (
            <div className="space-y-3">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-4 text-sm"
                >
                  <div>
                    <div className="font-semibold text-[#0B1F3A]">{addr.full_name}</div>
                    <div className="text-xs text-slate-600">
                      {addr.line1}
                      {addr.line2 ? `, ${addr.line2}` : ''}
                    </div>
                    <div className="text-xs text-slate-600">
                      {addr.city}, {addr.state} — {addr.postal_code}
                    </div>
                    <div className="mt-1 font-mono text-xs text-slate-500">{addr.phone}</div>
                  </div>
                  <button
                    type="button"
                    aria-label="Delete address"
                    onClick={async () => {
                      await deleteAddress(user.id, addr.id);
                      await loadAddresses();
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleAddAddress} className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
            <input
              type="text"
              required
              placeholder="Recipient Name"
              value={addrName}
              onChange={(e) => setAddrName(e.target.value)}
              className="h-9 rounded-lg border border-slate-300 px-3 text-xs"
            />
            <input
              type="tel"
              required
              placeholder="Phone"
              value={addrPhone}
              onChange={(e) => setAddrPhone(e.target.value)}
              className="h-9 rounded-lg border border-slate-300 px-3 text-xs"
            />
            <input
              type="text"
              required
              placeholder="Address Line 1"
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
              className="h-9 rounded-lg border border-slate-300 px-3 text-xs sm:col-span-2"
            />
            <input
              type="text"
              required
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-9 rounded-lg border border-slate-300 px-3 text-xs"
            />
            <input
              type="text"
              required
              placeholder="State"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="h-9 rounded-lg border border-slate-300 px-3 text-xs"
            />
            <input
              type="text"
              required
              maxLength={6}
              placeholder="PIN Code"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className="h-9 rounded-lg border border-slate-300 px-3 font-mono text-xs"
            />
            <button
              type="submit"
              disabled={busy}
              className="h-9 rounded-lg bg-[#F97316] text-xs font-semibold text-white hover:bg-[#EA580C]"
            >
              Add Address
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
