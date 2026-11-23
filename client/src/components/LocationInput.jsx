import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { api } from '../services/api.js';

export default function LocationInput({
  label,
  value,
  onChange,
  placeholder,
  dotClassName,
  paddingRight = '',
}) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const skipFetchRef = useRef(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced suggestion fetch
  useEffect(() => {
    if (!open) return;
    if (skipFetchRef.current) {
      skipFetchRef.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.searchLocations(value);
        setSuggestions(res.suggestions || []);
        setActiveIndex(-1);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 160);

    return () => clearTimeout(timer);
  }, [value, open]);

  const handleSelect = (itemLabel) => {
    skipFetchRef.current = true;
    onChange(itemLabel);
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!open || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex].label);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative flex items-center px-4 py-1.5">
      <span className={`w-2.5 h-2.5 rounded-full shrink-0 mr-3.5 ${dotClassName}`} />
      <div className={`flex-1 ${paddingRight}`}>
        <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 pt-1">
          {label}
        </div>
        <input
          type="text"
          value={value}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            if (!open) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          placeholder={placeholder}
          className="w-full pb-2 pt-0.5 bg-transparent text-[15px] font-semibold text-stone-900 dark:text-stone-100 placeholder:text-stone-400 outline-none"
        />
      </div>

      {/* Autocomplete Suggestions Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-xl overflow-hidden">
          {loading && suggestions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-stone-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
              Searching US locations...
            </div>
          ) : suggestions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-stone-500">
              No matching US cities found for &ldquo;{value}&rdquo;
            </div>
          ) : (
            <ul className="max-h-56 overflow-y-auto py-1">
              {suggestions.map((s, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <li key={`${s.label}-${idx}`}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelect(s.label);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2.5 transition-colors ${
                        isActive
                          ? 'bg-orange-50 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300'
                          : 'text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
                      }`}
                    >
                      <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
                      <span className="truncate">{s.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
