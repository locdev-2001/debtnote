import type { GuestRequest } from '@debtnote/contracts';
import type {
  PaymentRequest,
  PaymentRequestReader,
} from '../../features/recipient/payment-request';
import { disputeReasons } from '../../features/recipient/payment-request';
import type { RecipientResponseStore } from '../../features/recipient/response-store';
import { apiClient, queryClient } from '../../lib/rpc';

export function createRecipientApiAdapter(key: string): {
  reader: PaymentRequestReader;
  store: RecipientResponseStore;
} {
  const cache = new Map<string, GuestRequest>();
  const pendingCommands = new Map<string, string>();
  const reader: PaymentRequestReader = {
    async load() {
      try {
        const request = await apiClient.guest.view.query({ key });
        cache.set(request.id, request);
        return request as PaymentRequest;
      } catch (error) {
        const code = (error as { data?: { code?: string } }).data?.code;
        if (code && ['BAD_REQUEST', 'FORBIDDEN', 'NOT_FOUND'].includes(code)) return null;
        throw error;
      }
    },
  };
  const store: RecipientResponseStore = {
    load(request) {
      const response = cache.get(request.id)?.response;
      if (!response) return { reportedAmount: null, promisedDate: null, dispute: null };
      return {
        ...response,
        dispute: response.dispute
          ? {
              ...response.dispute,
              reason: Object.hasOwn(disputeReasons, response.dispute.reason)
                ? (response.dispute.reason as keyof typeof disputeReasons)
                : 'other',
            }
          : null,
      };
    },
    async save(requestId, _response, command) {
      const previous = cache.get(requestId);
      if (!previous) return false;
      const fingerprint = `${requestId}:${JSON.stringify(command)}`;
      const commandId = pendingCommands.get(fingerprint) ?? crypto.randomUUID();
      pendingCommands.set(fingerprint, commandId);
      if (command.type === 'cancel-report')
        await apiClient.guest.cancelReport.mutate({ key, commandId });
      else if (command.type === 'report-payment')
        await apiClient.guest.report.mutate({ key, commandId, amount: command.amount });
      else if (command.type === 'promise')
        await apiClient.guest.promise.mutate({
          key,
          commandId,
          date: command.date,
          ...(command.amount ? { amount: command.amount } : {}),
        });
      else {
        const line = previous.lines.find((line) => line.id === command.itemId);
        const debtId = line?.debtId ?? previous.debtIds[0];
        if (!debtId) return false;
        await apiClient.guest.dispute.mutate({
          key,
          commandId,
          debtId,
          reason: command.reason,
          note: command.note,
          itemId: line?.id.includes(':') ? line.id : null,
        });
      }
      await queryClient.invalidateQueries({ queryKey: ['payment-request', key] });
      pendingCommands.delete(fingerprint);
      return true;
    },
    reset: () => false,
  };
  return { reader, store };
}
