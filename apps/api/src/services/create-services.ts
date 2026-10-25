import { LedgerService } from '@debtnote/application';
import { PostgresLedgerRepository } from '@debtnote/database';
import type { ApiServices } from '@debtnote/rpc';
import { systemClock, systemIds } from '@debtnote/runtime';
import type { Pool } from 'pg';
import { AccessLinks } from '../adapters/access-links';
import { NapasPaymentCodeFormatter, PaymentCodeRenderer } from '../adapters/payment-code';
import { SecretVault } from '../adapters/secrets';
import { AuthService } from './auth';
import { FilesService, type OcrScheduler } from './files';
import { ReceivingService } from './receiving';

export function createServices(
  pool: Pool,
  key: Buffer,
  uploadDirectory: string,
  scheduler: OcrScheduler,
  clock = systemClock,
): ApiServices {
  const vault = new SecretVault(key);
  return {
    ledger: new LedgerService(new PostgresLedgerRepository(pool), clock, systemIds),
    auth: new AuthService(pool),
    access: new AccessLinks(pool, vault),
    receiving: new ReceivingService(
      pool,
      vault,
      new PaymentCodeRenderer([new NapasPaymentCodeFormatter()]),
    ),
    files: new FilesService(pool, uploadDirectory, scheduler),
  };
}
