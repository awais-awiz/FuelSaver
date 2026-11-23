import React from 'react';
import { Link } from 'react-router-dom';
import { Fuel, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';

export default function Navbar() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 h-14 border-b border-stone-200 dark:border-stone-800 bg-white/95 dark:bg-stone-950/95 backdrop-blur-md">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-700 text-white flex items-center justify-center shadow-sm shadow-orange-600/25">
            <Fuel className="w-4 h-4" />
          </div>
          <div className="leading-none">
            <span className="font-display font-extrabold text-[15px] tracking-tight text-stone-900 dark:text-stone-100">
              Fuel<span className="text-orange-600 dark:text-orange-400">Saver</span>
            </span>
            <span className="block text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-400 mt-0.5">
              Optimal Fuel Routing
            </span>
          </div>
        </Link>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:border-orange-400 flex items-center justify-center transition-colors"
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
