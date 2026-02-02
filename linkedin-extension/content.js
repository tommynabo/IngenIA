// --- IngenIA LinkedIn Extension - content.js ---
// Buttons in stats bar, pencil for comments, improved modal with Insert

(function () {
    'use strict';

    console.log('[IngenIA] Script loaded');

    const INJECTED_ATTR = 'data-ingenia-done';
    const PENCIL_ATTR = 'data-ingenia-pencil';

    // Run injection
    setTimeout(runInjection, 500);
    setTimeout(runInjection, 1500);
    setTimeout(runInjection, 3000);
    setInterval(runInjection, 2000);

    // Also observe DOM changes
    const observer = new MutationObserver(() => runInjection());
    observer.observe(document.body, { childList: true, subtree: true });

    function runInjection() {
        try {
            injectPostButtons();
            injectPencils();
        } catch (e) {
            console.error('[IngenIA] Error:', e);
        }
    }

    // --- POST BUTTONS (in the stats bar, next to "X comentarios") ---
    function injectPostButtons() {
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let node;
        while (node = walker.nextNode()) {
            const text = node.textContent.trim().toLowerCase();

            if (text.includes('comentario') || text.includes('comment')) {
                if (text.includes('añadir') || text.includes('add')) continue;

                let element = node.parentElement;
                if (!element) continue;

                let statsRow = null;
                let current = element;
                for (let i = 0; i < 5; i++) {
                    if (!current) break;
                    const hasReactions = current.querySelector('[class*="reaction"], [class*="social-counts"], [class*="social-details"]');
                    const style = window.getComputedStyle(current);
                    if (hasReactions || (style.display === 'flex' && current.innerText.includes('comentario'))) {
                        statsRow = current;
                        break;
                    }
                    current = current.parentElement;
                }

                if (!statsRow) statsRow = element.parentElement?.parentElement || element.parentElement;
                if (!statsRow) continue;
                if (statsRow.hasAttribute(INJECTED_ATTR)) continue;

                const isInComment = element.closest('.comments-comment-item, .comments-comments-list, [class*="comment-item"]');
                if (isInComment) continue;

                statsRow.setAttribute(INJECTED_ATTR, 'true');

                const postContainer = statsRow.closest('div[data-urn], .feed-shared-update-v2, article') || statsRow.parentElement?.parentElement?.parentElement;

                const container = document.createElement('div');
                container.className = 'ingenia-btns';
                container.style.cssText = 'display:inline-flex!important;align-items:center!important;gap:6px!important;margin-left:auto!important;flex-shrink:0!important;';

                const btnResumen = createBtn('📝 Resumir', () => handleClick(postContainer, 'summarize', btnResumen));
                const btnComentar = createBtn('⚡ Comentar', () => handleClick(postContainer, 'comment', btnComentar));

                container.appendChild(btnResumen);
                container.appendChild(btnComentar);
                statsRow.appendChild(container);

                console.log('[IngenIA] ✅ Post buttons injected');
            }
        }
    }

    // --- PENCIL for comment replies ---
    function injectPencils() {
        // Method 1: Find by text
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let node;
        while (node = walker.nextNode()) {
            const text = node.textContent.trim().toLowerCase();

            if (text === 'responder' || text === 'reply') {
                let element = node.parentElement;
                if (!element) continue;

                // Check if pencil already exists nearby
                const parent = element.parentElement;
                if (!parent) continue;
                if (parent.querySelector('.ingenia-pencil')) continue;
                if (element.hasAttribute(PENCIL_ATTR)) continue;

                element.setAttribute(PENCIL_ATTR, 'true');

                // Find the comment context
                const commentItem = element.closest('.comments-comment-item, [class*="comment"], article') || element.parentElement?.parentElement;

                // Create pencil button
                const pencil = document.createElement('button');
                pencil.className = 'ingenia-pencil';
                pencil.innerHTML = '✏️';
                pencil.title = 'Generar respuesta con IA';
                pencil.style.cssText = `
                    background: transparent !important;
                    border: none !important;
                    cursor: pointer !important;
                    font-size: 14px !important;
                    padding: 0 4px !important;
                    margin-left: 8px !important;
                    opacity: 0.6 !important;
                    transition: opacity 0.2s, transform 0.2s !important;
                    vertical-align: middle !important;
                `;
                pencil.onmouseenter = () => {
                    pencil.style.opacity = '1';
                    pencil.style.transform = 'scale(1.2)';
                };
                pencil.onmouseleave = () => {
                    pencil.style.opacity = '0.6';
                    pencil.style.transform = 'scale(1)';
                };

                pencil.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleClick(commentItem, 'reply', pencil);
                });

                // Insert after the Responder element
                if (element.nextSibling) {
                    element.parentNode.insertBefore(pencil, element.nextSibling);
                } else {
                    element.parentNode.appendChild(pencil);
                }

                console.log('[IngenIA] ✅ Pencil injected next to Responder');
            }
        }

        // Method 2: Also find by button/span structure
        document.querySelectorAll('button, span').forEach(el => {
            const text = el.innerText?.trim().toLowerCase();
            if (text === 'responder' || text === 'reply') {
                if (el.hasAttribute(PENCIL_ATTR)) return;
                const parent = el.parentElement;
                if (!parent) return;
                if (parent.querySelector('.ingenia-pencil')) return;

                el.setAttribute(PENCIL_ATTR, 'true');

                const commentItem = el.closest('.comments-comment-item, [class*="comment"], article') || el.parentElement?.parentElement;

                const pencil = document.createElement('button');
                pencil.className = 'ingenia-pencil';
                pencil.innerHTML = '✏️';
                pencil.title = 'Generar respuesta con IA';
                pencil.style.cssText = 'background:transparent!important;border:none!important;cursor:pointer!important;font-size:14px!important;padding:0 4px!important;margin-left:8px!important;opacity:0.6!important;vertical-align:middle!important;';
                pencil.onmouseenter = () => { pencil.style.opacity = '1'; };
                pencil.onmouseleave = () => { pencil.style.opacity = '0.6'; };

                pencil.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleClick(commentItem, 'reply', pencil);
                });

                parent.appendChild(pencil);
                console.log('[IngenIA] ✅ Pencil injected (method 2)');
            }
        });
    }

    // --- Create styled button ---
    function createBtn(label, onClick) {
        const btn = document.createElement('button');
        btn.innerHTML = label;
        btn.style.cssText = 'display:inline-flex!important;align-items:center!important;justify-content:center!important;background:#0a66c2!important;color:white!important;border:none!important;border-radius:14px!important;padding:4px 10px!important;font-size:12px!important;font-weight:600!important;cursor:pointer!important;white-space:nowrap!important;';
        btn.onmouseenter = () => { btn.style.background = '#004182'; };
        btn.onmouseleave = () => { btn.style.background = '#0a66c2'; };
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            onClick();
        });
        return btn;
    }

    // --- Handle button click ---
    async function handleClick(context, actionType, button) {
        let licenseKey;
        try {
            const store = await chrome.storage.sync.get(['licenseKey']);
            licenseKey = store.licenseKey;
        } catch (e) {
            alert('Error de extensión. Recarga la página.');
            return;
        }

        if (!licenseKey) {
            alert('Configura tu clave de licencia en la extensión IngenIA.');
            return;
        }

        const textEl = context?.querySelector('.feed-shared-update-v2__description, .update-components-text, .feed-shared-text-view, .comments-comment-item__main-content, [class*="comment-text"]') || context;
        const postText = textEl?.innerText?.trim() || '';

        if (!postText) {
            alert('No encontré texto para procesar.');
            return;
        }

        const authorEl = context?.querySelector('.update-components-actor__name, .feed-shared-actor__name, .comments-post-meta__name-text, [class*="comment-meta"]');
        const author = authorEl?.innerText?.split('\n')[0] || 'Autor';

        const orig = button.innerHTML;
        button.innerHTML = '⏳';
        button.disabled = true;

        try {
            let prompt;
            if (actionType === 'summarize') {
                prompt = `Resume esto brevemente. Autor: ${author}:\n\n${postText}`;
            } else if (actionType === 'comment') {
                prompt = `Genera un comentario profesional para este post de ${author}:\n\n${postText}`;
            } else {
                prompt = `Responde a este comentario de ${author}:\n\n${postText}`;
            }

            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'generate_comment',
                    licenseKey,
                    prompt
                }, res => {
                    if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                    else resolve(res);
                });
            });

            if (response?.success) {
                showModal(response.result, actionType);
            } else {
                alert('Error: ' + (response?.error || 'Desconocido'));
            }
        } catch (e) {
            console.error(e);
            alert('Error de conexión');
        } finally {
            button.innerHTML = orig;
            button.disabled = false;
        }
    }

    // --- Show result modal (improved UI) ---
    function showModal(text, actionType) {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px;';

        const box = document.createElement('div');
        box.style.cssText = 'background:white;padding:28px;border-radius:16px;max-width:600px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.4);max-height:80vh;display:flex;flex-direction:column;';

        // Title
        const title = document.createElement('h2');
        title.textContent = actionType === 'summarize' ? '📝 Resumen' : actionType === 'comment' ? '⚡ Comentario Generado' : '✏️ Respuesta Generada';
        title.style.cssText = 'margin:0 0 20px;font-size:22px;color:#333;';

        // Content
        const content = document.createElement('div');
        content.textContent = text;
        content.style.cssText = 'white-space:pre-wrap;overflow-y:auto;margin-bottom:24px;line-height:1.7;font-size:16px;color:#444;flex:1;padding:16px;background:#f8f9fa;border-radius:8px;border:1px solid #e0e0e0;';

        // Buttons container
        const btns = document.createElement('div');
        btns.style.cssText = 'display:flex;gap:12px;justify-content:flex-end;flex-wrap:wrap;';

        // Insert button (only for comment/reply)
        if (actionType === 'comment' || actionType === 'reply') {
            const insertBtn = document.createElement('button');
            insertBtn.textContent = '📥 Insertar';
            insertBtn.style.cssText = 'background:#0a66c2;color:white;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-weight:600;font-size:15px;transition:background 0.2s;';
            insertBtn.onmouseenter = () => { insertBtn.style.background = '#004182'; };
            insertBtn.onmouseleave = () => { insertBtn.style.background = '#0a66c2'; };
            insertBtn.onclick = () => {
                insertTextInCommentBox(text);
                overlay.remove();
            };
            btns.appendChild(insertBtn);
        }

        // Copy button
        const copyBtn = document.createElement('button');
        copyBtn.textContent = '📋 Copiar';
        copyBtn.style.cssText = 'background:#0a66c2;color:white;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-weight:600;font-size:15px;transition:background 0.2s;';
        copyBtn.onmouseenter = () => { copyBtn.style.background = '#004182'; };
        copyBtn.onmouseleave = () => { copyBtn.style.background = '#0a66c2'; };
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(text);
            copyBtn.textContent = '✓ Copiado!';
            copyBtn.style.background = '#2e7d32';
            setTimeout(() => {
                copyBtn.textContent = '📋 Copiar';
                copyBtn.style.background = '#0a66c2';
            }, 2000);
        };

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Cerrar';
        closeBtn.style.cssText = 'background:#e0e0e0;color:#333;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-weight:600;font-size:15px;transition:background 0.2s;';
        closeBtn.onmouseenter = () => { closeBtn.style.background = '#d0d0d0'; };
        closeBtn.onmouseleave = () => { closeBtn.style.background = '#e0e0e0'; };
        closeBtn.onclick = () => overlay.remove();

        btns.append(copyBtn, closeBtn);
        box.append(title, content, btns);
        overlay.appendChild(box);

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        document.body.appendChild(overlay);
    }

    // --- Insert text into LinkedIn comment box ---
    function insertTextInCommentBox(text) {
        // Find the comment input box
        const commentBox = document.querySelector('.comments-comment-box__form .ql-editor, .ql-editor[contenteditable="true"], [contenteditable="true"][data-placeholder*="comentario"], [contenteditable="true"][data-placeholder*="comment"], .comments-comment-texteditor .ql-editor');

        if (commentBox) {
            commentBox.innerHTML = `<p>${text}</p>`;
            commentBox.focus();

            // Trigger input event so LinkedIn registers the change
            const event = new Event('input', { bubbles: true });
            commentBox.dispatchEvent(event);

            console.log('[IngenIA] ✅ Text inserted in comment box');
            return;
        }

        // Fallback: try to find any contenteditable
        const anyEditable = document.querySelector('[contenteditable="true"]');
        if (anyEditable) {
            anyEditable.innerHTML = `<p>${text}</p>`;
            anyEditable.focus();
            anyEditable.dispatchEvent(new Event('input', { bubbles: true }));
            console.log('[IngenIA] ✅ Text inserted (fallback)');
            return;
        }

        // Last resort: copy to clipboard
        navigator.clipboard.writeText(text);
        alert('No encontré el cuadro de comentario. El texto ha sido copiado al portapapeles.');
    }

})();
