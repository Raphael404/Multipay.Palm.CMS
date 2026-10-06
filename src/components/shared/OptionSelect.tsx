import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { statusLabel } from '@/components/shared/StatusText';

const ALL = '__all__';

export interface Option<T extends string = string> {
  value: T;
  label: string;
}

/** Options for an enum list, labelled with statusLabel ("InRepair" → "In Repair"). */
export function enumOptions<T extends string>(values: readonly T[]): Option<T>[] {
  return values.map((value) => ({ value, label: statusLabel(value) }));
}

/**
 * Select over a list of options. With `allLabel` it gets an extra "All …"
 * entry that maps to `undefined` (for filters).
 */
export function OptionSelect<T extends string>({
  value,
  onChange,
  options,
  allLabel,
  placeholder,
  className = 'w-44',
  size,
}: {
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  options: readonly Option<T>[];
  allLabel?: string;
  placeholder?: string;
  className?: string;
  size?: 'sm' | 'default';
}) {
  return (
    <Select
      value={value ?? (allLabel ? ALL : '')}
      onValueChange={(v) => onChange(v === ALL ? undefined : (v as T))}
    >
      <SelectTrigger className={className} size={size}>
        <SelectValue placeholder={placeholder ?? allLabel} />
      </SelectTrigger>
      <SelectContent>
        {allLabel && <SelectItem value={ALL}>{allLabel}</SelectItem>}
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
