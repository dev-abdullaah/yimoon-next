// scripts/build-prod.mjs
//
// Builds the app with the values in .env.production.
//
// `next build` loads .env.local after .env.production, and .env.local wins.
// On a developer machine that bakes the local API (http://127.0.0.1:8000) into
// the rewrites and into every NEXT_PUBLIC_* value in the client bundle.
// Variables already set in process.env take precedence over every .env file,
// so this script loads .env.production into the environment first and then
// runs `next build`.
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envFile = join(root, '.env.production');

if (!existsSync(envFile)) {
    console.error('Missing .env.production; cannot build for production.');
    process.exit(1);
}

for (const rawLine of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);

    process.env[key] = value;
}

process.env.NODE_ENV = 'production';

console.log(`Building with API: ${process.env.NEXT_PUBLIC_API_BASE_URL}`);

const result = spawnSync('npx', ['next', 'build'], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
