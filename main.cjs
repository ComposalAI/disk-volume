'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');

function mount(env = process.env) {
  if (process.platform !== 'linux' || !env.COMPOSAL_DISK_ROOT) throw new Error('disk-volume requires a Composal Modal GitHub runner');
  const key = env.INPUT_KEY;
  const input = env.INPUT_PATH;
  if (!key || key.length > 512 || !input || /[\r\n\0]/.test(key + input)) throw new Error('A key (1–512 characters) and a path are required');
  const root = fs.realpathSync(env.COMPOSAL_DISK_ROOT);
  const digest = crypto.createHash('sha256').update(key).digest('hex');
  const source = path.join(root, 'data', digest);
  const manifests = path.join(root, 'manifests');
  const stateFile = path.join(manifests, digest + '.json');
  if (fs.existsSync(stateFile)) throw new Error('Each disk key can be mounted once per job');
  if (fs.readdirSync(manifests).filter(name => name.endsWith('.json')).length >= 5) throw new Error('At most five disks can be mounted per job');
  const hit = fs.existsSync(source);
  fs.mkdirSync(source, {recursive:true});
  if (fs.realpathSync(source) !== source) throw new Error('Disk source must not be a symbolic link');
  const expanded = input === '~' ? os.homedir() : input.startsWith('~/') ? path.join(os.homedir(), input.slice(2)) : input;
  const target = path.resolve(env.GITHUB_WORKSPACE || process.cwd(), expanded);
  if (target === root || target.startsWith(root + '/') || root.startsWith(target + '/') || target === '/') throw new Error('Mount path overlaps runner storage');
  fs.mkdirSync(target, {recursive:true});
  if (fs.realpathSync(target) !== target || fs.readdirSync(target).length) throw new Error('Mount path must be an empty directory without symlinks');
  execFileSync('mount', ['--bind', source, target], {stdio:'inherit'});
  fs.writeFileSync(stateFile, JSON.stringify({key}), {flag:'wx'});
  fs.appendFileSync(env.GITHUB_STATE, `target=${target}\nroot=${root}\n`);
  fs.appendFileSync(env.GITHUB_OUTPUT, `cache-hit=${hit}\npath=${target}\n`);
  console.log(`Mounted ${key}: ${hit ? 'trusted snapshot restored' : 'empty volume'} at ${target}`);
}
if (require.main === module) { try { mount(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
module.exports = {mount};
