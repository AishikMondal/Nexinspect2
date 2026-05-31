export interface MetricValue {
  value: number;
  unit: string;
  rating: "good" | "needs-improvement" | "poor";
}

export interface CoreWebVitals {
  FCP?: MetricValue;
  LCP?: MetricValue;
  CLS?: MetricValue;
  TTFB?: MetricValue;
  INP?: MetricValue;
}

export interface LongTaskEntry {
  id: string;
  startTime: number;
  duration: number;
  attribution?: string;
}

export interface LayoutShiftEntry {
  id: string;
  startTime: number;
  score: number;
  sources?: string[];
}

export interface MemorySample {
  timeStamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export interface RenderBlockingResource {
  url: string;
  type: "script" | "stylesheet";
  size: number;
}

export interface UnusedCodeEstimate {
  url: string;
  type: "css" | "javascript";
  totalBytes: number;
  unusedBytes: number;
  unusedPercentage: number;
}

export interface PerformanceData {
  vitals: CoreWebVitals;
  longTasks: LongTaskEntry[];
  layoutShifts: LayoutShiftEntry[];
  memoryHistory: MemorySample[];
  renderBlocking: RenderBlockingResource[];
  unusedCode: UnusedCodeEstimate[];
}
