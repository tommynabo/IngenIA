// IngenIA v8 - Back to working version with fixes
(function () {
    console.log('[IngenIA] v8 - Simple Working');

    const done = new Set();

    setInterval(scan, 2000);
    setTimeout(scan, 500);

    function scan() {
        // POST BUTTONS - broad search for action bars
        document.querySelectorAll('button, span').forEach(el => {
            const t = el.innerText?.toLowerCase().trim();
            if ((t === 'recomendar' || t === 'like') && !done.has(el)) {
                done.add(el);
                const bar = el.closest('[class*="social-action"]') || el.parentElement?.parentElement;
                if (bar && !bar.querySelector('.ing-btn')) {
                    const post = bar.closest('[data-urn], .feed-shared-update-v2, article');
                    const c = document.createElement('div');
                    c.style.cssText = 'display:inline-flex;gap:8px;margin-left:12px;align-items:center;';
                    c.innerHTML = `<button class="ing-btn" data-action="summarize">📝 Resumir</button><button class="ing-btn" data-action="comment">⚡ Comentar</button>`;
                    c.querySelectorAll('.ing-btn').forEach(b => {
                        b.style.cssText = 'background:#0a66c2;color:#fff;border:none;border-radius:16px;padding:6px 12px;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;transition:background 0.2s;';
                        b.onmouseenter = () => b.style.background = '#004182';
                        b.onmouseleave = () => b.style.background = '#0a66c2';
                        b.onclick = (e) => { e.stopPropagation(); doAction(post, b.dataset.action, b); };
                    });
                    bar.appendChild(c);
                }
            }
        });

        // PENCIL - only ONE per comment container
        document.querySelectorAll('.comments-comment-item, .comments-comment-entity, [class*="comments-comment-item"]').forEach(commentContainer => {
            // Skip if we already added pencil to this container
            if (commentContainer.dataset.ingPencilAdded) return;

            // Find responder button in this container
            let responderBtn = null;
            commentContainer.querySelectorAll('button, span').forEach(el => {
                const t = el.innerText?.trim().toLowerCase();
                if ((t === 'responder' || t === 'reply') && !responderBtn) {
                    responderBtn = el;
                }
            });

            if (!responderBtn) return;

            // Mark this container as processed
            commentContainer.dataset.ingPencilAdded = 'true';

            const p = document.createElement('span');
            p.className = 'ing-pencil';
            p.innerHTML = '✏️';
            p.style.cssText = 'cursor:pointer;margin-left:8px;font-size:16px;';
            p.onclick = (e) => {
                e.stopPropagation();
                const txt = commentContainer.querySelector('[class*="main-content"],[class*="comment-text"]')?.innerText || '';
                if (!txt) { alert('No encontré texto'); return; }
                doReply(txt, p, responderBtn, commentContainer);
            };
            responderBtn.after(p);
        });
    }

    async function doAction(post, action, btn) {
        // Check if chrome.storage is available
        if (!chrome?.storage?.sync) {
            alert('Error: La extensión no está cargada correctamente. Recarga la página.');
            return;
        }

        const key = (await chrome.storage.sync.get('licenseKey')).licenseKey;
        if (!key) { alert('Configura tu licencia'); return; }

        const txt = post?.querySelector('.update-components-text,.feed-shared-text-view,.feed-shared-update-v2__description')?.innerText || post?.innerText?.substring(0, 500) || '';
        if (!txt) { alert('No encontré texto'); return; }

        const originalText = btn.innerHTML;
        btn.innerHTML = '⏳';
        const prompt = action === 'summarize' ? `Resume: ${txt}` : `Comenta profesionalmente: ${txt}`;

        chrome.runtime.sendMessage({ action: 'generate_comment', licenseKey: key, prompt }, r => {
            btn.innerHTML = originalText;
            if (r?.success) modal(r.result, true, null, post);
            else alert(r?.error || 'Error');
        });
    }

    async function doReply(txt, btn, respBtn, commentContainer) {
        // Check if chrome.storage is available
        if (!chrome?.storage?.sync) {
            alert('Error: La extensión no está cargada correctamente. Recarga la página.');
            return;
        }

        const key = (await chrome.storage.sync.get('licenseKey')).licenseKey;
        if (!key) { alert('Configura tu licencia'); return; }

        btn.innerHTML = '⏳';
        const prompt = `Responde cordialmente a: "${txt}"`;

        chrome.runtime.sendMessage({ action: 'generate_comment', licenseKey: key, prompt }, r => {
            btn.innerHTML = '✏️';
            if (r?.success) modal(r.result, true, respBtn, commentContainer);
            else alert(r?.error || 'Error');
        });
    }

    function modal(text, showInsert, respBtn, container) {
        const o = document.createElement('div');
        o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:999999;display:flex;align-items:center;justify-content:center;';
        o.innerHTML = `
            <div style="background:#fff;padding:24px;border-radius:12px;max-width:550px;width:90%;box-shadow:0 4px 12px rgba(0,0,0,0.2);">
                <h3 style="margin:0 0 16px;color:#333;">Resultado IngenIA</h3>
                <div style="background:#f5f5f5;padding:14px;border-radius:8px;font-size:15px;line-height:1.6;max-height:300px;overflow:auto;margin-bottom:20px;">${text}</div>
                <div style="display:flex;gap:10px;justify-content:flex-end;">
                    ${showInsert ? '<button id="ing-insert" style="background:#0a66c2;color:#fff;border:none;padding:8px 16px;border-radius:16px;cursor:pointer;font-weight:600;">📥 Insertar</button>' : ''}
                    <button id="ing-copy" style="background:#fff;color:#0a66c2;border:1px solid #0a66c2;padding:8px 16px;border-radius:16px;cursor:pointer;font-weight:600;">📋 Copiar</button>
                    <button id="ing-close" style="background:transparent;color:#666;border:none;padding:8px 16px;border-radius:16px;cursor:pointer;font-weight:600;">Cerrar</button>
                </div>
            </div>`;
        document.body.appendChild(o);

        o.querySelector('#ing-close').onclick = () => o.remove();
        o.querySelector('#ing-copy').onclick = () => {
            navigator.clipboard.writeText(text);
            const copyBtn = o.querySelector('#ing-copy');
            copyBtn.textContent = '✓ Copiado';
            setTimeout(() => copyBtn.textContent = '📋 Copiar', 2000);
        };

        const ins = o.querySelector('#ing-insert');
        if (ins) {
            ins.onclick = () => {
                if (respBtn) respBtn.click();

                setTimeout(() => {
                    let ed;
                    if (respBtn && container) {
                        ed = container.parentElement?.querySelector('.ql-editor[contenteditable="true"]') ||
                            container.querySelector('.ql-editor[contenteditable="true"]');
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
                        ed.dispatchEvent(new Event('focus', { bubbles: true }));
                    } else {
                        navigator.clipboard.writeText(text);
                        alert('Texto copiado al portapapeles (no pude encontrar la caja de texto automática).');
                    }
                    o.remove();
                }, 600);
            };
        }

        o.onclick = (e) => { if (e.target === o) o.remove(); };
    }
})();
