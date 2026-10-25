import { randomBytes } from 'node:crypto';
import { DomainError } from '@debtnote/application';
import type { GuestScope } from '@debtnote/contracts';
import type { Pool } from 'pg';
import { digestSecret, type SecretVault } from './secrets';

export class AccessLinks {
  constructor(
    private readonly pool: Pool,
    private readonly vault: SecretVault,
  ) {}
  async issue(ownerId: string, shareId: string) {
    const share = await this.pool.query(
      'SELECT id FROM shares WHERE id=$1 AND owner_id=$2 AND revoked_at IS NULL AND expires_at>now()',
      [shareId, ownerId],
    );
    if (!share.rowCount) throw new DomainError('Link không còn hiệu lực.', 'NOT_FOUND');
    const key = randomBytes(32).toString('base64url');
    const result = await this.pool.query(
      'INSERT INTO share_keys (share_id,hash,sealed_key) VALUES ($1,$2,$3) ON CONFLICT (share_id) DO UPDATE SET share_id=EXCLUDED.share_id RETURNING sealed_key',
      [shareId, digestSecret(key), this.vault.seal(key)],
    );
    return { key: this.vault.open(result.rows[0].sealed_key), shareId };
  }
  async resolve(key: string): Promise<GuestScope> {
    const result = await this.pool.query(
      'SELECT s.owner_id AS "ownerId",s.id AS "shareId" FROM share_keys k JOIN shares s ON s.id=k.share_id WHERE k.hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now()',
      [digestSecret(key)],
    );
    if (!result.rowCount) throw new DomainError('Link đã hết hạn hoặc bị thu hồi.', 'FORBIDDEN');
    return result.rows[0];
  }
  async list(ownerId: string) {
    const result = await this.pool.query(
      'SELECT s.id,s.person_id AS "personId",s.debt_ids AS "debtIds",s.expires_at AS "expiresAt",s.revoked_at AS "revokedAt",k.sealed_key FROM shares s LEFT JOIN share_keys k ON k.share_id=s.id WHERE s.owner_id=$1 ORDER BY s.created_at DESC',
      [ownerId],
    );
    return result.rows.map((row) => ({
      ...row,
      sealed_key: undefined,
      key: row.sealed_key ? this.vault.open(row.sealed_key) : null,
    }));
  }
}
