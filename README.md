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
      - uses: composalai/disk-volume@v1.2.0
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

The directory is backed by persistent storage mounted directly on the runner.
Package managers read and update it in place. The post step flushes writes;
there is no archive, restore copy, snapshot publication, or automatic deletion.
The repository checkout and `.git` stay on local runner disk.

Jobs with the same key share a writable cache across branches and runner sizes,
including pull requests and failed jobs. Use it for rebuildable package download
stores with integrity checks. Choose separate keys for tools that require an
exclusive writable directory. Do not store credentials or use these directories
as build outputs or workspaces. Committed writes are visible to subsequent
runners; an already running job does not automatically refresh its view.

Up to five keys can be mounted per job. `cache-hit` means the directory already
exists, not that every dependency is present. Let the package manager install
missing packages. VM runners use bind mounts; sandboxes link the requested path
to the mounted storage. The first run after the direct-storage update starts
cold; archive snapshots from older runners are not copied or extracted.

Dependency disks are opt-in. Ordinary `actions/cache` and language setup actions
continue using GitHub's cache backend.
