import { Database } from '@ansvar/mcp-sqlite';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DB_ENV_VAR } from './constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function getDbPath(): string {
  return process.env[DB_ENV_VAR] ?? join(__dirname, '..', '..', 'data', 'database.db');
}

export function openDatabase(dbPath?: string) {
  return new Database(dbPath ?? getDbPath());
}
