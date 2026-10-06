import { z } from 'zod';
import { MERCHANT_STATUSES } from '@/types';

const optional = z.string().trim();

export const merchantFormSchema = z.object({
  merchantName: z.string().trim().min(1, 'Merchant name is required'),
  merchantExternalId: optional,
  customerName: optional,
  taxCode: optional,
  brandName: optional,
  region: optional,
  district: optional,
  address: optional,
  profile: optional,
  merchantCategory: optional,
  contactPhone: optional,
  contactPersonName: optional,
  status: z.enum(MERCHANT_STATUSES),
});

export type MerchantFormValues = z.infer<typeof merchantFormSchema>;
