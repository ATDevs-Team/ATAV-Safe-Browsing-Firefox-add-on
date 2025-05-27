// ATAV Safe Browsing - blocked.js
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
        if (history.length > 1 && document.referrer) {
            history.back();
        } else {
            window.location.href = 'about:newtab'; 
        }
    });
});
