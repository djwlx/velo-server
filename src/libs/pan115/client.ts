import { secret } from './crypto.js';
import type { FileListResponse } from './types.js';

const FILE_LIST_URL = 'https://webapi.115.com/files';
const DOWNLOAD_URL = 'https://proapi.115.com/app/chrome/downurl';
const REQUEST_TIMEOUT_MS = 15_000;
const MIN_115_REQUEST_INTERVAL_MS = 200;

let requestQueue = Promise.resolve();
let lastRequestAt = 0;

const request = async (input: string, init: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS) => {
  const task = async () => {
    const waitMs = Math.max(0, lastRequestAt + MIN_115_REQUEST_INTERVAL_MS - Date.now());
    if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(input, { ...init, signal: controller.signal });
      if (!response.ok) throw new Error(`115 request failed: ${response.status}`);
      return response;
    } finally {
      clearTimeout(timer);
      lastRequestAt = Date.now();
    }
  };
  const pending = requestQueue.then(task, task);
  requestQueue = pending.then(
    () => undefined,
    () => undefined,
  );
  return pending;
};

export function create115Sdk(cookie: string, userAgent: string) {
  const headers = { Cookie: cookie, Accept: 'application/json', 'User-Agent': userAgent };
  return {
    async getFileList(offset = 0, pageSize = 500, cid = '0'): Promise<FileListResponse> {
      const url = new URL(FILE_LIST_URL);
      for (const [key, value] of Object.entries({
        aid: '1',
        cid,
        o: 'user_ptime',
        asc: '1',
        offset,
        show_dir: '1',
        limit: pageSize,
        snap: '0',
        natsort: '0',
        record_open_time: '1',
        format: 'json',
        fc_mix: '0',
      }))
        url.searchParams.set(key, String(value));
      const result = (await (
        await request(url.toString(), { headers })
      ).json()) as FileListResponse;
      return result;
    },
    async getFile(pc: string): Promise<Record<string, unknown>> {
      const timestamp = Math.floor(Date.now() / 1000);
      const encoded = secret.encode(JSON.stringify({ pickcode: pc }), timestamp);
      const body = new FormData();
      body.append('data', encoded.data);
      const response = (await (
        await request(DOWNLOAD_URL, { method: 'POST', headers, body })
      ).json()) as {
        data?: unknown;
        state?: unknown;
        code?: unknown;
        errno?: unknown;
        error?: unknown;
        error_msg?: unknown;
        msg?: unknown;
        message?: unknown;
      };
      if (typeof response.data !== 'string' || !response.data.trim()) {
        const state =
          typeof response.state === 'string' ||
          typeof response.state === 'number' ||
          typeof response.state === 'boolean'
            ? String(response.state)
            : 'unknown';
        const codeValue = response.code ?? response.errno;
        const code =
          typeof codeValue === 'string' || typeof codeValue === 'number'
            ? String(codeValue)
            : 'unknown';
        const messageValue =
          response.error_msg ?? response.error ?? response.msg ?? response.message;
        const message = typeof messageValue === 'string' ? messageValue : 'unknown';
        throw new Error(
          `115 returned no download metadata (state=${state}, code=${code}, message=${message.slice(0, 120)})`,
        );
      }
      let decoded: string;
      try {
        decoded = secret.decode(response.data, encoded.key);
      } catch {
        throw new Error('115 download metadata could not be decoded');
      }
      try {
        return JSON.parse(decoded) as Record<string, unknown>;
      } catch {
        throw new Error('115 download metadata is invalid');
      }
    },
  };
}

export type Sdk115 = ReturnType<typeof create115Sdk>;
