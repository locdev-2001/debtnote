import {
  createHash,
  scrypt as nodeScrypt,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { DomainError } from '@debtnote/application';
import type { Identity } from '@debtnote/contracts';
import type { Pool, PoolClient } from 'pg';

const scrypt = promisify(nodeScrypt);
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
async function hashPin(pin: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scrypt(pin, salt, 64)) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}
async function pinMatches(pin: string, stored: string) {
  const [salt, encoded] = stored.split(':');
  if (!salt || !encoded || encoded.length !== 128) return false;
  const actual = (await scrypt(pin, salt, 64)) as Buffer;
  return timingSafeEqual(actual, Buffer.from(encoded, 'hex'));
}
export class AuthService {
  constructor(private readonly pool: Pool) {}
  async limit(key: string, maximum = 30, seconds = 900) {
    const result = await this.pool.query(
      `INSERT INTO auth_limits (key,attempts,expires_at) VALUES ($1,1,now()+$2*interval '1 second') ON CONFLICT (key) DO UPDATE SET attempts=CASE WHEN auth_limits.expires_at<now() THEN 1 ELSE auth_limits.attempts+1 END, expires_at=CASE WHEN auth_limits.expires_at<now() THEN now()+$2*interval '1 second' ELSE auth_limits.expires_at END RETURNING attempts`,
      [tokenHash(key), seconds],
    );
    if (Number(result.rows[0]?.attempts) > maximum)
      throw new DomainError('Thử quá nhiều lần. Vui lòng quay lại sau.', 'FORBIDDEN');
  }
  private async session(client: Pool | PoolClient, accountId: string) {
    const token = randomBytes(32).toString('base64url');
    await client.query(
      "INSERT INTO sessions (hash,account_id,expires_at) VALUES ($1,$2,now()+interval '30 days')",
      [tokenHash(token), accountId],
    );
    return token;
  }
  async enter(phone: string, pin: string, ip: string) {
    const existing = await this.pool.query('SELECT id FROM accounts WHERE phone=$1', [phone]);
    if (existing.rowCount) return this.login(phone, pin, ip);
    try {
      return await this.register(phone, pin, ip);
    } catch (error) {
      if (error instanceof DomainError && error.kind === 'CONFLICT')
        return this.login(phone, pin, ip);
      throw error;
    }
  }
  async register(phone: string, pin: string, ip: string) {
    await this.limit(`register:${ip}`, 10, 3600);
    const stored = await hashPin(pin);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const id = randomUUID();
      const result = await client.query(
        "INSERT INTO accounts (id,phone,pin_hash,name) VALUES ($1,$2,$3,'') ON CONFLICT (phone) DO NOTHING RETURNING id,phone,name",
        [id, phone, stored],
      );
      if (!result.rowCount)
        throw new DomainError('SĐT đã có tài khoản. Dùng PIN để đăng nhập.', 'CONFLICT');
      const sessionToken = await this.session(client, id);
      await client.query('COMMIT');
      return { user: result.rows[0] as Identity, sessionToken };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  async login(phone: string, pin: string, ip: string) {
    await this.limit(`login:${ip}`, 40);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query('SELECT * FROM accounts WHERE phone=$1 FOR UPDATE', [
        phone,
      ]);
      const account = result.rows[0];
      if (!account) {
        await scrypt(pin, 'debtnote-unavailable-account', 64);
        throw new DomainError('SĐT hoặc PIN chưa đúng.', 'FORBIDDEN');
      }
      if (account.locked_until && new Date(account.locked_until).getTime() > Date.now())
        throw new DomainError('Tài khoản tạm khóa. Thử lại sau 15 phút.', 'FORBIDDEN');
      if (!(await pinMatches(pin, account.pin_hash))) {
        const failures = account.locked_until ? 1 : Number(account.failed_attempts) + 1;
        await client.query(
          "UPDATE accounts SET failed_attempts=$2,locked_until=CASE WHEN $2>=5 THEN now()+interval '15 minutes' ELSE NULL END WHERE id=$1",
          [account.id, failures],
        );
        await client.query('COMMIT');
        throw new DomainError('SĐT hoặc PIN chưa đúng.', 'FORBIDDEN');
      }
      await client.query('UPDATE accounts SET failed_attempts=0,locked_until=NULL WHERE id=$1', [
        account.id,
      ]);
      const sessionToken = await this.session(client, account.id);
      await client.query('COMMIT');
      return {
        user: { id: account.id, phone: account.phone, name: account.name } as Identity,
        sessionToken,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  async identify(token: string | undefined): Promise<Identity | null> {
    if (!token || token.length > 100) return null;
    const result = await this.pool.query(
      'SELECT a.id,a.phone,a.name FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.hash=$1 AND s.expires_at>now()',
      [tokenHash(token)],
    );
    return result.rows[0] ?? null;
  }
  async logout(token: string | undefined) {
    if (token) await this.pool.query('DELETE FROM sessions WHERE hash=$1', [tokenHash(token)]);
  }
  async changePin(
    accountId: string,
    currentPin: string,
    newPin: string,
    sessionToken: string | undefined,
  ) {
    await this.limit(`pin:${accountId}`, 10);
    const account = (
      await this.pool.query('SELECT pin_hash FROM accounts WHERE id=$1', [accountId])
    ).rows[0];
    if (!account || !(await pinMatches(currentPin, account.pin_hash)))
      throw new DomainError('PIN hiện tại chưa đúng.', 'FORBIDDEN');
    await this.pool.query('UPDATE accounts SET pin_hash=$2 WHERE id=$1', [
      accountId,
      await hashPin(newPin),
    ]);
    await this.pool.query('DELETE FROM sessions WHERE account_id=$1 AND hash<>$2', [
      accountId,
      tokenHash(sessionToken ?? ''),
    ]);
    return { saved: true };
  }
  async verifyPin(accountId: string, pin: string) {
    await this.limit(`pin-confirm:${accountId}`, 5);
    const account = (
      await this.pool.query('SELECT pin_hash FROM accounts WHERE id=$1', [accountId])
    ).rows[0];
    if (!account || !(await pinMatches(pin, account.pin_hash)))
      throw new DomainError('PIN chưa đúng.', 'FORBIDDEN');
  }
  async createRecovery(accountId: string, pin: string) {
    await this.limit(`recovery-create:${accountId}`, 10);
    const account = (
      await this.pool.query('SELECT pin_hash FROM accounts WHERE id=$1', [accountId])
    ).rows[0];
    if (!account || !(await pinMatches(pin, account.pin_hash)))
      throw new DomainError('PIN chưa đúng.', 'FORBIDDEN');
    const code = randomBytes(18).toString('base64url');
    await this.pool.query('UPDATE accounts SET recovery_hash=$2 WHERE id=$1', [
      accountId,
      tokenHash(code),
    ]);
    return { code };
  }
  async recover(phone: string, code: string, pin: string, ip: string) {
    await this.limit(`recovery:${ip}`, 10, 3600);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const account = (
        await client.query('SELECT id,recovery_hash FROM accounts WHERE phone=$1 FOR UPDATE', [
          phone,
        ])
      ).rows[0];
      if (
        !account?.recovery_hash ||
        !timingSafeEqual(Buffer.from(account.recovery_hash), Buffer.from(tokenHash(code)))
      )
        throw new DomainError('Thông tin khôi phục chưa đúng.', 'FORBIDDEN');
      await client.query(
        'UPDATE accounts SET pin_hash=$2,recovery_hash=NULL,failed_attempts=0,locked_until=NULL WHERE id=$1',
        [account.id, await hashPin(pin)],
      );
      await client.query('DELETE FROM sessions WHERE account_id=$1', [account.id]);
      await client.query('COMMIT');
      return { saved: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
