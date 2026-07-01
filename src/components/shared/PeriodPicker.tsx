import { useMemo, useState } from 'react';
import { CalendarRange } from 'lucide-react';
import { subDays, format, startOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type Period = 'today' | '7d' | '30d' | 'custom';

export interface PeriodValue {
  period: Period;
  from?: string; // ISO, only when period === 'custom'
  to?: string;
}

/**
 * Stable, memoized version of periodToRange. Use this inside components:
 * periodToRange reads the current time, so calling it on every render would
 * produce a new value each time and put React Query keys in an endless
 * refetch loop.
 */
export function usePeriodRange(value: PeriodValue): { from: string; to: string } {
  return useMemo(
    () => periodToRange(value),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value.period, value.from, value.to],
  );
}

export function periodToRange(value: PeriodValue): { from: string; to: string } {
  const now = new Date();
  switch (value.period) {
    case 'today':
      return { from: startOfDay(now).toISOString(), to: now.toISOString() };
    case '7d':
      return { from: subDays(now, 7).toISOString(), to: now.toISOString() };
    case '30d':
      return { from: subDays(now, 30).toISOString(), to: now.toISOString() };
    case 'custom':
      return {
        from: value.from ?? subDays(now, 30).toISOString(),
        to: value.to ?? now.toISOString(),
      };
  }
}

const PRESETS: { period: Period; label: string }[] = [
  { period: 'today', label: 'Today' },
  { period: '7d', label: '7d' },
  { period: '30d', label: '30d' },
];

export function PeriodPicker({
  value,
  onChange,
}: {
  value: PeriodValue;
  onChange: (value: PeriodValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>();

  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
      {PRESETS.map((p) => (
        <Button
          key={p.period}
          size="sm"
          variant="ghost"
          className={cn(
            'h-8 rounded-lg px-3',
            value.period === p.period && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
          )}
          onClick={() => onChange({ period: p.period })}
        >
          {p.label}
        </Button>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              'h-8 rounded-lg px-3',
              value.period === 'custom' && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
            )}
          >
            <CalendarRange className="size-4" />
            {value.period === 'custom' && value.from && value.to
              ? `${format(new Date(value.from), 'dd MMM')} – ${format(new Date(value.to), 'dd MMM')}`
              : 'Custom'}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={draft}
            onSelect={(range) => {
              setDraft(range);
              if (range?.from && range?.to) {
                onChange({
                  period: 'custom',
                  from: startOfDay(range.from).toISOString(),
                  to: new Date(range.to.setHours(23, 59, 59, 999)).toISOString(),
                });
                setOpen(false);
              }
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
