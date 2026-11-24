-- ============================================================================
-- SHMX — ECE Components E-Commerce Store
-- Complete PostgreSQL Schema, RLS Policies, Full-Text + Trigram Search,
-- Atomic Order & Stock Management Functions, and Storage Policies
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ----------------------------------------------------------------------------
-- 1. TABLES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  line1 text NOT NULL,
  line2 text NOT NULL DEFAULT '',
  city text NOT NULL,
  state text NOT NULL,
  postal_code text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  model_number text NOT NULL,
  brand text NOT NULL DEFAULT 'Generic',
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  product_type text NOT NULL DEFAULT 'Component',
  short_spec text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  specs jsonb NOT NULL DEFAULT '{}'::jsonb,
  pin_configuration text NOT NULL DEFAULT '',
  pin_diagram_url text,
  operating_voltage text NOT NULL DEFAULT '',
  applications text NOT NULL DEFAULT '',
  datasheet_url text,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  discount_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 95),
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold integer NOT NULL DEFAULT 10 CHECK (low_stock_threshold >= 0),
  images text[] NOT NULL DEFAULT '{}'::text[],
  rating_avg numeric(3,2) NOT NULL DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  sales_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_featured_kit boolean NOT NULL DEFAULT false,
  search_vector tsvector,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL CHECK (discount_type IN ('percent', 'flat')),
  discount_value numeric(10,2) NOT NULL CHECK (discount_value > 0),
  min_order_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (min_order_amount >= 0),
  max_discount_amount numeric(10,2),
  expires_at timestamptz,
  usage_limit integer,
  used_count integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  hero_image_url text,
  shipping_flat_rate numeric(10,2) NOT NULL DEFAULT 60 CHECK (shipping_flat_rate >= 0),
  free_shipping_threshold numeric(10,2) NOT NULL DEFAULT 999 CHECK (free_shipping_threshold >= 0),
  cod_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.store_settings (id, shipping_flat_rate, free_shipping_threshold, cod_enabled)
VALUES (1, 60, 999, true)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  address_snapshot jsonb NOT NULL,
  subtotal numeric(10,2) NOT NULL CHECK (subtotal >= 0),
  shipping_charge numeric(10,2) NOT NULL DEFAULT 0 CHECK (shipping_charge >= 0),
  discount_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount numeric(10,2) NOT NULL CHECK (total_amount >= 0),
  coupon_code text,
  payment_method text NOT NULL CHECK (payment_method IN ('razorpay', 'cod')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  order_status text NOT NULL DEFAULT 'placed' CHECK (order_status IN ('placed', 'packed', 'shipped', 'delivered', 'cancelled')),
  cancellation_reason text,
  refund_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name text NOT NULL,
  model_number text NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  line_total numeric(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  provider text NOT NULL CHECK (provider IN ('razorpay', 'cod')),
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_signature text,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'authorized', 'captured', 'failed', 'refunded')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text NOT NULL DEFAULT '',
  comment text NOT NULL DEFAULT '',
  is_verified_purchase boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)
);

