import { Cpu } from 'lucide-react';

interface FooterProps {
  onNavigate: (path: string) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const linkClass =
    'text-sm text-slate-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:underline';

  return (
    <footer className="mt-16 border-t border-slate-200 bg-[#0B1F3A] text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-[#F97316]">
                <Cpu className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <span className="font-display text-xl font-extrabold tracking-tight">SHMX</span>
            </div>
            <p className="text-sm font-medium text-[#F97316]">
              Your One-Stop ECE Components Store.
            </p>
            <p className="text-xs leading-relaxed text-slate-300">
              Precision integrated circuits, development boards, sensors, power electronics, and
              university ECE lab kits engineered for makers, students, and hardware teams.
            </p>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-white">Core Categories</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <a
                  href="/catalog?category=ics"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/catalog?category=ics');
                  }}
                  className={linkClass}
                >
                  Logic & Analog ICs
                </a>
              </li>
              <li>
                <a
                  href="/catalog?category=development-boards"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/catalog?category=development-boards');
                  }}
                  className={linkClass}
                >
                  Arduino, ESP32 & FPGA
                </a>
              </li>
              <li>
                <a
                  href="/catalog?category=sensors"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/catalog?category=sensors');
                  }}
                  className={linkClass}
                >
                  Sensors & Modules
                </a>
              </li>
              <li>
                <a
                  href="/catalog?category=ece-lab-kits"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/catalog?category=ece-lab-kits');
                  }}
                  className={linkClass}
                >
                  ECE Lab & Learning Kits
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-white">More Hardware</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <a
                  href="/catalog?category=displays"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/catalog?category=displays');
                  }}
                  className={linkClass}
                >
                  OLED & LCD Displays
                </a>
              </li>
              <li>
                <a
                  href="/catalog?category=robotics-motor-drivers"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/catalog?category=robotics-motor-drivers');
                  }}
                  className={linkClass}
                >
                  Robotics & Motor Drivers
                </a>
              </li>
              <li>
                <a
                  href="/catalog?category=communication-modules"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/catalog?category=communication-modules');
                  }}
                  className={linkClass}
                >
                  RF, Bluetooth & GPS
                </a>
              </li>
              <li>
                <a
                  href="/catalog?category=power-supply"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/catalog?category=power-supply');
                  }}
                  className={linkClass}
                >
                  Power Supply & Batteries
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-white">Customer & Store</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <a
                  href="/orders"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/orders');
                  }}
                  className={linkClass}
                >
                  My Orders
                </a>
              </li>
              <li>
                <a
                  href="/wishlist"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/wishlist');
                  }}
                  className={linkClass}
                >
                  Saved Wishlist
                </a>
              </li>
              <li>
                <a
                  href="/account"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/account');
                  }}
                  className={linkClass}
                >
                  Account & Addresses
                </a>
              </li>
              <li>
                <a
                  href="/admin"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/admin');
                  }}
                  className={linkClass}
                >
                  Admin Console
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} SHMX Electronics. All rights reserved.</span>
          <span>Dedicated to Electronics & Communication Engineering Components</span>
        </div>
      </div>
    </footer>
  );
}
