'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const {persist} = require('./post.cjs');

test('post step preserves dependency bytes in the Modal archive', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'composal-disk-post-'));
  try {
    const root = path.join(temp, 'working');
    const backing = path.join(temp, 'persisted');
    const digest = crypto.createHash('sha256').update('test-key').digest('hex');
    const source = path.join(root, 'data', digest);
    fs.mkdirSync(source, {recursive:true});
    fs.mkdirSync(path.join(root, 'manifests'), {recursive:true});
    fs.mkdirSync(backing);
    fs.writeFileSync(path.join(source, 'dependency.txt'), 'cached dependency bytes');
    fs.writeFileSync(path.join(root, 'manifests', digest + '.json'), JSON.stringify({key:'test-key'}));
    persist({STATE_target:source, STATE_root:root, STATE_digest:digest, COMPOSAL_DISK_PERSIST_ROOT:backing}, (command, args, options) => {
      if (command === 'tar') execFileSync(command, args, options);
    });
    const restored = path.join(temp, 'restored');
    fs.mkdirSync(restored);
    execFileSync('tar', ['-xzf', path.join(backing, 'archives', digest + '.tar.gz'), '-C', restored]);
    assert.equal(fs.readFileSync(path.join(restored, 'dependency.txt'), 'utf8'), 'cached dependency bytes');
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(backing, 'manifests', digest + '.json'))), {key:'test-key'});
    assert.equal(fs.existsSync(path.join(backing, 'archives', digest + '.tar.gz.tmp')), false);
  } finally { fs.rmSync(temp, {recursive:true, force:true}); }
});

test('original runner disks still flush before unmounting', () => {
  const calls = [];
  persist({STATE_target:'/target',STATE_root:'/disk'}, (...args) => calls.push(args.slice(0,2)));
  assert.deepEqual(calls, [['sync',['/disk']],['umount',['/target']]]);
});

test('unmounted actions do not attempt publication', () => {
  persist({}, () => assert.fail('unmounted action must not run commands'));
});
