const projectDirectory = __dirname;
const application = {
  cwd: projectDirectory,
  interpreter: process.execPath,
  instances: 1,
  exec_mode: 'fork',
  autorestart: true,
  watch: false,
  kill_timeout: 15000,
  exp_backoff_restart_delay: 1000,
  time: true,
  env: {
    NODE_ENV: 'production',
    ...(process.env.DEBTNOTE_ENV_FILE ? { DEBTNOTE_ENV_FILE: process.env.DEBTNOTE_ENV_FILE } : {}),
  },
};
module.exports = {
  apps: [
    {
      ...application,
      name: 'debtnote-api',
      script: 'deploy/api.mjs',
      max_memory_restart: '512M',
      out_file: '.local/logs/api-out.log',
      error_file: '.local/logs/api-error.log',
    },
    {
      ...application,
      name: 'debtnote-worker',
      script: 'deploy/worker.mjs',
      max_memory_restart: '1G',
      out_file: '.local/logs/worker-out.log',
      error_file: '.local/logs/worker-error.log',
    },
  ],
};
