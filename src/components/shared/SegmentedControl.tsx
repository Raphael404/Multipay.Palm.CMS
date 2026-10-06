import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const segmentClass = (active: boolean) =>
  cn(
    'h-8 rounded-lg px-3',
    active && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
  );

/** Pill group of mutually exclusive options (period, granularity, ...). */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  children,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Extra segments rendered after the options (e.g. a custom-range popover). */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
      {options.map((o) => (
        <Button
          key={o.value}
          size="sm"
          variant="ghost"
          className={segmentClass(o.value === value)}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </Button>
      ))}
      {children}
    </div>
  );
}
