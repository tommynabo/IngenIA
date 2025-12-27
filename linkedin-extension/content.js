// --- Constants ---
const OBSERVER_TARGET = document.body;
// Wrapper typically used by LinkedIn feed updates
const POST_SELECTOR = '.feed-shared-update-v2';
const ACTION_BAR_SELECTOR = '.feed-shared-social-action-bar';
const TEXT_SELECTOR = '.feed-shared-update-v2__description, .update-components-text, .feed-shared-text-view';

// --- State ---
const INJECTED_ATTR = 'data-ingenia-injected';

// --- Observer ---
const observer = new MutationObserver((mutations) => {
    // Check if nodes added, then scan
    if (mutations.some(m => m.addedNodes.length > 0)) {
        scanAndInject();
    }
});

observer.observe(OBSERVER_TARGET, { childList: true, subtree: true });

// Initial scan
scanAndInject();

function scanAndInject() {
    const posts = document.querySelectorAll(POST_SELECTOR);
    posts.forEach(post => {
        if (post.hasAttribute(INJECTED_ATTR)) return;

        const actionBar = post.querySelector(ACTION_BAR_SELECTOR);
        if (actionBar) {
            injectButtons(actionBar, post);
            post.setAttribute(INJECTED_ATTR, 'true');
        }
    });
}

function injectButtons(container, postElement) {
    const btnContainer = document.createElement('div');
    btnContainer.className = 'ingenia-btn-container';

    // Summarize
    const btnSum = createButton('📝', 'Resumir', () => handleAction(postElement, 'summarize', btnSum));
    // Comment
    const btnComment = createButton('⚡️', 'Comentar', () => handleAction(postElement, 'comment', btnComment));

    btnContainer.appendChild(btnSum);
    btnContainer.appendChild(btnComment);
    container.appendChild(btnContainer);
}

function createButton(icon, text, onClick) {
    const btn = document.createElement('button');
    btn.className = 'ingenia-btn';
    btn.innerHTML = `<span class="ingenia-icon">${icon}</span> ${text}`;
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
    });
    return btn;
}

// --- Logic ---
async function handleAction(postElement, type, button) {
    // 1. Get License Key
    let licenseKey;
    try {
        const store = await chrome.storage.sync.get(['licenseKey']);
        licenseKey = store.licenseKey;
    } catch (err) {
        showToast("⚠️ Extensión invalidada. Recarga la página por favor.");
        return;
    }

    if (!licenseKey) {
        showModal('Falta Configuración', 'No tienes configurada la Clave de Licencia. Abre la extensión y pégala.');
        return;
    }

    // 2. Get Text
    const textNode = postElement.querySelector(TEXT_SELECTOR);
    const postText = textNode ? textNode.innerText.trim() : "";

    if (!postText) {
        showModal('Error', 'No pude encontrar texto en este post.');
        return;
    }

    // 3. Prepare Prompt
    let prompt = postText;
    if (type === 'summarize') {
        prompt = "Resume esto brevemente en español con puntos clave: " + postText;
    }

    // 4. UI Loading
    const originalHTML = button.innerHTML;
    button.innerHTML = '<div class="ingenia-spinner"></div>';
    button.disabled = true;

    // 5. Send Message to Background
    try {
        const response = await sendMessageToBackground({
            action: 'generate_comment',
            licenseKey: licenseKey,
            prompt: prompt
        });

        if (response.success) {
            if (type === 'comment') {
                showModal('Comentario Generado', response.result, [
                    { label: 'Insertar', primary: true, onClick: () => insertText(postElement, response.result) },
                    { label: 'Copiar', onClick: () => copyToClipboard(response.result) }
                ]);
            } else {
                showModal('Resumen', response.result, [
                    { label: 'Copiar', primary: true, onClick: () => copyToClipboard(response.result) }
                ]);
            }
        } else {
            throw new Error(response.error || "Error desconocido");
        }
    } catch (err) {
        console.error(err);
        showModal('Error', err.message);
    } finally {
        button.innerHTML = originalHTML;
        button.disabled = false;
    }
}

// Wrapper to handle "Extension context invalidated" gracefully
function sendMessageToBackground(payload) {
    return new Promise((resolve, reject) => {
        try {
            chrome.runtime.sendMessage(payload, (response) => {
                if (chrome.runtime.lastError) {
                    return reject(new Error(chrome.runtime.lastError.message));
                }
                resolve(response);
            });
        } catch (e) {
            reject(new Error("Contexto invalidado. Recarga la página."));
        }
    });
}

function insertText(postElement, text) {
    const commentBtn = postElement.querySelector('button.comment-button') || postElement.querySelector('button[aria-label*="Comment"]');
    if (commentBtn) commentBtn.click();

    setTimeout(() => {
        const editor = postElement.querySelector('.ql-editor') || postElement.querySelector('div[contenteditable="true"]');
        if (editor) {
            editor.focus();
            document.execCommand('insertText', false, text);
            editor.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            copyToClipboard(text);
            showToast("No encontré el editor, copiado al portapapeles.");
        }
    }, 800);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    showToast("¡Copiado!");
}

// --- UI Components ---

function showToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; 
        background: #333; color: white; padding: 12px 24px; 
        border-radius: 8px; z-index: 10001; font-family: sans-serif;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function showModal(title, text, actions = []) {
    // Cleanup existing
    const existing = document.querySelector('.ingenia-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'ingenia-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'ingenia-modal';

    // Header
    const header = document.createElement('div');
    header.className = 'ingenia-modal-header';
    header.innerHTML = `<h3 class="ingenia-modal-title">${title}</h3>`;
    const close = document.createElement('button');
    close.className = 'ingenia-close-btn';
    close.innerHTML = '&times;';
    close.onclick = () => overlay.remove();
    header.appendChild(close);

    // Body
    const body = document.createElement('div');
    body.className = 'ingenia-modal-body';
    body.innerText = text;

    // Footer
    const footer = document.createElement('div');
    footer.className = 'ingenia-modal-footer';

    if (actions.length === 0) actions.push({ label: 'Cerrar' });

    actions.forEach(act => {
        const btn = document.createElement('button');
        btn.className = act.primary ? 'ingenia-primary-btn' : 'ingenia-secondary-btn';
        btn.textContent = act.label;
        btn.onclick = () => {
            if (act.onClick) act.onClick();
            overlay.remove();
        };
        footer.appendChild(btn);
    });

    modal.append(header, body, footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}
