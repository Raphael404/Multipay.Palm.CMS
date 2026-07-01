import { z } from 'zod';

export const merchantFormSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  legalName: z.string().min(2, 'Legal name is required'),
  taxId: z
    .string()
    .regex(/^\d{9}$/, 'Georgian tax ID is 9 digits'),
  status: z.enum(['active', 'suspended', 'pending_kyc', 'closed']),
  commissionRate: z.coerce
    .number<number>()
    .min(0.1, 'Min 0.1%')
    .max(10, 'Max 10%'),
  contact: z.object({
    person: z.string().min(2, 'Contact person is required'),
    phone: z.string().min(9, 'Phone is required'),
    email: z.email('Valid email required'),
    address: z.string().min(5, 'Address is required'),
  }),
});

export type MerchantFormValues = z.infer<typeof merchantFormSchema>;
