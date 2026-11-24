import {
  ArrowRight,
  BatteryCharging,
  Bot,
  CircuitBoard,
  Cpu,
  Grid,
  Monitor,
  PackageCheck,
  Radio,
  Sliders,
  Thermometer,
} from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';
import type { Category, Product, StoreSettings } from '../types/database';
import { NotConfiguredNotice } from '../components/NotConfiguredNotice';
import { ProductCard } from '../components/ProductCard';
import { ProductSkeleton } from '../components/ProductSkeleton';

interface HomePageProps {
  categories: Category[];
  newArrivals: Product[];
  bestSellers: Product[];
  featuredKits: Product[];
  settings: StoreSettings;
  loading: boolean;
  error: string | null;
  wishlistIds: Set<string>;
  onRetry: () => void;
  onNavigate: (path: string) => void;
  onAddToCart: (product: Product) => Promise<void>;
  onBuyNow: (product: Product) => Promise<void>;
  onToggleWishlist: (productId: string) => Promise<void>;
}

function CategoryIcon({ slug }: { slug: string }) {
  const cls = 'h-5 w-5 text-[#0B1F3A] group-hover:text-[#F97316] transition-colors';
  switch (slug) {
    case 'ics':
      return <Cpu className={cls} aria-hidden="true" />;
    case 'development-boards':
      return <CircuitBoard className={cls} aria-hidden="true" />;
    case 'sensors':
      return <Thermometer className={cls} aria-hidden="true" />;
    case 'breadboards-prototyping':
      return <Grid className={cls} aria-hidden="true" />;
    case 'passive-components':
      return <Sliders className={cls} aria-hidden="true" />;
    case 'displays':
      return <Monitor className={cls} aria-hidden="true" />;
    case 'robotics-motor-drivers':
      return <Bot className={cls} aria-hidden="true" />;
    case 'communication-modules':
      return <Radio className={cls} aria-hidden="true" />;
    case 'power-supply':
      return <BatteryCharging className={cls} aria-hidden="true" />;
    default:
      return <PackageCheck className={cls} aria-hidden="true" />;
  }
}

