document.addEventListener('DOMContentLoaded', () => {
    const apiUrlInput = document.getElementById('apiUrl');
    const emailInput = document.getElementById('email');
    const saveBtn = document.getElementById('saveBtn');
    const statusDiv = document.getElementById('status');

    // Load saved settings
    chrome.storage.sync.get(['apiUrl', 'email'], (items) => {
        if (items.apiUrl) apiUrlInput.value = items.apiUrl;
        if (items.email) emailInput.value = items.email;
    });

    saveBtn.addEventListener('click', () => {
        const apiUrl = apiUrlInput.value.trim();
        const email = emailInput.value.trim();

        if (!apiUrl) {
            showStatus('La URL de la API es requerida.', 'error');
            return;
        }

        if (!email) {
            showStatus('El Email es requerido.', 'error');
            return;
        }

        chrome.storage.sync.set({
            apiUrl: apiUrl,
            email: email
        }, () => {
            showStatus('Configuración guardada exitosamente.', 'success');
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
