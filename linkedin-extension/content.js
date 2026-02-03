// IngenIA v6 - SIMPLE & WORKING
(function () {
    console.log('[IngenIA] v6');

    const done = new Set();

    setInterval(scan, 1500);
    setTimeout(scan, 800);

    function scan() {
        addPostButtons();
        addPencils();
    }

    function addPostButtons() {
        // Find all social counts containers (where "X likes" and "X comments" are shown)
        document.querySelectorAll('.social-details-social-counts').forEach(countsBar => {
            // Skip if already processed
            if (countsBar.dataset.ingProcessed) return;
            countsBar.dataset.ingProcessed = 'true';

            const post = countsBar.closest('.feed-shared-update-v2, [data-urn], article');
            if (!post) return;

            // Create our button container
            const container = document.createElement('div');
            container.className = 'ing-btns';
            container.style.cssText = 'display:inline-flex;gap:8px;margin-left:16px;vertical-align:middle;';

            container.innerHTML = `
                <button class="ing-btn" data-act="summarize">📝 Resumir</button>
                <button class="ing-btn" data-act="comment">⚡ Comentar</button>
            `;

            container.querySelectorAll('.ing-btn').forEach(btn => {
                btn.style.cssText = 'background:#0a66c2;color:#fff;border:none;border-radius:16px;padding:5px 12px;font-size:13px;font-weight:600;cursor:pointer;';
                btn.onclick = (e) => {
                    e.stopPropagation();
                    handlePostAction(post, btn.dataset.act, btn);
                };
            });

            countsBar.appendChild(container);
        });
    }

    function addPencils() {
        // Find all "Responder" buttons
        document.querySelectorAll('button, span').forEach(el => {
            const txt = el.innerText?.trim().toLowerCase();
            if ((txt === 'responder' || txt === 'reply') && !done.has(el)) {
                done.add(el);

                // Don't add if pencil already exists nearby
                if (el.parentElement?.querySelector('.ing-pencil')) return;
                if (el.nextElementSibling?.classList?.contains('ing-pencil')) return;

                const comment = el.closest('.comments-comment-item, [class*="comment-item"], [class*="comment-entity"]');

                const pencil = document.createElement('span');
                pencil.className = 'ing-pencil';
                pencil.innerHTML = '✏️';
                pencil.style.cssText = 'cursor:pointer;margin-left:6px;font-size:15px;';
                pencil.onclick = (e) => {
                    e.stopPropagation();
                    handleReply(comment, pencil, el);
                };

                el.after(pencil);
            }
        });
    }

    async function handlePostAction(post, action, btn) {
        const key = (await chrome.storage.sync.get('licenseKey')).licenseKey;
        if (!key) { alert('Configura tu licencia'); return; }

        // Get post text
        const textEl = post.querySelector('.feed-shared-text, .update-components-text, .feed-shared-update-v2__description, [class*="update-components-text"]');
        const txt = textEl?.innerText?.trim();

        if (!txt) { alert('No encontré el texto del post'); return; }

        const orig = btn.innerHTML;
        btn.innerHTML = '⏳';
        btn.disabled = true;

        const prompt = action === 'summarize'
            ? `Resume brevemente: ${txt}`
            : `Escribe un comentario profesional para: ${txt}`;

        chrome.runtime.sendMessage({ action: 'generate_comment', licenseKey: key, prompt }, r => {
            btn.innerHTML = orig;
            btn.disabled = false;
            if (r?.success) showModal(r.result, post, null);
            else alert(r?.error || 'Error');
        });
    }

    async function handleReply(comment, pencil, respBtn) {
        const key = (await chrome.storage.sync.get('licenseKey')).licenseKey;
        if (!key) { alert('Configura tu licencia'); return; }

        // Get comment text
        const textEl = comment?.querySelector('.comments-comment-item__main-content, [class*="comment-text"], [class*="main-content"]');
        const txt = textEl?.innerText?.trim();

        if (!txt) { alert('No encontré el texto del comentario'); return; }

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
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:999999;display:flex;align-items:center;justify-content:center;';
        overlay.innerHTML = `
            <div style="background:#fff;padding:24px;border-radius:12px;max-width:520px;width:90%;box-shadow:0 8px 30px rgba(0,0,0,.25);">
                <h3 style="margin:0 0 14px;font-size:17px;color:#333;">Resultado IngenIA</h3>
                <div style="background:#f4f4f4;padding:14px;border-radius:8px;font-size:14px;line-height:1.5;max-height:280px;overflow:auto;margin-bottom:18px;">${text}</div>
                <div style="display:flex;gap:10px;justify-content:flex-end;">
                    <button id="ing-insert" style="background:#0a66c2;color:#fff;border:none;padding:9px 18px;border-radius:18px;cursor:pointer;font-weight:600;">📥 Insertar</button>
                    <button id="ing-copy" style="background:#fff;color:#0a66c2;border:2px solid #0a66c2;padding:9px 18px;border-radius:18px;cursor:pointer;font-weight:600;">📋 Copiar</button>
                    <button id="ing-close" style="background:#eee;color:#333;border:none;padding:9px 18px;border-radius:18px;cursor:pointer;font-weight:600;">Cerrar</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelector('#ing-close').onclick = () => overlay.remove();

        overlay.querySelector('#ing-copy').onclick = () => {
            navigator.clipboard.writeText(text);
            overlay.querySelector('#ing-copy').innerHTML = '✓ Copiado';
        };

        overlay.querySelector('#ing-insert').onclick = () => {
            // Click responder if needed
            if (respBtn) respBtn.click();

            setTimeout(() => {
                // Find the editor
                let editor;
                if (respBtn && container) {
                    editor = container.querySelector('.ql-editor[contenteditable="true"]') ||
                        container.parentElement?.querySelector('.ql-editor[contenteditable="true"]');
                }
                if (!editor) {
                    const all = document.querySelectorAll('.ql-editor[contenteditable="true"]');
                    editor = all[all.length - 1];
                }

                if (editor) {
                    editor.innerHTML = `<p>${text}</p>`;
                    editor.focus();
                    editor.dispatchEvent(new Event('input', { bubbles: true }));
                } else {
                    navigator.clipboard.writeText(text);
                }
                overlay.remove();
            }, 600);
        };

        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    }
})();
