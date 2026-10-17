# Composal Disk Volume

Keep package downloads between GitHub Actions jobs on Composal runners. Mount
your package manager's cache directory, then run your install command as usual.
Later jobs with the same key reuse the files already there.

See the [Composal runner guide](https://composal.ai/docs/github-actions-runners#dependency-caches)
for runner setup and dependency caching.

## Use it in a workflow

```yaml
jobs:
  test:
    runs-on: [composal-x64-4x]
    steps:
      - uses: actions/checkout@v4
      - uses: composalai/disk-volume@v1.2.0
        id: npm-disk
        with:
          key: npm-store-v1
          path: ~/.npm
      - run: npm ci
      - run: npm test
```

Composal mounts persistent storage at `path`. Your package manager reads and
updates it in place. At the end of the job, the action flushes its writes.
Composal keeps the cache for future jobs without compressing it, copying it
back or deleting it after use. Your checkout, `.git` and build outputs belong
on local runner disk.

## Choose a key and path

`key` names a cache within your GitHub App installation and repository. Reuse
it across runs and runner sizes. Give incompatible toolchains different keys.

`path` must be an empty directory. It can be absolute, relative to the workspace,
or start with `~/`. You can mount up to five keys per job.

Use package download stores such as `~/.npm`, a pnpm store or
`~/.cargo/registry/cache`. Keep credentials out of these directories and use
package managers that check downloaded files for integrity. Mount only the
download cache, keeping tool configuration, locks and unpacked sources local.

## Understand what is shared

Jobs with the same key share a writable cache across branches, including pull
requests. Writes from failed jobs persist too. If your tool needs exclusive
access to its cache, give concurrent jobs different keys.

New runners see the latest committed writes. A job that is already running
does not automatically refresh its view when another job writes to the cache.

The action outputs `cache-hit` and the absolute mounted `path`. A cache hit
means the directory exists; it may still be missing packages. Keep your install
step in the workflow so the package manager can fetch what it needs.

The first run after switching from archive-backed runners starts cold. Older
archives are not imported. This action is optional and separate from
`actions/cache` and the caching options in language setup actions.
