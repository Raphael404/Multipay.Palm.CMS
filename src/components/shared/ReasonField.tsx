import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/shared/FormField';

/** Backend limit for action reasons (assign, suspend, status change…). */
export const REASON_MAX = 512;

/** Blank reasons are omitted from the request. */
export const optionalReason = (reason: string) => reason.trim() || undefined;

export function ReasonField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <FormField label="Reason">
      <Textarea value={value} maxLength={REASON_MAX} onChange={(e) => onChange(e.target.value)} />
    </FormField>
  );
}
