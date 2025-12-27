document.addEventListener('DOMContentLoaded', () => {
    const apiUrlInput = document.getElementById('apiUrl');
    const licenseKeyInput = document.getElementById('licenseKey');
    const saveBtn = document.getElementById('saveBtn');
    const statusDiv = document.getElementById('status');

    // Load saved settings
    chrome.storage.sync.get(['apiUrl', 'licenseKey'], (items) => {
        if (items.apiUrl) apiUrlInput.value = items.apiUrl;
        if (items.licenseKey) licenseKeyInput.value = items.licenseKey;
    });

    saveBtn.addEventListener('click', () => {
        const apiUrl = apiUrlInput.value.trim();
        const licenseKey = licenseKeyInput.value.trim();

        if (!apiUrl) {
            showStatus('La URL de la API es requerida.', 'error');
            return;
        }

        if (!licenseKey) {
            showStatus('La CLAVE es requerida.', 'error');
            return;
        }

        chrome.storage.sync.set({
            apiUrl: apiUrl,
            licenseKey: licenseKey
        }, () => {
            showStatus('Guardado. ¡Listo para usar!', 'success');
            setTimeout(() => {
                statusDiv.textContent = '';
            }, 2000);
        });
    });

    function showStatus(msg, type) {
        statusDiv.textContent = msg;
        statusDiv.className = 'status ' + type;
    }
});