export function HomePage({
  categories,
  newArrivals,
  bestSellers,
  featuredKits,
  settings,
  loading,
  error,
  wishlistIds,
  onRetry,
  onNavigate,
  onAddToCart,
  onBuyNow,
  onToggleWishlist,
}: HomePageProps) {
  const hasHeroImage = Boolean(settings.hero_image_url && settings.hero_image_url.trim().length > 0);

  return (
    <div>
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0B1F3A] via-[#102B50] to-[#08172B] text-white">
        {hasHeroImage && (
          <>
            <img
              src={settings.hero_image_url!}
              alt="Electronics engineering workbench"
              referrerPolicy="no-referrer"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            <div
              className="absolute inset-0 bg-gradient-to-r from-[#0B1F3A]/92 via-[#0B1F3A]/78 to-[#0B1F3A]/45"
              aria-hidden="true"
            />
          </>
        )}

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-22 lg:py-24">
          <div className="max-w-2xl space-y-5">
            <p className="text-sm font-semibold tracking-wide text-[#F97316]">
              Your One-Stop ECE Components Store
            </p>
            <h1
              className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl leading-[1.12]"
              style={{ textWrap: 'balance' }}
            >
              Everything Electronics. All in One Place.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-slate-200 sm:text-lg">
              Discover quality electronic components, development boards, sensors and engineering
              kits at SHMX.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('/catalog')}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#F97316] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#EA580C] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span>Explore Products</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/catalog?category=ece-lab-kits')}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/20 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]"
              >
                Shop ECE Kits
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {!isSupabaseConfigured ? (
          <div className="mt-10">
            <NotConfiguredNotice service="Supabase" />
          </div>
        ) : error ? (
          <div className="mt-10 rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
            <p className="font-semibold">Unable to load storefront catalog</p>
            <p className="mt-1 text-red-700">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 rounded-lg bg-[#0B1F3A] px-4 py-2 text-xs font-semibold text-white"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Shop by Category */}
            <section className="mt-12" aria-labelledby="cat-heading">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 id="cat-heading" className="font-display text-2xl font-bold text-[#0B1F3A]">
                    Shop by Category
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Ten specialized Electronics & Communication Engineering hardware departments.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('/catalog')}
                  className="text-xs font-semibold text-[#F97316] hover:underline whitespace-nowrap shrink-0"
                >
                  View all components
                </button>
              </div>

              {loading ? (
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {Array.from({ length: 10 }).map((_, idx) => (
                    <div key={idx} className="h-24 rounded-xl border border-slate-200 bg-slate-50 animate-pulse" />
                  ))}
                </div>
              ) : categories.length === 0 ? (
                <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600">
                  No categories found in the database yet. Run <code className="font-mono">supabase/seed.sql</code> to populate the 10 ECE categories.
                </div>
              ) : (
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => onNavigate(`/catalog?category=${cat.slug}`)}
                      className="group flex flex-col items-start justify-between rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[#0B1F3A] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-[#F97316]/10">
                        <CategoryIcon slug={cat.slug} />
                      </div>
                      <div className="mt-3">
                        <div className="font-display text-sm font-semibold text-[#0B1F3A]">
                          {cat.name}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                          {cat.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Best Sellers */}
            <section className="mt-14" aria-labelledby="bestsellers-heading">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 id="bestsellers-heading" className="font-display text-2xl font-bold text-[#0B1F3A]">
                    Best Sellers
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Most-ordered microcontrollers, sensors, and logic ICs across ECE labs.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('/catalog?sort=best_selling')}
                  className="text-xs font-semibold text-[#F97316] hover:underline whitespace-nowrap shrink-0"
                >
                  See all best sellers
                </button>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => <ProductSkeleton key={i} />)
                ) : bestSellers.length === 0 ? (
                  <div className="col-span-full rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600">
                    No active products found in the database yet.
                  </div>
                ) : (
                  bestSellers.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      isWishlisted={wishlistIds.has(p.id)}
                      onNavigateProduct={(slug) => onNavigate(`/product/${slug}`)}
                      onAddToCart={onAddToCart}
                      onBuyNow={onBuyNow}
                      onToggleWishlist={onToggleWishlist}
                    />
                  ))
                )}
              </div>
            </section>

            {/* New Arrivals */}
            <section className="mt-14" aria-labelledby="new-arrivals-heading">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 id="new-arrivals-heading" className="font-display text-2xl font-bold text-[#0B1F3A]">
                    New Arrivals
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Recently stocked hardware components and development modules.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('/catalog?sort=newest')}
                  className="text-xs font-semibold text-[#F97316] hover:underline whitespace-nowrap shrink-0"
                >
                  View latest stock
                </button>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => <ProductSkeleton key={i} />)
                  : newArrivals.map((p) => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        isWishlisted={wishlistIds.has(p.id)}
                        onNavigateProduct={(slug) => onNavigate(`/product/${slug}`)}
                        onAddToCart={onAddToCart}
                        onBuyNow={onBuyNow}
                        onToggleWishlist={onToggleWishlist}
                      />
                    ))}
              </div>
            </section>

            {/* Featured ECE Kits */}
            <section className="mt-14" aria-labelledby="kits-heading">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 id="kits-heading" className="font-display text-2xl font-bold text-[#0B1F3A]">
                    Featured ECE Lab & Learning Kits
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Complete hardware bundles for university coursework, IoT, robotics, and VLSI.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('/catalog?category=ece-lab-kits')}
                  className="text-xs font-semibold text-[#F97316] hover:underline whitespace-nowrap shrink-0"
                >
                  Browse all kits
                </button>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => <ProductSkeleton key={i} />)
                  : featuredKits.map((p) => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        isWishlisted={wishlistIds.has(p.id)}
                        onNavigateProduct={(slug) => onNavigate(`/product/${slug}`)}
                        onAddToCart={onAddToCart}
                        onBuyNow={onBuyNow}
                        onToggleWishlist={onToggleWishlist}
                      />
                    ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
