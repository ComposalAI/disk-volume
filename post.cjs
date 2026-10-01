'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

function persist(env = process.env, run = execFileSync) {
  if (!env.STATE_target) return;
  if (!env.COMPOSAL_DISK_PERSIST_ROOT) run('sync', [env.STATE_root], {stdio:'inherit'});
  run('umount', [env.STATE_target], {stdio:'inherit'});
  if (env.COMPOSAL_DISK_PERSIST_ROOT) {
    const digest = env.STATE_digest;
    if (!/^[a-f0-9]{64}$/.test(digest || '')) throw new Error('Invalid disk identity');
    const root = fs.realpathSync(env.STATE_root);
    const backing = fs.realpathSync(env.COMPOSAL_DISK_PERSIST_ROOT);
    const source = path.join(root, 'data', digest);
    if (fs.realpathSync(source) !== source) throw new Error('Disk source must not be a symbolic link');
    const archive = path.join(backing, 'archives', digest + '.tar.gz');
    fs.mkdirSync(path.dirname(archive), {recursive:true});
    fs.mkdirSync(path.join(backing, 'manifests'), {recursive:true});
    run('tar', ['-czf', archive + '.tmp', '-C', source, '.'], {stdio:'inherit'});
    fs.renameSync(archive + '.tmp', archive);
    fs.copyFileSync(path.join(root, 'manifests', digest + '.json'), path.join(backing, 'manifests', digest + '.json'));
    run('sync', [backing], {stdio:'inherit'});
    console.log('Dependency snapshot archived to the private Modal disk.');
  }
  console.log('Disk writes persisted to the job clone. Composal publishes successful default-branch jobs after cleanup.');
}
if (require.main === module) {
  try { persist(); } catch (error) { console.error('Could not persist the disk: ' + error.message); process.exitCode = 1; }
}
module.exports = {persist};
