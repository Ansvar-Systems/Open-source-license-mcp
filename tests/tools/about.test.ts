// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, beforeAll } from 'vitest';
import BetterSqlite3 from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

import { about } from '../../src/tools/about.js';

let db: any;

beforeAll(() => {
  // DB is built by globalSetup (tests/global-setup.ts)
  db = new BetterSqlite3(join(__dirname, '../../data/database.db'));
});

describe('about', () => {
  it('returns canonical server identity', () => {
    const out = about(db);
    expect(out.name).toBeTruthy();
    expect(out.version).toBeTruthy();
    expect(out.category).toBe('compliance');
  });

  it('reports total_items as the sum of per-table counts', () => {
    const out = about(db);
    const sum = Object.entries(out.stats)
      .filter(([k]) => k !== 'total_items')
      .reduce((acc, [, v]) => acc + (v as number), 0);
    expect(out.stats.total_items).toBe(sum);
  });

  it('declares data-use-license-mcp as related sibling for dataset / open-data queries', () => {
    // Cross-pointer disambiguation: the gateway exposes both license MCPs
    // under the same domain ("intellectual-property"), so an agent reading
    // `about` on either side needs an explicit hand-off rule for the
    // other's scope.
    const out = about(db);
    expect(Array.isArray(out.related_servers)).toBe(true);
    const sibling = out.related_servers.find((r) => r.name === 'data-use-license-mcp');
    expect(sibling).toBeDefined();
    expect(sibling!.scope).toMatch(/Creative Commons|CC|open-data|vendor/i);
    expect(sibling!.use_when).toMatch(/Creative Commons|open-data|vendor TOS/i);
  });

  it('links to ansvar.ai/mcp directory', () => {
    const out = about(db);
    expect(out.network.directory).toBe('https://ansvar.ai/mcp');
  });
});
