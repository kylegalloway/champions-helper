import { useState, useRef, useMemo } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
  required?: boolean;
  id?: string;
}

export function AutocompleteInput({
  value,
  onChange,
  suggestions,
  placeholder,
  className,
  required,
  id,
}: Props) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = value.toLowerCase();
    if (!q) return [];
    return suggestions.filter((s) => s.toLowerCase().includes(q)).slice(0, 8);
  }, [value, suggestions]);

  function select(s: string) {
    onChange(s);
    setOpen(false);
    inputRef.current?.blur();
  }

  function handleKey(e: React.KeyboardEvent) {
    if (!open || filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      select(filtered[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setHighlighted(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        className={className}
        required={required}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 mt-0.5 w-full bg-gray-900 border border-gray-700 rounded shadow-lg z-30 max-h-48 overflow-y-auto">
          {filtered.map((s, i) => (
            <button
              key={s}
              type="button"
              onMouseDown={() => select(s)}
              className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                i === highlighted ? 'bg-gray-700 text-white' : 'text-gray-200 hover:bg-gray-800'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
