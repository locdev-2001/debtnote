import { z } from 'zod';

export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T12:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Ngày chưa hợp lệ.');
export const amountSchema = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const positiveAmountSchema = amountSchema.min(1);
export const idSchema = z.string().uuid();
export const commandIdSchema = idSchema;
export const participantIdSchema = z.union([idSchema, z.literal('self')]);
export const directionSchema = z.enum(['receivable', 'payable']);
export const phoneSchema = z
  .string()
  .trim()
  .min(9)
  .max(20)
  .transform((phone) => {
    const digits = phone.replace(/[\s().-]/g, '');
    return digits.startsWith('0')
      ? `+84${digits.slice(1)}`
      : digits.startsWith('+')
        ? digits
        : `+${digits}`;
  })
  .refine((phone) => /^\+[1-9]\d{8,14}$/.test(phone), 'SĐT chưa hợp lệ.');
export const pinSchema = z.string().regex(/^\d{6}$/, 'PIN gồm 6 số.');
export const personSchema = z
  .object({
    id: idSchema.optional(),
    name: z.string().trim().min(1).max(60),
    phone: z.string().max(20).default(''),
  })
  .strict();
export const quickDebtSchema = z
  .object({
    commandId: commandIdSchema,
    personId: idSchema.optional(),
    personName: z.string().trim().min(1).max(60).optional(),
    direction: directionSchema,
    amount: positiveAmountSchema,
    note: z.string().trim().max(160).default(''),
    dueDate: dateKeySchema.nullable().default(null),
  })
  .strict()
  .refine((input) => Boolean(input.personId || input.personName), 'Chọn hoặc thêm người.');
export const billInputSchema = z
  .object({
    commandId: commandIdSchema,
    title: z.string().trim().max(80).default('Khoản chung'),
    payerId: participantIdSchema,
    mode: z.enum(['equal', 'custom']),
    participants: z
      .array(z.object({ id: participantIdSchema, name: z.string().trim().min(1).max(60) }).strict())
      .min(1)
      .max(50),
    items: z
      .array(
        z
          .object({
            id: z.string().min(1).max(80),
            title: z.string().trim().min(1).max(80),
            amount: positiveAmountSchema,
            participantIds: z.array(participantIdSchema).min(1).max(50),
          })
          .strict(),
      )
      .min(1)
      .max(100),
    fee: amountSchema.default(0),
    discount: amountSchema.default(0),
    dueDate: dateKeySchema.nullable().default(null),
    attachmentId: idSchema.nullable().default(null),
  })
  .strict();
export const paymentInputSchema = z
  .object({
    commandId: commandIdSchema,
    personId: idSchema,
    direction: directionSchema,
    debtIds: z.array(idSchema).min(1).max(100),
    amount: positiveAmountSchema,
    note: z.string().max(160).default(''),
  })
  .strict();
export const promiseInputSchema = z
  .object({
    commandId: commandIdSchema,
    debtId: idSchema,
    date: dateKeySchema,
    amount: positiveAmountSchema.optional(),
  })
  .strict();
export const shareInputSchema = z
  .object({
    commandId: commandIdSchema,
    personId: idSchema,
    debtIds: z.array(idSchema).min(1).max(100),
    days: z.number().int().min(1).max(90).default(30),
  })
  .strict();
export const guestKeySchema = z.string().regex(/^[a-zA-Z0-9_-]{40,64}$/);
export const guestReportSchema = z
  .object({ key: guestKeySchema, commandId: commandIdSchema, amount: positiveAmountSchema })
  .strict();
export const guestPromiseSchema = z
  .object({
    key: guestKeySchema,
    commandId: commandIdSchema,
    date: dateKeySchema,
    amount: positiveAmountSchema.optional(),
  })
  .strict();
export const guestDisputeSchema = z
  .object({
    key: guestKeySchema,
    commandId: commandIdSchema,
    debtId: idSchema,
    reason: z.enum(['amount', 'items', 'paid', 'other']),
    itemId: z.string().max(80).nullable().default(null),
    note: z.string().trim().max(240).default(''),
  })
  .strict();
export const settingsInputSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    paymentQrPayload: z.string().min(1).max(1024).nullable(),
    remindHour: z.number().int().min(0).max(23).default(9),
    remindersEnabled: z.boolean().default(true),
  })
  .strict();
export const uploadInputSchema = z
  .object({
    name: z.string().max(120),
    mime: z.enum(['image/jpeg', 'image/png', 'image/webp']),
    base64: z.string().min(1).max(14_000_000),
  })
  .strict();
export type BillInput = z.infer<typeof billInputSchema>;
export type PaymentInput = z.infer<typeof paymentInputSchema>;
export type QuickDebtInput = z.infer<typeof quickDebtSchema>;
export type PromiseInput = z.infer<typeof promiseInputSchema>;
export type ShareInput = z.infer<typeof shareInputSchema>;
export type GuestDisputeInput = z.infer<typeof guestDisputeSchema>;
export type SettingsInput = z.infer<typeof settingsInputSchema>;
