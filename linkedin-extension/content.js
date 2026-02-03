// IngenIA V21 - HYBRID: V18 Injection + December UI
// V18 TreeWalker worked. December UI was beautiful. Combining both.
console.log("🚀 IngenIA V21 HYBRID");

// === DIAGNOSTIC ===
const banner = document.createElement('div');
banner.innerText = "✅ V21 HYBRID";
banner.style.cssText = "position:fixed;top:10px;right:10px;background:lime;color:black;padding:4px 8px;z-index:999999;border-radius:4px;font-weight:bold;font-size:11px;";
document.body.appendChild(banner);
setTimeout(() => banner.remove(), 4000);

// === STATE ===
const done = new WeakSet();

// === MAIN LOOP (V18 style - works!) ===
setInterval(inject, 500);

function inject() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);

    while (walker.nextNode()) {
        const node = walker.currentNode;
        const txt = node.textContent.trim();
        const parent = node.parentElement;

        if (!parent || done.has(parent)) continue;

        // === POST BUTTONS ===
        if (txt === 'Recomendar' || txt === 'Like') {
            // Skip if inside comment
            if (parent.closest('.comments-comment-item') || parent.closest('[class*="comment-item"]')) continue;

            done.add(parent);

            const row = parent.closest('ul') || parent.closest('[class*="action-bar"]') || parent.parentElement?.parentElement;
            if (!row || row.querySelector('.ingenia-btn-container-small')) continue;

            const post = row.closest('.feed-shared-update-v2') || row.closest('article') || row.closest('[data-urn]');

            // Create container (December style)
            const container = document.createElement('div');
            container.className = 'ingenia-btn-container-small';

            const btnSum = createButton('📝', 'Resumir', () => handleAction(post, 'summarize', btnSum));
            const btnCom = createButton('⚡️', 'Comentar', () => handleAction(post, 'comment', btnCom));

            container.appendChild(btnSum);
            container.appendChild(btnCom);
            row.appendChild(container);
        }

        // === PENCIL FOR REPLIES ===
        if (txt === 'Responder' || txt === 'Reply') {
            const comment = parent.closest('.comments-comment-item') ||
                parent.closest('[class*="comment-item"]') ||
                parent.closest('article');

            if (!comment) continue;
            done.add(parent);

            // Check no duplicate
            if (parent.parentElement.querySelector('.ingenia-btn-mini')) continue;

            const iaBtn = createButton('✏️', '', () => handleAction(comment, 'reply', iaBtn));
            iaBtn.className = 'ingenia-btn-mini';
            iaBtn.title = "Generar respuesta con IA";

            parent.insertAdjacentElement('afterend', iaBtn);
        }
    }
}

// === BUTTON CREATION (December style) ===
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

// === ACTION HANDLER (December logic) ===
async function handleAction(postElement, type, button) {
    // 1. License
    let licenseKey;
    try {
        const store = await chrome.storage.sync.get(['licenseKey']);
        licenseKey = store.licenseKey;
    } catch (err) {
        showToast("⚠️ Extensión invalidada. Recarga la página.");
        return;
    }

    if (!licenseKey) {
        showModal('Falta Configuración', 'No tienes configurada la Clave de Licencia.');
        return;
    }

    // 2. Get Text
    let postText = '';
    if (postElement) {
        const clone = postElement.cloneNode(true);
        clone.querySelectorAll('button, .comments-comments-list, [class*="action-bar"]').forEach(n => n.remove());
        postText = clone.innerText.trim().substring(0, 1500);
    }

    if (!postText) {
        showModal('Error', 'No pude encontrar texto para procesar.');
        return;
    }

    // 3. Author
    const authorNode = postElement?.querySelector('.update-components-actor__name, .feed-shared-actor__name, .comments-post-meta__name-text');
    let authorName = authorNode ? authorNode.innerText.split('\n')[0].trim() : "el autor";

    // 4. Prompt
    let prompt;
    if (type === 'summarize') {
        prompt = `Resume brevemente en español: ${postText}`;
    } else if (type === 'reply') {
        prompt = `Escribe una respuesta breve y profesional a este comentario de ${authorName}:\n\n"${postText}"`;
    } else {
        prompt = `Escribe un comentario profesional para este post de ${authorName}:\n\n${postText}`;
    }

    // 5. Loading
    const originalHTML = button.innerHTML;
    button.innerHTML = '<div class="ingenia-spinner"></div>';
    button.disabled = true;

    // 6. Send
    try {
        const response = await sendMessageToBackground({
            action: 'generate_comment',
            licenseKey: licenseKey,
            prompt: prompt
        });

        if (response.success) {
            if (type === 'summarize') {
                showModal('Resumen', response.result, [
                    { label: 'Copiar', primary: true, onClick: () => copyToClipboard(response.result) }
                ]);
            } else {
                showModal(type === 'reply' ? 'Respuesta Generada' : 'Comentario Generado', response.result, [
                    { label: 'Insertar', primary: true, onClick: () => insertText(postElement, response.result) },
                    { label: 'Copiar', onClick: () => copyToClipboard(response.result) }
                ]);
            }
        } else {
            throw new Error(response.error || "Error desconocido");
        }
    } catch (err) {
        showModal('Error', err.message);
    } finally {
        button.innerHTML = originalHTML;
        button.disabled = false;
    }
}

function sendMessageToBackground(payload) {
    return new Promise((resolve, reject) => {
        try {
            chrome.runtime.sendMessage(payload, (response) => {
                if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
                resolve(response);
            });
        } catch (e) {
            reject(new Error("Contexto invalidado. Recarga la página."));
        }
    });
}

// === INSERT TEXT ===
function insertText(postElement, text) {
    // Find Reply button and click
    const replyBtn = postElement?.querySelector('button.reply-action') ||
        Array.from(postElement?.querySelectorAll('button') || []).find(b =>
            (b.innerText || '').toLowerCase().includes('reply') ||
            (b.innerText || '').toLowerCase().includes('responder')
        );

    if (replyBtn) replyBtn.click();

    setTimeout(() => {
        const editor = postElement?.querySelector('.ql-editor') ||
            postElement?.querySelector('div[contenteditable="true"]') ||
            document.activeElement;

        if (editor && editor.isContentEditable) {
            editor.focus();
            document.execCommand('insertText', false, text);
            editor.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            copyToClipboard(text);
            showToast("No encontré el editor, copiado al portapapeles.");
        }
    }, 600);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    showToast("¡Copiado!");
}

// === UI (December style) ===
function showToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = `position:fixed;bottom:20px;right:20px;background:#333;color:white;padding:12px 24px;border-radius:8px;z-index:10001;font-family:sans-serif;box-shadow:0 4px 12px rgba(0,0,0,0.2);`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function showModal(title, text, actions = []) {
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
