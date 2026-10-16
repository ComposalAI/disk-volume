'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {mount} = require('./main.cjs');

function fixture() {
  const temp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'disk-volume-')));
  const root = path.join(temp, 'volume');
  fs.mkdirSync(path.join(root, 'data'), {recursive:true});
  return {temp, root, job(name, runtime = 'sandbox') {
    const job = path.join(temp, name);
    fs.mkdirSync(path.join(job, 'manifests'), {recursive:true});
    return {INPUT_KEY:'npm-store', INPUT_PATH:'cache', COMPOSAL_DISK_ROOT:root,
      COMPOSAL_DISK_MANIFEST_ROOT:path.join(job, 'manifests'), COMPOSAL_RUNNER_RUNTIME:runtime,
      GITHUB_WORKSPACE:job, GITHUB_STATE:path.join(job, 'state'), GITHUB_OUTPUT:path.join(job, 'output')};
  }};
}

test('fresh jobs reuse cache bytes in place with independent mount bookkeeping', () => {
  const f = fixture();
  try {
    const first = f.job('first');
    mount(first, () => assert.fail('sandbox must not invoke mount'), 'linux');
    fs.writeFileSync(path.join(first.GITHUB_WORKSPACE, 'cache', 'dependency'), 'cached bytes');
    const persistFirst = fs.realpathSync(path.join(first.GITHUB_WORKSPACE, 'cache'));
    const second = f.job('second');
    mount(second, () => assert.fail('sandbox must not invoke mount'), 'linux');
    assert.equal(fs.readFileSync(path.join(second.GITHUB_WORKSPACE, 'cache', 'dependency'), 'utf8'), 'cached bytes');
    assert.equal(fs.realpathSync(path.join(second.GITHUB_WORKSPACE, 'cache')), persistFirst);
    assert.match(fs.readFileSync(first.GITHUB_OUTPUT, 'utf8'), /cache-hit=false/);
    assert.match(fs.readFileSync(second.GITHUB_OUTPUT, 'utf8'), /cache-hit=true/);
    assert.throws(() => mount(first, () => {}, 'linux'), /once per job/);
  } finally {fs.rmSync(f.temp, {recursive:true, force:true});}
});

test('VM cache paths bind directly to the persistent filesystem', () => {
  const f = fixture();
  try {
    const env = f.job('vm', 'vm'), calls = [];
    mount(env, (command, args) => calls.push([command, args]), 'linux');
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], 'mount');
    assert.equal(calls[0][1][0], '--bind');
    assert.ok(calls[0][1][1].startsWith(path.join(f.root, 'data') + '/'));
    assert.equal(calls[0][1][2], path.join(env.GITHUB_WORKSPACE, 'cache'));
  } finally {fs.rmSync(f.temp, {recursive:true, force:true});}
});

test('mounting refuses to cover an existing checkout or populated directory', () => {
  const f = fixture();
  try {
    const env = f.job('populated');
    fs.mkdirSync(path.join(env.GITHUB_WORKSPACE, 'cache'));
    fs.writeFileSync(path.join(env.GITHUB_WORKSPACE, 'cache', 'source.txt'), 'keep source');
    assert.throws(() => mount(env, () => assert.fail('must not mount'), 'linux'), /empty directory/);
    assert.equal(fs.readFileSync(path.join(env.GITHUB_WORKSPACE, 'cache', 'source.txt'), 'utf8'), 'keep source');
  } finally {fs.rmSync(f.temp, {recursive:true, force:true});}
});

test('empty workspaces and Git metadata remain local before checkout starts', () => {
  const f = fixture();
  try {
    for (const runtime of ['vm', 'sandbox']) {
      for (const input of ['.', '..', '.git', '.git/objects', 'nested/.git']) {
        const env = f.job(runtime + '-' + input.replaceAll('/', '-').replaceAll('.', 'dot'), runtime);
        env.INPUT_PATH = input;
        // Keep bookkeeping outside an otherwise empty workspace, as it is
        // when the action runs before the first checkout step.
        env.COMPOSAL_DISK_MANIFEST_ROOT = path.join(f.temp, 'manifests-' + path.basename(env.GITHUB_WORKSPACE));
        fs.renameSync(path.join(env.GITHUB_WORKSPACE, 'manifests'), env.COMPOSAL_DISK_MANIFEST_ROOT);
        assert.equal(fs.readdirSync(env.GITHUB_WORKSPACE).length, 0);
        assert.throws(() => mount(env, () => assert.fail('must not mount workspace or .git'), 'linux'), /workspace or .git/);
        assert.equal(fs.lstatSync(env.GITHUB_WORKSPACE).isSymbolicLink(), false);
        assert.equal(fs.existsSync(path.join(env.GITHUB_WORKSPACE, '.git')), false);
      }
    }
  } finally {fs.rmSync(f.temp, {recursive:true, force:true});}
});
