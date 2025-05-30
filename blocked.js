document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);

    document.getElementById('host').textContent = params.get('host') || 'N/A';
    document.getElementById('risk').textContent = params.get('risk') || 'N/A';
    document.getElementById('category').textContent = params.get('category') || 'N/A';

    const originalUrl = params.get('originalUrl');
    const originalUrlDisplay = document.getElementById('originalUrlDisplay');

    if (originalUrl) {
        try {
            originalUrlDisplay.textContent = decodeURIComponent(originalUrl);
        } catch (e) {
            console.error("ATAV BlockedPage: Error decoding original URL:", e);
            originalUrlDisplay.textContent = "Error decoding URL";
        }
    } else {
        originalUrlDisplay.textContent = 'N/A';
    }

    document.getElementById('goBackButton').addEventListener('click', () => {
        window.location.href = 'https://dl.atdevs.org/other/resources/exts/atav/safe-browsing/html/safety.html';
    });

    document.getElementById('emergencyExitButton').addEventListener('click', () => {
        window.location.href = 'https://dl.atdevs.org/other/resources/exts/atav/safe-browsing/html/safety.html';
    });

    document.getElementById('continueButton').addEventListener('click', () => {
    if (originalUrl) {
        const container = document.getElementById('iframeContainer');
        container.innerHTML = '<p><strong>You are viewing the unsafe site below. For your safety, interactions may be limited.</strong></p>';
        const iframe = document.createElement('iframe');
        iframe.id = "unsafeIframe";
        iframe.style.width = "100%";
        iframe.style.height = "400px";
        iframe.style.border = "2px solid #c00";
        iframe.src = decodeURIComponent(originalUrl);
        iframe.setAttribute('sandbox', 'allow-scripts'); // Sandboxed!
        container.appendChild(iframe);
        container.style.display = 'block';
        document.getElementById('continueButton').disabled = true;
    }
    });
});
