import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MERCHANT_STATUSES, type MerchantDetail } from '@/types';
import { useUpdateMerchant } from '@/features/merchants/api';
import { merchantFormSchema, type MerchantFormValues } from '@/features/merchants/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/shared/FormField';
import { LoadingButton } from '@/components/shared/LoadingButton';
import { OptionSelect, enumOptions } from '@/components/shared/OptionSelect';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

type TextField = Exclude<keyof MerchantFormValues, 'status'>;

const STATUS_OPTIONS = enumOptions(MERCHANT_STATUSES);

const TEXT_FIELDS = [
  'merchantName',
  'merchantExternalId',
  'customerName',
  'taxCode',
  'brandName',
  'region',
  'district',
  'address',
  'profile',
  'merchantCategory',
  'contactPhone',
  'contactPersonName',
] as const satisfies readonly TextField[];

function toFormValues(m: MerchantDetail): MerchantFormValues {
  const values = { status: m.status } as MerchantFormValues;
  for (const key of TEXT_FIELDS) values[key] = m[key] ?? '';
  return values;
}

export function MerchantFormSheet({
  open,
  onOpenChange,
  merchant,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  merchant: MerchantDetail;
}) {
  const update = useUpdateMerchant(merchant.id);

  const form = useForm<MerchantFormValues>({
    resolver: zodResolver(merchantFormSchema),
    defaultValues: toFormValues(merchant),
  });

  useEffect(() => {
    if (open) form.reset(toFormValues(merchant));
  }, [open, merchant, form]);

  const onSubmit = form.handleSubmit((v) => {
    // Optional fields are sent as null when left empty.
    const input = { id: merchant.id, status: v.status } as Parameters<typeof update.mutate>[0];
    for (const key of TEXT_FIELDS) input[key] = v[key] === '' ? null : v[key];
    update.mutate(input, { onSuccess: () => onOpenChange(false) });
  });

  const err = form.formState.errors;
  const text = (name: TextField, label: string, placeholder?: string) => (
    <FormField label={label} error={err[name]?.message}>
      <Input placeholder={placeholder} {...form.register(name)} />
    </FormField>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Edit {merchant.merchantName ?? 'merchant'}</SheetTitle>
          <SheetDescription>Update legal information, location and contacts.</SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} className="space-y-4 px-4 pb-4">
          {text('merchantName', 'Merchant name')}
          <div className="grid grid-cols-2 gap-3">
            {text('brandName', 'Brand name')}
            {text('customerName', 'Customer name')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {text('taxCode', 'Tax code')}
            {text('merchantExternalId', 'External ID')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Status" error={err.status?.message}>
              <OptionSelect
                value={form.watch('status')}
                onChange={(v) => v && form.setValue('status', v)}
                options={STATUS_OPTIONS}
                className="w-full"
              />
            </FormField>
            {text('merchantCategory', 'Category')}
          </div>
          {text('profile', 'Profile')}

          <p className="pt-2 text-sm font-semibold text-foreground">Location</p>
          <div className="grid grid-cols-2 gap-3">
            {text('region', 'Region')}
            {text('district', 'District')}
          </div>
          {text('address', 'Address')}

          <p className="pt-2 text-sm font-semibold text-foreground">Contact</p>
          <div className="grid grid-cols-2 gap-3">
            {text('contactPersonName', 'Contact person')}
            {text('contactPhone', 'Phone', '+995 5XX XX XX XX')}
          </div>

          <SheetFooter className="px-0">
            <LoadingButton type="submit" pending={update.isPending}>
              Save changes
            </LoadingButton>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
