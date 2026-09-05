import type { Sdk115 } from './client.js';
import type { DownloadMeta, FileItem } from './types.js';

const MAX_FILES = 2_000;
const MAX_FOLDERS = 128;

export function parseDownloadMeta(result: Record<string, unknown>): DownloadMeta {
  const first = Object.values(result)[0];
  const meta = first && typeof first === 'object' ? (first as Record<string, unknown>) : {};
  const nestedUrl =
    meta.url && typeof meta.url === 'object'
      ? (meta.url as Record<string, unknown>).url
      : undefined;
  return {
    url: typeof nestedUrl === 'string' ? nestedUrl : '',
    fileName: typeof meta.file_name === 'string' ? meta.file_name : 'image',
  };
}

export async function resolveDownloadUrl(sdk: Sdk115, pc: string) {
  const encoded = await sdk.getFile(pc);
  const meta = parseDownloadMeta(encoded);
  const url = new URL(meta.url);
  if (url.protocol !== 'https:') throw new Error('115 returned an insecure download URL');
  return meta;
}

export async function listPictures(
  sdk: Sdk115,
  rootCid: string,
): Promise<Array<FileItem & { parentCid: string }>> {
  const result: Array<FileItem & { parentCid: string }> = [];
  const queue = [rootCid];
  const visited = new Set<string>();
  while (queue.length && result.length < MAX_FILES && visited.size < MAX_FOLDERS) {
    const cid = queue.shift() as string;
    if (visited.has(cid)) continue;
    visited.add(cid);
    const firstPage = await sdk.getFileList(0, 500, cid);
    const count = Math.min(Math.max(Number(firstPage.count || 0), 0), MAX_FILES - result.length);
    for (let offset = 0; offset < Math.max(count, 1); offset += 500) {
      const page =
        offset === 0
          ? firstPage
          : await sdk.getFileList(offset, Math.min(500, count - offset), cid);
      for (const item of page.data || []) {
        if (item.fid && item.class === 'PIC' && item.pc) result.push({ ...item, parentCid: cid });
        else if (!item.fid && item.cid && !visited.has(item.cid)) queue.push(item.cid);
        if (result.length >= MAX_FILES) break;
      }
      if (!page.data?.length || result.length >= MAX_FILES) break;
    }
  }
  return result;
}

export function pickRandom<T>(items: T[]) {
  if (!items.length) return undefined;
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  return items[random[0] % items.length];
}
