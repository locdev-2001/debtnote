import { readApiEnvironment } from '@debtnote/runtime';
import { defineConfig } from 'drizzle-kit';

const environment = readApiEnvironment();

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './migrations',
  dbCredentials: { url: environment.DATABASE_URL },
  strict: true,
});
