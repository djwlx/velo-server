import type { Handler } from 'hono';

import { Pan115Sdk } from '../../../libs/pan115/index.js';
import { randomInt } from '../../../utils/number.js';
import { fail, success } from '../../../utils/response.js';
import { bulkInsertPics, clearAllPics, getPicByIndex, getPicCount } from '../repositories/pic.js';
import type { Pan115Env } from '../types.js';
import { fetchRecursively } from '../utils.js';

export const getRandomPic: Handler<Pan115Env> = async (c) => {
  const cookie = c.get('cookie115');
  const userAgent = c.req.header('User-Agent');
  const isModeJson = c.req.query('mode') === 'json';
  const client115 = new Pan115Sdk(cookie, isModeJson ? userAgent : '');
  const count = getPicCount();
  if (!count) {
    return c.json(fail('no cached pic', 404));
  }
  const pic = getPicByIndex(randomInt(0, count - 1));
  if (!pic) {
    return c.json(fail('no cached pic', 404));
  }

  const fileInfo = await client115.getFile(pic.pc_code);
  if (isModeJson) {
    return c.json(success(fileInfo));
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
    },
  });
};

export const cacheFileIdInDB: Handler<Pan115Env> = async (c) => {
  const cookie = c.get('cookie115');
  const body = await c.req.json<{ cid?: string; delayMs?: number }>();
  const cid = body.cid;
  if (!cid) return c.json(fail('cid is required', 400));
  const delayMs = body.delayMs ?? 500;
  const client115 = new Pan115Sdk(cookie);

  void fetchRecursively(
    client115,
    cid,
    ({ parentCid, items }) => {
      const pics = items.filter((item) => item.class === 'PIC' && item.pc);
      const rows = pics.map(({ pc, class: fileClass }) => ({
        pc_code: pc,
        class: fileClass,
        cid: parentCid,
      }));
      bulkInsertPics(rows);
    },
    { delayMs },
  ).catch((error: unknown) => {
    c.var.logger.error({ error }, 'cache 115 files failed');
  });

  return c.json(success({ cid, started: true }));
};

export const clearPicsHandler: Handler<Pan115Env> = (c) => {
  clearAllPics();
  return c.json(success({ cleared: true }));
};
