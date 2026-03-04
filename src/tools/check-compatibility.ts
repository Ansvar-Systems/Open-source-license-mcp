// SPDX-License-Identifier: Apache-2.0
import type { Db } from '../constants.js';
import { responseMeta } from '../utils/response-meta.js';

export interface CheckCompatibilityArgs {
  license_a: string;
  license_b: string;
  linking_type?: 'static' | 'dynamic' | 'separate_component' | 'any';
}

interface CompatRow {
  license_a: string;
  license_b: string;
  linking_type: string;
  compatible: number;
  direction: string;
  conditions: string | null;
  confidence: string;
}

/**
 * Flip direction when we find a match via the reverse query (B,A instead of A,B).
 */
function flipDirection(direction: string): string {
  if (direction === 'a_into_b') return 'b_into_a';
  if (direction === 'b_into_a') return 'a_into_b';
  return direction; // bidirectional stays the same
}

/**
 * Try to find a compatibility entry. Search order:
 * 1. Exact (A, B, linking_type)
 * 2. Reverse (B, A, linking_type) -- flip direction
 * 3. Fallback linking_type="any" for (A, B)
 * 4. Fallback linking_type="any" for (B, A) -- flip direction
 */
function findCompat(db: Db, a: string, b: string, linkingType: string): { row: CompatRow; flipped: boolean } | null {
  const stmt = db.prepare(`
    SELECT license_a, license_b, linking_type, compatible, direction, conditions, confidence
    FROM compatibility_matrix
    WHERE license_a = ? AND license_b = ? AND linking_type = ?
  `);

  // Step 1: exact match
  const exact = stmt.get(a, b, linkingType) as CompatRow | undefined;
  if (exact) return { row: exact, flipped: false };

  // Step 2: reverse match
  const reverse = stmt.get(b, a, linkingType) as CompatRow | undefined;
  if (reverse) return { row: reverse, flipped: true };

  // Steps 3-4: fallback to linking_type = "any" (only if we asked for something specific)
  if (linkingType !== 'any') {
    const anyForward = stmt.get(a, b, 'any') as CompatRow | undefined;
    if (anyForward) return { row: anyForward, flipped: false };

    const anyReverse = stmt.get(b, a, 'any') as CompatRow | undefined;
    if (anyReverse) return { row: anyReverse, flipped: true };
  }

  return null;
}

export function checkCompatibility(db: Db, args: CheckCompatibilityArgs) {
  const linkingType = args.linking_type ?? 'any';

  const match = findCompat(db, args.license_a, args.license_b, linkingType);

  if (!match) {
    return {
      license_a: args.license_a,
      license_b: args.license_b,
      linking_type: linkingType,
      no_data: true,
      message: `No curated compatibility data available for ${args.license_a} + ${args.license_b}. This does not imply compatibility or incompatibility -- manual review of both license texts is required.`,
      ...responseMeta(),
    };
  }

  const { row, flipped } = match;
  const direction = flipped ? flipDirection(row.direction) : row.direction;

  return {
    license_a: args.license_a,
    license_b: args.license_b,
    linking_type: row.linking_type,
    compatible: row.compatible === 1,
    direction,
    conditions: row.conditions,
    confidence: row.confidence,
    ...responseMeta(),
  };
}
