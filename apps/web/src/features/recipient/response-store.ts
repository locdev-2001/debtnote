import { isDateKey } from '../../lib/calendar';
import {
  disputeReasons,
  emptyRecipientResponse,
  type PaymentRequest,
  type RecipientCommand,
  type RecipientResponse,
  reportAmountIssue,
} from './payment-request';

type ResponseStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export interface RecipientResponseStore {
  load: (request: PaymentRequest) => RecipientResponse;
  save: (
    requestId: string,
    response: RecipientResponse,
    command: RecipientCommand,
  ) => boolean | Promise<boolean>;
  reset: (requestId: string) => boolean;
}
const storageKey = (requestId: string) => `debtnote:recipient-prototype:v1:${requestId}`;
function validResponse(
  candidate: unknown,
  request: PaymentRequest,
): candidate is RecipientResponse {
  if (!candidate || typeof candidate !== 'object') return false;
  const response = candidate as RecipientResponse;
  if (
    response.reportedAmount !== null &&
    (typeof response.reportedAmount !== 'number' ||
      reportAmountIssue(request, response.reportedAmount))
  )
    return false;
  if (response.promisedDate !== null && !isDateKey(response.promisedDate)) return false;
  return (
    response.dispute === null ||
    Boolean(
      response.dispute &&
        Object.hasOwn(disputeReasons, response.dispute.reason) &&
        (response.dispute.reason === 'items'
          ? request.lines.some(
              (line) => line.id === response.dispute?.itemId && line.personalAmount > 0,
            )
          : response.dispute.itemId === null) &&
        typeof response.dispute.note === 'string' &&
        response.dispute.note.length <= 240,
    )
  );
}
export function createRecipientResponseStore(
  storage: ResponseStorage | undefined,
): RecipientResponseStore {
  return {
    load(request) {
      try {
        const candidate: unknown = JSON.parse(storage?.getItem(storageKey(request.id)) ?? 'null');
        return validResponse(candidate, request) ? candidate : emptyRecipientResponse();
      } catch {
        return emptyRecipientResponse();
      }
    },
    save(requestId, response) {
      try {
        if (!storage) return false;
        storage.setItem(storageKey(requestId), JSON.stringify(response));
        return true;
      } catch {
        return false;
      }
    },
    reset(requestId) {
      try {
        if (!storage) return false;
        storage.removeItem(storageKey(requestId));
        return true;
      } catch {
        return false;
      }
    },
  };
}
