export type FileItem = { n?: string; pc?: string; cid?: string; fid?: string; class?: string };
export type FileListResponse = {
  data?: FileItem[];
  count?: number;
  path?: Array<{ name?: string }>;
};
export type DownloadMeta = { url: string; fileName: string };
