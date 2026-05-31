import type { NetworkRequest, RequestTimings } from "./types/network";
import type { CertDetails } from "./types/security";

// Configure side panel behavior to open on action click
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error("Error setting side panel behavior:", error));

let sidePanelPort: chrome.runtime.Port | null = null;
let attachedTabId: number | null = null;
const tabRequests = new Map<number, NetworkRequest[]>();
const requestMap = new Map<string, NetworkRequest>(); // requestId -> NetworkRequest
const tabCertificates = new Map<number, CertDetails>();

// Keep track of active requests to compute timings
interface PendingRequest {
  id: string;
  url: string;
  method: string;
  type: string;
  initiator: string;
  requestHeaders: Record<string, string>;
  timeStamp: number;
  wallTime: number;
}
const pendingRequests = new Map<string, PendingRequest>();

// Helper to notify the sidepanel of updates
function notifySidePanel() {
  if (!sidePanelPort || attachedTabId === null) return;
  const requests = tabRequests.get(attachedTabId) || [];
  const cert = tabCertificates.get(attachedTabId);
  sidePanelPort.postMessage({
    type: "NETWORK_UPDATE",
    tabId: attachedTabId,
    requests,
    certificate: cert,
  });
}

function notifyDebuggerStatus(attached: boolean, tabId: number) {
  if (!sidePanelPort) return;
  sidePanelPort.postMessage({
    type: "DEBUGGER_STATUS",
    attached,
    tabId,
  });
}

// Attach debugger to a specific tab
function attachDebugger(tabId: number) {
  if (attachedTabId === tabId) {
    notifyDebuggerStatus(true, tabId);
    return;
  }
  if (attachedTabId !== null) {
    detachDebugger(attachedTabId);
  }

  chrome.debugger.attach({ tabId }, "1.3", () => {
    if (chrome.runtime.lastError) {
      console.warn("Debugger attach failed:", chrome.runtime.lastError.message);
      notifyDebuggerStatus(false, tabId);
      return;
    }

    attachedTabId = tabId;
    notifyDebuggerStatus(true, tabId);

    chrome.debugger.sendCommand({ tabId }, "Network.enable", {}, () => {
      if (chrome.runtime.lastError) {
        console.warn("Network.enable failed:", chrome.runtime.lastError.message);
      }
    });
  });
}

// Detach debugger from a specific tab
function detachDebugger(tabId: number) {
  chrome.debugger.detach({ tabId }, () => {
    if (chrome.runtime.lastError) {
      // Ignore if already detached
    }
    if (attachedTabId === tabId) {
      attachedTabId = null;
      notifyDebuggerStatus(false, tabId);
    }
  });
}

// Attach debugger to the current active tab
function attachToActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].id) {
      // Don't debug chrome:// or edge:// system pages
      const url = tabs[0].url || "";
      if (url.startsWith("chrome://") || url.startsWith("chrome-extension://") || url.startsWith("edge://") || url.startsWith("about:")) {
        return;
      }
      attachDebugger(tabs[0].id);
    }
  });
}

// Handle connections from the side panel
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "sidepanel") {
    sidePanelPort = port;
    attachToActiveTab();

    port.onMessage.addListener((msg) => {
      if (msg.type === "ATTACH_REQUEST") {
        attachToActiveTab();
      } else if (msg.type === "DETACH_REQUEST" && attachedTabId !== null) {
        detachDebugger(attachedTabId);
      } else if (msg.type === "CLEAR_LOGS" && attachedTabId !== null) {
        tabRequests.set(attachedTabId, []);
        notifySidePanel();
      }
    });

    port.onDisconnect.addListener(() => {
      sidePanelPort = null;
      if (attachedTabId !== null) {
        detachDebugger(attachedTabId);
      }
    });
  }
});

