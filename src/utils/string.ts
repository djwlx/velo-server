export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^\x20-\x21\x23-\x7e]/g, '_').trim().slice(0, 255);
}

export function buildContentDisposition(filename: string): string {
  const fallback = sanitizeFilename(filename);
  const named = fallback.length > 0 ? `; filename="${fallback}"` : '';
  return `inline${named}; filename*=UTF-8''${encodeURIComponent(filename)}`;
}