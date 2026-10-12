import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { CheckIcon, ChevronDownIcon, Loader2, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { Option } from '@/components/shared/OptionSelect';

const ALL = '__all__';

/**
 * OptionSelect with a search box, for option lists loaded from the backend
 * (merchants, terminals, devices, users). Filters client-side by label.
 */
export function SearchableSelect<T extends string>({
  value,
  onChange,
  options,
  allLabel,
  placeholder,
  className = 'w-44',
  size = 'default',
  loading,
  emptyText = 'No results',
  searchPlaceholder = 'Search...',
}: {
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  options: readonly Option<T>[];
  allLabel?: string;
  placeholder?: string;
  className?: string;
  size?: 'sm' | 'default';
  loading?: boolean;
  emptyText?: string;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
    return allLabel && !q ? [{ value: ALL, label: allLabel }, ...matches] : matches;
  }, [options, query, allLabel]);

  // Keep the highlight inside the list when the search narrows it.
  const active = Math.min(activeIndex, Math.max(0, items.length - 1));
  const optionId = (i: number) => `${id}-option-${i}`;

  const selected = options.find((o) => o.value === value);
  const triggerLabel = selected?.label ?? (value ? value : (allLabel ?? placeholder));
  const isPlaceholder = !selected && !allLabel;

  const setOpenState = (next: boolean) => {
    setOpen(next);
    if (!next) setQuery('');
    else setActive(Math.max(0, items.findIndex((o) => o.value === (value ?? ALL))));
  };

  const pick = (v: string) => {
    onChange(v === ALL ? undefined : (v as T));
    setOpenState(false);
  };

  const move = (delta: number) => {
    if (items.length === 0) return;
    const next = (active + delta + items.length) % items.length;
    setActive(next);
    listRef.current?.querySelector(`[data-index="${next}"]`)?.scrollIntoView({ block: 'nearest' });
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = items[active];
      if (item) pick(item.value);
    }
  };

  return (
    // `modal` gives the popover its own scroll lock, so the list scrolls inside dialogs.
    <Popover open={open} onOpenChange={setOpenState} modal>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          data-size={size}
          className={cn(
            'flex items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 dark:bg-input/30 dark:hover:bg-input/50',
            className,
          )}
        >
          <span className={cn('line-clamp-1 text-left', isPlaceholder && 'text-muted-foreground')}>
            {triggerLabel}
          </span>
          <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto min-w-(--radix-popover-trigger-width) max-w-96 p-0"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).querySelector('input')?.focus();
        }}
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            role="combobox"
            aria-expanded
            aria-controls={`${id}-listbox`}
            aria-activedescendant={items.length > 0 ? optionId(active) : undefined}
            aria-autocomplete="list"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder={searchPlaceholder}
            className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div ref={listRef} id={`${id}-listbox`} role="listbox" className="max-h-64 overflow-y-auto p-1">
          {loading && options.length === 0 ? (
            <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </div>
          ) : items.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">{emptyText}</p>
          ) : (
            items.map((o, i) => {
              const isSelected = o.value === (value ?? (allLabel ? ALL : undefined));
              return (
                <div
                  key={o.value}
                  id={optionId(i)}
                  role="option"
                  aria-selected={isSelected}
                  data-index={i}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(o.value)}
                  className={cn(
                    'relative flex cursor-default items-center rounded-sm py-1.5 pr-8 pl-2 text-sm select-none',
                    i === active && 'bg-accent text-accent-foreground',
                  )}
                >
                  <span className="line-clamp-1">{o.label}</span>
                  {isSelected && <CheckIcon className="absolute right-2 size-4" />}
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
