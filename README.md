# SHMX — Your One-Stop ECE Components Store

Production-grade Electronics and Communication Engineering (ECE) e-commerce storefront and admin console built with **React**, **TypeScript**, **Tailwind CSS**, **Supabase** (Auth, Postgres, Storage, RLS, Edge Functions), and **Razorpay**.

---

## 1. Environment Variables

Create a `.env` file in the project root (based on `.env.example`):

```env
VITE_SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
VITE_RAZORPAY_KEY_ID="rzp_test_YOUR_KEY_ID"
```

- Never put `SUPABASE_SERVICE_ROLE_KEY` or `RAZORPAY_KEY_SECRET` in `.env` or any `VITE_` variable.
- If environment variables are not configured, SHMX displays explicit "Not Configured" notices instead of simulating fake logins, products, or payments.

---

## 2. Supabase Database & Storage Setup

1. Create a new project in [Supabase](https://supabase.com).
2. Open **SQL Editor** and run `supabase/schema.sql`. This creates:
   - Tables: `profiles`, `addresses`, `categories`, `products`, `cart_items`, `wishlist`, `coupons`, `store_settings`, `orders`, `order_items`, `payments`, `reviews`
   - Full-text + trigram search index and `search_products` RPC
   - Atomic order & stock decrement/restoration functions (`place_cod_order`, `prepare_razorpay_order`, `confirm_razorpay_payment`, `cancel_order_and_restore_stock`, `admin_update_order_status`)
   - Row Level Security (RLS) policies on all tables
   - Public-read / admin-write Storage bucket `product-images`
3. Run `supabase/seed.sql` in **SQL Editor** to seed the 10 ECE categories (A–J), sample ECE components with specs & INR pricing, and starter coupons (`ECE10`, `LAB100`).
   - Seeded products intentionally have `images = '{}'` so they display `"Image unavailable"` until you upload real component photos in the Admin Dashboard.
4. Enable **Realtime** for `products`, `categories`, and `store_settings` under **Database -> Replication** (optional, for instant storefront updates when admins edit items).

---

## 3. Making a User Admin

By default, every registered user receives `role = 'customer'` via the `handle_new_user` trigger, and RLS/triggers block users from promoting themselves.

To grant Admin access to your account:

1. Sign up normally in the app.
2. In Supabase **SQL Editor**, run:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'your-admin-email@example.com'
);
```

3. Sign out and back in (or refresh), then navigate to `/admin` (or click **Admin Dashboard** in the account menu).

---

## 4. Razorpay Edge Functions Setup

Deploy the two Edge Functions in `supabase/functions/`:

```bash
supabase functions deploy create-razorpay-order
supabase functions deploy verify-razorpay-payment
```

Configure the required Edge Function secrets (never committed to source code):

```bash
supabase secrets set RAZORPAY_KEY_ID="rzp_test_YOUR_KEY_ID"
supabase secrets set RAZORPAY_KEY_SECRET="YOUR_RAZORPAY_KEY_SECRET"
```

- `create-razorpay-order` authenticates the user JWT, runs `prepare_razorpay_order` to validate stock and calculate totals authoritatively in Postgres, and creates the Razorpay order server-side.
- `verify-razorpay-payment` verifies the Razorpay HMAC-SHA256 signature using `RAZORPAY_KEY_SECRET`, then invokes `confirm_razorpay_payment` to atomically decrement stock and mark the order paid.

---

## 5. SMS Provider Setup (Mobile Number + OTP Auth)

1. In Supabase Dashboard, go to **Authentication -> Providers -> Phone**.
2. Enable **Phone** sign-in and configure your SMS provider (e.g., **Twilio**, **MSG91**, or **MessageBird**) with your provider credentials.
3. Users can then sign in via the **Mobile OTP** tab in the Login modal.

---

## 6. Local Development & Build

```bash
npm install
npm run dev
```

Run pure logic unit tests:

```bash
npx --yes tsx --test src/lib/pricing.test.ts src/lib/validators.test.ts
```

Build for production:

```bash
npm run build
```
