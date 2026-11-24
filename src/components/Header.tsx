import React, { useEffect, useRef, useState } from 'react';
import {
  Cpu,
  Heart,
  LogOut,
  Menu,
  Package,
  Search,
  ShieldCheck,
  ShoppingCart,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { computeEffectivePrice, formatINR } from '../lib/pricing';
import { fetchSearchSuggestions } from '../services/catalogService';

export interface NavItem {
  label: string;
  path: string;
  categorySlug?: string;
  query?: string;
}

export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { label: 'Home', path: '/' },
  { label: 'All Components', path: '/catalog' },
  { label: 'ICs', path: '/catalog?category=ics', categorySlug: 'ics' },
  { label: 'Arduino & ESP32', path: '/catalog?category=development-boards', categorySlug: 'development-boards' },
  { label: 'Sensors', path: '/catalog?category=sensors', categorySlug: 'sensors' },
  { label: 'FPGA & VLSI', path: '/catalog?category=development-boards&q=FPGA', categorySlug: 'development-boards', query: 'FPGA' },
  { label: 'Displays', path: '/catalog?category=displays', categorySlug: 'displays' },
  { label: 'Robotics', path: '/catalog?category=robotics-motor-drivers', categorySlug: 'robotics-motor-drivers' },
  { label: 'Power Supply', path: '/catalog?category=power-supply', categorySlug: 'power-supply' },
  { label: 'Electronics Kits', path: '/catalog?category=ece-lab-kits', categorySlug: 'ece-lab-kits' },
  { label: 'Tools & Accessories', path: '/catalog?category=breadboards-prototyping', categorySlug: 'breadboards-prototyping' },
];

interface HeaderProps {
  currentPath: string;
  searchQuery: string;
  onNavigate: (path: string) => void;
  onSearchSubmit: (query: string) => void;
  onOpenAuth: () => void;
}

