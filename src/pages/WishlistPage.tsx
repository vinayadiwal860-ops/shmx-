import { Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { isSupabaseConfigured } from '../lib/supabase';
import type { Product } from '../types/database';
import { NotConfiguredNotice } from '../components/NotConfiguredNotice';
import { ProductCard } from '../components/ProductCard';

interface WishlistPageProps {
  onNavigate: (path: string) => void;
  onOpenAuth: () => void;
  onAddToCart: (product: Product) => Promise<void>;
  onBuyNow: (product: Product) => Promise<void>;
}

export function WishlistPage({
  onNavigate,
  onOpenAuth,
  onAddToCart,
  onBuyNow,
}: WishlistPageProps) {
  const { user } = useAuth();
  const { wishlistProducts, wishlistIds, toggleWishlist } = useCart();

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="mb-6 font-display text-2xl font-bold text-[#0B1F3A]">Saved Wishlist</h1>
        <NotConfiguredNotice service="Supabase" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <Heart className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
        <h1 className="mt-4 font-display text-2xl font-bold text-[#0B1F3A]">
          Sign in to view your wishlist
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Bookmark ICs, boards, and sensor modules for upcoming lab builds.
        </p>
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl font-bold text-[#0B1F3A] sm:text-3xl">
        Saved Wishlist ({wishlistProducts.length})
      </h1>

      {wishlistProducts.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-12 text-center">
          <h2 className="font-display text-lg font-semibold text-[#0B1F3A]">Your wishlist is empty</h2>
          <p className="mt-1.5 text-sm text-slate-600">
            Click the heart icon on any component card to save it here.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('/catalog')}
            className="mt-5 rounded-lg bg-[#0B1F3A] px-5 py-2.5 text-xs font-semibold text-white"
          >
            Explore Components
          </button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {wishlistProducts.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              isWishlisted={wishlistIds.has(p.id)}
              onNavigateProduct={(slug) => onNavigate(`/product/${slug}`)}
              onAddToCart={onAddToCart}
              onBuyNow={onBuyNow}
              onToggleWishlist={(id) => toggleWishlist(id, onOpenAuth)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
