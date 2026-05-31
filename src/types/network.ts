export interface RequestTimings {
  blocked: number;  // time spent waiting in browser queue
  dns: number;      // DNS resolution duration
  connect: number;  // TCP connection duration
  ssl: number;      // SSL/TLS handshake duration
  send: number;     // sending request headers/body
  ttfb: number;     // time to first byte
  receive: number;  // receiving response body
}

export interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  status: number;
  statusText: string;
  type: string;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  responseBodyTruncated?: boolean;
  size: number; // in bytes
  duration: number; // in ms
  mimeType: string;
  cached: boolean;
  timings: RequestTimings;
  initiator: string;
  timeStamp: number; // ms timestamp
  compressionRatio?: number; // efficiency
  isDuplicate?: boolean; // deduplication detection
  isSlow?: boolean; // duration > 3000ms
}
