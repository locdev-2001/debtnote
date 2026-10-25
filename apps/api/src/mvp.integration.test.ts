import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readApiEnvironment, systemClock } from '@debtnote/runtime';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer } from './app';
import { createServices } from './services/create-services';

const enabled = process.env.DEBTNOTE_INTEGRATION === '1';
const tomorrow = new Date(`${systemClock.today()}T12:00:00Z`);
tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
const futureDate = tomorrow.toISOString().slice(0, 10);
describe.skipIf(!enabled)('MVP qua HTTP và PostgreSQL thật', () => {
  const schemaName = `mvp_test_${randomUUID().replaceAll('-', '')}`;
  let admin: Pool;
  let pool: Pool;
  let server: ReturnType<typeof createServer>;
  let uploads: string;
  let services: ReturnType<typeof createServices>;
  async function post(
    route: string,
    input: unknown,
    cookie = '',
    origin = 'http://localhost:5173',
  ) {
    return server.inject({
      method: 'POST',
      url: `/trpc/${route}`,
      headers: { origin, cookie, 'content-type': 'application/json' },
      payload: JSON.stringify(input ?? null),
    });
  }
  async function get(route: string, input?: unknown, cookie = '') {
    return server.inject({
      method: 'GET',
      url: `/trpc/${route}${input ? `?input=${encodeURIComponent(JSON.stringify(input))}` : ''}`,
      headers: { cookie },
    });
  }
  async function session(phone: string) {
    const response = await post('auth.enter', { phone, pin: '739251' });
    expect(response.statusCode, response.body).toBe(200);
    const cookie = String(response.headers['set-cookie']).split(';')[0] ?? '';
    return { cookie, user: response.json().result.data };
  }
  beforeAll(async () => {
    const environment = readApiEnvironment();
    if (environment.NODE_ENV === 'production')
      throw new Error('Không chạy tích hợp trên production.');
    admin = new Pool({ connectionString: environment.DATABASE_URL });
    await admin.query(`CREATE SCHEMA "${schemaName}"`);
    pool = new Pool({
      connectionString: environment.DATABASE_URL,
      options: `-c search_path=${schemaName}`,
      max: 8,
    });
    const migrationPath = join(import.meta.dirname, '../../../packages/database/migrations');
    for (const name of (await readdir(migrationPath))
      .filter((name) => name.endsWith('.sql'))
      .sort()) {
      const source = (await readFile(join(migrationPath, name), 'utf8')).replaceAll(
        '"public".',
        `"${schemaName}".`,
      );
      await pool.query(source);
    }
    uploads = await mkdtemp(join(tmpdir(), 'debtnote-mvp-'));
    services = createServices(pool, randomBytes(32), uploads, { enqueue: async () => {} });
    server = createServer({ services });
    await server.ready();
  }, 20_000);
  afterAll(async () => {
    await server?.close();
    await pool?.end();
    if (admin) {
      await admin.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
      await admin.end();
    }
    if (uploads) await rm(uploads, { recursive: true, force: true });
  });
  it('một luồng SĐT/PIN, session HttpOnly, bảo vệ Origin, lockout và khôi phục một lần', async () => {
    const account = await session('+999100000001');
    const response = await post('auth.enter', { phone: '+999100000001', pin: '739251' });
    expect(response.headers['set-cookie']).toContain('HttpOnly');
    expect(response.json().result.data.id).toBe(account.user.id);
    expect((await get('ledger.snapshot')).statusCode).toBe(401);
    expect(
      (await post('auth.logout', undefined, account.cookie, 'https://site-la.example')).statusCode,
    ).toBe(403);
    for (let attempt = 0; attempt < 5; attempt++)
      expect((await post('auth.enter', { phone: '+999100000001', pin: '000000' })).statusCode).toBe(
        403,
      );
    expect((await post('auth.enter', { phone: '+999100000001', pin: '739251' })).statusCode).toBe(
      403,
    );
    await pool.query("UPDATE accounts SET locked_until=now()-interval '1 minute' WHERE id=$1", [
      account.user.id,
    ]);
    const recovery = await post('auth.createRecovery', { pin: '739251' }, account.cookie);
    expect(recovery.statusCode).toBe(200);
    const reset = {
      phone: '+999100000001',
      code: recovery.json().result.data.code,
      newPin: '426815',
    };
    expect((await post('auth.recover', reset)).statusCode).toBe(200);
    expect((await get('ledger.snapshot', undefined, account.cookie)).statusCode).toBe(401);
    expect((await post('auth.recover', reset)).statusCode).toBe(403);
    expect((await post('auth.enter', { phone: reset.phone, pin: reset.newPin })).statusCode).toBe(
      200,
    );
  }, 15_000);
  it('hai phiên chủ/khách, idempotency, thu hồi link, thanh toán đồng thời và tách sổ', async () => {
    const owner = await session('+999100000002');
    const outsider = await session('+999100000003');
    const command = {
      commandId: randomUUID(),
      personName: 'Bình',
      direction: 'receivable',
      amount: 360_000,
      dueDate: futureDate,
    };
    const created = await post('ledger.createDebt', command, owner.cookie);
    expect(created.statusCode, created.body).toBe(200);
    const debt = created.json().result.data;
    expect((await post('ledger.createDebt', command, owner.cookie)).json().result.data.id).toBe(
      debt.id,
    );
    expect(
      (await post('ledger.createDebt', { ...command, amount: 1 }, owner.cookie)).statusCode,
    ).toBe(409);
    expect(
      (
        await post(
          'ledger.promise',
          { commandId: randomUUID(), debtId: debt.id, date: futureDate },
          outsider.cookie,
        )
      ).statusCode,
    ).toBe(404);
    const share = await post(
      'ledger.share',
      { commandId: randomUUID(), personId: debt.personId, debtIds: [debt.id] },
      owner.cookie,
    );
    expect(share.statusCode, share.body).toBe(200);
    const { key, shareId } = share.json().result.data;
    expect((await get('guest.view', { key })).json().result.data.principalAmount).toBe(360_000);
    expect(
      (
        await post('guest.promise', {
          key,
          commandId: randomUUID(),
          date: futureDate,
          amount: 100_000,
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (await post('guest.report', { key, commandId: randomUUID(), amount: 200_000 })).statusCode,
    ).toBe(200);
    let snapshot = (await get('ledger.snapshot', undefined, owner.cookie)).json().result.data;
    expect(snapshot.totals.receivable).toBe(360_000);
    expect(snapshot.records[0].awaitingConfirmation).toBe(true);
    expect(snapshot.commands).toBeUndefined();
    const paymentId = snapshot.payments[0].id;
    const confirms = await Promise.all([
      post(
        'ledger.confirmReport',
        { commandId: randomUUID(), paymentId, accept: true },
        owner.cookie,
      ),
      post(
        'ledger.confirmReport',
        { commandId: randomUUID(), paymentId, accept: true },
        owner.cookie,
      ),
    ]);
    expect(confirms.map((response) => response.statusCode).sort()).toEqual([200, 409]);
    snapshot = (await get('ledger.snapshot', undefined, owner.cookie)).json().result.data;
    expect(snapshot.totals.receivable).toBe(160_000);
    expect((await get('guest.view', { key })).json().result.data.confirmedAmounts).toEqual([
      200_000,
    ]);
    expect(
      (await get('ledger.snapshot', undefined, outsider.cookie)).json().result.data.records,
    ).toEqual([]);
    expect(
      (
        await post(
          'settings.save',
          { name: 'An', paymentQrPayload: 'app://test-payment' },
          owner.cookie,
        )
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await post(
          'settings.save',
          { name: 'An', paymentQrPayload: 'app://test-payment', pin: '739251' },
          owner.cookie,
        )
      ).statusCode,
    ).toBe(200);
    expect((await get('guest.view', { key })).json().result.data.paymentQrPayload).toBe(
      'app://test-payment',
    );
    expect((await post('ledger.revoke', { id: shareId }, owner.cookie)).statusCode).toBe(200);
    const expired = await post(
      'ledger.share',
      { commandId: randomUUID(), personId: debt.personId, debtIds: [debt.id] },
      owner.cookie,
    );
    const expiredLink = expired.json().result.data;
    await pool.query("UPDATE shares SET expires_at=now()-interval '1 second' WHERE id=$1", [
      expiredLink.shareId,
    ]);
    expect((await get('guest.view', { key: expiredLink.key })).statusCode).toBe(403);
    expect((await get('guest.view', { key })).statusCode).toBe(403);
    expect(
      (await post('guest.report', { key, commandId: randomUUID(), amount: 1 })).statusCode,
    ).toBe(403);
  }, 15_000);
  it('ảnh riêng theo chủ sổ, chặn SVG giả dạng và file được stream qua HTTP', async () => {
    const owner = await session('+999100000004');
    const outsider = await session('+999100000005');
    const photo = await readFile(join(import.meta.dirname, '../../web/public/icon-192.png'));
    const response = await post(
      'files.upload',
      { name: 'bill.png', mime: 'image/png', base64: photo.toString('base64') },
      owner.cookie,
    );
    expect(response.statusCode, response.body).toBe(200);
    const id = response.json().result.data.id;
    expect(
      (await server.inject({ url: `/files/${id}`, headers: { cookie: owner.cookie } })).rawPayload,
    ).toEqual(photo);
    expect(
      (await server.inject({ url: `/files/${id}`, headers: { cookie: outsider.cookie } }))
        .statusCode,
    ).toBe(404);
    expect((await server.inject(`/files/${id}`)).statusCode).toBe(401);
    expect(
      (
        await post(
          'files.upload',
          { name: 'fake.png', mime: 'image/png', base64: Buffer.from('<svg/>').toString('base64') },
          owner.cookie,
        )
      ).statusCode,
    ).toBe(400);
    const payload = (await pool.query('SELECT sealed_payload FROM receiving_profiles LIMIT 1'))
      .rows[0]?.sealed_payload;
    if (payload) expect(payload).not.toContain('app://');
  });
});
