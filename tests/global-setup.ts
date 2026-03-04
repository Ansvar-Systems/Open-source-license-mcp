// SPDX-License-Identifier: Apache-2.0
// Global setup: build the SQLite database once before any test file runs.
import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function setup() {
  // Hardcoded command with no user input -- safe to use execSync here.
  execSync('npm run build:db', { cwd: join(__dirname, '..'), stdio: 'pipe' });
}
