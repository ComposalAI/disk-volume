# Composal Disk Volume

Persist dependency directories across ephemeral Composal GitHub runners with
Modal Volumes v2. Both `composal-x64-2x` and `composal-x64-4x` use the same
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

Each VM extracts trusted snapshots into private directories on its local disk,
so package managers and tests read local files. Concurrent jobs never share a
live directory. The action's post step archives its directory to the job's
private Modal Volume namespace. After the VM stops, Composal verifies the job's actual GitHub assignment:
only successful `push`, `schedule`, or `workflow_dispatch` jobs on the
repository's default branch can publish a new snapshot. Pull requests and other
branches can restore and modify their private clone, but their writes are
removed. When trusted jobs publish the same key concurrently, the last completed
publication becomes the snapshot for future VMs; changes are not merged.

No Modal credentials or additional GitHub workflow permissions are needed.
This action requires Linux Composal runners and host jobs. Container jobs are
not supported in v1. The path must be empty and must not traverse a symlink;
existing files are never hidden or replaced. Do not use this action to mount
Docker's overlay storage; this is a persisted dependency directory, not an
ext4 block device. Keep deployment artifacts and irreplaceable data elsewhere.

Limits: five disk mounts per job, 32 keys and 10 GiB of published data per
repository. Snapshots unused for seven days are not restored. Superseded
snapshots are removed after seven days and abandoned job clones after a day.
Current snapshot metadata remains reserved until the key is reused; this first
release has no user-facing disk deletion interface. Modal Volumes v2 is beta.

Dependency disks are opt-in. Ordinary `actions/cache` and language setup actions
continue using GitHub's cache backend; bucket-backed Actions archive caching is
a separate integration.
