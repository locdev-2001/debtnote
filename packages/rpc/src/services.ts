import type { LedgerService } from '@debtnote/application';
import type {
  AttachmentView,
  GuestScope,
  Identity,
  ReceivingProfile,
  SettingsInput,
} from '@debtnote/contracts';

export interface ApiServices {
  ledger: LedgerService;
  auth: {
    identify(token: string | undefined): Promise<Identity | null>;
    enter(
      phone: string,
      pin: string,
      ip: string,
    ): Promise<{ user: Identity; sessionToken: string }>;
    register(
      phone: string,
      pin: string,
      ip: string,
    ): Promise<{ user: Identity; sessionToken: string }>;
    login(
      phone: string,
      pin: string,
      ip: string,
    ): Promise<{ user: Identity; sessionToken: string }>;
    logout(token: string | undefined): Promise<void>;
    limit(key: string, maximum?: number, seconds?: number): Promise<void>;
    changePin(
      accountId: string,
      currentPin: string,
      newPin: string,
      sessionToken: string | undefined,
    ): Promise<{ saved: boolean }>;
    verifyPin(accountId: string, pin: string): Promise<void>;
    createRecovery(accountId: string, pin: string): Promise<{ code: string }>;
    recover(phone: string, code: string, pin: string, ip: string): Promise<{ saved: boolean }>;
  };
  access: {
    issue(ownerId: string, shareId: string): Promise<{ key: string; shareId: string }>;
    resolve(key: string): Promise<GuestScope>;
    list(ownerId: string): Promise<
      {
        id: string;
        personId: string;
        debtIds: string[];
        expiresAt: string;
        revokedAt: string | null;
        key: string | null;
      }[]
    >;
  };
  receiving: {
    get(ownerId: string): Promise<ReceivingProfile>;
    save(ownerId: string, input: SettingsInput): Promise<{ saved: boolean }>;
    forRequest(
      ownerId: string,
      amount: number,
      reference: string,
    ): Promise<{ collectorName: string; paymentQrPayload: string | null }>;
  };
  files: {
    upload(
      ownerId: string,
      input: { name: string; mime: string; base64: string },
    ): Promise<AttachmentView>;
    get(ownerId: string, attachmentId: string): Promise<AttachmentView>;
    retry(ownerId: string, attachmentId: string): Promise<{ queued: boolean }>;
    file(
      ownerId: string,
      attachmentId: string,
    ): Promise<{ path: string; mime: string; name: string }>;
  };
}
