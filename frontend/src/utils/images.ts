export function getSafeImageUrl(value?: string | null) {
  const url = value?.trim();
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("file://")) return url;
  return null;
}
