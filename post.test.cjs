'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {persist} = require('./post.cjs');

test('cache writes are committed in place without copying or unmounting', () => {
  const calls = [];
  persist({STATE_target:'/cache', STATE_root:'/disk'}, (...args) => calls.push(args.slice(0,2)));
  assert.deepEqual(calls, [['sync', ['/disk']]]);
});

test('an action that did not mount a disk does not flush storage', () => {
  persist({}, () => assert.fail('unmounted action must not run commands'));
});

test('flush errors fail the post step instead of claiming persistence', () => {
  assert.throws(() => persist({STATE_root:'/disk'}, () => {throw new Error('sync failed');}), /sync failed/);
});
