document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const targetUrl = params.get("url") || "";

  const urlDisplay = document.getElementById("blocked-url-display");
  if (urlDisplay) {
    urlDisplay.textContent = targetUrl || "Unknown Target URL";
  }

  const goBackBtn = document.getElementById("go-back-btn");
  if (goBackBtn) {
    goBackBtn.addEventListener("click", () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.close();
      }
    });
  }

  const allowTempBtn = document.getElementById("allow-temp-btn");
  if (allowTempBtn) {
    allowTempBtn.addEventListener("click", async () => {
      if (targetUrl) {
        const response = await browser.runtime.sendMessage({
          action: "allowTemporarily",
          url: targetUrl
        });
        if (response && response.success) {
          window.location.href = targetUrl;
        }
      }
    });
  }
});
