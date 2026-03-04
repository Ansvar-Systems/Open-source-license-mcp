/**
 * Fetch SPDX license list and transform to seed format.
 * Source: https://github.com/spdx/license-list-data (CC0-1.0)
 * Run: npx tsx scripts/fetch-spdx.ts
 */
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, '..', 'data', 'seed', 'spdx-licenses.json');

const SPDX_URL = 'https://raw.githubusercontent.com/spdx/license-list-data/main/json/licenses.json';

interface SpdxLicense {
  licenseId: string;
  name: string;
  isOsiApproved: boolean;
  isFsfLibre?: boolean;
  isDeprecatedLicenseId: boolean;
  detailsUrl: string;
  seeAlso: string[];
}

function classifyCopyleft(id: string): 'strong' | 'weak' | 'permissive' | 'network' | 'unknown' {
  const base = id.replace(/-only$/, '').replace(/-or-later$/, '');

  const network = ['AGPL-1.0', 'AGPL-3.0', 'SSPL-1.0', 'OSL-3.0'];
  if (network.some((n) => base.startsWith(n))) return 'network';

  const strong = ['GPL-2.0', 'GPL-3.0', 'EUPL-1.1', 'EUPL-1.2', 'CECILL-2.1', 'CECILL-2.0', 'RPL-1.1', 'RPL-1.5', 'QPL-1.0'];
  if (strong.some((s) => base.startsWith(s))) return 'strong';

  const weak = ['LGPL-2.0', 'LGPL-2.1', 'LGPL-3.0', 'MPL-1.0', 'MPL-1.1', 'MPL-2.0', 'EPL-1.0', 'EPL-2.0', 'CDDL-1.0', 'CDDL-1.1', 'CPL-1.0', 'CeCILL-C', 'CPAL-1.0'];
  if (weak.some((w) => base.startsWith(w))) return 'weak';

  const permissive = [
    'MIT', 'Apache-1.0', 'Apache-1.1', 'Apache-2.0',
    'BSD-1-Clause', 'BSD-2-Clause', 'BSD-3-Clause',
    'ISC', 'Unlicense', 'CC0-1.0', '0BSD', 'Zlib',
    'BSL-1.0', 'PSF-2.0', 'Python-2.0', 'curl',
    'X11', 'WTFPL', 'Fair', 'PostgreSQL', 'JSON',
    'Artistic-2.0', 'PHP-3.0', 'PHP-3.01',
    'Unicode-DFS-2016', 'Unicode-TOU', 'BlueOak-1.0.0',
    'MulanPSL-2.0',
  ];
  if (permissive.some((p) => base.startsWith(p))) return 'permissive';

  return 'unknown';
}

async function main() {
  console.log('Fetching SPDX license list...');
  const res = await fetch(SPDX_URL);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
  const data = await res.json() as { licenses: SpdxLicense[]; licenseListVersion: string };

  console.log(`Found ${data.licenses.length} licenses (SPDX version ${data.licenseListVersion})`);

  const licenses = data.licenses.map((l) => ({
    spdx_id: l.licenseId,
    name: l.name,
    osi_approved: l.isOsiApproved,
    fsf_free: l.isFsfLibre ?? false,
    deprecated: l.isDeprecatedLicenseId,
    details_url: l.detailsUrl,
    see_also: l.seeAlso,
    copyleft_type: classifyCopyleft(l.licenseId),
  }));

  // Stats
  const stats = {
    total: licenses.length,
    osi_approved: licenses.filter(l => l.osi_approved).length,
    fsf_free: licenses.filter(l => l.fsf_free).length,
    deprecated: licenses.filter(l => l.deprecated).length,
    by_copyleft: {
      strong: licenses.filter(l => l.copyleft_type === 'strong').length,
      weak: licenses.filter(l => l.copyleft_type === 'weak').length,
      permissive: licenses.filter(l => l.copyleft_type === 'permissive').length,
      network: licenses.filter(l => l.copyleft_type === 'network').length,
      unknown: licenses.filter(l => l.copyleft_type === 'unknown').length,
    },
  };

  writeFileSync(OUTPUT, JSON.stringify({ version: data.licenseListVersion, stats, licenses }, null, 2));
  console.log(`Wrote ${licenses.length} licenses to data/seed/spdx-licenses.json`);
  console.log('Stats:', JSON.stringify(stats, null, 2));
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
