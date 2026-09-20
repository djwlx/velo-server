import type { Handler } from 'hono';

import { ErrorCode } from '../../../config/error-code.js';
import { isRunning, runExclusive } from '../../../libs/async-lock.js';
import { rootLogger } from '../../../libs/logger.js';
import { Pan115Sdk } from '../../../libs/pan115/index.js';
import { randomInt } from '../../../utils/number.js';
import { fail, success } from '../../../utils/response.js';
import { buildContentDisposition, escapeHtml } from '../../../utils/string.js';
import { bulkInsertPics, clearAllPics, getPicByIndex, getPicCount } from '../repositories/pic.js';
import type { Pan115Env } from '../types.js';
import { fetchRecursively } from '../utils.js';

const PIC_CACHE_LOCK_KEY = 'pan115-pic-cache';

export const getRandomPic: Handler<Pan115Env> = async (c) => {
  const cookie = c.get('cookie115');
  const userAgent = c.req.header('User-Agent');
  const mode = c.req.query('mode');
  const isModeJson = mode === 'json';
  const isModeHtml = mode === 'html';
  const client115 = new Pan115Sdk(cookie, isModeJson || isModeHtml ? userAgent : '');
  const count = getPicCount();
  if (!count) {
    return c.json(fail('noCachedPic', ErrorCode.ResourceNotFound), 404);
  }
  const pic = getPicByIndex(randomInt(0, count - 1));
  if (!pic) {
    return c.json(fail('noCachedPic', ErrorCode.ResourceNotFound), 404);
  }

  const fileInfo = await client115.getFile(pic.pc_code);
  if (isModeJson) {
    return c.json(success(fileInfo));
  }

  if (isModeHtml) {
    const url = escapeHtml(fileInfo.url);
    const name = escapeHtml(fileInfo.file_name);
    return c.html(
      `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${name}</title></head><body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#000"><img src="${url}" alt="${name}" style="max-width:100%;max-height:100vh"></body></html>`,
    );
  }

  const res = await fetch(fileInfo.url, {
    headers: {
      'User-Agent': client115.userAgent,
      Referer: 'https://115.com/',
    },
  });
  if (!res.ok || !res.body) {
    throw new Error(`download failed: ${res.status}`);
  }
  return new Response(res.body, {
    status: res.status,
    headers: {
      'Content-Type': fileInfo.mime,
      'Content-Length': res.headers.get('Content-Length') ?? fileInfo.file_size,
      'Content-Disposition': buildContentDisposition(fileInfo.file_name),
    },
  });
};

export const cacheFileIdInDB: Handler<Pan115Env> = async (c) => {
  if (isRunning(PIC_CACHE_LOCK_KEY)) {
    return c.json(fail('picCacheRunning', ErrorCode.ResourceConflict), 409);
  }

  const cookie = c.get('cookie115');
  const body = await c.req.json<{ cid?: string; delayMs?: number }>();
  const cid = body.cid;
  if (!cid) return c.json(fail('cidRequired', ErrorCode.ValidationFailed), 400);
  const delayMs = body.delayMs ?? 500;
  const client115 = new Pan115Sdk(cookie);

  let total = 0;
  void runExclusive(async () => {
    try {
      await fetchRecursively(
        client115,
        cid,
        ({ parentCid, items }) => {
          const pics = items.filter((item) => item.class === 'PIC' && item.pc);
          const rows = pics.map(({ pc, class: fileClass }) => ({
            pc_code: pc,
            class: fileClass,
            cid: parentCid,
          }));
          total += rows.length;
          bulkInsertPics(rows);
        },
        { delayMs },
      );
      rootLogger.info({ cid, total }, 'cache 115 files done');
    } catch (error) {
      rootLogger.error({ err: error, cid }, 'cache 115 files failed');
    }
  }, PIC_CACHE_LOCK_KEY);

  return c.json(success({ cid, started: true }));
};

export const clearPicsHandler: Handler<Pan115Env> = (c) => {
  if (isRunning(PIC_CACHE_LOCK_KEY)) {
    return c.json(fail('picCacheRunning', ErrorCode.ResourceConflict), 409);
  }
  clearAllPics();
  return c.json(success({ cleared: true }));
};
