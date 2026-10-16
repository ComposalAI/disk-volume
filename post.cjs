'use strict';
const {execFileSync} = require('node:child_process');

function persist(env = process.env, run = execFileSync) {
  if (!env.STATE_root) return;
  run('sync', [env.STATE_root], {stdio:'inherit'});
  console.log('Dependency cache writes persisted.');
}
if (require.main === module) {
  try { persist(); } catch (error) { console.error('Could not persist the disk: ' + error.message); process.exitCode = 1; }
}
module.exports = {persist};
