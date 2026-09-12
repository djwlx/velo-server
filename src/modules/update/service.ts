import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { cp, mkdir, readdir, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { extract } from 'tar';

import { rootLogger } from '../../libs/logger.js';
import { getAppVersion } from '../../utils/version.js';

const WEB_DIR = resolve('./data/web');
const SEED_DIR = resolve('./public');
const REPO = 'djwlx/velo-web';
const KEEP_RELEASES = 3;
const RELEASE_BASE = `https://github.com/${REPO}/releases/latest/download`;

const CURRENT_LINK = join(WEB_DIR, 'current');
const RELEASES_DIR = join(WEB_DIR, 'releases');

interface WebVersion {
  version: string;
  file: string;
  sha256: string;
}

const logger = rootLogger.child({ module: 'update' });

const readVersion = async (dir: string): Promise<string | undefined> => {
  try {
    const raw = await readFile(join(dir, 'version.json'), 'utf8');
    const parsed = JSON.parse(raw) as { version?: string };
    return parsed.version;
  } catch {
    return undefined;
  }
};

export const getCurrentVersion = () => readVersion(CURRENT_LINK);

export const getServedRoot = () => CURRENT_LINK;

const toParts = (version: string) =>
  version
    .replace(/^v/, '')
    .split('.')
    .map((part) => Number(part) || 0);

const isNewer = (candidate: string, current: string) => {
  const a = toParts(candidate);
  const b = toParts(current);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
};

const linkCurrent = async (version: string) => {
  await mkdir(RELEASES_DIR, { recursive: true });
  const tempLink = join(WEB_DIR, `current.tmp-${Date.now()}`);
  await symlink(join('releases', version), tempLink);
  await rename(tempLink, CURRENT_LINK);
};

const cleanupReleases = async (activeVersion: string) => {
  const entries = await readdir(RELEASES_DIR, { withFileTypes: true });
  const stale = entries
    .filter((entry) => entry.isDirectory() && entry.name !== activeVersion)
    .map((entry) => entry.name)
    .sort((a, b) => (isNewer(a, b) ? -1 : 1));

  await Promise.all(
    stale
      .slice(Math.max(KEEP_RELEASES - 1, 0))
      .map((version) => rm(join(RELEASES_DIR, version), { recursive: true, force: true })),
  );
};

const fetchLatest = async (): Promise<WebVersion | undefined> => {
  const response = await fetch(`${RELEASE_BASE}/latest.json`, {
    headers: { 'User-Agent': 'velo-server' },
  });
  if (!response.ok) {
    if (response.status !== 404) {
      throw new Error(`latest.json responded ${response.status}`);
    }
    return undefined;
  }
  return (await response.json()) as WebVersion;
};

const applyUpdate = async (latest: WebVersion) => {
  const releaseDir = join(RELEASES_DIR, latest.version);

  if (!existsSync(releaseDir)) {
    const response = await fetch(`${RELEASE_BASE}/${latest.file}`, {
      headers: { 'User-Agent': 'velo-server' },
    });
    if (!response.ok) {
      throw new Error(`download responded ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const digest = createHash('sha256').update(buffer).digest('hex');
    if (latest.sha256 && digest !== latest.sha256) {
      throw new Error('sha256 mismatch');
    }

    await mkdir(releaseDir, { recursive: true });
    const archive = join(WEB_DIR, latest.file);
    await writeFile(archive, buffer);
    try {
      await extract({ file: archive, cwd: releaseDir });
    } finally {
      await rm(archive, { force: true });
    }
  }

  await linkCurrent(latest.version);
  await cleanupReleases(latest.version);
  logger.info({ version: latest.version }, 'web updated');
};

export interface UpdateStatus {
  current: string | null;
  latest: string | null;
  hasUpdate: boolean;
}

export const checkUpdate = async (): Promise<UpdateStatus> => {
  const current = (await getCurrentVersion()) ?? null;
  const latest = await fetchLatest();
  if (!latest) return { current, latest: null, hasUpdate: false };

  return {
    current,
    latest: latest.version,
    hasUpdate: !current || isNewer(latest.version, current),
  };
};

let pendingUpdate: Promise<string> | undefined;

const performUpdate = async () => {
  const latest = await fetchLatest();
  if (!latest) throw new Error('no web release found');

  const current = await getCurrentVersion();
  if (current && !isNewer(latest.version, current)) return current;

  await applyUpdate(latest);
  return latest.version;
};

export const updateToLatest = () => {
  pendingUpdate ??= performUpdate().finally(() => {
    pendingUpdate = undefined;
  });
  return pendingUpdate;
};

const ensureSeeded = async () => {
  if (!existsSync(CURRENT_LINK)) {
    await mkdir(join(RELEASES_DIR, 'empty'), { recursive: true });
    await linkCurrent('empty');
  }

  if (!existsSync(join(SEED_DIR, 'index.html'))) return;

  const seedVersion = (await readVersion(SEED_DIR)) ?? getAppVersion();
  const releaseDir = join(RELEASES_DIR, seedVersion);
  if (!existsSync(releaseDir)) {
    await mkdir(releaseDir, { recursive: true });
    await cp(SEED_DIR, releaseDir, { recursive: true, force: true });
  }

  const currentVersion = await getCurrentVersion();
  if (!currentVersion || isNewer(seedVersion, currentVersion)) {
    await linkCurrent(seedVersion);
    logger.info({ version: seedVersion }, 'seeded web release from public');
  }

  await cleanupReleases((await getCurrentVersion()) ?? seedVersion);
};

export const initWeb = async () => {
  try {
    await ensureSeeded();
  } catch (error) {
    logger.error({ error }, 'web seed failed');
  }

  void updateToLatest().catch((error) => {
    logger.error({ error }, 'initial web update failed');
  });

  return getServedRoot();
};
