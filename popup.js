// ATAV Safe Browsing - popup.js (v1.0.4)
document.addEventListener('DOMContentLoaded', async () => {
    const reportForm = document.getElementById('reportForm');
    const reportHostInput = document.getElementById('reportHost');
    const reportReasonInput = document.getElementById('reportReason');
    const reportStatusMessage = document.getElementById('reportStatusMessage');
    const currentSiteStatusDiv = document.getElementById('currentSiteStatus');
    const currentSiteHostSpan = document.getElementById('currentSiteHost');

    let currentTabActiveHost = null; 

    function updateDisplayStatus(data, hostForDisplay) {
        if (!data) {
            currentSiteStatusDiv.textContent = "Status: Could not retrieve status from background.";
            currentSiteStatusDiv.className = 'status-error'; // Changed to error for clarity
            return;
        }
        if (data.error) {
            currentSiteStatusDiv.textContent = `Error: ${data.error}`;
            currentSiteStatusDiv.className = 'status-error';
        } else if (data.status === "Dangerous") {
            currentSiteStatusDiv.textContent = `DANGEROUS! Risk: ${data.risk || 'Not specified'}`;
            currentSiteStatusDiv.className = 'status-dangerous';
        } else if (data.status === "Safe") {
            currentSiteStatusDiv.textContent = "SAFE";
            currentSiteStatusDiv.className = 'status-safe';
        } else {
            currentSiteStatusDiv.textContent = `Status: ${data.status || 'Unknown or no data'}`;
            currentSiteStatusDiv.className = 'status-unknown';
        }
    }
    
    async function loadCurrentTabStatus() {
        currentSiteHostSpan.textContent = "Loading...";
        currentSiteStatusDiv.textContent = "Checking status...";
        currentSiteStatusDiv.className = ''; 

        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            if (tabs && tabs.length > 0 && tabs[0].url) {
                const currentTab = tabs[0];
                let url;
                try {
                    url = new URL(currentTab.url);
                } catch (e) {
                    currentTabActiveHost = null;
                    currentSiteHostSpan.textContent = "N/A (Invalid URL)";
                    reportHostInput.value = ''; 
                    currentSiteStatusDiv.textContent = "Cannot determine host from current URL.";
                    currentSiteStatusDiv.className = 'status-error';
                    console.warn("ATAV Popup: Error parsing current tab URL:", currentTab.url, e);
                    return;
                }

                if (url.protocol === "http:" || url.protocol === "https:") {
                    currentTabActiveHost = url.hostname;
                    currentSiteHostSpan.textContent = currentTabActiveHost;
                    reportHostInput.value = currentTabActiveHost; 

                    if (browser.runtime && browser.runtime.sendMessage) {
                        console.log(`ATAV Popup: Sending checkHost message for ${currentTabActiveHost}`);
                        browser.runtime.sendMessage({
                            action: "checkHost",
                            host: currentTabActiveHost
                        }).then(response => {
                            console.log("ATAV Popup: Received response from background for checkHost:", response);
                            updateDisplayStatus(response, currentTabActiveHost);
                        }).catch(error => {
                            console.error("ATAV Popup: Error sending/receiving message for checkHost:", error);
                            // This is where the "Communication error" message originates
                            updateDisplayStatus({ error: `Communication error with background: ${error.message || 'Unknown error'}` }, currentTabActiveHost);
                        });
                    } else {
                         console.error("ATAV Popup: browser.runtime.sendMessage is not available.");
                        updateDisplayStatus({ error: "Cannot query background (runtime unavailable)." }, currentTabActiveHost);
                    }
                } else {
                    currentTabActiveHost = null; 
                    currentSiteHostSpan.textContent = "N/A (Special Page)";
                    reportHostInput.value = ''; 
                    currentSiteStatusDiv.textContent = "Status not applicable for this page type.";
                    currentSiteStatusDiv.className = 'status-unknown';
                }
            } else {
                currentTabActiveHost = null;
                currentSiteHostSpan.textContent = "N/A";
                reportHostInput.value = '';
                currentSiteStatusDiv.textContent = "No active HTTP/HTTPS tab found.";
                currentSiteStatusDiv.className = 'status-unknown';
            }
        } catch (e) {
            currentTabActiveHost = null;
            console.error("ATAV Popup: Error getting current tab:", e);
            currentSiteHostSpan.textContent = "Error";
            reportHostInput.value = '';
            updateDisplayStatus({ error: "Could not get tab info." }, null);
        }
    }

    loadCurrentTabStatus();

    reportForm.addEventListener('submit', (event) => { // Can be non-async if sendMessage is handled with .then/.catch
        event.preventDefault();
        const hostToReport = reportHostInput.value.trim();
        const reason = reportReasonInput.value.trim();

        reportStatusMessage.textContent = ""; 
        reportStatusMessage.className = "";

        if (!hostToReport) {
            reportStatusMessage.textContent = "Hostname is required.";
            reportStatusMessage.className = 'status-error';
            return;
        }
        if (!/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}$|^localhost$/.test(hostToReport)) {
            reportStatusMessage.textContent = "Invalid hostname format.";
            reportStatusMessage.className = 'status-error';
            return;
        }

        reportStatusMessage.textContent = "Submitting report...";
        reportStatusMessage.className = 'status-unknown'; 

        console.log(`ATAV Popup: Sending reportSite message for ${hostToReport}`);
        browser.runtime.sendMessage({
            action: "reportSite",
            host: hostToReport,
            reason: reason
        }).then(response => {
            console.log("ATAV Popup: Received response from background for reportSite:", response);
            if (response && response.status === "Success") {
                reportStatusMessage.textContent = `Report for '${response.host || hostToReport}' submitted!`;
                reportStatusMessage.className = 'status-safe';
                reportReasonInput.value = ''; 
                if (hostToReport === currentTabActiveHost) {
                    loadCurrentTabStatus(); 
                }
            } else {
                reportStatusMessage.textContent = `Error: ${response ? (response.error || 'Submission failed') : 'Unknown API response'}`;
                reportStatusMessage.className = 'status-error';
            }
        }).catch(error => {
            console.error("ATAV Popup: Error sending/receiving message for reportSite:", error);
            reportStatusMessage.textContent = `Failed to submit report: ${error.message || 'Unknown communication error'}`;
            reportStatusMessage.className = 'status-error';
        });
    });
});
