// ATAV Safe Browsing - background.js (v1.0.4)
const API_BASE_URL = "https://atav-api-browser.atdevs.org";

// Listener for web requests to check and block dangerous sites
browser.webRequest.onBeforeRequest.addListener(
  async function(details) {
    // Only act on top-level main frame GET requests
    if (details.type !== "main_frame" || details.method !== "GET" || details.frameId !== 0) {
      return {};
    }

    let url;
    try {
        url = new URL(details.url);
    } catch (e) {
        console.warn(`ATAV Background: Invalid URL encountered in onBeforeRequest: ${details.url}`, e);
        return {}; // Not a processable URL
    }
    
    const host = url.hostname;

    // Don't check special browser URLs, our own API, or our blocked page
    if (!host || url.protocol === "about:" || url.protocol === "moz-extension:" || url.protocol === "file:" || host === new URL(API_BASE_URL).hostname) {
      return {};
    }
    if (details.url.startsWith(browser.runtime.getURL("blocked.html"))) {
      return {}; // Avoid redirect loop for the blocked page itself
    }

    try {
      console.log(`ATAV Background: Checking ${host} from URL (onBeforeRequest): ${details.url}`);
      const response = await fetch(`${API_BASE_URL}/check?host=${encodeURIComponent(host)}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`ATAV Background API Error for ${host} (onBeforeRequest): ${response.status} ${errorText}`);
        await browser.storage.local.remove(`status_${host}`);
        return {};
      }

      const data = await response.json();
      data.timestamp = Date.now(); 
      await browser.storage.local.set({[`status_${host}`]: data}); 

      if (data.status === "Dangerous") {
        console.log(`ATAV Background: Blocking dangerous site: ${host}. Risk: ${data.risk}`);
        const blockedPageUrl = browser.runtime.getURL("blocked.html");
        const params = new URLSearchParams({
          host: data.host,
          risk: data.risk || 'Not specified',
          category: data.category || 'Unknown',
          originalUrl: encodeURIComponent(details.url) 
        });
        return { redirectUrl: `${blockedPageUrl}?${params.toString()}` };
      }
      
      console.log(`ATAV Background: Site ${host} is ${data.status} (onBeforeRequest)`);
      return {}; 
    } catch (error) {
      console.error(`ATAV Background: Network or other error checking site ${host} (onBeforeRequest):`, error);
      await browser.storage.local.remove(`status_${host}`);
      return {};
    }
  },
  { urls: ["http://*/*", "https://*/*"], types: ["main_frame"] },
  ["blocking"] 
);

// Listener for messages from popup
browser.runtime.onMessage.addListener(async (request, sender) => {
  console.log("ATAV Background: Message received in onMessage listener", JSON.stringify(request));

  if (request.action === "checkHost") {
    const host = request.host;
    if (!host) {
      console.error("ATAV Background: checkHost called with no host.");
      return { error: "Host not provided by popup for checkHost" }; 
    }
    try {
      const storageKey = `status_${host}`;
      const storedResult = await browser.storage.local.get(storageKey);
      if (storedResult && storedResult[storageKey]) {
        const cacheEntry = storedResult[storageKey];
        if (cacheEntry.timestamp && (Date.now() - cacheEntry.timestamp < 1 * 60 * 1000)) {
          console.log(`ATAV Background: Using cached status for ${host} in popup.`, cacheEntry);
          return cacheEntry; // Return cached data
        }
      }

      console.log(`ATAV Background: Fetching fresh status for ${host} for popup.`);
      const response = await fetch(`${API_BASE_URL}/check?host=${encodeURIComponent(host)}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`ATAV Background API Error (popup check for ${host}): ${response.status} ${errorText}`);
        return { error: `API error ${response.status} for ${host}` };
      }
      const data = await response.json();
      data.timestamp = Date.now(); 
      await browser.storage.local.set({[storageKey]: data}); 
      console.log(`ATAV Background: checkHost for ${host} (popup) will return fresh data:`, data);
      return data; 
    } catch (error) {
      console.error(`ATAV Background: Error in checkHost for ${host} (popup):`, error);
      return { error: error.message || `Unknown error during checkHost for ${host}` }; 
    }
  } else if (request.action === "reportSite") {
    const { host, reason } = request;
    if (!host) {
      console.error("ATAV Background: reportSite called with no host.");
      return { status: "Error", error: "Host not provided by popup for reportSite" };
    }
    try {
      console.log(`ATAV Background: Reporting site ${host} with reason: ${reason}`);
      const apiResponse = await fetch(`${API_BASE_URL}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, reason: reason || '' })
      });

      const responseText = await apiResponse.text(); 
      if (!apiResponse.ok) {
        console.error(`ATAV Background API Report Error for ${host}: ${apiResponse.status} ${responseText}`);
        try {
            const errorJson = JSON.parse(responseText);
            return { status: "Error", error: errorJson.error || `API error ${apiResponse.status} for ${host}` };
        } catch (e) {
            return { status: "Error", error: `API error ${apiResponse.status} for ${host}: ${responseText}` };
        }
      }
      const data = JSON.parse(responseText);
      console.log(`ATAV Background: Report submission for ${host} successful:`, data);
      return data;
    } catch (error) {
      console.error(`ATAV Background: Error in reportSite for ${host}:`, error);
      return { status: "Error", error: error.message || `Unknown error during reportSite for ${host}` };
    }
  }
  
  console.warn("ATAV Background: Unhandled message action received:", request.action);
  return { error: `Unhandled action: ${request.action}` }; // Default response for unhandled actions
});

console.log("ATAV Safe Browsing background script loaded and running (v1.0.4).");
