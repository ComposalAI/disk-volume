# Composal Disk Volume

Persist dependency directories across Composal GitHub Actions jobs.
Both `composal-x64-2x` and `composal-x64-4x` use the same
repository-scoped storage.

```yaml
jobs:
  test:
    runs-on: [composal-x64-4x]
    steps:
      - uses: actions/checkout@v4
      - uses: composalai/disk-volume@v1
        id: npm-disk
        with:
          key: npm-store-v1
          path: ~/.npm
      - run: npm ci
      - run: npm test
```

`key` identifies a persistent directory within your GitHub App installation and
repository. `path` is an empty absolute, workspace-relative, or `~/` directory.
The action outputs `cache-hit` and the absolute mounted `path`. Prefer stable
keys for package download stores (`~/.npm`, a pnpm store, Cargo registry/git
caches); package managers check the package versions and integrity. Use distinct
keys for incompatible platforms or toolchains.

Each job restores its own copy of a trusted snapshot. Concurrent jobs never
share a live directory. Only successful `push`, `schedule`, or
`workflow_dispatch` jobs on the repository's default branch publish an updated
snapshot. Pull requests and other branches can restore and modify their copy,
but their changes are discarded. When trusted jobs publish the same key
concurrently, the last completed publication becomes the snapshot for future
jobs; changes are not merged.

Limits: five disk mounts per job, 32 keys and 10 GiB of published data per
repository. Snapshots unused for seven days are not restored. Superseded
snapshots are removed after seven days and abandoned job clones after a day.
Current snapshot metadata remains reserved until the key is reused; this first
release has no user-facing disk deletion interface.

Dependency disks are opt-in. Ordinary `actions/cache` and language setup actions
continue using GitHub's cache backend.
