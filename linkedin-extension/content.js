// IngenIA v7 - FINAL FIXED VERSION
(function () {
    console.log('[IngenIA] v7 - Final');

    setInterval(scan, 1500);
    setTimeout(scan, 800);

    function scan() {
        addPostButtons();
        addPencilToComments();
    }

    // === POST BUTTONS ===
    function addPostButtons() {
        // Find the social counts line (likes + comments count)
        // This is the line with "X personas" and "X comentarios"
        document.querySelectorAll('[class*="social-details-social-counts"], [class*="social-counts"]').forEach(countsEl => {
            // Check if already processed
            if (countsEl.getAttribute('data-ing-done')) return;
            countsEl.setAttribute('data-ing-done', '1');

            // Find parent post
            const post = countsEl.closest('article, .feed-shared-update-v2, [data-urn]');
            if (!post) return;

            // Create buttons
            const btns = document.createElement('span');
            btns.className = 'ing-post-btns';
            btns.style.cssText = 'display:inline-flex;gap:8px;margin-left:16px;vertical-align:middle;';
            btns.innerHTML = `
                <button class="ing-btn" data-act="summarize" style="background:#0a66c2;color:#fff;border:none;border-radius:16px;padding:5px 14px;font-size:13px;font-weight:600;cursor:pointer;">📝 Resumir</button>
                <button class="ing-btn" data-act="comment" style="background:#0a66c2;color:#fff;border:none;border-radius:16px;padding:5px 14px;font-size:13px;font-weight:600;cursor:pointer;">⚡ Comentar</button>
            `;

            btns.querySelectorAll('.ing-btn').forEach(b => {
                b.onclick = e => {
                    e.stopPropagation();
                    handlePost(post, b.getAttribute('data-act'), b);
                };
            });

            countsEl.appendChild(btns);
        });
    }

    // === ONE PENCIL PER COMMENT ===
    function addPencilToComments() {
        // Process each comment container ONCE
        document.querySelectorAll('.comments-comment-item, .comments-comment-entity, [class*="comments-comment-item"]').forEach(comment => {
            // Skip if already processed
            if (comment.getAttribute('data-ing-pencil')) return;
            comment.setAttribute('data-ing-pencil', '1');

            // Find the "Responder" button inside this specific comment
            let respBtn = null;
            comment.querySelectorAll('button, span').forEach(el => {
                const t = el.innerText?.trim().toLowerCase();
                if (t === 'responder' || t === 'reply') {
                    respBtn = el;
                }
            });

            if (!respBtn) return;

            // Create ONE pencil
            const pencil = document.createElement('span');
            pencil.className = 'ing-pencil';
            pencil.innerHTML = '✏️';
            pencil.title = 'Responder con IA';
            pencil.style.cssText = 'cursor:pointer;margin-left:6px;font-size:15px;vertical-align:middle;';
            pencil.onclick = e => {
                e.stopPropagation();
                handleComment(comment, pencil, respBtn);
            };

            respBtn.after(pencil);
        });
    }

    // === HANDLE POST ACTION ===
    async function handlePost(post, action, btn) {
        const key = (await chrome.storage.sync.get('licenseKey')).licenseKey;
        if (!key) { alert('Configura tu licencia en la extensión'); return; }

        // Find post text - try multiple selectors
        let txt = '';
        const textSelectors = [
            '.feed-shared-update-v2__description',
            '.update-components-text',
            '.feed-shared-text-view',
            '[data-ad-preview="message"]',
            '.feed-shared-text'
        ];
        for (const sel of textSelectors) {
            const el = post.querySelector(sel);
            if (el?.innerText?.trim()) {
                txt = el.innerText.trim();
                break;
            }
        }

        if (!txt) {
            // Fallback: get any text content from post
            txt = post.innerText?.substring(0, 800) || '';
        }

        if (!txt || txt.length < 10) {
            alert('No encontré el texto del post');
            return;
        }

        const orig = btn.innerHTML;
        btn.innerHTML = '⏳';
        btn.disabled = true;

        const prompt = action === 'summarize'
            ? `Resume este post de LinkedIn de forma breve y clara:\n\n${txt}`
            : `Escribe un comentario profesional y relevante para este post de LinkedIn:\n\n${txt}`;

        chrome.runtime.sendMessage({ action: 'generate_comment', licenseKey: key, prompt }, r => {
            btn.innerHTML = orig;
            btn.disabled = false;
            if (r?.success) showModal(r.result, post, null);
            else alert(r?.error || 'Error al generar');
        });
    }

    // === HANDLE COMMENT REPLY ===
    async function handleComment(comment, pencil, respBtn) {
        const key = (await chrome.storage.sync.get('licenseKey')).licenseKey;
        if (!key) { alert('Configura tu licencia en la extensión'); return; }

        // Find comment text - try multiple selectors
        let txt = '';
        const textSelectors = [
            '.comments-comment-item__main-content',
            '[class*="comment-item__main-content"]',
            '.update-components-text',
            '[class*="comment-text"]'
        ];
        for (const sel of textSelectors) {
            const el = comment.querySelector(sel);
            if (el?.innerText?.trim()) {
                txt = el.innerText.trim();
                break;
            }
        }

        if (!txt || txt.length < 3) {
            alert('No encontré el texto del comentario');
            return;
        }

        const orig = pencil.innerHTML;
        pencil.innerHTML = '⏳';

        const prompt = `Escribe una respuesta cordial y profesional a este comentario de LinkedIn:\n\n"${txt}"`;

        chrome.runtime.sendMessage({ action: 'generate_comment', licenseKey: key, prompt }, r => {
            pencil.innerHTML = orig;
            if (r?.success) showModal(r.result, comment, respBtn);
            else alert(r?.error || 'Error al generar');
        });
    }

    // === MODAL ===
    function showModal(text, container, respBtn) {
        const overlay = document.createElement('div');
        overlay.id = 'ing-modal-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:999999;display:flex;align-items:center;justify-content:center;';
        overlay.innerHTML = `
            <div style="background:#fff;padding:24px;border-radius:12px;max-width:520px;width:90%;box-shadow:0 8px 30px rgba(0,0,0,.25);">
                <h3 style="margin:0 0 14px;font-size:17px;color:#333;">Resultado IngenIA</h3>
                <div style="background:#f4f4f4;padding:14px;border-radius:8px;font-size:14px;line-height:1.5;max-height:280px;overflow:auto;margin-bottom:18px;white-space:pre-wrap;">${text}</div>
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
            overlay.querySelector('#ing-copy').textContent = '✓ Copiado';
        };

        overlay.querySelector('#ing-insert').onclick = () => {
            // Click responder button if this is a reply
            if (respBtn) respBtn.click();

            setTimeout(() => {
                let editor = null;

                // Try to find the editor
                if (respBtn && container) {
                    // For replies, look near the comment
                    editor = container.querySelector('.ql-editor[contenteditable="true"]');
                    if (!editor) {
                        editor = container.parentElement?.querySelector('.ql-editor[contenteditable="true"]');
                    }
                }

                // Fallback: get the last editor on the page
                if (!editor) {
                    const allEditors = document.querySelectorAll('.ql-editor[contenteditable="true"]');
                    if (allEditors.length > 0) {
                        editor = allEditors[allEditors.length - 1];
                    }
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

        overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    }
})();
