export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^\x20-\x21\x23-\x7e]/g, '_').trim().slice(0, 255);
}

export function buildContentDisposition(
  filename: string,
  type: 'inline' | 'attachment' = 'inline',
): string {
  const fallback = sanitizeFilename(filename);
  const named = fallback.length > 0 ? `; filename="${fallback}"` : '';
  return `${type}${named}; filename*=UTF-8''${encodeURIComponent(filename)}`;
}