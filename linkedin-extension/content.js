// IngenIA v9 - Fixed: Post vs Comment distinction
(function () {
    console.log('[IngenIA] v9 - Post/Comment Fix');

    const processedPosts = new Set();
    const processedComments = new Set();

    setInterval(scan, 2000);
    setTimeout(scan, 500);

    function scan() {
        addPostButtons();
        addCommentPencils();
    }

    // === POST BUTTONS ONLY ===
    function addPostButtons() {
        // Find posts - these are the main feed items
        document.querySelectorAll('.feed-shared-update-v2, [data-urn*="activity"]').forEach(post => {
            if (processedPosts.has(post)) return;

            // Find the "Recomendar" button WITHIN THIS POST (not in comments)
            // The post-level Recomendar is in the main social actions bar
            const postActionBar = post.querySelector('.feed-shared-social-action-bar, [class*="social-action-bar"]');
            if (!postActionBar) return;

            // Check if already has our buttons
            if (postActionBar.querySelector('.ing-btn')) return;

            const recBtn = Array.from(postActionBar.querySelectorAll('button, span')).find(el => {
                const t = el.innerText?.toLowerCase().trim();
                return t === 'recomendar' || t === 'like';
            });

            if (!recBtn) return;

            processedPosts.add(post);

            // Create buttons container
            const container = document.createElement('div');
            container.style.cssText = 'display:inline-flex;gap:8px;margin-left:12px;align-items:center;';
            container.innerHTML = `
                <button class="ing-btn" data-action="summarize">📝 Resumir</button>
                <button class="ing-btn" data-action="comment">⚡ Comentar</button>
            `;

            container.querySelectorAll('.ing-btn').forEach(btn => {
                btn.style.cssText = 'background:#0a66c2;color:#fff;border:none;border-radius:16px;padding:6px 12px;font-size:14px;font-weight:600;cursor:pointer;transition:background 0.2s;';
                btn.onmouseenter = () => btn.style.background = '#004182';
                btn.onmouseleave = () => btn.style.background = '#0a66c2';
                btn.onclick = (e) => {
                    e.stopPropagation();
                    handlePost(post, btn.dataset.action, btn);
                };
            });

            // Add after the Recomendar button
            recBtn.parentElement.appendChild(container);
        });
    }

    // === COMMENT PENCILS ONLY ===
    function addCommentPencils() {
        // Find comment items
        document.querySelectorAll('.comments-comment-item, .comments-comment-entity, [class*="comments-comment"]').forEach(comment => {
            if (processedComments.has(comment)) return;

            // Find the "Responder" button
            const respBtn = Array.from(comment.querySelectorAll('button, span')).find(el => {
                const t = el.innerText?.trim().toLowerCase();
                return t === 'responder' || t === 'reply';
            });

            if (!respBtn) return;

            // Check if pencil already exists
            if (respBtn.nextElementSibling?.classList?.contains('ing-pencil')) return;

            processedComments.add(comment);

            // Create pencil
            const pencil = document.createElement('span');
            pencil.className = 'ing-pencil';
            pencil.innerHTML = '✏️';
            pencil.style.cssText = 'cursor:pointer;margin-left:8px;font-size:16px;';
            pencil.onclick = (e) => {
                e.stopPropagation();
                handleComment(comment, pencil, respBtn);
            };

            respBtn.after(pencil);
        });
    }

    async function handlePost(post, action, btn) {
        if (!chrome?.storage?.sync) {
            alert('Error: La extensión no está cargada correctamente. Recarga la página.');
            return;
        }

        const key = (await chrome.storage.sync.get('licenseKey')).licenseKey;
        if (!key) { alert('Configura tu licencia'); return; }

        const txt = post?.querySelector('.update-components-text,.feed-shared-text-view,.feed-shared-update-v2__description')?.innerText?.trim() || '';
        if (!txt) { alert('No encontré texto del post'); return; }

        const orig = btn.innerHTML;
        btn.innerHTML = '⏳';
        const prompt = action === 'summarize' ? `Resume: ${txt}` : `Comenta profesionalmente: ${txt}`;

        chrome.runtime.sendMessage({ action: 'generate_comment', licenseKey: key, prompt }, r => {
            btn.innerHTML = orig;
            if (r?.success) showModal(r.result, post, null);
            else alert(r?.error || 'Error');
        });
    }

    async function handleComment(comment, pencil, respBtn) {
        if (!chrome?.storage?.sync) {
            alert('Error: La extensión no está cargada correctamente. Recarga la página.');
            return;
        }

        const key = (await chrome.storage.sync.get('licenseKey')).licenseKey;
        if (!key) { alert('Configura tu licencia'); return; }

        const txt = comment?.querySelector('[class*="main-content"],[class*="comment-text"]')?.innerText?.trim() || '';
        if (!txt) { alert('No encontré texto del comentario'); return; }

        pencil.innerHTML = '⏳';
        const prompt = `Responde cordialmente a: "${txt}"`;

        chrome.runtime.sendMessage({ action: 'generate_comment', licenseKey: key, prompt }, r => {
            pencil.innerHTML = '✏️';
            if (r?.success) showModal(r.result, comment, respBtn);
            else alert(r?.error || 'Error');
        });
    }

    function showModal(text, container, respBtn) {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:999999;display:flex;align-items:center;justify-content:center;';
        overlay.innerHTML = `
            <div style="background:#fff;padding:24px;border-radius:12px;max-width:550px;width:90%;box-shadow:0 4px 12px rgba(0,0,0,0.2);">
                <h3 style="margin:0 0 16px;color:#333;">Resultado IngenIA</h3>
                <div style="background:#f5f5f5;padding:14px;border-radius:8px;font-size:15px;line-height:1.6;max-height:300px;overflow:auto;margin-bottom:20px;">${text}</div>
                <div style="display:flex;gap:10px;justify-content:flex-end;">
                    <button id="ing-insert" style="background:#0a66c2;color:#fff;border:none;padding:8px 16px;border-radius:16px;cursor:pointer;font-weight:600;">📥 Insertar</button>
                    <button id="ing-copy" style="background:#fff;color:#0a66c2;border:1px solid #0a66c2;padding:8px 16px;border-radius:16px;cursor:pointer;font-weight:600;">📋 Copiar</button>
                    <button id="ing-close" style="background:transparent;color:#666;border:none;padding:8px 16px;border-radius:16px;cursor:pointer;font-weight:600;">Cerrar</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        overlay.querySelector('#ing-close').onclick = () => overlay.remove();
        overlay.querySelector('#ing-copy').onclick = () => {
            navigator.clipboard.writeText(text);
            const btn = overlay.querySelector('#ing-copy');
            btn.textContent = '✓ Copiado';
            setTimeout(() => btn.textContent = '📋 Copiar', 2000);
        };

        overlay.querySelector('#ing-insert').onclick = () => {
            if (respBtn) respBtn.click();

            setTimeout(() => {
                let ed;
                if (respBtn && container) {
                    ed = container.querySelector('.ql-editor[contenteditable="true"]') ||
                        container.parentElement?.querySelector('.ql-editor[contenteditable="true"]');
                } else if (container) {
                    ed = container.querySelector('.ql-editor[contenteditable="true"]');
                }

                if (!ed) {
                    const editors = document.querySelectorAll('.ql-editor[contenteditable="true"]');
                    ed = editors[editors.length - 1];
                }

                if (ed) {
                    ed.innerHTML = `<p>${text}</p>`;
                    ed.focus();
                    ed.dispatchEvent(new Event('input', { bubbles: true }));
                } else {
                    navigator.clipboard.writeText(text);
                    alert('Texto copiado al portapapeles');
                }
                overlay.remove();
            }, 600);
        };

        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    }
})();
