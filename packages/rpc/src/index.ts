import { DomainError } from '@debtnote/application';
import {
  billInputSchema,
  guestDisputeSchema,
  guestKeySchema,
  guestPromiseSchema,
  guestReportSchema,
  type Identity,
  idSchema,
  paymentInputSchema,
  personSchema,
  phoneSchema,
  pinSchema,
  promiseInputSchema,
  quickDebtSchema,
  settingsInputSchema,
  shareInputSchema,
  uploadInputSchema,
} from '@debtnote/contracts';
import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { ApiServices } from './services';

export type { ApiServices } from './services';

export interface RpcContext {
  requestId: string;
  services?: ApiServices;
  user?: Identity | null;
  sessionToken?: string;
  setSession?: (token: string | null) => void;
  ip?: string;
}
const rpc = initTRPC.context<RpcContext>().create({
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    message:
      error.code === 'INTERNAL_SERVER_ERROR'
        ? 'Chưa thực hiện được. Vui lòng thử lại.'
        : error.code === 'BAD_REQUEST' && error.cause instanceof z.ZodError
          ? 'Kiểm tra lại thông tin.'
          : shape.message,
    data: { ...shape.data, stack: undefined },
  }),
});
const serviceProcedure = rpc.procedure.use(async ({ ctx, next }) => {
  if (!ctx.services) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
  const result = await next({ ctx: { ...ctx, services: ctx.services } });
  if (!result.ok && result.error.cause instanceof DomainError)
    throw new TRPCError({ code: result.error.cause.kind, message: result.error.cause.message });
  return result;
});
const ownerProcedure = serviceProcedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập.' });
  return next({ ctx: { ...ctx, user: ctx.user } });
});
const authInput = z.object({ phone: phoneSchema, pin: pinSchema }).strict();
const commandTarget = z.object({ commandId: idSchema, id: idSchema }).strict();

