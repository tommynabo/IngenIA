document.addEventListener('DOMContentLoaded', () => {
    const keyInput = document.getElementById('licenseKey');
    const saveBtn = document.getElementById('saveBtn');
    const statusDiv = document.getElementById('status');

    // Load saved key
    chrome.storage.sync.get(['licenseKey'], (items) => {
        if (items.licenseKey) {
            keyInput.value = items.licenseKey;
        }
    });

    // Save key
    saveBtn.addEventListener('click', () => {
        const key = keyInput.value.trim();

        if (!key) {
            showStatus('Por favor, introduce una clave.', false);
            return;
        }

        chrome.storage.sync.set({ licenseKey: key }, () => {
            showStatus('¡Guardado correctamente!', true);
            // Optional: Notify content script to update immediately if needed via message passing, 
            // but our content script re-reads storage on every click anyway.
        });
    });

    function showStatus(msg, isSuccess) {
        statusDiv.textContent = msg;
        statusDiv.className = isSuccess ? 'success' : '';
        setTimeout(() => {
            statusDiv.textContent = '';
        }, 2000);
    }
});
