export type UserRole = 'customer' | 'admin';

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  created_at: string;
  updated_at?: string;
}

export interface Address {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  is_default: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  model_number: string;
  brand: string;
  category_id: string;
  category_name?: string;
  category_slug?: string;
  product_type: string;
  short_spec: string;
  description: string;
  specs: Record<string, string>;
  pin_configuration: string;
  pin_diagram_url: string | null;
  operating_voltage: string;
  applications: string;
  datasheet_url: string | null;
  price: number;
  discount_percent: number;
  stock_quantity: number;
  low_stock_threshold: number;
  images: string[];
  rating_avg: number;
  rating_count: number;
  sales_count: number;
  is_active: boolean;
  is_featured_kit: boolean;
  created_at: string;
}

export interface CartEntry {
  product_id: string;
  quantity: number;
  product?: Product;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percent' | 'flat';
  discount_value: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  expires_at: string | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  created_at: string;
}

export interface StoreSettings {
  id: number;
  hero_image_url: string | null;
  shipping_flat_rate: number;
  free_shipping_threshold: number;
  cod_enabled: boolean;
  updated_at?: string;
}

export type OrderStatus = 'placed' | 'packed' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'razorpay' | 'cod';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  model_number: string;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  address_snapshot: {
    full_name: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
  };
  subtotal: number;
  shipping_charge: number;
  discount_amount: number;
  total_amount: number;
  coupon_code: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  cancellation_reason: string | null;
  refund_notes: string | null;
  created_at: string;
  order_items?: OrderItem[];
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string;
  comment: string;
  is_verified_purchase: boolean;
  created_at: string;
  profiles?: { full_name: string } | null;
}

export type SortOption = 'best_selling' | 'newest' | 'price_asc' | 'price_desc' | 'highest_rated';

export interface ProductFilterState {
  query: string;
  categorySlug: string;
  minPrice: string;
  maxPrice: string;
  brand: string;
  productType: string;
  inStockOnly: boolean;
  sort: SortOption;
}
