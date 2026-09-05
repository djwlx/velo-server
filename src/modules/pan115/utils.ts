import type { FileItem, Pan115Sdk } from '../../libs/pan115/index.js';

export type TraversePage = {
  parentCid: string;
  items: FileItem[];
};

export type TraverseOptions = {
  delayMs?: number;
};

const PAGE_SIZE = 50;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchRecursively(
  sdk: Pan115Sdk,
  rootCid: string,
  onRequest: (page: TraversePage) => void | Promise<void>,
  options: TraverseOptions = {},
): Promise<void> {
  const delayMs = options.delayMs ?? 0;

  const visited = new Set<string>([rootCid]);
  const queue = [rootCid];

  while (queue.length) {
    const cid = queue.shift() as string;
    const firstPage = await sdk.getFileList(0, PAGE_SIZE, cid);
    const totalPages = Math.max(Math.ceil(firstPage.count / PAGE_SIZE), 1);
    for (let i = 0; i < totalPages; i++) {
      const page = i === 0 ? firstPage : await sdk.getFileList(i * PAGE_SIZE, PAGE_SIZE, cid);
      for (const item of page.data) {
        if (!item.fid && !visited.has(item.cid)) {
          visited.add(item.cid);
          queue.push(item.cid);
        }
      }
      await onRequest({ parentCid: cid, items: page.data });
      if (!page.data.length) break;
      if (delayMs > 0) await sleep(delayMs);
    }
  }
}
