// ATAV Safe Browsing - blocked.js (testing branch)
// Handles blocked.html logic for in-page continuation

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);

    document.getElementById('host').textContent = params.get('host') || 'N/A';
    document.getElementById('risk').textContent = params.get('risk') || 'N/A';
    document.getElementById('category').textContent = params.get('category') || 'N/A';

    const originalUrl = params.get('originalUrl');
    const originalUrlDisplay = document.getElementById('originalUrlDisplay');
    let decodedUrl = '';

    if (originalUrl) {
        try {
            decodedUrl = decodeURIComponent(originalUrl);
            originalUrlDisplay.textContent = decodedUrl;
        } catch (e) {
            console.error("ATAV BlockedPage: Error decoding original URL:", e);
            originalUrlDisplay.textContent = "Error decoding URL";
        }
    } else {
        originalUrlDisplay.textContent = 'N/A';
    }

    // Go Back Safely
    document.getElementById('goBackButton').addEventListener('click', () => {
        if (history.length > 1 && document.referrer) {
            history.back();
        } else {
            window.location.href = 'about:newtab';
        }
    });

    // Stop & Close (from block screen)
    function stopAndClose() {
        try { if (typeof window.stop === 'function') window.stop(); } catch(e){}
        window.close();
    }
    document.getElementById('stopCloseButton').addEventListener('click', stopAndClose);

    // Continue Anyway: load blocked site in iframe, stay in block page
    document.getElementById('continueButton').addEventListener('click', () => {
        // Use decodedUrl if available, else get from display span
        let toLoad = decodedUrl || originalUrlDisplay.textContent.trim();
        if (!/^https?:\/\//i.test(toLoad)) {
            alert('Invalid or missing original URL. (Value: "' + toLoad + '")');
            return;
        }
        document.getElementById('blockContainer').style.display = 'none';
        document.getElementById('frameContainer').style.display = 'flex';
        document.getElementById('blockedIframe').src = toLoad;
    });

    // Stop & Close (from iframe view)
    document.getElementById('closeFrameButton').addEventListener('click', stopAndClose);

    // Return to block warning, blank the iframe and hide it
    document.getElementById('backToBlockPage').addEventListener('click', () => {
        document.getElementById('blockedIframe').src = 'about:blank';
        document.getElementById('frameContainer').style.display = 'none';
        document.getElementById('blockContainer').style.display = 'block';
    });
});
