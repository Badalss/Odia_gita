import { spawnSync } from 'node:child_process';

for (const file of ['script.js', 'catalog.js', 'sources.js', 'player-core.js']) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log('JavaScript syntax checks passed.');
