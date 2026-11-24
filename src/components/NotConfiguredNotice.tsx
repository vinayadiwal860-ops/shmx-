import { AlertTriangle, Terminal } from 'lucide-react';

interface NotConfiguredNoticeProps {
  service?: 'Supabase' | 'Razorpay' | 'SMS OTP';
  title?: string;
  description?: string;
}

export function NotConfiguredNotice({
  service = 'Supabase',
  title,
  description,
}: NotConfiguredNoticeProps) {
  const defaultTitles: Record<string, string> = {
    Supabase: 'Supabase Database & Auth Not Configured',
    Razorpay: 'Razorpay Payment Gateway Not Configured',
    'SMS OTP': 'SMS OTP Provider Not Configured',
  };

  const defaultDescriptions: Record<string, string> = {
    Supabase:
      'SHMX reads all ECE components, categories, orders, and accounts directly from Supabase Postgres. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment, then execute supabase/schema.sql and supabase/seed.sql in your Supabase SQL Editor.',
    Razorpay:
      'Online Razorpay checkout requires VITE_RAZORPAY_KEY_ID in the client environment and RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET in Supabase Edge Function secrets.',
    'SMS OTP':
      'Mobile OTP sign-in requires an SMS provider (such as Twilio or MSG91) configured under Supabase Authentication -> Providers -> Phone.',
  };

  return (
    <div
      role="status"
      className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-[#0B1F3A]"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0B1F3A] text-white">
          <AlertTriangle className="h-4 w-4 text-[#F97316]" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="font-display text-base font-semibold text-[#0B1F3A]">
            {title || defaultTitles[service]}
          </h3>
          <p className="text-sm leading-relaxed text-slate-600">
            {description || defaultDescriptions[service]}
          </p>
          {service === 'Supabase' && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5 text-[#F97316]" aria-hidden="true" />
                VITE_SUPABASE_URL
              </span>
              <span aria-hidden="true">·</span>
              <span>VITE_SUPABASE_ANON_KEY</span>
              <span aria-hidden="true">·</span>
              <span>supabase/schema.sql + supabase/seed.sql</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
