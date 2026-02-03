// IngenIA v5 - FIXED SELECTORS
(function () {
    console.log('[IngenIA] v5 - Fixed');

    const processedPosts = new WeakSet();
    const processedComments = new WeakSet();

    setInterval(scan, 2000);
    setTimeout(scan, 500);

    function scan() {
        // === POST BUTTONS ===
        // Target the SOCIAL ACTIONS BAR of each post (where Like/Comment/Repost/Send buttons are)
        document.querySelectorAll('.feed-shared-update-v2, [data-urn*="activity"]').forEach(post => {
            if (processedPosts.has(post)) return;

            // Find the social actions bar - it contains the main action buttons
            const actionsBar = post.querySelector('.social-details-social-counts, .feed-shared-social-action-bar, [class*="social-details"]');
            if (!actionsBar) return;

            // Check if we already added our buttons
            if (post.querySelector('.ing-container')) return;

            processedPosts.add(post);

            // Create button container
            const container = document.createElement('div');
            container.className = 'ing-container';
            container.style.cssText = 'display:inline-flex;gap:8px;margin-left:12px;align-items:center;vertical-align:middle;';
            container.innerHTML = `
                <button class="ing-btn" data-action="summarize">📝 Resumir</button>
                <button class="ing-btn" data-action="comment">⚡ Comentar</button>
            `;

            container.querySelectorAll('.ing-btn').forEach(btn => {
                btn.style.cssText = 'background:#0a66c2;color:#fff;border:none;border-radius:16px;padding:6px 14px;font-size:13px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px;transition:background 0.2s;';
                btn.onmouseenter = () => btn.style.background = '#004182';
                btn.onmouseleave = () => btn.style.background = '#0a66c2';
                btn.onclick = (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    doAction(post, btn.dataset.action, btn);
                };
            });

            // Insert after the counts (likes count area)
            actionsBar.appendChild(container);
        });

        // === PENCIL FOR REPLIES ===
        // Target the "Responder" button specifically within comment items
        document.querySelectorAll('.comments-comment-item, .comments-comment-entity').forEach(comment => {
            if (processedComments.has(comment)) return;

            // Find the "Responder" button - it's a button or span with exact text
            const responderBtn = Array.from(comment.querySelectorAll('button, span')).find(el => {
                const text = el.innerText?.trim().toLowerCase();
                return text === 'responder' || text === 'reply';
            });

            if (!responderBtn) return;

            // Check if pencil already exists next to this button
            if (responderBtn.parentElement?.querySelector('.ing-pencil')) return;

            processedComments.add(comment);

            // Create pencil
            const pencil = document.createElement('span');
            pencil.className = 'ing-pencil';
            pencil.innerHTML = '✏️';
            pencil.title = 'Generar respuesta con IA';
            pencil.style.cssText = 'cursor:pointer;margin-left:8px;font-size:16px;vertical-align:middle;';
            pencil.onclick = (e) => {
                e.stopPropagation();
                e.preventDefault();

                // Get comment text - look for the actual comment content
                const commentTextEl = comment.querySelector('.comments-comment-item__main-content, [class*="comment-text"], .update-components-text');
                const txt = commentTextEl?.innerText?.trim() || '';

                if (!txt || txt.length < 5) {
                    alert('No encontré el texto del comentario');
                    return;
                }

                doReply(txt, pencil, responderBtn, comment);
            };

            // Insert right after the Responder button
            responderBtn.after(pencil);
        });
    }

    async function doAction(post, action, btn) {
        const key = (await chrome.storage.sync.get('licenseKey')).licenseKey;
        if (!key) { alert('Configura tu licencia en la extensión'); return; }

        // Get post text - look for the main content
        const textEl = post.querySelector('.feed-shared-update-v2__description, .update-components-text, .feed-shared-text-view, [class*="update-components-text"]');
        const txt = textEl?.innerText?.trim() || '';

        if (!txt || txt.length < 10) {
            alert('No encontré el texto del post');
            return;
        }

        const originalText = btn.innerHTML;
        btn.innerHTML = '⏳';
        btn.disabled = true;

        const prompt = action === 'summarize'
            ? `Resume este post de LinkedIn de forma concisa: ${txt}`
            : `Genera un comentario profesional y relevante para este post de LinkedIn: ${txt}`;

        chrome.runtime.sendMessage({ action: 'generate_comment', licenseKey: key, prompt }, r => {
            btn.innerHTML = originalText;
            btn.disabled = false;
            if (r?.success) {
                showModal(r.result, true, null, post);
            } else {
                alert(r?.error || 'Error al generar');
            }
        });
    }

    async function doReply(txt, pencil, responderBtn, comment) {
        const key = (await chrome.storage.sync.get('licenseKey')).licenseKey;
        if (!key) { alert('Configura tu licencia en la extensión'); return; }

        const originalHTML = pencil.innerHTML;
        pencil.innerHTML = '⏳';

        const prompt = `Genera una respuesta cordial y profesional a este comentario de LinkedIn: "${txt}"`;

        chrome.runtime.sendMessage({ action: 'generate_comment', licenseKey: key, prompt }, r => {
            pencil.innerHTML = originalHTML;
            if (r?.success) {
                showModal(r.result, true, responderBtn, comment);
            } else {
                alert(r?.error || 'Error al generar');
            }
        });
    }

    function showModal(text, showInsert, responderBtn, container) {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:999999;display:flex;align-items:center;justify-content:center;';
        overlay.innerHTML = `
            <div style="background:#fff;padding:24px;border-radius:12px;max-width:550px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.3);">
                <h3 style="margin:0 0 16px;color:#333;font-size:18px;">Resultado IngenIA</h3>
                <div style="background:#f5f5f5;padding:16px;border-radius:8px;font-size:14px;line-height:1.6;max-height:300px;overflow:auto;margin-bottom:20px;white-space:pre-wrap;">${text}</div>
                <div style="display:flex;gap:10px;justify-content:flex-end;">
                    ${showInsert ? '<button id="ing-insert" style="background:#0a66c2;color:#fff;border:none;padding:10px 20px;border-radius:20px;cursor:pointer;font-weight:600;font-size:14px;">📥 Insertar</button>' : ''}
                    <button id="ing-copy" style="background:#fff;color:#0a66c2;border:2px solid #0a66c2;padding:10px 20px;border-radius:20px;cursor:pointer;font-weight:600;font-size:14px;">📋 Copiar</button>
                    <button id="ing-close" style="background:#f0f0f0;color:#333;border:none;padding:10px 20px;border-radius:20px;cursor:pointer;font-weight:600;font-size:14px;">Cerrar</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        overlay.querySelector('#ing-close').onclick = () => overlay.remove();

        overlay.querySelector('#ing-copy').onclick = () => {
            navigator.clipboard.writeText(text);
            const btn = overlay.querySelector('#ing-copy');
            btn.innerHTML = '✓ Copiado';
            setTimeout(() => btn.innerHTML = '📋 Copiar', 2000);
        };

        const insertBtn = overlay.querySelector('#ing-insert');
        if (insertBtn) {
            insertBtn.onclick = () => {
                // If this is a reply, click the Responder button first
                if (responderBtn) {
                    responderBtn.click();
                }

                // Wait for LinkedIn to render the editor
                setTimeout(() => {
                    let editor;

                    if (responderBtn && container) {
                        // Look for editor within or after the comment
                        editor = container.querySelector('.ql-editor[contenteditable="true"]') ||
                            container.parentElement?.querySelector('.ql-editor[contenteditable="true"]');
                    }

                    if (!editor && container) {
                        // For main post, look within the post container
                        editor = container.querySelector('.ql-editor[contenteditable="true"]');
                    }

                    // Fallback: get the last visible editor
                    if (!editor) {
                        const allEditors = document.querySelectorAll('.ql-editor[contenteditable="true"]');
                        editor = allEditors[allEditors.length - 1];
                    }

                    if (editor) {
                        editor.innerHTML = `<p>${text}</p>`;
                        editor.focus();
                        editor.dispatchEvent(new Event('input', { bubbles: true }));
                    } else {
                        navigator.clipboard.writeText(text);
                        alert('Texto copiado (no se pudo insertar automáticamente)');
                    }

                    overlay.remove();
                }, 700);
            };
        }

        // Close on overlay click
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    }
})();
