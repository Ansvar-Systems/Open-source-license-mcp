// SPDX-License-Identifier: Apache-2.0
import type { Db } from '../constants.js';

interface MetadataRow {
  key: string;
  value: string;
}

export function checkDataFreshness(db: Db) {
  const rows = db.prepare(`
    SELECT key, value FROM db_metadata
  `).all() as MetadataRow[];

  const metadata: Record<string, string> = {};
  for (const row of rows) {
    metadata[row.key] = row.value;
  }

  const builtAt = metadata['built_at'] ?? null;
  const spdxVersion = metadata['spdx_version'] ?? null;

  let ageInDays: number | null = null;
  let status: 'fresh' | 'aging' | 'stale' | 'unknown' = 'unknown';

  if (builtAt) {
    const builtDate = new Date(builtAt);
    const now = new Date();
    ageInDays = Math.floor((now.getTime() - builtDate.getTime()) / (1000 * 60 * 60 * 24));

    if (ageInDays <= 30) {
      status = 'fresh';
    } else if (ageInDays <= 90) {
      status = 'aging';
    } else {
      status = 'stale';
    }
  }

  return {
    status,
    built_at: builtAt,
    age_in_days: ageInDays,
    spdx_version: spdxVersion,
    sources: {
      spdx_license_list: {
        version: spdxVersion,
        status: spdxVersion ? 'loaded' : 'unknown',
      },
      reuse_spec: {
        status: 'loaded',
        note: 'REUSE specification rules are curated at build time.',
      },
      cra_obligations: {
        status: 'loaded',
        note: 'CRA license obligations are curated at build time.',
      },
      compatibility_matrix: {
        status: 'loaded',
        note: 'Compatibility data is curated at build time.',
      },
    },
    metadata,
  };
}
