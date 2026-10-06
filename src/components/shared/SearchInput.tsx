import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Search box that reports changes after the user stops typing, so list pages
 * don't send a request per keystroke.
 */
export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
  delay = 300,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  delay?: number;
}) {
  const [draft, setDraft] = useState(value);
  // Latest callback without restarting the debounce timer on parent re-renders.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Follow external changes (e.g. "Clear filters", back/forward navigation).
  useEffect(() => setDraft(value), [value]);

  useEffect(() => {
    if (draft === value) return;
    const timer = setTimeout(() => onChangeRef.current(draft.trim()), delay);
    return () => clearTimeout(timer);
  }, [draft, value, delay]);

  return (
    <div className={cn('relative w-full max-w-xs', className)}>
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        className="pl-9"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
    </div>
  );
}
