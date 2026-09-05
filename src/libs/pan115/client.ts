import mime from 'mime-types';

import { secret } from './crypto.js';
import type { DownloadMetaResponse, FileInfo, FileListResponse, FileResponse } from './types.js';

const FILE_LIST_URL = 'https://webapi.115.com/files';
const DOWNLOAD_URL = 'https://proapi.115.com/app/chrome/downurl';
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

export class Pan115Sdk {
  readonly userAgent: string;
  private readonly headers: Record<string, string>;

  constructor(cookie: string, userAgent?: string) {
    this.userAgent = userAgent?.trim() || DEFAULT_USER_AGENT;
    this.headers = {
      Cookie: cookie,
      Accept: 'application/json',
      'User-Agent': this.userAgent,
    };
  }

  private async request(input: string, init: RequestInit): Promise<Response> {
    const response = await fetch(input, { ...init, headers: this.headers });
    if (!response.ok) throw new Error(`115 request failed: ${response.status}`);
    return response;
  }

  async getFileList(offset = 0, pageSize = 100, cid = '0'): Promise<FileListResponse> {
    const query = new URLSearchParams({
      aid: '1',
      cid,
      o: 'user_ptime',
      asc: '1',
      offset: String(offset),
      show_dir: '1',
      limit: String(pageSize),
      snap: '0',
      natsort: '0',
      record_open_time: '1',
      format: 'json',
      fc_mix: '0',
    });
    const response = await this.request(`${FILE_LIST_URL}?${query.toString()}`, { method: 'GET' });
    return (await response.json()) as FileListResponse;
  }

  async getFile(pc: string): Promise<FileInfo> {
    const timestamp = Math.floor(Date.now() / 1000);
    const encoded = secret.encode(JSON.stringify({ pickcode: pc }), timestamp);
    const body = new FormData();
    body.append('data', encoded.data);
    const response = (await (
      await this.request(DOWNLOAD_URL, { method: 'POST', body })
    ).json()) as FileResponse;
    if (!response.state || !response.data) {
      throw new Error(
        `115 returned no download metadata (msg=${response.msg}, errno=${response.errno})`,
      );
    }
    let decoded: string;
    try {
      decoded = secret.decode(response.data, encoded.key);
    } catch {
      throw new Error('115 download metadata could not be decoded');
    }
    try {
      const meta = JSON.parse(decoded) as DownloadMetaResponse;
      const entry = Object.values(meta)[0];
      return {
        file_name: entry.file_name,
        file_size: entry.file_size,
        url: entry.url.url,
        mime: mime.lookup(entry.file_name) || 'image/jpeg',
      };
    } catch {
      throw new Error('115 download metadata is invalid');
    }
  }
}
