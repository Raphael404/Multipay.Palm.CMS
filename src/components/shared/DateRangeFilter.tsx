import { useState } from 'react';
import { endOfDay, startOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { CalendarRange } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const toRange = (from?: string, to?: string): DateRange | undefined =>
  from && to ? { from: new Date(from), to: new Date(to) } : undefined;

/** Date range filter; emits start-of-day / end-of-day ISO (UTC) strings. */
export function DateRangeFilter({
  from,
  to,
  onChange,
}: {
  from?: string;
  to?: string;
  onChange: (from?: string, to?: string) => void;
}) {
  // In-progress selection; re-seeded from the applied range on every open.
  const [draft, setDraft] = useState<DateRange | undefined>();
  return (
    <Popover onOpenChange={(open) => open && setDraft(toRange(from, to))}>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <CalendarRange className="size-4" />
          {from && to ? `${formatDate(from, 'dd MMM')} – ${formatDate(to, 'dd MMM')}` : 'Date range'}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={draft}
          defaultMonth={draft?.from}
          onSelect={(range) => {
            setDraft(range);
            if (range?.from && range?.to) {
              onChange(startOfDay(range.from).toISOString(), endOfDay(range.to).toISOString());
            }
          }}
        />
        {(from || draft) && (
          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                setDraft(undefined);
                onChange(undefined, undefined);
              }}
            >
              Clear range
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