-- ----------------------------------------------------------------------------
-- 2. INDEXES FOR PERFORMANCE & SEARCH
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products (is_active);
CREATE INDEX IF NOT EXISTS idx_products_search_vector ON public.products USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_model_trgm ON public.products USING GIN (model_number gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_brand_trgm ON public.products USING GIN (brand gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_short_spec_trgm ON public.products USING GIN (short_spec gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON public.orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON public.reviews (product_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 3. HELPER FUNCTIONS & TRIGGERS
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone'),
    'customer'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only administrators can change user roles.';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_role_guard ON public.profiles;
CREATE TRIGGER trg_profiles_role_guard
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

CREATE OR REPLACE FUNCTION public.update_product_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_cat_name text := '';
BEGIN
  SELECT name INTO v_cat_name FROM public.categories WHERE id = NEW.category_id;
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.model_number, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.brand, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(v_cat_name, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.short_spec, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.product_type, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.operating_voltage, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.applications, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'D') ||
    setweight(to_tsvector('english', coalesce(NEW.specs::text, '')), 'D');
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_search_vector ON public.products;
CREATE TRIGGER trg_products_search_vector
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_product_search_vector();

CREATE OR REPLACE FUNCTION public.sync_product_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_id uuid;
BEGIN
  v_product_id := COALESCE(NEW.product_id, OLD.product_id);
  UPDATE public.products
  SET
    rating_avg = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM public.reviews WHERE product_id = v_product_id), 0),
    rating_count = (SELECT COUNT(*) FROM public.reviews WHERE product_id = v_product_id)
  WHERE id = v_product_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_sync_rating ON public.reviews;
CREATE TRIGGER trg_reviews_sync_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_rating();

CREATE OR REPLACE FUNCTION public.mark_verified_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.is_verified_purchase := EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    WHERE o.user_id = NEW.user_id
      AND oi.product_id = NEW.product_id
      AND o.order_status <> 'cancelled'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_verified ON public.reviews;
CREATE TRIGGER trg_reviews_verified
  BEFORE INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.mark_verified_review();

-- ----------------------------------------------------------------------------
-- 4. SEARCH RPC (Full-Text + Trigram + ILIKE)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.search_products(
  p_query text DEFAULT '',
  p_category_slug text DEFAULT NULL,
  p_min_price numeric DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_brand text DEFAULT NULL,
  p_product_type text DEFAULT NULL,
  p_in_stock_only boolean DEFAULT false,
  p_sort text DEFAULT 'best_selling',
  p_limit integer DEFAULT 48,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  model_number text,
  brand text,
  category_id uuid,
  category_name text,
  category_slug text,
  product_type text,
  short_spec text,
  description text,
  specs jsonb,
  pin_configuration text,
  pin_diagram_url text,
  operating_voltage text,
  applications text,
  datasheet_url text,
  price numeric,
  discount_percent numeric,
  stock_quantity integer,
  low_stock_threshold integer,
  images text[],
  rating_avg numeric,
  rating_count integer,
  sales_count integer,
  is_active boolean,
  is_featured_kit boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
AS $$
  WITH q AS (
    SELECT trim(coalesce(p_query, '')) AS term
  ),
  scored AS (
    SELECT
      p.*,
      c.name AS category_name,
      c.slug AS category_slug,
      ROUND(p.price * (1 - p.discount_percent / 100.0), 2) AS effective_price,
      CASE
        WHEN q.term = '' THEN 1.0
        ELSE (
          COALESCE(ts_rank(p.search_vector, websearch_to_tsquery('english', q.term)), 0) * 2.0 +
          GREATEST(
            similarity(p.name, q.term),
            similarity(p.model_number, q.term),
            similarity(p.brand, q.term),
            similarity(p.short_spec, q.term)
          )
        )
      END AS relevance
    FROM public.products p
    JOIN public.categories c ON c.id = p.category_id
    CROSS JOIN q
    WHERE p.is_active = true
      AND (p_category_slug IS NULL OR p_category_slug = '' OR c.slug = p_category_slug)
      AND (p_min_price IS NULL OR ROUND(p.price * (1 - p.discount_percent / 100.0), 2) >= p_min_price)
      AND (p_max_price IS NULL OR ROUND(p.price * (1 - p.discount_percent / 100.0), 2) <= p_max_price)
      AND (p_brand IS NULL OR p_brand = '' OR p.brand = p_brand)
      AND (p_product_type IS NULL OR p_product_type = '' OR p.product_type = p_product_type)
      AND (NOT p_in_stock_only OR p.stock_quantity > 0)
      AND (
        q.term = ''
        OR p.search_vector @@ websearch_to_tsquery('english', q.term)
        OR p.name ILIKE '%' || q.term || '%'
        OR p.model_number ILIKE '%' || q.term || '%'
        OR p.brand ILIKE '%' || q.term || '%'
        OR p.short_spec ILIKE '%' || q.term || '%'
        OR p.specs::text ILIKE '%' || q.term || '%'
        OR c.name ILIKE '%' || q.term || '%'
        OR similarity(p.name, q.term) > 0.2
        OR similarity(p.model_number, q.term) > 0.2
      )
  )
  SELECT
    s.id, s.name, s.slug, s.model_number, s.brand, s.category_id,
    s.category_name, s.category_slug, s.product_type, s.short_spec,
    s.description, s.specs, s.pin_configuration, s.pin_diagram_url,
    s.operating_voltage, s.applications, s.datasheet_url, s.price,
    s.discount_percent, s.stock_quantity, s.low_stock_threshold,
    s.images, s.rating_avg, s.rating_count, s.sales_count,
    s.is_active, s.is_featured_kit, s.created_at
  FROM scored s
  ORDER BY
    CASE WHEN (SELECT term FROM q) <> '' THEN s.relevance END DESC NULLS LAST,
    CASE WHEN p_sort = 'price_asc' THEN s.effective_price END ASC NULLS LAST,
    CASE WHEN p_sort = 'price_desc' THEN s.effective_price END DESC NULLS LAST,
    CASE WHEN p_sort = 'newest' THEN s.created_at END DESC NULLS LAST,
    CASE WHEN p_sort = 'highest_rated' THEN s.rating_avg END DESC NULLS LAST,
    CASE WHEN p_sort = 'best_selling' OR p_sort IS NULL THEN s.sales_count END DESC NULLS LAST,
    s.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 100))
  OFFSET GREATEST(0, p_offset);
$$;

-- ----------------------------------------------------------------------------
-- 5. ATOMIC ORDER & STOCK TRANSACTIONS
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE sql
AS $$
  SELECT 'SHMX-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
$$;

-- Atomic Cash on Delivery Order Placement (decrements stock immediately in transaction)
CREATE OR REPLACE FUNCTION public.place_cod_order(
  p_address_id uuid,
  p_coupon_code text DEFAULT NULL
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_settings public.store_settings%ROWTYPE;
  v_addr public.addresses%ROWTYPE;
  v_coupon public.coupons%ROWTYPE;
  v_subtotal numeric(10,2) := 0;
  v_discount numeric(10,2) := 0;
  v_shipping numeric(10,2) := 0;
  v_total numeric(10,2) := 0;
  v_order public.orders%ROWTYPE;
  v_item record;
  v_unit_price numeric(10,2);
  v_item_count integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to place an order.';
  END IF;

  SELECT * INTO v_settings FROM public.store_settings WHERE id = 1;
  IF NOT COALESCE(v_settings.cod_enabled, false) THEN
    RAISE EXCEPTION 'Cash on Delivery is currently disabled by store administration.';
  END IF;

  SELECT * INTO v_addr FROM public.addresses WHERE id = p_address_id AND user_id = v_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Selected delivery address was not found.';
  END IF;

  -- Lock cart products in deterministic order to prevent overselling and deadlocks
  FOR v_item IN
    SELECT ci.product_id, ci.quantity, p.name, p.model_number, p.price, p.discount_percent, p.stock_quantity, p.is_active
    FROM public.cart_items ci
    JOIN public.products p ON p.id = ci.product_id
    WHERE ci.user_id = v_user_id
    ORDER BY ci.product_id
    FOR UPDATE OF p
  LOOP
    v_item_count := v_item_count + 1;
    IF NOT v_item.is_active THEN
      RAISE EXCEPTION 'Product "%" is no longer available.', v_item.name;
    END IF;
    IF v_item.stock_quantity < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for "%" (available: %, requested: %).', v_item.name, v_item.stock_quantity, v_item.quantity;
    END IF;
    v_unit_price := ROUND(v_item.price * (1 - v_item.discount_percent / 100.0), 2);
    v_subtotal := v_subtotal + (v_unit_price * v_item.quantity);
  END LOOP;

  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'Your cart is empty.';
  END IF;

  -- Apply coupon if provided
  IF p_coupon_code IS NOT NULL AND trim(p_coupon_code) <> '' THEN
    SELECT * INTO v_coupon
    FROM public.coupons
    WHERE upper(code) = upper(trim(p_coupon_code))
      AND is_active = true
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid or inactive coupon code.';
    END IF;
    IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
      RAISE EXCEPTION 'This coupon has expired.';
    END IF;
    IF v_coupon.usage_limit IS NOT NULL AND v_coupon.used_count >= v_coupon.usage_limit THEN
      RAISE EXCEPTION 'This coupon has reached its usage limit.';
    END IF;
    IF v_subtotal < v_coupon.min_order_amount THEN
      RAISE EXCEPTION 'Minimum order of ₹% required for coupon %.', v_coupon.min_order_amount, v_coupon.code;
    END IF;

    IF v_coupon.discount_type = 'percent' THEN
      v_discount := ROUND(v_subtotal * (v_coupon.discount_value / 100.0), 2);
      IF v_coupon.max_discount_amount IS NOT NULL AND v_discount > v_coupon.max_discount_amount THEN
        v_discount := v_coupon.max_discount_amount;
      END IF;
    ELSE
      v_discount := LEAST(v_subtotal, v_coupon.discount_value);
    END IF;

    UPDATE public.coupons SET used_count = used_count + 1 WHERE id = v_coupon.id;
  END IF;

  IF v_subtotal >= v_settings.free_shipping_threshold THEN
    v_shipping := 0;
  ELSE
    v_shipping := v_settings.shipping_flat_rate;
  END IF;

  v_total := GREATEST(0, v_subtotal - v_discount + v_shipping);

  INSERT INTO public.orders (
    order_number, user_id, address_snapshot, subtotal, shipping_charge,
    discount_amount, total_amount, coupon_code, payment_method, payment_status, order_status
  ) VALUES (
    public.generate_order_number(),
    v_user_id,
    jsonb_build_object(
      'full_name', v_addr.full_name,
      'phone', v_addr.phone,
      'line1', v_addr.line1,
      'line2', v_addr.line2,
      'city', v_addr.city,
      'state', v_addr.state,
      'postal_code', v_addr.postal_code
    ),
    v_subtotal,
    v_shipping,
    v_discount,
    v_total,
    CASE WHEN v_coupon.id IS NOT NULL THEN v_coupon.code ELSE NULL END,
    'cod',
    'pending',
    'placed'
  )
  RETURNING * INTO v_order;

  FOR v_item IN
    SELECT ci.product_id, ci.quantity, p.name, p.model_number, p.price, p.discount_percent
    FROM public.cart_items ci
    JOIN public.products p ON p.id = ci.product_id
    WHERE ci.user_id = v_user_id
  LOOP
    v_unit_price := ROUND(v_item.price * (1 - v_item.discount_percent / 100.0), 2);
    INSERT INTO public.order_items (
      order_id, product_id, product_name, model_number, unit_price, quantity, line_total
    ) VALUES (
      v_order.id, v_item.product_id, v_item.name, v_item.model_number,
      v_unit_price, v_item.quantity, ROUND(v_unit_price * v_item.quantity, 2)
    );

    UPDATE public.products
    SET
      stock_quantity = stock_quantity - v_item.quantity,
      sales_count = sales_count + v_item.quantity
    WHERE id = v_item.product_id;
  END LOOP;

  INSERT INTO public.payments (order_id, user_id, provider, amount, currency, status)
  VALUES (v_order.id, v_user_id, 'cod', v_total, 'INR', 'created');

  DELETE FROM public.cart_items WHERE user_id = v_user_id;

  RETURN v_order;
END;
$$;

-- Prepare Pending Razorpay Order (called by create-razorpay-order Edge Function using user JWT)
CREATE OR REPLACE FUNCTION public.prepare_razorpay_order(
  p_address_id uuid,
  p_coupon_code text DEFAULT NULL
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_settings public.store_settings%ROWTYPE;
  v_addr public.addresses%ROWTYPE;
  v_coupon public.coupons%ROWTYPE;
  v_subtotal numeric(10,2) := 0;
  v_discount numeric(10,2) := 0;
  v_shipping numeric(10,2) := 0;
  v_total numeric(10,2) := 0;
  v_order public.orders%ROWTYPE;
  v_item record;
  v_unit_price numeric(10,2);
  v_item_count integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT * INTO v_settings FROM public.store_settings WHERE id = 1;
  SELECT * INTO v_addr FROM public.addresses WHERE id = p_address_id AND user_id = v_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Selected delivery address was not found.';
  END IF;

  FOR v_item IN
    SELECT ci.product_id, ci.quantity, p.name, p.model_number, p.price, p.discount_percent, p.stock_quantity, p.is_active
    FROM public.cart_items ci
    JOIN public.products p ON p.id = ci.product_id
    WHERE ci.user_id = v_user_id
    ORDER BY ci.product_id
  LOOP
    v_item_count := v_item_count + 1;
    IF NOT v_item.is_active THEN
      RAISE EXCEPTION 'Product "%" is no longer available.', v_item.name;
    END IF;
    IF v_item.stock_quantity < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for "%" (available: %, requested: %).', v_item.name, v_item.stock_quantity, v_item.quantity;
    END IF;
    v_unit_price := ROUND(v_item.price * (1 - v_item.discount_percent / 100.0), 2);
    v_subtotal := v_subtotal + (v_unit_price * v_item.quantity);
  END LOOP;

  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'Your cart is empty.';
  END IF;

  IF p_coupon_code IS NOT NULL AND trim(p_coupon_code) <> '' THEN
    SELECT * INTO v_coupon
    FROM public.coupons
    WHERE upper(code) = upper(trim(p_coupon_code))
      AND is_active = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid or inactive coupon code.';
    END IF;
    IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
      RAISE EXCEPTION 'This coupon has expired.';
    END IF;
    IF v_coupon.usage_limit IS NOT NULL AND v_coupon.used_count >= v_coupon.usage_limit THEN
      RAISE EXCEPTION 'This coupon has reached its usage limit.';
    END IF;
    IF v_subtotal < v_coupon.min_order_amount THEN
      RAISE EXCEPTION 'Minimum order of ₹% required for coupon %.', v_coupon.min_order_amount, v_coupon.code;
    END IF;

    IF v_coupon.discount_type = 'percent' THEN
      v_discount := ROUND(v_subtotal * (v_coupon.discount_value / 100.0), 2);
      IF v_coupon.max_discount_amount IS NOT NULL AND v_discount > v_coupon.max_discount_amount THEN
        v_discount := v_coupon.max_discount_amount;
      END IF;
    ELSE
      v_discount := LEAST(v_subtotal, v_coupon.discount_value);
    END IF;
  END IF;

  IF v_subtotal >= v_settings.free_shipping_threshold THEN
    v_shipping := 0;
  ELSE
    v_shipping := v_settings.shipping_flat_rate;
  END IF;

  v_total := GREATEST(0, v_subtotal - v_discount + v_shipping);

  INSERT INTO public.orders (
    order_number, user_id, address_snapshot, subtotal, shipping_charge,
    discount_amount, total_amount, coupon_code, payment_method, payment_status, order_status
  ) VALUES (
    public.generate_order_number(),
    v_user_id,
    jsonb_build_object(
      'full_name', v_addr.full_name,
      'phone', v_addr.phone,
      'line1', v_addr.line1,
      'line2', v_addr.line2,
      'city', v_addr.city,
      'state', v_addr.state,
      'postal_code', v_addr.postal_code
    ),
    v_subtotal,
    v_shipping,
    v_discount,
    v_total,
    CASE WHEN v_coupon.id IS NOT NULL THEN v_coupon.code ELSE NULL END,
    'razorpay',
    'pending',
    'placed'
  )
  RETURNING * INTO v_order;

  FOR v_item IN
    SELECT ci.product_id, ci.quantity, p.name, p.model_number, p.price, p.discount_percent
    FROM public.cart_items ci
    JOIN public.products p ON p.id = ci.product_id
    WHERE ci.user_id = v_user_id
  LOOP
    v_unit_price := ROUND(v_item.price * (1 - v_item.discount_percent / 100.0), 2);
    INSERT INTO public.order_items (
      order_id, product_id, product_name, model_number, unit_price, quantity, line_total
    ) VALUES (
      v_order.id, v_item.product_id, v_item.name, v_item.model_number,
      v_unit_price, v_item.quantity, ROUND(v_unit_price * v_item.quantity, 2)
    );
  END LOOP;

  RETURN v_order;
END;
$$;

-- Confirm Razorpay Payment & Atomically Decrement Stock (called by verify-razorpay-payment Edge Function via service role)
CREATE OR REPLACE FUNCTION public.confirm_razorpay_payment(
  p_order_id uuid,
  p_razorpay_order_id text,
  p_razorpay_payment_id text,
  p_razorpay_signature text
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item record;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  IF v_order.payment_status = 'paid' THEN
    RETURN v_order;
  END IF;

  -- Lock products in order and verify stock
  FOR v_item IN
    SELECT oi.product_id, oi.quantity, p.name, p.stock_quantity
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = p_order_id
    ORDER BY oi.product_id
    FOR UPDATE OF p
  LOOP
    IF v_item.stock_quantity < v_item.quantity THEN
      UPDATE public.orders
      SET payment_status = 'refunded',
          order_status = 'cancelled',
          cancellation_reason = 'Insufficient stock during payment confirmation; automatic refund required.',
          updated_at = now()
      WHERE id = p_order_id;
      RAISE EXCEPTION 'Stock exhausted for "%" during payment confirmation.', v_item.name;
    END IF;
  END LOOP;

  FOR v_item IN
    SELECT oi.product_id, oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id
  LOOP
    UPDATE public.products
    SET
      stock_quantity = stock_quantity - v_item.quantity,
      sales_count = sales_count + v_item.quantity
    WHERE id = v_item.product_id;
  END LOOP;

  IF v_order.coupon_code IS NOT NULL THEN
    UPDATE public.coupons
    SET used_count = used_count + 1
    WHERE upper(code) = upper(v_order.coupon_code);
  END IF;

  UPDATE public.orders
  SET payment_status = 'paid', updated_at = now()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  UPDATE public.payments
  SET
    razorpay_payment_id = p_razorpay_payment_id,
    razorpay_signature = p_razorpay_signature,
    status = 'captured'
  WHERE order_id = p_order_id AND razorpay_order_id = p_razorpay_order_id;

  DELETE FROM public.cart_items WHERE user_id = v_order.user_id;

  RETURN v_order;
END;
$$;

-- Cancel Order & Restore Stock Atomically
CREATE OR REPLACE FUNCTION public.cancel_order_and_restore_stock(
  p_order_id uuid,
  p_reason text DEFAULT '',
  p_refund_notes text DEFAULT NULL
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_admin boolean := public.is_admin();
  v_order public.orders%ROWTYPE;
  v_item record;
  v_should_restore boolean := false;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  IF NOT v_is_admin AND v_order.user_id <> v_user_id THEN
    RAISE EXCEPTION 'Unauthorized to cancel this order.';
  END IF;

  IF NOT v_is_admin AND v_order.order_status NOT IN ('placed', 'packed') THEN
    RAISE EXCEPTION 'Orders already shipped or delivered cannot be cancelled directly.';
  END IF;

  IF v_order.order_status = 'cancelled' THEN
    RETURN v_order;
  END IF;

  v_should_restore := (v_order.payment_method = 'cod' OR v_order.payment_status = 'paid');

  IF v_should_restore THEN
    FOR v_item IN
      SELECT oi.product_id, oi.quantity
      FROM public.order_items oi
      WHERE oi.order_id = p_order_id
      ORDER BY oi.product_id
    LOOP
      UPDATE public.products
      SET
        stock_quantity = stock_quantity + v_item.quantity,
        sales_count = GREATEST(0, sales_count - v_item.quantity)
      WHERE id = v_item.product_id;
    END LOOP;
  END IF;

  UPDATE public.orders
  SET
    order_status = 'cancelled',
    payment_status = CASE WHEN payment_status = 'paid' THEN 'refunded' ELSE payment_status END,
    cancellation_reason = COALESCE(NULLIF(trim(p_reason), ''), cancellation_reason),
    refund_notes = COALESCE(p_refund_notes, refund_notes),
    updated_at = now()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

-- Admin Order Status Update
CREATE OR REPLACE FUNCTION public.admin_update_order_status(
  p_order_id uuid,
  p_order_status text,
  p_refund_notes text DEFAULT NULL,
  p_cancellation_reason text DEFAULT NULL
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin privileges required.';
  END IF;

  IF p_order_status = 'cancelled' THEN
    RETURN public.cancel_order_and_restore_stock(
      p_order_id,
      COALESCE(p_cancellation_reason, 'Cancelled by store administrator'),
      p_refund_notes
    );
  END IF;

  UPDATE public.orders
  SET
    order_status = p_order_status,
    refund_notes = COALESCE(p_refund_notes, refund_notes),
    updated_at = now()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  RETURN v_order;
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_update_own_or_admin" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- ADDRESSES
CREATE POLICY "addresses_own_all" ON public.addresses
  FOR ALL USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- CATEGORIES
CREATE POLICY "categories_public_read" ON public.categories
  FOR SELECT USING (true);

CREATE POLICY "categories_admin_write" ON public.categories
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- PRODUCTS
CREATE POLICY "products_public_read_active" ON public.products
  FOR SELECT USING (is_active = true OR public.is_admin());

CREATE POLICY "products_admin_write" ON public.products
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- CART ITEMS
CREATE POLICY "cart_items_own_all" ON public.cart_items
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- WISHLIST
CREATE POLICY "wishlist_own_all" ON public.wishlist
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- COUPONS
CREATE POLICY "coupons_public_read_active" ON public.coupons
  FOR SELECT USING (is_active = true OR public.is_admin());

CREATE POLICY "coupons_admin_write" ON public.coupons
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- STORE SETTINGS
CREATE POLICY "store_settings_public_read" ON public.store_settings
  FOR SELECT USING (true);

CREATE POLICY "store_settings_admin_write" ON public.store_settings
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ORDERS
CREATE POLICY "orders_select_own_or_admin" ON public.orders
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "orders_admin_update" ON public.orders
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ORDER ITEMS
CREATE POLICY "order_items_select_own_or_admin" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id AND (o.user_id = auth.uid() OR public.is_admin())
    )
  );

-- PAYMENTS
CREATE POLICY "payments_select_own_or_admin" ON public.payments
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- REVIEWS
CREATE POLICY "reviews_public_read" ON public.reviews
  FOR SELECT USING (true);

CREATE POLICY "reviews_verified_buyer_insert" ON public.reviews
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.orders o
      JOIN public.order_items oi ON oi.order_id = o.id
      WHERE o.user_id = auth.uid()
        AND oi.product_id = reviews.product_id
        AND o.order_status <> 'cancelled'
    )
  );

CREATE POLICY "reviews_own_update_delete" ON public.reviews
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "reviews_own_delete" ON public.reviews
  FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- ----------------------------------------------------------------------------
-- 7. SUPABASE STORAGE BUCKET & POLICIES (product-images)
-- ----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
CREATE POLICY "product_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_admin_insert" ON storage.objects;
CREATE POLICY "product_images_admin_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

DROP POLICY IF EXISTS "product_images_admin_update" ON storage.objects;
CREATE POLICY "product_images_admin_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'product-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

DROP POLICY IF EXISTS "product_images_admin_delete" ON storage.objects;
CREATE POLICY "product_images_admin_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'product-images' AND public.is_admin());
