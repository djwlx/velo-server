export type FileItem = {
  cid: string;
  aid: string;
  pid: string;
  n: string;
  pc: string;
  m: number;
  star_time: number;
  cc: string;
  sh: string;
  t: string;
  te: string;
  tu: string;
  tp: string;
  to: string;
  e: string;
  p: number;
  ns: string;
  u: string;
  fc: number;
  fdes: number;
  hdf: number;
  ispl: number;
  fvs: number;
  check_code: number;
  check_msg: string;
  fuuid: number;
  ec: number;
  fl: unknown[];
  issct: number;
  score: number;
  is_top: number;
  fid?: string;
  class?: string;
};

export type PathItem = {
  name: string;
  aid: string;
  cid: string;
  pid: string;
  isp: string;
};

export type FileListResponse = {
  data: FileItem[];
  count: number;
  sys_count: number;
  page_size: number;
  aid: string;
  cid: string | number;
  is_asc: number;
  star: number;
  is_share: number;
  type: number;
  is_q: number;
  r_all: number;
  stdir: number;
  cur: number;
  min_size: number;
  max_size: number;
  record_open_time: string;
  path: PathItem[];
  fields: string;
  order: string;
  fc_mix: number;
  cost_time_1: number;
  cost_time_2: number;
  cost_time_3: number;
  cost_time_4: number;
  cost_time_5: number;
  cost_time_6: number;
  cost_time_7: number;
  cost_time_8: number;
  natsort: number;
  uid: number;
  offset: number;
  limit: number;
  suffix: string;
  last_utime: number;
  use_cache: number;
  state: boolean;
  error: string;
  errNo: number;
};

export type FileUrl = {
  url: string;
  client: number;
  desc: string | null;
  isp: string | null;
  oss_id: string;
  ooid: string;
};

export type DownloadMeta = {
  file_name: string;
  file_size: string;
  pick_code: string;
  sha1: string;
  url: FileUrl;
};

export type DownloadMetaResponse = Record<string, DownloadMeta>;

export type FileResponse = {
  state: boolean;
  msg: string;
  errno: number;
  data: string;
};

export type FileInfo = {
  file_name: string;
  file_size: string;
  url: string;
  mime: string;
};
