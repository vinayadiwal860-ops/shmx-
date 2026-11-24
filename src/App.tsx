import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthModal } from './components/AuthModal';
import { CartDrawer } from './components/CartDrawer';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { AuthProvider } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { isSupabaseConfigured } from './lib/supabase';
import { AccountPage } from './pages/AccountPage';
import { AdminPage } from './pages/AdminPage';
import { CatalogPage } from './pages/CatalogPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { HomePage } from './pages/HomePage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { OrdersPage } from './pages/OrdersPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { WishlistPage } from './pages/WishlistPage';
import {
  DEFAULT_STORE_SETTINGS,
  fetchCategories,
  fetchStoreSettings,
  searchCatalogProducts,
  subscribeCatalogRealtime,
} from './services/catalogService';
import type { Category, Product, ProductFilterState, SortOption, StoreSettings } from './types/database';

function parseCatalogFilters(search: string): ProductFilterState {
  const params = new URLSearchParams(search);
  const sortParam = params.get('sort') as SortOption | null;
  const validSorts: SortOption[] = [
    'best_selling',
    'newest',
    'price_asc',
    'price_desc',
    'highest_rated',
  ];
  return {
    query: params.get('q') || '',
    categorySlug: params.get('category') || '',
    minPrice: params.get('min') || '',
    maxPrice: params.get('max') || '',
    brand: params.get('brand') || '',
    productType: params.get('type') || '',
    inStockOnly: params.get('stock') === '1',
    sort: sortParam && validSorts.includes(sortParam) ? sortParam : 'best_selling',
  };
}

function StorefrontShell() {
  const { addToCart, toggleWishlist, wishlistIds, setIsCartOpen } = useCart();

  const [locationPath, setLocationPath] = useState<string>(
    () => `${window.location.pathname}${window.location.search}`
  );
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [featuredKits, setFeaturedKits] = useState<Product[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [homeLoading, setHomeLoading] = useState(isSupabaseConfigured);
  const [homeError, setHomeError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const onPop = () => {
      setLocationPath(`${window.location.pathname}${window.location.search}`);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setLocationPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => {
      setToast((curr) => (curr === msg ? null : curr));
    }, 2800);
  }, []);

  const loadStorefrontData = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setHomeLoading(false);
      return;
    }
    setHomeLoading(true);
    setHomeError(null);
    try {
      const [cats, st, best, newest, kits] = await Promise.all([
        fetchCategories(),
        fetchStoreSettings(),
        searchCatalogProducts({ sort: 'best_selling' }, 8, 0),
        searchCatalogProducts({ sort: 'newest' }, 8, 0),
        searchCatalogProducts({ categorySlug: 'ece-lab-kits', sort: 'best_selling' }, 4, 0),
      ]);
      setCategories(cats);
      setSettings(st);
      setBestSellers(best.slice(0, 4));
      setNewArrivals(newest.slice(0, 4));
      setFeaturedKits(kits.slice(0, 4));
    } catch (err) {
      setHomeError(err instanceof Error ? err.message : 'Unable to fetch catalog data.');
    } finally {
      setHomeLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStorefrontData();
  }, [loadStorefrontData, refreshToken]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    return subscribeCatalogRealtime(() => {
      setRefreshToken((n) => n + 1);
    });
  }, []);

  const [pathname, searchStr] = useMemo(() => {
    const idx = locationPath.indexOf('?');
    if (idx === -1) return [locationPath, ''];
    return [locationPath.slice(0, idx), locationPath.slice(idx)];
  }, [locationPath]);

  const catalogFilters = useMemo(() => parseCatalogFilters(searchStr), [searchStr]);

  const handleSearchSubmit = (q: string) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    const qs = params.toString();
    navigate(qs ? `/catalog?${qs}` : '/catalog');
  };

  const handleAddToCart = async (product: Product, quantity = 1) => {
    try {
      await addToCart(product, quantity);
      showToast(`Added ${product.name} to cart.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not add to cart.');
    }
  };

  const handleBuyNow = async (product: Product, quantity = 1) => {
    try {
      await addToCart(product, quantity);
      navigate('/checkout');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to proceed.');
    }
  };

  const handleToggleWishlist = async (productId: string) => {
    await toggleWishlist(productId, () => setAuthModalOpen(true));
  };

  let mainContent = (
    <HomePage
      categories={categories}
      newArrivals={newArrivals}
      bestSellers={bestSellers}
      featuredKits={featuredKits}
      settings={settings}
      loading={homeLoading}
      error={homeError}
      wishlistIds={wishlistIds}
      onRetry={loadStorefrontData}
      onNavigate={navigate}
      onAddToCart={(p) => handleAddToCart(p, 1)}
      onBuyNow={(p) => handleBuyNow(p, 1)}
      onToggleWishlist={handleToggleWishlist}
    />
  );

  if (pathname === '/catalog') {
    mainContent = (
      <CatalogPage
        categories={categories}
        initialFilters={catalogFilters}
        wishlistIds={wishlistIds}
        refreshToken={refreshToken}
        onNavigate={navigate}
        onAddToCart={(p) => handleAddToCart(p, 1)}
        onBuyNow={(p) => handleBuyNow(p, 1)}
        onToggleWishlist={handleToggleWishlist}
      />
    );
  } else if (pathname.startsWith('/product/')) {
    const slug = decodeURIComponent(pathname.replace('/product/', ''));
    mainContent = (
      <ProductDetailPage
        slug={slug}
        wishlistIds={wishlistIds}
        onNavigate={navigate}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        onToggleWishlist={handleToggleWishlist}
      />
    );
  } else if (pathname === '/checkout') {
    mainContent = (
      <CheckoutPage
        settings={settings}
        onNavigate={navigate}
        onOpenAuth={() => setAuthModalOpen(true)}
      />
    );
  } else if (pathname.startsWith('/order-confirmed/')) {
    const orderId = decodeURIComponent(pathname.replace('/order-confirmed/', ''));
    mainContent = <OrderConfirmationPage orderId={orderId} onNavigate={navigate} />;
  } else if (pathname === '/orders') {
    mainContent = <OrdersPage onNavigate={navigate} onOpenAuth={() => setAuthModalOpen(true)} />;
  } else if (pathname === '/wishlist') {
    mainContent = (
      <WishlistPage
        onNavigate={navigate}
        onOpenAuth={() => setAuthModalOpen(true)}
        onAddToCart={(p) => handleAddToCart(p, 1)}
        onBuyNow={(p) => handleBuyNow(p, 1)}
      />
    );
  } else if (pathname === '/account') {
    mainContent = <AccountPage onOpenAuth={() => setAuthModalOpen(true)} />;
  } else if (pathname === '/admin') {
    mainContent = (
      <AdminPage
        onOpenAuth={() => setAuthModalOpen(true)}
        onCatalogMutated={() => setRefreshToken((n) => n + 1)}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0B1F3A]">
      <Header
        currentPath={locationPath}
        searchQuery={catalogFilters.query}
        onNavigate={navigate}
        onSearchSubmit={handleSearchSubmit}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      <main className="flex-1">{mainContent}</main>

      <Footer onNavigate={navigate} />

      <CartDrawer
        settings={settings}
        onCheckout={() => navigate('/checkout')}
        onRequireAuth={() => {
          setIsCartOpen(false);
          setAuthModalOpen(true);
        }}
        onNavigateProduct={(slug) => navigate(`/product/${slug}`)}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 rounded-xl bg-[#0B1F3A] px-4 py-3 text-xs font-semibold text-white shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <StorefrontShell />
      </CartProvider>
    </AuthProvider>
  );
}
