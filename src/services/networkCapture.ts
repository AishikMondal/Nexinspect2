import type { NetworkRequest } from "../types/network";

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function formatDuration(ms: number): string {
  if (ms < 1) return "< 1 ms";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function analyzeCacheControl(headers: Record<string, string>): {
  cacheable: boolean;
  directives: string[];
  ttl?: number;
} {
  const cacheControl = headers["cache-control"] || "";
  if (!cacheControl) {
    return { cacheable: false, directives: [] };
  }

  const directives = cacheControl.split(",").map((s) => s.trim().toLowerCase());
  const noStore = directives.includes("no-store");
  const noCache = directives.includes("no-cache");
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const ttl = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : undefined;

  const cacheable = !noStore && !noCache && (ttl === undefined || ttl > 0);

  return {
    cacheable,
    directives,
    ttl,
  };
}

export function getCompressionSavedBytes(request: NetworkRequest): {
  savedBytes: number;
  percentage: number;
  algorithm: string;
} | null {
  const contentEncoding = request.responseHeaders["content-encoding"] || "";
  if (!contentEncoding) return null;

  const originalSizeStr =
    request.responseHeaders["x-original-content-length"] ||
    request.responseHeaders["content-length"];
  if (!originalSizeStr) return null;

  const originalSize = parseInt(originalSizeStr, 10);
  if (isNaN(originalSize) || originalSize <= request.size) return null;

  const savedBytes = originalSize - request.size;
  const percentage = Math.round((savedBytes / originalSize) * 100);

  return {
    savedBytes,
    percentage,
    algorithm: contentEncoding,
  };
}
