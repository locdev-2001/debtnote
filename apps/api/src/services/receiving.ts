import { DomainError } from '@debtnote/application';
import type { SettingsInput } from '@debtnote/contracts';
import type { Pool } from 'pg';
import type { PaymentCodeRenderer } from '../adapters/payment-code';
import type { SecretVault } from '../adapters/secrets';

export class ReceivingService {
  constructor(
    private readonly pool: Pool,
    private readonly vault: SecretVault,
    private readonly renderer: PaymentCodeRenderer,
  ) {}
  async get(ownerId: string) {
    const result = await this.pool.query(
      'SELECT a.name,p.sealed_payload,p.reminders_enabled,p.remind_hour,a.recovery_hash IS NOT NULL AS has_recovery FROM accounts a LEFT JOIN receiving_profiles p ON p.owner_id=a.id WHERE a.id=$1',
      [ownerId],
    );
    const profile = result.rows[0];
    if (!profile) throw new DomainError('Tài khoản không tồn tại.', 'NOT_FOUND');
    return {
      name: profile.name as string,
      paymentQrPayload: profile.sealed_payload ? this.vault.open(profile.sealed_payload) : null,
      remindersEnabled: profile.reminders_enabled ?? true,
      remindHour: profile.remind_hour ?? 9,
      hasRecovery: profile.has_recovery as boolean,
    };
  }
  async save(ownerId: string, input: SettingsInput) {
    if (
      input.paymentQrPayload &&
      new TextEncoder().encode(input.paymentQrPayload).byteLength > 1024
    )
      throw new DomainError('Mã QR quá dài.');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE accounts SET name=$2 WHERE id=$1', [ownerId, input.name]);
      await client.query(
        'INSERT INTO receiving_profiles (owner_id,sealed_payload,reminders_enabled,remind_hour,updated_at) VALUES ($1,$2,$3,$4,now()) ON CONFLICT (owner_id) DO UPDATE SET sealed_payload=EXCLUDED.sealed_payload,reminders_enabled=EXCLUDED.reminders_enabled,remind_hour=EXCLUDED.remind_hour,updated_at=now()',
        [
          ownerId,
          input.paymentQrPayload ? this.vault.seal(input.paymentQrPayload) : null,
          input.remindersEnabled,
          input.remindHour,
        ],
      );
      await client.query('COMMIT');
      return { saved: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  async forRequest(ownerId: string, amount: number, reference: string) {
    const settings = await this.get(ownerId);
    return {
      collectorName: settings.name || 'Người tạo',
      paymentQrPayload:
        settings.paymentQrPayload && amount > 0
          ? this.renderer.build(settings.paymentQrPayload, amount, reference)
          : null,
    };
  }
}
