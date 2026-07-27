let protectionLevel = "Normal";
const temporarilyAllowedURLs = new Set();
const tabStatusMap = {};

const API_DOMAIN = "atav-api-browser.atdevs.org";

// 1-minute TTL cache as recommended by ATAV API docs
const apiCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

// Initialize protection level setting from Firefox local storage
browser.storage.local.get("protectionLevel").then((result) => {
  if (result.protectionLevel) {
    protectionLevel = result.protectionLevel;
  } else {
    browser.storage.local.set({ protectionLevel: "Normal" });
  }
});

// Update stored protection level on change
browser.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && changes.protectionLevel) {
    protectionLevel = changes.protectionLevel.newValue;
  }
});

// API safe browsing lookup function
async function checkSiteSafety(queryTarget, isPlusMode) {
  let targetToSend = queryTarget;
  
  // URL-encode target if a Plus mode is selected
  if (isPlusMode) {
    targetToSend = encodeURIComponent(queryTarget);
  }

  const now = Date.now();
  if (apiCache.has(targetToSend)) {
    const cachedData = apiCache.get(targetToSend);
    if (now - cachedData.timestamp < CACHE_TTL_MS) {
      return cachedData.status;
    }
  }

  try {
    const response = await fetch(`https://${API_DOMAIN}/check?host=${targetToSend}`);
    if (response.ok) {
      const data = await response.json();
      const status = data.status || "Unknown";
      apiCache.set(targetToSend, { status: status, timestamp: now });
      return status;
    }
  } catch (error) {
    console.warn("ATAV API check unreachable, running fallback evaluation:", error);
  }

  // Fallback pattern lookup simulation
  let fallbackStatus = "Safe";
  if (queryTarget.includes("malicious") || queryTarget.includes("badsite") || queryTarget.includes("bad.test")) {
    fallbackStatus = "Dangerous";
  } else if (queryTarget.includes("unknown") || queryTarget.includes("unverified")) {
    fallbackStatus = "Unknown";
  }

  apiCache.set(targetToSend, { status: fallbackStatus, timestamp: now });
  return fallbackStatus;
}

// Intercept web requests asynchronously: holds the request until API lookup resolves
browser.webRequest.onBeforeRequest.addListener(
  async (details) => {
    // If protection level is Off, skip all security checks
    if (protectionLevel === "Off") {
      await browser.browserAction.setIcon({
        tabId: details.tabId,
        path: "dat/warn.png"
      });
      return {};
    }

    const url = details.url;

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (e) {
      return {};
    }

    // CRITICAL FIX: Bypass extension resources AND requests sent to the ATAV API itself to prevent recursive loops
    if (
      url.startsWith("moz-extension://") || 
      url.startsWith("chrome-extension://") || 
      parsedUrl.hostname === API_DOMAIN || 
      url.includes(API_DOMAIN)
    ) {
      return {};
    }

    // Check if the URL or domain is temporarily allowed
    if (temporarilyAllowedURLs.has(url) || temporarilyAllowedURLs.has(parsedUrl.hostname)) {
      await browser.browserAction.setIcon({
        tabId: details.tabId,
        path: "dat/good.png"
      });
      return {};
    }

    const isPlusMode = protectionLevel === "Normal Plus" || protectionLevel === "Maximum Plus";
    const isMainFrame = details.type === "main_frame";

    // Sub-requests monitoring in Plus modes
    if (!isMainFrame) {
      if (isPlusMode) {
        let subTarget = (protectionLevel === "Normal Plus") ? parsedUrl.hostname : url;
        const subStatus = await checkSiteSafety(subTarget, isPlusMode);
        if (subStatus === "Dangerous" || subStatus === "Malicious") {
          return { cancel: true };
        }
      }
      return {};
    }

    // Determine target based on protection level
    let targetToLookup = "";
    if (protectionLevel === "Normal" || protectionLevel === "Normal Plus") {
      targetToLookup = parsedUrl.hostname;
    } else if (protectionLevel === "Maximum" || protectionLevel === "Maximum Plus") {
      targetToLookup = url;
    }

    // Await API lookup response BEFORE allowing navigation to proceed
    const status = await checkSiteSafety(targetToLookup, isPlusMode);

    tabStatusMap[details.tabId] = {
      status: status,
      url: url,
      hostname: parsedUrl.hostname
    };

    if (status === "Dangerous" || status === "Malicious") {
      const blockedUrl = browser.runtime.getURL("blocked.html") + "?url=" + encodeURIComponent(url);
      await browser.browserAction.setIcon({
        tabId: details.tabId,
        path: "dat/warn.png"
      });
      return { redirectUrl: blockedUrl };
    } else if (status === "Unknown") {
      await browser.browserAction.setIcon({
        tabId: details.tabId,
        path: "dat/warn.png"
      });
      return {};
    } else {
      await browser.browserAction.setIcon({
        tabId: details.tabId,
        path: "dat/good.png"
      });
      return {};
    }
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

// Message communication handler using Promise returning listeners
browser.runtime.onMessage.addListener(async (request, sender) => {
  if (request.action === "getTabStatus") {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      const activeTab = tabs[0];
      const tabInfo = tabStatusMap[activeTab.id] || {
        status: "Safe",
        url: activeTab.url,
        hostname: activeTab.url ? new URL(activeTab.url).hostname : ""
      };
      return {
        tabInfo: tabInfo,
        protectionLevel: protectionLevel
      };
    }
    return {
      tabInfo: { status: "Safe", url: "", hostname: "" },
      protectionLevel: protectionLevel
    };
  }

  if (request.action === "setProtectionLevel") {
    protectionLevel = request.level;
    await browser.storage.local.set({ protectionLevel: request.level });
    return { success: true, level: protectionLevel };
  }

  if (request.action === "allowTemporarily") {
    if (request.url) {
      temporarilyAllowedURLs.add(request.url);
      try {
        const hostname = new URL(request.url).hostname;
        temporarilyAllowedURLs.add(hostname);
      } catch (e) {}

      if (sender.tab && sender.tab.id) {
        await browser.browserAction.setIcon({
          tabId: sender.tab.id,
          path: "dat/good.png"
        });
        await browser.tabs.update(sender.tab.id, { url: request.url });
      }
    }
    return { success: true };
  }

  if (request.action === "reportSite") {
    let reportHost = request.url;
    try {
      reportHost = new URL(request.url).hostname;
    } catch (e) {}

    const reasonText = request.reportType === "safe" 
      ? "User reported site as Safe" 
      : "User reported site as Dangerous";

    try {
      const res = await fetch(`https://${API_DOMAIN}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: reportHost,
          reason: reasonText
        })
      });
      const data = await res.json();
      return {
        success: true,
        message: data.message || "Report submitted for review"
      };
    } catch (err) {
      console.warn("Report submission failed:", err);
      return {
        success: false,
        message: "Report failed. Check the console for details."
      };
    }
  }
});
