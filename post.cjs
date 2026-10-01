'use strict';
const {execFileSync} = require('node:child_process');
try {
  if (process.env.STATE_target) {
    execFileSync('sync', [process.env.STATE_root], {stdio:'inherit'});
    execFileSync('umount', [process.env.STATE_target], {stdio:'inherit'});
    console.log('Disk writes persisted to the job clone. Composal publishes successful default-branch jobs after cleanup.');
  }
} catch (error) { console.error('Could not flush or unmount the disk: ' + error.message); process.exitCode = 1; }
