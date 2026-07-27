document.addEventListener("DOMContentLoaded", async () => {
  const headerIcon = document.getElementById("header-icon");
  const protectionSelect = document.getElementById("protection-level");
  const siteUrlElem = document.getElementById("site-url");
  const statusBadge = document.getElementById("status-badge");
  const statusDesc = document.getElementById("status-desc");
  const reportContainer = document.getElementById("unknown-report-container");
  const reportSafeBtn = document.getElementById("report-safe-btn");
  const reportMaliciousBtn = document.getElementById("report-malicious-btn");
  const feedbackMsg = document.getElementById("feedback-msg");

  let currentTabUrl = "";

  // Always attach event listener so user can toggle out of "Off" mode
  protectionSelect.addEventListener("change", async (e) => {
    const selectedLevel = e.target.value;
    await browser.runtime.sendMessage({ action: "setProtectionLevel", level: selectedLevel });
    window.location.reload();
  });

  // Attach report button click handlers
  if (reportSafeBtn) {
    reportSafeBtn.addEventListener("click", () => handleReport("safe"));
  }

  if (reportMaliciousBtn) {
    reportMaliciousBtn.addEventListener("click", () => handleReport("dangerous"));
  }

  try {
    const response = await browser.runtime.sendMessage({ action: "getTabStatus" });
    if (response) {
      if (response.protectionLevel) {
        protectionSelect.value = response.protectionLevel;
      }

      const tabInfo = response.tabInfo || {};
      currentTabUrl = tabInfo.url || "";
      siteUrlElem.textContent = tabInfo.hostname || currentTabUrl || "No active site";

      if (response.protectionLevel === "Off") {
        headerIcon.src = "dat/warn.png";
        statusBadge.className = "status-badge status-off";
        statusBadge.textContent = "Protection Off";
        statusDesc.textContent = "Protection is turned off. Site security checks are disabled.";
        reportContainer.style.display = "none";
      } else {
        const status = tabInfo.status || "Safe";

        if (status === "Unknown") {
          headerIcon.src = "dat/warn.png";
          statusBadge.className = "status-badge status-unknown";
          statusBadge.textContent = "Unknown Site";
          statusDesc.textContent = "We don't know this site. It isn't in our database and we have no idea if it's good or bad.";
          reportContainer.style.display = "block";
        } else if (status === "Dangerous" || status === "Malicious") {
          headerIcon.src = "dat/warn.png";
          statusBadge.className = "status-badge status-malicious";
          statusBadge.textContent = "Dangerous";
          statusDesc.textContent = "Warning: This site is flagged as dangerous or malicious!";
          reportContainer.style.display = "none";
        } else {
          headerIcon.src = "dat/good.png";
          statusBadge.className = "status-badge status-safe";
          statusBadge.textContent = "Safe";
          statusDesc.textContent = "This site is verified as safe by ATAV Safe Browsing.";
          reportContainer.style.display = "none";
        }
      }
    }
  } catch (e) {
    console.error("Error retrieving tab status:", e);
  }

  async function handleReport(reportType) {
    if (!currentTabUrl) return;

    const res = await browser.runtime.sendMessage({
      action: "reportSite",
      url: currentTabUrl,
      reportType: reportType
    });

    if (res && res.success) {
      feedbackMsg.textContent = res.message || "Thank you! Report received.";
      feedbackMsg.style.display = "block";
      reportSafeBtn.disabled = true;
      reportMaliciousBtn.disabled = true;
    }
  }
});
