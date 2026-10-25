import { defineConfig } from 'tsup';

export default defineConfig({
  format: ['esm'],
  target: 'node22',
  clean: true,
  sourcemap: true,
});
