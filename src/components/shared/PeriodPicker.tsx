import { useMemo, useState } from 'react';
import { CalendarRange } from 'lucide-react';
import { endOfDay, format, startOfDay, subDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SegmentedControl, segmentClass } from '@/components/shared/SegmentedControl';

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

function periodToRange(value: PeriodValue): { from: string; to: string } {
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

const PRESETS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
] as const satisfies readonly { value: Period; label: string }[];

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
    <SegmentedControl<Period>
      options={PRESETS}
      value={value.period}
      onChange={(period) => onChange({ period })}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" variant="ghost" className={segmentClass(value.period === 'custom')}>
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
                  to: endOfDay(range.to).toISOString(),
                });
                setOpen(false);
              }
            }}
          />
        </PopoverContent>
      </Popover>
    </SegmentedControl>
  );
}
