import React, { useEffect, useRef, useState } from "react";

export type Suggestion = {
  id?: string;
  label: string; // display e.g. 'Name — CODE'
  name?: string;
  code?: string;
  index?: number; // optional serial number to show in list
};

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  value: string;
  onChange: (v: string) => void;
  onSelect: (s: Suggestion) => void;
  suggestions?: Suggestion[]; // optional static list
  loading?: boolean;
  placeholder?: string;
  maxSuggestions?: number;
  className?: string;
  inputClassName?: string;
};

export function SmartSearchTextbox({
  value,
  onChange,
  onSelect,
  suggestions = [],
  loading = false,
  placeholder = "",
  maxSuggestions = 200,
  className = "",
  inputClassName = "w-44 md:w-56 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
  ...rest
}: Props) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(-1);
  const [internalValue, setInternalValue] = useState(value);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  // Sync internal value when external value changes (e.g., when selection is cleared)
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // Filter suggestions by internalValue (simple substring match)
  const filtered = React.useMemo(() => {
    const q = (internalValue || "").trim().toLowerCase();
    if (!q) return suggestions.slice(0, maxSuggestions);
    return suggestions
      .filter(s => (s.label || "").toLowerCase().includes(q) || (s.code || "").toLowerCase().includes(q))
      .slice(0, maxSuggestions);
  }, [suggestions, internalValue, maxSuggestions]);

  // auto-scroll the highlighted item into view
  useEffect(() => {
    if (!listRef.current || idx < 0) return;
    const items = listRef.current.querySelectorAll('li');
    const el = items[idx] as HTMLElement | undefined;
    if (el) {
      // ensure element is visible in container
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [idx]);

  // close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setIdx(-1);
      }
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setIdx(i => Math.min(i + 1, Math.max(0, filtered.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      setIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && idx >= 0 && idx < filtered.length) {
        e.preventDefault();
        onSelect(filtered[idx]);
        setOpen(false);
        setIdx(-1);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setIdx(-1);
    }
  };

  const handleInputChange = (v: string) => {
    setInternalValue(v);
    onChange(v);
    setOpen(true);
    setIdx(-1);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="flex items-center gap-2">
        <input
          {...rest}
          value={internalValue}
          placeholder={placeholder}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className={inputClassName}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-haspopup="listbox"
        />
        {loading && (
          <svg className="animate-spin h-4 w-4 text-muted-foreground" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
        )}
      </div>

      {open && filtered.length > 0 && (
        <ul ref={listRef} role="listbox" className="absolute z-50 left-0 mt-1 min-w-max max-h-48 overflow-auto border bg-white rounded shadow-lg">
          {filtered.map((s, i) => (
            <li
              key={s.id || s.label}
              role="option"
              aria-selected={i === idx}
              onMouseDown={(e) => e.preventDefault()} // prevent blur before click
              onMouseEnter={() => setIdx(i)}
              onClick={() => { onSelect(s); setOpen(false); setIdx(-1); }}
              className={`px-3 py-2 text-sm cursor-pointer ${i === idx ? 'bg-primary text-white' : 'hover:bg-gray-50'}`}
            >
              <div className="flex justify-between items-center gap-3">
                <div className="flex items-center gap-3">
                  {/* Use filtered position as SRNO so numbering is always visible and consistent */}
                  <span className="inline-flex items-center justify-center text-xs text-muted-foreground w-6 h-5 bg-slate-100 rounded">{i + 1}</span>
                  <span className="truncate font-medium">{s.name || s.label}</span>
                </div>
                {s.code && <span className="font-mono text-xs text-muted-foreground ml-2">{s.code}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SmartSearchTextbox;