export function Header({
  currentPath,
  searchQuery,
  onNavigate,
  onSearchSubmit,
  onOpenAuth,
}: HeaderProps) {
  const { user, profile, isAdmin, signOut } = useAuth();
  const { itemCount, wishlistProducts, setIsCartOpen } = useCart();

  const [inputVal, setInputVal] = useState(searchQuery);
  const [suggestions, setSuggestions] = useState<
    { id: string; name: string; slug: string; model_number: string; price: number; discount_percent: number }[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const accountWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputVal(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const trimmed = inputVal.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetchSearchSuggestions(trimmed);
        setSuggestions(res);
      } catch {
        setSuggestions([]);
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [inputVal]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
      if (accountWrapRef.current && !accountWrapRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    onSearchSubmit(inputVal.trim());
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      {/* Main Bar */}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-3 lg:gap-8">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg border border-slate-200 text-[#0B1F3A] hover:bg-slate-50 lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/');
            }}
            className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] rounded-md"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0B1F3A] text-[#F97316]">
              <Cpu className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <span className="font-display text-lg sm:text-xl font-extrabold tracking-tight text-[#0B1F3A]">
              SHMX
            </span>
          </a>
        </div>

        {/* Search Bar */}
        <div ref={searchWrapRef} className="relative hidden flex-1 max-w-2xl md:block">
          <form onSubmit={handleFormSubmit} className="relative flex items-center">
            <label htmlFor="desktop-ece-search" className="sr-only">
              Search ECE components
            </label>
            <Search
              className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="desktop-ece-search"
              type="search"
              value={inputVal}
              onFocus={() => setShowSuggestions(true)}
              onChange={(e) => {
                setInputVal(e.target.value);
                setShowSuggestions(true);
              }}
              placeholder="Search ICs, sensors, Arduino, FPGA..."
              className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-24 text-sm text-[#0B1F3A] placeholder:text-slate-400 focus:border-[#0B1F3A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F97316]/30"
            />
            <button
              type="submit"
              className="absolute right-1 h-8 rounded-md bg-[#0B1F3A] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#16335B] whitespace-nowrap"
            >
              Search
            </button>
          </form>

          {showSuggestions && suggestions.length > 0 && (
            <div
              role="listbox"
              aria-label="Component suggestions"
              className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
            >
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => {
                    setShowSuggestions(false);
                    onNavigate(`/product/${s.slug}`);
                  }}
                  className="flex w-full items-center justify-between gap-4 border-b border-slate-100 px-4 py-2.5 text-left text-sm hover:bg-slate-50 last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-[#0B1F3A] truncate">{s.name}</div>
                    <div className="font-mono text-xs text-slate-500">{s.model_number}</div>
                  </div>
                  <span className="font-mono text-xs font-semibold text-[#0B1F3A] tabular-nums shrink-0">
                    {formatINR(computeEffectivePrice(s.price, s.discount_percent))}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Account, Wishlist, Orders, Cart */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {user ? (
            <div ref={accountWrapRef} className="relative">
              <button
                type="button"
                onClick={() => setAccountMenuOpen((o) => !o)}
                aria-expanded={accountMenuOpen}
                className="inline-flex h-9 sm:h-10 items-center gap-1.5 sm:gap-2 rounded-lg border border-slate-200 px-2.5 sm:px-3 text-xs font-semibold text-[#0B1F3A] hover:bg-slate-50 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]"
              >
                <User className="h-4 w-4 text-[#F97316]" aria-hidden="true" />
                <span className="max-w-[72px] sm:max-w-[96px] truncate">
                  {profile?.full_name?.split(' ')[0] || 'Account'}
                </span>
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 top-11 z-50 w-52 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      onNavigate('/account');
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-[#0B1F3A] hover:bg-slate-50"
                  >
                    <User className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    Profile & Addresses
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      onNavigate('/orders');
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-[#0B1F3A] hover:bg-slate-50"
                  >
                    <Package className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    My Orders
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onNavigate('/admin');
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm font-semibold text-[#F97316] hover:bg-slate-50"
                    >
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                      Admin Dashboard
                    </button>
                  )}
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    type="button"
                    onClick={async () => {
                      setAccountMenuOpen(false);
                      await signOut();
                      onNavigate('/');
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-red-600 hover:bg-slate-50"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="inline-flex h-9 sm:h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 sm:px-3 text-xs font-semibold text-[#0B1F3A] transition-colors hover:border-[#0B1F3A] hover:bg-slate-50 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]"
            >
              <User className="h-4 w-4 text-[#0B1F3A]" aria-hidden="true" />
              <span className="sm:hidden">Login</span>
              <span className="hidden sm:inline">Login / Sign Up</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onNavigate('/orders')}
            className="hidden sm:inline-flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-[#0B1F3A] hover:bg-slate-50 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]"
          >
            <Package className="h-4 w-4 text-slate-600" aria-hidden="true" />
            <span>My Orders</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/wishlist')}
            aria-label={`Wishlist (${wishlistProducts.length} items)`}
            className="inline-flex h-9 sm:h-10 items-center gap-1.5 rounded-lg px-2 sm:px-2.5 text-xs font-semibold text-[#0B1F3A] hover:bg-slate-50 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]"
          >
            <Heart className="h-4 w-4 text-slate-600" aria-hidden="true" />
            <span className="hidden lg:inline">Wishlist</span>
            {wishlistProducts.length > 0 && (
              <span className="font-mono text-xs text-[#F97316] tabular-nums">
                ({wishlistProducts.length})
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            aria-label={`Open shopping cart with ${itemCount} items`}
            className="inline-flex h-9 sm:h-10 items-center gap-1.5 sm:gap-2 rounded-lg bg-[#0B1F3A] px-2.5 sm:px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#16335B] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]"
          >
            <ShoppingCart className="h-4 w-4 text-[#F97316]" aria-hidden="true" />
            <span className="hidden sm:inline">Cart</span>
            <span
              data-testid="cart-count"
              className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-[11px] tabular-nums"
            >
              {itemCount}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="border-t border-slate-100 px-3 py-1.5 md:hidden">
        <form onSubmit={handleFormSubmit} className="relative flex items-center">
          <label htmlFor="mobile-ece-search" className="sr-only">
            Search ECE components
          </label>
          <Search
            className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400"
            aria-hidden="true"
          />
          <input
            id="mobile-ece-search"
            type="search"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Search ICs, sensors, Arduino, FPGA..."
            className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 pl-9 pr-16 text-sm text-[#0B1F3A] placeholder:text-slate-400 focus:border-[#0B1F3A] focus:bg-white focus:outline-none"
          />
          <button
            type="submit"
            className="absolute right-1 h-7 rounded bg-[#0B1F3A] px-2.5 text-xs font-semibold text-white"
          >
            Go
          </button>
        </form>
      </div>

      {/* Desktop Category Nav Row */}
      <nav
        aria-label="Component categories"
        className="hidden border-t border-slate-100 bg-slate-50/70 lg:block"
      >
        <div className="mx-auto flex max-w-7xl items-center gap-5 overflow-x-auto px-6 py-2 no-scrollbar">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const isActive =
              item.path === '/'
                ? currentPath === '/'
                : currentPath.startsWith(item.path.split('?')[0]) &&
                  (item.categorySlug
                    ? currentPath.includes(item.categorySlug) &&
                      (item.query ? currentPath.includes(item.query) : !currentPath.includes('q=FPGA'))
                    : currentPath === '/catalog');
            return (
              <a
                key={item.label}
                href={item.path}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(item.path);
                }}
                className={`whitespace-nowrap shrink-0 border-b-2 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'border-[#F97316] text-[#0B1F3A] font-semibold'
                    : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-[#0B1F3A]'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </div>
      </nav>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-[#0B1F3A]/40 backdrop-blur-[1px]"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside
            aria-label="Mobile navigation"
            className="relative z-10 flex h-full w-80 max-w-[85vw] flex-col bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded bg-[#0B1F3A] text-[#F97316]">
                  <Cpu className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="font-display text-lg font-extrabold text-[#0B1F3A]">SHMX</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="space-y-1">
                <p className="px-2 pb-1.5 text-xs font-semibold text-slate-400">
                  Browse ECE Catalog
                </p>
                {PRIMARY_NAV_ITEMS.map((item) => (
                  <a
                    key={item.label}
                    href={item.path}
                    onClick={(e) => {
                      e.preventDefault();
                      setMobileMenuOpen(false);
                      onNavigate(item.path);
                    }}
                    className="flex h-10 items-center rounded-lg px-2.5 text-sm font-medium text-[#0B1F3A] hover:bg-slate-100"
                  >
                    {item.label}
                  </a>
                ))}
              </div>

              <div className="mt-6 border-t border-slate-200 pt-4 space-y-1">
                <p className="px-2 pb-1.5 text-xs font-semibold text-slate-400">Account</p>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('/orders');
                  }}
                  className="flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm font-medium text-[#0B1F3A] hover:bg-slate-100"
                >
                  <Package className="h-4 w-4 text-slate-500" aria-hidden="true" />
                  My Orders
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('/wishlist');
                  }}
                  className="flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm font-medium text-[#0B1F3A] hover:bg-slate-100"
                >
                  <Heart className="h-4 w-4 text-slate-500" aria-hidden="true" />
                  Wishlist
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onNavigate('/admin');
                    }}
                    className="flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm font-semibold text-[#F97316] hover:bg-slate-100"
                  >
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    Admin Dashboard
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}