export const appRouter = rpc.router({
  system: rpc.router({
    status: rpc.procedure
      .output(z.object({ service: z.literal('debtnote'), status: z.literal('ok') }))
      .query(() => ({ service: 'debtnote' as const, status: 'ok' as const })),
  }),
  auth: rpc.router({
    me: serviceProcedure.query(({ ctx }) => ctx.user ?? null),
    enter: serviceProcedure.input(authInput).mutation(async ({ ctx, input }) => {
      const response = await ctx.services.auth.enter(input.phone, input.pin, ctx.ip ?? 'local');
      ctx.setSession?.(response.sessionToken);
      return response.user;
    }),
    register: serviceProcedure.input(authInput).mutation(async ({ ctx, input }) => {
      const response = await ctx.services.auth.register(input.phone, input.pin, ctx.ip ?? 'local');
      ctx.setSession?.(response.sessionToken);
      return response.user;
    }),
    login: serviceProcedure.input(authInput).mutation(async ({ ctx, input }) => {
      const response = await ctx.services.auth.login(input.phone, input.pin, ctx.ip ?? 'local');
      ctx.setSession?.(response.sessionToken);
      return response.user;
    }),
    logout: serviceProcedure.mutation(async ({ ctx }) => {
      await ctx.services.auth.logout(ctx.sessionToken);
      ctx.setSession?.(null);
      return { loggedOut: true };
    }),
    changePin: ownerProcedure
      .input(z.object({ currentPin: pinSchema, newPin: pinSchema }).strict())
      .mutation(({ ctx, input }) =>
        ctx.services.auth.changePin(ctx.user.id, input.currentPin, input.newPin, ctx.sessionToken),
      ),
    createRecovery: ownerProcedure
      .input(z.object({ pin: pinSchema }).strict())
      .mutation(({ ctx, input }) => ctx.services.auth.createRecovery(ctx.user.id, input.pin)),
    recover: serviceProcedure
      .input(
        z
          .object({ phone: phoneSchema, code: z.string().min(16).max(64), newPin: pinSchema })
          .strict(),
      )
      .mutation(({ ctx, input }) =>
        ctx.services.auth.recover(input.phone, input.code, input.newPin, ctx.ip ?? 'local'),
      ),
  }),
  ledger: rpc.router({
    snapshot: ownerProcedure.query(({ ctx }) => ctx.services.ledger.snapshot(ctx.user.id)),
    person: ownerProcedure
      .input(personSchema)
      .mutation(({ ctx, input }) => ctx.services.ledger.savePerson(ctx.user.id, input)),
    createDebt: ownerProcedure
      .input(quickDebtSchema)
      .mutation(({ ctx, input }) => ctx.services.ledger.createDebt(ctx.user.id, input)),
    createBill: ownerProcedure.input(billInputSchema).mutation(async ({ ctx, input }) => {
      if (input.attachmentId) await ctx.services.files.get(ctx.user.id, input.attachmentId);
      return ctx.services.ledger.createBill(ctx.user.id, input);
    }),
    payment: ownerProcedure
      .input(paymentInputSchema)
      .mutation(({ ctx, input }) => ctx.services.ledger.recordPayment(ctx.user.id, input)),
    confirmReport: ownerProcedure
      .input(z.object({ commandId: idSchema, paymentId: idSchema, accept: z.boolean() }).strict())
      .mutation(({ ctx, input }) =>
        ctx.services.ledger.confirmReport(
          ctx.user.id,
          input.commandId,
          input.paymentId,
          input.accept,
        ),
      ),
    promise: ownerProcedure
      .input(promiseInputSchema)
      .mutation(({ ctx, input }) => ctx.services.ledger.promise(ctx.user.id, input)),
    share: ownerProcedure.input(shareInputSchema).mutation(async ({ ctx, input }) => {
      const share = await ctx.services.ledger.createShare(ctx.user.id, input);
      return ctx.services.access.issue(ctx.user.id, share.id);
    }),
    links: ownerProcedure.query(({ ctx }) => ctx.services.access.list(ctx.user.id)),
    revoke: ownerProcedure
      .input(z.object({ id: idSchema }).strict())
      .mutation(({ ctx, input }) => ctx.services.ledger.revokeShare(ctx.user.id, input.id)),
    cancel: ownerProcedure
      .input(commandTarget)
      .mutation(({ ctx, input }) =>
        ctx.services.ledger.cancelDebt(ctx.user.id, input.commandId, input.id),
      ),
    resolveDispute: ownerProcedure
      .input(z.object({ id: idSchema }).strict())
      .mutation(({ ctx, input }) => ctx.services.ledger.resolveDispute(ctx.user.id, input.id)),
    saveDraft: ownerProcedure
      .input(
        z.object({ id: idSchema, content: z.record(z.string(), z.unknown()).nullable() }).strict(),
      )
      .mutation(({ ctx, input }) =>
        ctx.services.ledger.saveDraft(ctx.user.id, input.id, input.content),
      ),
    readNotifications: ownerProcedure.mutation(({ ctx }) =>
      ctx.services.ledger.readNotifications(ctx.user.id),
    ),
  }),
  settings: rpc.router({
    get: ownerProcedure.query(({ ctx }) => ctx.services.receiving.get(ctx.user.id)),
    save: ownerProcedure
      .input(settingsInputSchema.extend({ pin: pinSchema.optional() }))
      .mutation(async ({ ctx, input }) => {
        const { pin, ...settings } = input;
        const previous = await ctx.services.receiving.get(ctx.user.id);
        if (previous.paymentQrPayload !== settings.paymentQrPayload) {
          if (!pin)
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Nhập PIN để đổi QR nhận tiền.' });
          await ctx.services.auth.verifyPin(ctx.user.id, pin);
        }
        const result = await ctx.services.receiving.save(ctx.user.id, settings);
        await ctx.services.ledger.rebuildReminders(ctx.user.id);
        return result;
      }),
  }),
  files: rpc.router({
    upload: ownerProcedure.input(uploadInputSchema).mutation(async ({ ctx, input }) => {
      await ctx.services.auth.limit(`upload:${ctx.user.id}`, 30, 3600);
      return ctx.services.files.upload(ctx.user.id, input);
    }),
    status: ownerProcedure
      .input(z.object({ id: idSchema }).strict())
      .query(({ ctx, input }) => ctx.services.files.get(ctx.user.id, input.id)),
    retry: ownerProcedure
      .input(z.object({ id: idSchema }).strict())
      .mutation(async ({ ctx, input }) => {
        await ctx.services.auth.limit(`ocr-retry:${ctx.user.id}`, 10, 3600);
        return ctx.services.files.retry(ctx.user.id, input.id);
      }),
  }),
  guest: rpc.router({
    view: serviceProcedure
      .input(z.object({ key: guestKeySchema }).strict())
      .query(async ({ ctx, input }) => {
        await ctx.services.auth.limit(`guest-read:${ctx.ip ?? 'local'}`, 240, 60);
        const scope = await ctx.services.access.resolve(input.key);
        const request = await ctx.services.ledger.guestView(scope, 'Người tạo');
        const remaining =
          request.principalAmount -
          request.confirmedAmounts.reduce((total, amount) => total + amount, 0);
        return {
          ...request,
          ...(await ctx.services.receiving.forRequest(scope.ownerId, remaining, request.reference)),
        };
      }),
    report: serviceProcedure.input(guestReportSchema).mutation(async ({ ctx, input }) => {
      await ctx.services.auth.limit(`guest-write:${ctx.ip ?? 'local'}`, 60, 60);
      const scope = await ctx.services.access.resolve(input.key);
      return ctx.services.ledger.guestReport(scope, input.commandId, input.amount);
    }),
    cancelReport: serviceProcedure
      .input(z.object({ key: guestKeySchema, commandId: idSchema }).strict())
      .mutation(async ({ ctx, input }) => {
        await ctx.services.auth.limit(`guest-write:${ctx.ip ?? 'local'}`, 60, 60);
        return ctx.services.ledger.guestCancelReport(
          await ctx.services.access.resolve(input.key),
          input.commandId,
        );
      }),
    promise: serviceProcedure.input(guestPromiseSchema).mutation(async ({ ctx, input }) => {
      await ctx.services.auth.limit(`guest-write:${ctx.ip ?? 'local'}`, 60, 60);
      return ctx.services.ledger.guestPromise(
        await ctx.services.access.resolve(input.key),
        input.commandId,
        input.date,
        input.amount,
      );
    }),
    dispute: serviceProcedure.input(guestDisputeSchema).mutation(async ({ ctx, input }) => {
      await ctx.services.auth.limit(`guest-write:${ctx.ip ?? 'local'}`, 60, 60);
      const { key, ...details } = input;
      return ctx.services.ledger.guestDispute(await ctx.services.access.resolve(key), details);
    }),
  }),
});
export type AppRouter = typeof appRouter;
