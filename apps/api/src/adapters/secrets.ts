import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export const digestSecret = (secret: string) => createHash('sha256').update(secret).digest('hex');
export async function loadEncryptionKey(
  configured: string | undefined,
  localPath: string,
  production: boolean,
) {
  if (configured && /^[a-f\d]{64}$/i.test(configured)) return Buffer.from(configured, 'hex');
  if (production) throw new Error('Production cần APP_DATA_KEY gồm 64 ký tự hex.');
  await mkdir(dirname(localPath), { recursive: true, mode: 0o700 });
  try {
    return Buffer.from((await readFile(localPath, 'utf8')).trim(), 'hex');
  } catch {
    const generated = randomBytes(32).toString('hex');
    try {
      await writeFile(localPath, generated, { flag: 'wx', mode: 0o600 });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
    return Buffer.from((await readFile(localPath, 'utf8')).trim(), 'hex');
  }
}
export class SecretVault {
  constructor(private readonly key: Buffer) {}
  seal(secret: string) {
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, nonce);
    const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    return Buffer.concat([nonce, cipher.getAuthTag(), encrypted]).toString('base64url');
  }
  open(sealed: string) {
    const encoded = Buffer.from(sealed, 'base64url');
    if (encoded.length < 28) throw new Error('Dữ liệu bảo vệ chưa hợp lệ.');
    const cipher = createDecipheriv('aes-256-gcm', this.key, encoded.subarray(0, 12));
    cipher.setAuthTag(encoded.subarray(12, 28));
    return Buffer.concat([cipher.update(encoded.subarray(28)), cipher.final()]).toString('utf8');
  }
}
