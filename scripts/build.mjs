import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, relative, isAbsolute } from 'node:path';
import { tracks } from '../catalog.js';

if (tracks.length !== 20 || new Set(tracks.map(track => track.id)).size !== tracks.length) {
  throw new Error('The catalogue must contain twenty unique track IDs.');
}
const root = fileURLToPath(new URL('../', import.meta.url));
const target = resolve(root, 'dist');
const inside = relative(root, target);
if (!inside || inside.startsWith('..') || isAbsolute(inside)) throw new Error('Invalid build target.');
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
for (const file of ['index.html', 'styles.css', 'script.js', 'catalog.js', 'player-core.js', '404.html', '.nojekyll']) {
  await cp(resolve(root, file), resolve(target, file));
}
await mkdir(resolve(target, 'assets'), { recursive: true });
for (const file of ['riverside-desktop.webp', 'riverside-mobile.webp', 'favicon.svg', 'site-preview.jpg']) {
  await cp(resolve(root, 'assets', file), resolve(target, 'assets', file));
}
console.log('Static release prepared in dist/ (no runtime packages or secrets).');
