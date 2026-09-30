// Runs a command with .env.test loaded, so e2e tests never touch the dev database.
const { spawnSync } = require('node:child_process');
process.loadEnvFile(require('node:path').join(__dirname, '..', '.env.test'));
const [cmd, ...args] = process.argv.slice(2);
const r = spawnSync(cmd, args, { stdio: 'inherit', shell: true, env: process.env });
process.exit(r.status ?? 1);
