// --- IngenIA LinkedIn Extension - content.js ---
// Buttons in stats bar, pencil only for comments

(function () {
    'use strict';

    console.log('[IngenIA] Script loaded');

    const INJECTED_ATTR = 'data-ingenia-done';
    const PENCIL_ATTR = 'data-ingenia-pencil';

    // Run injection
    setTimeout(runInjection, 1000);
    setTimeout(runInjection, 2000);
    setInterval(runInjection, 2000);

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
        // Find elements that contain "comentarios" or "comments" text
        // This is the stats row where we want to place our buttons

        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let node;
        while (node = walker.nextNode()) {
            const text = node.textContent.trim().toLowerCase();

            // Look for "X comentarios" or "X comments"
            if (text.includes('comentario') || text.includes('comment')) {
                // Make sure it's the stats count, not a button
                if (text.includes('añadir') || text.includes('add')) continue;

                let element = node.parentElement;
                if (!element) continue;

                // Find the stats row container (parent that holds likes count + comments count)
                let statsRow = null;
                let current = element;
                for (let i = 0; i < 5; i++) {
                    if (!current) break;

                    // Stats row usually has flex display and contains reaction counts
                    const hasReactions = current.querySelector('[class*="reaction"], [class*="social-counts"], [class*="social-details"]');
                    const style = window.getComputedStyle(current);

                    if (hasReactions || (style.display === 'flex' && current.innerText.includes('comentario'))) {
                        statsRow = current;
                        break;
                    }
                    current = current.parentElement;
                }

                if (!statsRow) {
                    // Fallback: go up 2-3 levels
                    statsRow = element.parentElement?.parentElement || element.parentElement;
                }

                if (!statsRow) continue;
                if (statsRow.hasAttribute(INJECTED_ATTR)) continue;

                // Make sure we're not in a comment section
                const isInComment = element.closest('.comments-comment-item, .comments-comments-list, [class*="comment-item"]');
                if (isInComment) continue;

                // Mark as done
                statsRow.setAttribute(INJECTED_ATTR, 'true');

                // Find the post container for text extraction
                const postContainer = statsRow.closest('div[data-urn], .feed-shared-update-v2, article') || statsRow.parentElement?.parentElement?.parentElement;

                // Create button container
                const container = document.createElement('div');
                container.className = 'ingenia-btns';
                container.style.cssText = `
                    display: inline-flex !important;
                    align-items: center !important;
                    gap: 6px !important;
                    margin-left: auto !important;
                    flex-shrink: 0 !important;
                `;

                // Create buttons
                const btnResumen = createBtn('📝 Resumir', () => handleClick(postContainer, 'summarize', btnResumen));
                const btnComentar = createBtn('⚡ Comentar', () => handleClick(postContainer, 'comment', btnComentar));

                container.appendChild(btnResumen);
                container.appendChild(btnComentar);

                // Append to stats row
                statsRow.appendChild(container);

                console.log('[IngenIA] ✅ Post buttons injected in stats row');
            }
        }
    }

    // --- PENCIL for comment replies ---
    function injectPencils() {
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let node;
        while (node = walker.nextNode()) {
            const text = node.textContent.trim().toLowerCase();

            // Find "Responder" buttons in comments
            if (text === 'responder' || text === 'reply') {
                let element = node.parentElement;
                if (!element) continue;
                if (element.hasAttribute(PENCIL_ATTR)) continue;

                // Make sure we're in a comment
                const commentItem = element.closest('.comments-comment-item, .comments-comments-list, [class*="comment-item"], article');
                if (!commentItem) continue;

                element.setAttribute(PENCIL_ATTR, 'true');

                // Create pencil button
                const pencil = document.createElement('button');
                pencil.innerHTML = '✏️';
                pencil.title = 'Generar respuesta con IA';
                pencil.style.cssText = `
                    background: transparent !important;
                    border: none !important;
                    cursor: pointer !important;
                    font-size: 16px !important;
                    padding: 2px 6px !important;
                    margin-left: 4px !important;
                    opacity: 0.7 !important;
                    transition: opacity 0.2s !important;
                `;
                pencil.onmouseenter = () => { pencil.style.opacity = '1'; };
                pencil.onmouseleave = () => { pencil.style.opacity = '0.7'; };

                pencil.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleClick(commentItem, 'reply', pencil);
                });

                // Insert after the Responder text/button
                if (element.parentNode) {
                    element.parentNode.insertBefore(pencil, element.nextSibling);
                    console.log('[IngenIA] ✅ Pencil injected');
                }
            }
        }
    }

    // --- Create styled button ---
    function createBtn(label, onClick) {
        const btn = document.createElement('button');
        btn.innerHTML = label;
        btn.style.cssText = `
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: #0a66c2 !important;
            color: white !important;
            border: none !important;
            border-radius: 14px !important;
            padding: 4px 10px !important;
            font-size: 12px !important;
            font-weight: 600 !important;
            cursor: pointer !important;
            white-space: nowrap !important;
        `;

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

        // Get text
        const textEl = context?.querySelector('.feed-shared-update-v2__description, .update-components-text, .feed-shared-text-view, .comments-comment-item__main-content') || context;
        const postText = textEl?.innerText?.trim() || '';

        if (!postText) {
            alert('No encontré texto para procesar.');
            return;
        }

        // Get author
        const authorEl = context?.querySelector('.update-components-actor__name, .feed-shared-actor__name, .comments-post-meta__name-text');
        const author = authorEl?.innerText?.split('\n')[0] || 'Autor';

        // Show loading
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
                showModal(response.result);
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

    // --- Show result modal ---
    function showModal(text) {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:999999;display:flex;align-items:center;justify-content:center;';

        const box = document.createElement('div');
        box.style.cssText = 'background:white;padding:24px;border-radius:12px;max-width:500px;width:90%;box-shadow:0 10px 40px rgba(0,0,0,0.3);';

        const title = document.createElement('h3');
        title.textContent = 'Resultado IngenIA';
        title.style.cssText = 'margin:0 0 16px;font-size:18px;';

        const content = document.createElement('div');
        content.textContent = text;
        content.style.cssText = 'white-space:pre-wrap;max-height:300px;overflow-y:auto;margin-bottom:20px;line-height:1.6;';

        const btns = document.createElement('div');
        btns.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;';

        const copyBtn = document.createElement('button');
        copyBtn.textContent = 'Copiar';
        copyBtn.style.cssText = 'background:#0a66c2;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:600;';
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(text);
            copyBtn.textContent = '✓ Copiado';
            setTimeout(() => { copyBtn.textContent = 'Copiar'; }, 1500);
        };

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Cerrar';
        closeBtn.style.cssText = 'background:#e0e0e0;color:#333;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:600;';
        closeBtn.onclick = () => overlay.remove();

        btns.append(copyBtn, closeBtn);
        box.append(title, content, btns);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
    }

})();
