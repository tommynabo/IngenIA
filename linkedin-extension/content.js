// --- IngenIA LinkedIn Extension - content.js ---
// NUCLEAR VERSION - Find elements by text, not by tag

(function () {
    'use strict';

    console.log('[IngenIA] 🚀 Script starting...');

    // IMMEDIATE VISUAL CONFIRMATION - Red dot in corner
    const marker = document.createElement('div');
    marker.id = 'ingenia-marker';
    marker.style.cssText = 'position:fixed;bottom:10px;left:10px;width:15px;height:15px;background:red;border-radius:50%;z-index:2147483647;';
    document.body.appendChild(marker);
    console.log('[IngenIA] ✅ Red marker added');

    const INJECTED_ATTR = 'data-ingenia-done';

    // Run injection
    setTimeout(runInjection, 1000);
    setTimeout(runInjection, 2000);
    setTimeout(runInjection, 3000);
    setInterval(runInjection, 2000);

    function runInjection() {
        try {
            injectButtons();
        } catch (e) {
            console.error('[IngenIA] Error:', e);
        }
    }

    function injectButtons() {
        // Find ALL elements that contain "Recomendar" text
        // LinkedIn doesn't always use <button> tags!

        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let node;
        while (node = walker.nextNode()) {
            const text = node.textContent.trim().toLowerCase();

            if (text === 'recomendar' || text === 'like') {
                // Found it! Now find the action bar (parent container)
                let element = node.parentElement;
                if (!element) continue;

                // Go up to find the action bar container
                let actionBar = null;
                let current = element;
                for (let i = 0; i < 6; i++) {
                    if (!current) break;

                    // Check if this looks like an action bar (has multiple children, is a row)
                    const style = window.getComputedStyle(current);
                    const isFlexRow = style.display === 'flex' && style.flexDirection !== 'column';
                    const hasMultipleKids = current.children.length >= 3;

                    if (isFlexRow && hasMultipleKids) {
                        actionBar = current;
                        break;
                    }
                    current = current.parentElement;
                }

                if (!actionBar) {
                    // Fallback: just use 4 levels up
                    actionBar = element.parentElement?.parentElement?.parentElement?.parentElement;
                }

                if (!actionBar) continue;
                if (actionBar.hasAttribute(INJECTED_ATTR)) continue;

                // Mark as done
                actionBar.setAttribute(INJECTED_ATTR, 'true');

                // Find the post container
                const postContainer = actionBar.closest('div[data-urn], .feed-shared-update-v2, article') || actionBar.parentElement?.parentElement;

                // Create button container
                const container = document.createElement('div');
                container.className = 'ingenia-btns';
                container.style.cssText = `
                    display: inline-flex !important;
                    align-items: center !important;
                    gap: 8px !important;
                    margin-left: 12px !important;
                    flex-shrink: 0 !important;
                `;

                // Create buttons
                const btnResumen = createBtn('📝 Resumir', '#0a66c2', () => handleClick(postContainer, 'summarize', btnResumen));
                const btnComentar = createBtn('⚡ Comentar', '#0a66c2', () => handleClick(postContainer, 'comment', btnComentar));

                container.appendChild(btnResumen);
                container.appendChild(btnComentar);

                // Append to action bar
                actionBar.appendChild(container);

                // Turn marker green to show success
                marker.style.background = 'green';

                console.log('[IngenIA] ✅ Buttons injected!', actionBar);
            }
        }

        // Also inject pencil buttons for replies
        injectPencils();
    }

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

            if (text === 'responder' || text === 'reply') {
                let element = node.parentElement;
                if (!element) continue;
                if (element.hasAttribute('data-ingenia-pencil')) continue;

                element.setAttribute('data-ingenia-pencil', 'true');

                const pencil = createBtn('✏️', 'transparent', () => {
                    const comment = element.closest('.comments-comment-item, article, div[class*="comment"]');
                    handleClick(comment || element, 'reply', pencil);
                });
                pencil.style.color = '#666';
                pencil.style.padding = '4px';
                pencil.style.marginLeft = '4px';

                element.parentNode.insertBefore(pencil, element.nextSibling);
                console.log('[IngenIA] ✅ Pencil injected!');
            }
        }
    }

    function createBtn(label, bgColor, onClick) {
        const btn = document.createElement('button');
        btn.innerHTML = label;
        btn.style.cssText = `
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: ${bgColor} !important;
            color: ${bgColor === 'transparent' ? '#666' : 'white'} !important;
            border: none !important;
            border-radius: 16px !important;
            padding: 6px 14px !important;
            font-size: 14px !important;
            font-weight: 600 !important;
            cursor: pointer !important;
            white-space: nowrap !important;
            z-index: 9999 !important;
        `;

        if (bgColor !== 'transparent') {
            btn.onmouseenter = () => { btn.style.background = '#004182'; };
            btn.onmouseleave = () => { btn.style.background = bgColor; };
        }

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            onClick();
        });

        return btn;
    }

    async function handleClick(context, actionType, button) {
        // Get license
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
