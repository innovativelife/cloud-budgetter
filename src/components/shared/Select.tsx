import { useState, useRef, useEffect } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
}

export function Select({ value, options, onChange, placeholder }: SelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIdx = options.findIndex((o) => o.value === value);
        const nextIdx = e.key === 'ArrowDown'
          ? Math.min(currentIdx + 1, options.length - 1)
          : Math.max(currentIdx - 1, 0);
        onChange(options[nextIdx].value);
      }
      if (e.key === 'Enter') {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, value, options, onChange]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between gap-2 border rounded-md px-3 py-1.5 text-sm text-left bg-white hover:border-gray-400 transition-colors ${
          open ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-300'
        }`}
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-400'}>
          {selectedOption?.label ?? placeholder ?? 'Select...'}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                option.value === value
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
