import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DomainError } from '@debtnote/application';
import type { AttachmentView } from '@debtnote/contracts';
import { imageSize } from 'image-size';
import type { Pool } from 'pg';

export interface OcrScheduler {
  enqueue(attachmentId: string): Promise<void>;
}
export class FilesService {
  constructor(
    private readonly pool: Pool,
    private readonly directory: string,
    private readonly scheduler: OcrScheduler,
  ) {}
  async upload(ownerId: string, input: { name: string; mime: string; base64: string }) {
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(input.base64)) throw new DomainError('Ảnh chưa hợp lệ.');
    const bytes = Buffer.from(input.base64, 'base64');
    if (!bytes.length || bytes.length > 10 * 1024 * 1024)
      throw new DomainError('Chọn ảnh dưới 10 MB.');
    let type: string | undefined;
    try {
      const dimensions = imageSize(bytes);
      type = dimensions.type;
      if (
        !dimensions.width ||
        !dimensions.height ||
        dimensions.width * dimensions.height > 16_000_000 ||
        Math.max(dimensions.width, dimensions.height) > 10_000
      )
        throw new Error();
    } catch {
      throw new DomainError('Ảnh không hợp lệ hoặc quá lớn.');
    }
    const accepted: Record<string, string> = {
      jpg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    };
    if (!type || accepted[type] !== input.mime)
      throw new DomainError('Chỉ nhận ảnh JPG, PNG hoặc WebP.');
    const id = randomUUID();
    const path = join(this.directory, `${id}.${type}`);
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    await writeFile(path, bytes, { flag: 'wx', mode: 0o600 });
    try {
      await this.pool.query(
        "INSERT INTO attachments (id,owner_id,name,mime,path,status) VALUES ($1,$2,$3,$4,$5,'queued')",
        [id, ownerId, input.name, input.mime, path],
      );
    } catch (error) {
      await rm(path, { force: true });
      throw error;
    }
    await this.enqueue(id);
    return this.get(ownerId, id);
  }
  private async enqueue(id: string) {
    try {
      await this.scheduler.enqueue(id);
      return true;
    } catch {
      await this.pool.query(
        "UPDATE attachments SET status='error',error='Chưa đưa ảnh vào hàng đợi. Thử đọc lại.' WHERE id=$1",
        [id],
      );
      return false;
    }
  }
  async get(ownerId: string, id: string) {
    const result = await this.pool.query(
      'SELECT id,name,mime,status,ocr_result AS "ocrResult",error,created_at AS "createdAt" FROM attachments WHERE owner_id=$1 AND id=$2',
      [ownerId, id],
    );
    if (!result.rowCount) throw new DomainError('Không tìm thấy ảnh.', 'NOT_FOUND');
    return {
      ...result.rows[0],
      createdAt: new Date(result.rows[0].createdAt).toISOString(),
    } as AttachmentView;
  }
  async file(ownerId: string, id: string) {
    const result = await this.pool.query(
      'SELECT path,mime,name FROM attachments WHERE owner_id=$1 AND id=$2',
      [ownerId, id],
    );
    if (!result.rowCount) throw new DomainError('Không tìm thấy ảnh.', 'NOT_FOUND');
    return result.rows[0] as { path: string; mime: string; name: string };
  }
  async retry(ownerId: string, id: string) {
    const result = await this.pool.query(
      "UPDATE attachments SET status='queued',error=NULL WHERE owner_id=$1 AND id=$2 AND status='error' RETURNING id",
      [ownerId, id],
    );
    if (!result.rowCount) throw new DomainError('Ảnh đang xử lý hoặc đã đọc xong.');
    if (!(await this.enqueue(id))) throw new DomainError('Chưa đưa ảnh vào hàng đợi. Thử lại nhé.');
    return { queued: true };
  }
}
