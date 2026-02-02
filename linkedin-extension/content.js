// --- IngenIA LinkedIn Extension - content.js ---
// This script injects "Resumir" and "Comentar" buttons into LinkedIn posts.

(function () {
    'use strict';

    console.log('[IngenIA] Content script loaded and executing.');

    const INJECTED_ATTR = 'data-ingenia-injected';
    const REPLY_INJECTED_ATTR = 'data-ingenia-reply-injected';

    // --- Main Execution ---
    // Run immediately and also on interval
    injectAll();
    setInterval(injectAll, 1500);

    // Also use MutationObserver for faster reaction
    const observer = new MutationObserver(() => injectAll());
    observer.observe(document.body, { childList: true, subtree: true });

    function injectAll() {
        try {
            injectPostButtons();
            injectReplyButtons();
        } catch (e) {
            console.error('[IngenIA] Error:', e);
        }
    }

    // --- Post Buttons ---
    function injectPostButtons() {
        // Find all "Recomendar" or "Like" buttons directly
        const allButtons = document.querySelectorAll('button');

        allButtons.forEach(btn => {
            const text = (btn.innerText || '').toLowerCase();

            // Is this a "Like" / "Recomendar" button?
            if (text.includes('recomendar') || text.includes('like')) {
                // Find the action bar container (the row with all the buttons)
                const actionBar = btn.closest('div.feed-shared-social-action-bar, div[class*="social-actions"], div.display-flex');

                if (!actionBar) return;
                if (actionBar.hasAttribute(INJECTED_ATTR)) return;

                // Mark as injected
                actionBar.setAttribute(INJECTED_ATTR, 'true');

                // Find the post container for text extraction later
                const postContainer = actionBar.closest('div.feed-shared-update-v2, div[data-urn], article') || actionBar.parentElement.parentElement;

                // Create our button container
                const container = document.createElement('div');
                container.className = 'ingenia-btn-container';
                container.style.cssText = `
                    display: inline-flex !important;
                    align-items: center !important;
                    gap: 8px !important;
                    margin-left: 8px !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                `;

                // Summarize Button
                const btnSum = createButton('📝 Resumir', () => handleAction(postContainer, 'summarize', btnSum));
                // Comment Button
                const btnComment = createButton('⚡ Comentar', () => handleAction(postContainer, 'comment', btnComment));

                container.appendChild(btnSum);
                container.appendChild(btnComment);

                // Insert at the END of the action bar
                actionBar.appendChild(container);

                console.log('[IngenIA] Buttons injected!', actionBar);
            }
        });
    }

    // --- Reply Buttons (Pencil) ---
    function injectReplyButtons() {
        const allButtons = document.querySelectorAll('button');

        allButtons.forEach(btn => {
            if (btn.hasAttribute(REPLY_INJECTED_ATTR)) return;

            const text = (btn.innerText || '').toLowerCase().trim();

            if (text === 'responder' || text === 'reply') {
                btn.setAttribute(REPLY_INJECTED_ATTR, 'true');

                const commentItem = btn.closest('.comments-comment-item, article');
                if (!commentItem) return;

                const pencilBtn = createButton('✏️', () => handleAction(commentItem, 'reply', pencilBtn));
                pencilBtn.style.cssText = `
                    background: transparent !important;
                    color: #666 !important;
                    border: none !important;
                    padding: 4px 8px !important;
                    font-size: 16px !important;
                    cursor: pointer !important;
                    margin-left: 4px !important;
                `;
                pencilBtn.title = 'Generar respuesta con IA';

                btn.parentNode.insertBefore(pencilBtn, btn.nextSibling);
                console.log('[IngenIA] Pencil injected!');
            }
        });
    }

    // --- Create Styled Button ---
    function createButton(label, onClick) {
        const btn = document.createElement('button');
        btn.innerHTML = label;
        btn.style.cssText = `
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            background-color: #0a66c2 !important;
            color: white !important;
            border: none !important;
            border-radius: 16px !important;
            padding: 6px 12px !important;
            font-size: 14px !important;
            font-weight: 600 !important;
            cursor: pointer !important;
            visibility: visible !important;
            opacity: 1 !important;
            z-index: 9999 !important;
        `;
        btn.onmouseenter = () => { btn.style.backgroundColor = '#004182'; };
        btn.onmouseleave = () => { btn.style.backgroundColor = '#0a66c2'; };
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            onClick();
        });
        return btn;
    }

    // --- Handle Action ---
    async function handleAction(contextElement, actionType, button) {
        let licenseKey;
        try {
            const store = await chrome.storage.sync.get(['licenseKey']);
            licenseKey = store.licenseKey;
        } catch (e) {
            alert('Error: Recarga la página');
            return;
        }

        if (!licenseKey) {
            alert('Por favor, configura tu clave de licencia en la extensión.');
            return;
        }

        // Extract text
        const textEl = contextElement.querySelector('.feed-shared-update-v2__description, .update-components-text, .feed-shared-text-view') || contextElement;
        const postText = textEl.innerText.trim();

        if (!postText) {
            alert('No encontré texto para procesar.');
            return;
        }

        // Extract author
        const authorEl = contextElement.querySelector('.update-components-actor__name, .feed-shared-actor__name');
        const authorName = authorEl ? authorEl.innerText.split('\n')[0] : 'Autor';

        // Show loading
        const originalHTML = button.innerHTML;
        button.innerHTML = '⏳';
        button.disabled = true;

        try {
            let prompt;
            if (actionType === 'summarize') {
                prompt = `Resume esto brevemente. El autor es ${authorName}:\n\n${postText}`;
            } else if (actionType === 'comment') {
                prompt = `Genera un comentario profesional para este post de ${authorName}:\n\n${postText}`;
            } else if (actionType === 'reply') {
                prompt = `Responde a este comentario de ${authorName}:\n\n${postText}`;
            }

            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'generate_comment',
                    licenseKey: licenseKey,
                    prompt: prompt
                }, (res) => {
                    if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                    else resolve(res);
                });
            });

            if (response && response.success) {
                showResultModal(response.result);
            } else {
                alert('Error: ' + (response?.error || 'Desconocido'));
            }
        } catch (err) {
            console.error(err);
            alert('Error de conexión');
        } finally {
            button.innerHTML = originalHTML;
            button.disabled = false;
        }
    }

    // --- Show Result Modal ---
    function showResultModal(text) {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;';

        const modal = document.createElement('div');
        modal.style.cssText = 'background:white;padding:24px;border-radius:12px;max-width:500px;width:90%;box-shadow:0 10px 40px rgba(0,0,0,0.3);';

        const title = document.createElement('h3');
        title.innerText = 'Resultado';
        title.style.cssText = 'margin:0 0 16px 0;font-size:18px;';

        const content = document.createElement('div');
        content.innerText = text;
        content.style.cssText = 'margin-bottom:20px;white-space:pre-wrap;max-height:300px;overflow-y:auto;line-height:1.5;';

        const footer = document.createElement('div');
        footer.style.cssText = 'display:flex;justify-content:flex-end;gap:10px;';

        const copyBtn = document.createElement('button');
        copyBtn.innerText = 'Copiar';
        copyBtn.style.cssText = 'background:#0a66c2;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:600;';
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(text);
            copyBtn.innerText = '¡Copiado!';
            setTimeout(() => { copyBtn.innerText = 'Copiar'; }, 1500);
        };

        const closeBtn = document.createElement('button');
        closeBtn.innerText = 'Cerrar';
        closeBtn.style.cssText = 'background:#ddd;color:#333;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:600;';
        closeBtn.onclick = () => overlay.remove();

        footer.appendChild(copyBtn);
        footer.appendChild(closeBtn);
        modal.appendChild(title);
        modal.appendChild(content);
        modal.appendChild(footer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }

})();
