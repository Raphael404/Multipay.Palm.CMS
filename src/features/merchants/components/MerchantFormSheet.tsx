import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import type { Merchant } from '@/types';
import { useCreateMerchant, useUpdateMerchant } from '@/features/merchants/api';
import { merchantFormSchema, type MerchantFormValues } from '@/features/merchants/schemas';
import { statusLabel } from '@/components/shared/StatusText';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const STATUSES = ['active', 'suspended', 'pending_kyc', 'closed'] as const;

const EMPTY: MerchantFormValues = {
  name: '',
  legalName: '',
  taxId: '',
  status: 'pending_kyc',
  commissionRate: 2.0,
  contact: { person: '', phone: '', email: '', address: '' },
};

export function MerchantFormSheet({
  open,
  onOpenChange,
  merchant,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  merchant?: Merchant | null;
}) {
  const isEdit = Boolean(merchant);
  const create = useCreateMerchant();
  const update = useUpdateMerchant(merchant?.id ?? '');
  const pending = create.isPending || update.isPending;

  const form = useForm<MerchantFormValues>({
    resolver: zodResolver(merchantFormSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        merchant
          ? {
              name: merchant.name,
              legalName: merchant.legalName,
              taxId: merchant.taxId,
              status: merchant.status,
              commissionRate: merchant.commissionRate,
              contact: { ...merchant.contact },
            }
          : EMPTY,
      );
    }
  }, [open, merchant, form]);

  const onSubmit = form.handleSubmit((values) => {
    const action = isEdit ? update : create;
    action.mutate(values, { onSuccess: () => onOpenChange(false) });
  });

  const err = form.formState.errors;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEdit ? `Edit ${merchant?.name}` : 'Add merchant'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Update legal information, contacts and commission rate.'
              : 'Register a new merchant. New merchants start in Pending KYC.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} className="space-y-4 px-4 pb-4">
          <Field label="Display name" error={err.name?.message}>
            <Input placeholder="Agrohub Vake" {...form.register('name')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Legal name" error={err.legalName?.message}>
              <Input placeholder="Agrohub LLC" {...form.register('legalName')} />
            </Field>
            <Field label="Tax ID" error={err.taxId?.message}>
              <Input placeholder="405123456" inputMode="numeric" {...form.register('taxId')} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status" error={err.status?.message}>
              <Select
                value={form.watch('status')}
                onValueChange={(v) => form.setValue('status', v as MerchantFormValues['status'])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Commission rate (%)" error={err.commissionRate?.message}>
              <Input type="number" step="0.1" {...form.register('commissionRate')} />
            </Field>
          </div>

          <p className="pt-2 text-sm font-semibold text-foreground">Contact</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact person" error={err.contact?.person?.message}>
              <Input placeholder="Giorgi Beridze" {...form.register('contact.person')} />
            </Field>
            <Field label="Phone" error={err.contact?.phone?.message}>
              <Input placeholder="+995 5XX XX XX XX" {...form.register('contact.phone')} />
            </Field>
          </div>
          <Field label="Email" error={err.contact?.email?.message}>
            <Input type="email" placeholder="office@merchant.ge" {...form.register('contact.email')} />
          </Field>
          <Field label="Address" error={err.contact?.address?.message}>
            <Input placeholder="12 Chavchavadze Ave, Tbilisi" {...form.register('contact.address')} />
          </Field>

          <SheetFooter className="px-0">
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Create merchant'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
