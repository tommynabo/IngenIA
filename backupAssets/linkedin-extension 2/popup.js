document.addEventListener('DOMContentLoaded', () => {
    const keyInput = document.getElementById('licenseKey');
    const saveBtn = document.getElementById('saveBtn');
    const testBtn = document.getElementById('testBtn');
    const statusDiv = document.getElementById('status');

    // Load
    chrome.storage.sync.get(['licenseKey'], (items) => {
        if (items.licenseKey) keyInput.value = items.licenseKey;
    });

    // Save
    saveBtn.addEventListener('click', () => {
        const key = keyInput.value.trim();
        if (!key) return showStatus('Introduce una clave válida.', 'error');

        chrome.storage.sync.set({ licenseKey: key }, () => {
            showStatus('✅ Clave Guardada.', 'success');
        });
    });

    // Test
    testBtn.addEventListener('click', () => {
        const key = keyInput.value.trim();
        if (!key) return showStatus('Primero guarda la clave.', 'error');

        showStatus('⏳ Probando conexión...', '');
        saveBtn.disabled = true;
        testBtn.disabled = true;

        // Send message to background script
        chrome.runtime.sendMessage({
            action: 'test_connection',
            licenseKey: key,
            prompt: 'Test'
        }, (response) => {
            saveBtn.disabled = false;
            testBtn.disabled = false;

            if (chrome.runtime.lastError) {
                showStatus('❌ Error Interno: ' + chrome.runtime.lastError.message, 'error');
                return;
            }

            if (response && response.success) {
                showStatus('✅ ¡Conexión Exitosa!', 'success');
            } else {
                showStatus('❌ Fallo: ' + (response.error || 'Desconocido'), 'error');
            }
        });
    });

    function showStatus(msg, type) {
        statusDiv.textContent = msg;
        statusDiv.className = type;
    }
});
