import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
const razorpayKeyId = (import.meta.env.VITE_RAZORPAY_KEY_ID || '').trim();

const hasValidUrl =
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('YOUR_PROJECT_REF');

const hasValidKey =
  supabaseAnonKey.length > 20 &&
  !supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY');

export const isSupabaseConfigured: boolean = hasValidUrl && hasValidKey;

export const isRazorpayConfigured: boolean =
  isSupabaseConfigured &&
  razorpayKeyId.length > 8 &&
  !razorpayKeyId.includes('YOUR_KEY_ID');

export const RAZORPAY_KEY_ID = razorpayKeyId;
export const PRODUCT_IMAGES_BUCKET = 'product-images';

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
