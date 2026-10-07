/**
 * Generates the placeholder product artwork as SVG.
 *
 * Kept as a script rather than committed binaries so the repo stays text-only
 * and a reviewer can see exactly how the assets were produced.
 *
 * Usage: node scripts/generate-placeholder-images.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'apps', 'web', 'public', 'images', 'products');

const ITEMS = [
  { name: 'tour-tee', color: '#1f2937', label: 'TOUR TEE' },
  { name: 'concert-ticket', color: '#7c2d12', label: 'CONCERT' },
  { name: 'membership', color: '#4c1d95', label: 'GOLD MEMBER' },
  { name: 'photobook', color: '#0f766e', label: 'PHOTOBOOK' },
  { name: 'live-album', color: '#9d174d', label: 'LIVE ALBUM' },
  { name: 'lightstick', color: '#be185d', label: 'LIGHTSTICK' },
  { name: 'tote', color: '#78350f', label: 'TOTE BAG' },
];

function svgFor({ color, label }) {
  const lines = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">',
    '  <defs>',
    '    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">',
    `      <stop offset="0%" stop-color="${color}"/>`,
    '      <stop offset="100%" stop-color="#050505"/>',
    '    </linearGradient>',
    '  </defs>',
    '  <rect width="800" height="600" fill="url(#g)"/>',
    '  <circle cx="650" cy="120" r="95" fill="#ffffff" opacity="0.08"/>',
    '  <circle cx="130" cy="505" r="135" fill="#ffffff" opacity="0.06"/>',
    '  <text x="400" y="300" font-family="system-ui, sans-serif" font-size="52"',
    '        font-weight="700" fill="#ffffff" text-anchor="middle">',
    `    ${label}`,
    '  </text>',
    '  <text x="400" y="348" font-family="system-ui, sans-serif" font-size="20"',
    '        fill="#ffffff" opacity="0.7" text-anchor="middle">',
    '    Fan Commerce demo asset',
    '  </text>',
    '</svg>',
    '',
  ];
  return lines.join('\n');
}

mkdirSync(outDir, { recursive: true });
for (const item of ITEMS) {
  writeFileSync(join(outDir, `${item.name}.svg`), svgFor(item), 'utf8');
}

console.log(`Wrote ${ITEMS.length} placeholder images to ${outDir}`);
