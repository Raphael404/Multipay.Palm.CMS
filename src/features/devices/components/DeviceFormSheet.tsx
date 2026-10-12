import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DEVICE_TYPES, type Device, type DeviceInput } from '@/types';
import { useRegisterDevice, useUpdateDevice } from '@/features/devices/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

const TYPE_OPTIONS = enumOptions(DEVICE_TYPES);

const deviceFormSchema = z
  .object({
    palmModuleSerialNumber: z.string().trim().max(128),
    posUnitSerialNumber: z.string().trim().max(128),
    type: z.enum(DEVICE_TYPES),
    model: z.string().trim().max(128),
    notes: z.string().trim().max(1024),
  })
  .refine((v) => v.palmModuleSerialNumber || v.posUnitSerialNumber, {
    message: 'Enter at least one serial number',
    path: ['palmModuleSerialNumber'],
  });

type DeviceFormValues = z.infer<typeof deviceFormSchema>;

function toFormValues(d?: Device): DeviceFormValues {
  return {
    palmModuleSerialNumber: d?.palmModuleSerialNumber ?? '',
    posUnitSerialNumber: d?.posUnitSerialNumber ?? '',
    type: d?.type ?? 'Standalone',
    model: d?.model ?? '',
    notes: d?.notes ?? '',
  };
}

/** Empty optional fields are sent as null. */
function toInput(v: DeviceFormValues): DeviceInput {
  const orNull = (s: string) => (s === '' ? null : s);
  return {
    palmModuleSerialNumber: orNull(v.palmModuleSerialNumber),
    posUnitSerialNumber: orNull(v.posUnitSerialNumber),
    type: v.type,
    model: orNull(v.model),
    notes: orNull(v.notes),
  };
}

/** Edit an existing device, or register a new one when `device` is omitted. */
export function DeviceFormSheet({
  open,
  onOpenChange,
  device,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device?: Device;
  onCreated?: (device: Device) => void;
}) {
  const update = useUpdateDevice(device?.id ?? '');
  const register = useRegisterDevice();
  const pending = update.isPending || register.isPending;

  const form = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceFormSchema),
    defaultValues: toFormValues(device),
  });

  // Reset only when the sheet opens, so a background refetch doesn't wipe edits.
  useEffect(() => {
    if (open) form.reset(toFormValues(device));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = form.handleSubmit((v) => {
    const close = () => onOpenChange(false);
    if (device) {
      update.mutate(toInput(v), { onSuccess: close });
    } else {
      register.mutate(toInput(v), {
        onSuccess: (created) => {
          close();
          onCreated?.(created);
        },
      });
    }
  });

  const err = form.formState.errors;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {device ? `Edit ${device.palmModuleSerialNumber ?? 'device'}` : 'Register device'}
          </SheetTitle>
          <SheetDescription>Serial numbers, type, model and notes.</SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} className="space-y-4 px-4 pb-4">
          <FormField label="Palm module serial" error={err.palmModuleSerialNumber?.message}>
            <Input {...form.register('palmModuleSerialNumber')} />
          </FormField>
          <FormField label="POS unit serial" error={err.posUnitSerialNumber?.message}>
            <Input {...form.register('posUnitSerialNumber')} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Type" error={err.type?.message}>
              <OptionSelect
                value={form.watch('type')}
                onChange={(v) => v && form.setValue('type', v)}
                options={TYPE_OPTIONS}
                className="w-full"
              />
            </FormField>
            <FormField label="Model" error={err.model?.message}>
              <Input {...form.register('model')} />
            </FormField>
          </div>
          <FormField label="Notes" error={err.notes?.message}>
            <Textarea rows={4} {...form.register('notes')} />
          </FormField>

          <SheetFooter className="px-0">
            <LoadingButton type="submit" pending={pending}>
              {device ? 'Save changes' : 'Register'}
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
