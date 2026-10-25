import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { projectDirectory, readProductionSettings } from '../scripts/production-settings.mjs';

export async function startApplication(component) {
  if (!['api', 'worker'].includes(component)) throw new Error('Tiến trình chưa được hỗ trợ.');
  Object.assign(process.env, readProductionSettings());
  await import(pathToFileURL(join(projectDirectory, 'apps', component, 'dist/main.js')).href);
}