// Watch for active tab changes
chrome.tabs.onActivated.addListener((activeInfo) => {
  if (sidePanelPort) {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
      const url = tab?.url || "";
      if (url.startsWith("chrome://") || url.startsWith("chrome-extension://") || url.startsWith("edge://") || url.startsWith("about:")) {
        // Detach if we switch to a system tab
        if (attachedTabId !== null) {
          detachDebugger(attachedTabId);
        }
        return;
      }
      attachDebugger(activeInfo.tabId);
    });
  }
});

// Watch for tab updates (e.g. reload or navigation)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (sidePanelPort && tabId === attachedTabId && changeInfo.status === "loading") {
    // Clear requests for this tab when page reloads
    tabRequests.set(tabId, []);
    requestMap.clear();
    pendingRequests.clear();
    notifySidePanel();
  }
});

// Listen to debugger network events
chrome.debugger.onEvent.addListener(async (source, method, params: any) => {
  const tabId = source.tabId;
  if (tabId !== attachedTabId || !tabId) return;

  if (method === "Network.requestWillBeSent") {
    const { requestId, request, timestamp, wallTime, initiator, type } = params;
    
    // Normalize headers
    const reqHeaders: Record<string, string> = {};
    if (request.headers) {
      for (const [k, v] of Object.entries(request.headers)) {
        reqHeaders[k.toLowerCase()] = String(v);
      }
    }

    const pending: PendingRequest = {
      id: requestId,
      url: request.url,
      method: request.method,
      type: type || "other",
      initiator: initiator?.url || initiator?.type || "unknown",
      requestHeaders: reqHeaders,
      timeStamp: timestamp,
      wallTime: wallTime * 1000,
    };
    pendingRequests.set(requestId, pending);

  } else if (method === "Network.responseReceived") {
    const { requestId, response, type } = params;
    const pending = pendingRequests.get(requestId);
    if (!pending) return;

    // Normalize response headers
    const respHeaders: Record<string, string> = {};
    if (response.headers) {
      for (const [k, v] of Object.entries(response.headers)) {
        respHeaders[k.toLowerCase()] = String(v);
      }
    }

    // Capture security details (certificate) if available on the document load
    if (response.securityDetails && type === "Document") {
      const sd = response.securityDetails;
      const cert: CertDetails = {
        subject: sd.subjectName,
        issuer: sd.issuer,
        validFrom: new Date(sd.validFrom * 1000).toLocaleString(),
        validTo: new Date(sd.validTo * 1000).toLocaleString(),
        protocol: sd.protocol || "TLS 1.2/1.3",
        cipherSuite: sd.cipher || "Unknown",
        keyLength: sd.keyExchangeGroup ? 256 : 2048, // approximate or placeholder if exact key length is unavailable
      };
      tabCertificates.set(tabId, cert);
    }

    // Setup initial timings
    const timing = response.timing;
    const timings: RequestTimings = {
      blocked: 0,
      dns: 0,
      connect: 0,
      ssl: 0,
      send: 0,
      ttfb: 0,
      receive: 0,
    };

    if (timing) {
      // The values are offsets in ms relative to timing.requestTime
      timings.blocked = Math.max(0, timing.dnsStart > 0 ? timing.dnsStart : (timing.connectStart > 0 ? timing.connectStart : timing.sendStart));
      timings.dns = timing.dnsEnd > 0 ? Math.max(0, timing.dnsEnd - timing.dnsStart) : 0;
      timings.connect = timing.connectEnd > 0 ? Math.max(0, timing.connectEnd - timing.connectStart) : 0;
      timings.ssl = timing.sslEnd > 0 ? Math.max(0, timing.sslEnd - timing.sslStart) : 0;
      timings.send = timing.sendEnd > 0 ? Math.max(0, timing.sendEnd - timing.sendStart) : 0;
      timings.ttfb = Math.max(0, timing.receiveHeadersEnd - timing.sendEnd);
    }

    const cached = response.fromDiskCache || response.fromServiceWorker || false;
    const size = response.encodedDataLength || 0;
    
    // Calculate compression ratio
    let compressionRatio = undefined;
    const originalSizeStr = respHeaders["x-original-content-length"] || respHeaders["content-length"];
    const contentEncoding = respHeaders["content-encoding"];
    if (contentEncoding && originalSizeStr && size > 0) {
      const originalSize = parseInt(originalSizeStr, 10);
      if (!isNaN(originalSize) && originalSize > size) {
        compressionRatio = parseFloat(((originalSize - size) / originalSize).toFixed(2));
      }
    }

    const netRequest: NetworkRequest = {
      id: requestId,
      url: pending.url,
      method: pending.method,
      status: response.status,
      statusText: response.statusText || "OK",
      type: pending.type,
      requestHeaders: pending.requestHeaders,
      responseHeaders: respHeaders,
      size,
      duration: 0, // Will update when loadingFinished triggers
      mimeType: response.mimeType || "unknown",
      cached,
      timings,
      initiator: pending.initiator,
      timeStamp: pending.wallTime,
      compressionRatio,
      isDuplicate: false, // will run de-duplication pass
      isSlow: false,
    };

    requestMap.set(requestId, netRequest);
    
    // Add to list and run simple checks
    let list = tabRequests.get(tabId) || [];
    
    // Deduplication check: if there is another request with same method and url in the last 5 seconds
    const isDup = list.some(
      (r) => r.url === netRequest.url && r.method === netRequest.method && Math.abs(r.timeStamp - netRequest.timeStamp) < 5000
    );
    netRequest.isDuplicate = isDup;

    list.push(netRequest);
    tabRequests.set(tabId, list);
    notifySidePanel();

  } else if (method === "Network.loadingFinished") {
    const { requestId, encodedDataLength, timestamp } = params;
    const netRequest = requestMap.get(requestId);
    if (!netRequest) return;

    const pending = pendingRequests.get(requestId);
    if (pending) {
      // Calculate total duration in milliseconds
      const duration = Math.max(1, Math.round((timestamp - pending.timeStamp) * 1000));
      netRequest.duration = duration;
      netRequest.isSlow = duration > 3000;
      
      // Calculate receive timing (download phase)
      const t = netRequest.timings;
      const otherPhases = t.blocked + t.dns + t.connect + t.ssl + t.send + t.ttfb;
      t.receive = Math.max(0, duration - otherPhases);
    }

    if (encodedDataLength && encodedDataLength > 0) {
      netRequest.size = encodedDataLength;
    }

    // Try fetching response body for text types
    const textTypes = ["document", "stylesheet", "script", "xhr", "fetch", "json", "text"];
    const mime = netRequest.mimeType.toLowerCase();
    const isText = textTypes.some(t => mime.includes(t)) || mime.includes("javascript") || mime.includes("json") || mime.includes("html") || mime.includes("css") || mime.includes("xml");
    
    if (isText && !netRequest.cached) {
      chrome.debugger.sendCommand(
        { tabId },
        "Network.getResponseBody",
        { requestId },
        (responseResult: any) => {
          if (chrome.runtime.lastError) {
            // Ignore error, e.g. request finished too fast or was canceled
            return;
          }
          if (responseResult && responseResult.body) {
            netRequest.responseBody = responseResult.body;
            if (responseResult.base64Encoded) {
              try {
                netRequest.responseBody = atob(responseResult.body);
              } catch (e) {
                // Keep base64 if decoding fails
              }
            }
            if (netRequest.responseBody && netRequest.responseBody.length > 50000) {
              netRequest.responseBody = netRequest.responseBody.substring(0, 50000) + "\n... [TRUNCATED FOR MEMORY PERFORMANCE] ...";
              netRequest.responseBodyTruncated = true;
            }
            notifySidePanel();
          }
        }
      );
    } else {
      notifySidePanel();
    }

    // Clean up maps to avoid memory leaks
    pendingRequests.delete(requestId);
  }
});
export {}
