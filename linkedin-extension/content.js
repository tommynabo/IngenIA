// IngenIA v4 - SIMPLIFIED
(function () {
    console.log('[IngenIA] v4');

    const done = new Set();

    setInterval(scan, 2000);
    setTimeout(scan, 500);

    function scan() {
        // POST BUTTONS
        document.querySelectorAll('button, span').forEach(el => {
            if (done.has(el)) return;
            const t = el.innerText?.toLowerCase().trim();
            if (t === 'recomendar' || t === 'like') {
                done.add(el);
                const bar = el.closest('[class*="social-action"]') || el.parentElement?.parentElement;
                if (bar && !bar.querySelector('.ing-btn')) {
                    const post = bar.closest('[data-urn], .feed-shared-update-v2, article');
                    const c = document.createElement('div');
                    c.style.cssText = 'display:inline-flex;gap:8px;margin-left:8px;align-items:center;';
                    c.innerHTML = `<button class="ing-btn" data-action="summarize">📝 Resumir</button><button class="ing-btn" data-action="comment">⚡ Comentar</button>`;
                    c.querySelectorAll('.ing-btn').forEach(b => {
                        // Strong blue colors as requested
                        b.style.cssText = 'background:#0a66c2;color:#fff;border:none;border-radius:16px;padding:6px 12px;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;transition:background 0.2s;';
                        b.onmouseenter = () => b.style.background = '#004182';
                        b.onmouseleave = () => b.style.background = '#0a66c2';
                        b.onclick = (e) => { e.stopPropagation(); doAction(post, b.dataset.action, b); };
                    });
                    bar.appendChild(c);
                }
            }
        });

        // PENCIL - only ONE per Responder
        document.querySelectorAll('button, span').forEach(el => {
            if (done.has(el)) return;
            const t = el.innerText?.toLowerCase().trim();
            if (t === 'responder' || t === 'reply') {
                done.add(el);
                // STRICT CHECK: Check parent for existing pencil
                if (el.parentElement?.querySelector('.ing-pencil')) return;

                const comment = el.closest('.comments-comment-item, [class*="comment"]');
                const p = document.createElement('span');
                p.className = 'ing-pencil';
                p.innerHTML = '✏️'; // Emoji is naturally "strong color"
                // No opacity, fully visible constant
                p.style.cssText = 'cursor:pointer;margin-left:8px;font-size:16px;filter:drop-shadow(0 1px 1px rgba(0,0,0,0.1));';
                p.onclick = (e) => {
                    e.stopPropagation();
                    // Get comment text
                    const txt = comment?.querySelector('[class*="main-content"],[class*="comment-text"]')?.innerText || comment?.innerText?.split('\n').find(l => l.length > 20) || '';
                    if (!txt) { alert('No encontré texto'); return; }
                    doReply(txt, p, el, comment);
                };
                el.after(p);
            }
        });
    }

    async function doAction(post, action, btn) {
        const key = (await chrome.storage.sync.get('licenseKey')).licenseKey;
        if (!key) { alert('Configura tu licencia'); return; }

        const txt = post?.querySelector('.update-components-text,.feed-shared-text-view')?.innerText || post?.innerText?.substring(0, 500) || '';
        if (!txt) { alert('No encontré texto'); return; }

        const originalText = btn.innerHTML;
        btn.innerHTML = '⏳';
        const prompt = action === 'summarize' ? `Resume: ${txt}` : `Comenta profesionalmente: ${txt}`;

        chrome.runtime.sendMessage({ action: 'generate_comment', licenseKey: key, prompt }, r => {
            btn.innerHTML = originalText;
            if (r?.success) modal(r.result, action === 'comment', null, post); // Pass post container
            else alert(r?.error || 'Error');
        });
    }

    async function doReply(txt, btn, respBtn, commentContainer) {
        const key = (await chrome.storage.sync.get('licenseKey')).licenseKey;
        if (!key) { alert('Configura tu licencia'); return; }

        btn.innerHTML = '⏳';
        const prompt = `Responde cordialmente a: "${txt}"`;

        chrome.runtime.sendMessage({ action: 'generate_comment', licenseKey: key, prompt }, r => {
            btn.innerHTML = '✏️';
            if (r?.success) modal(r.result, true, respBtn, commentContainer); // Pass reply button and container
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
                // Determine insertion target
                if (respBtn) {
                    // REPLY MODE
                    respBtn.click(); // Ensure reply box is open
                } else {
                    // MAIN COMMENT MODE
                    // Try to find the main comment button if needed, but usually the box is at the bottom or we focus the main editor
                    // If 'container' is the post, look for the main comment box inside it
                    const mainCommentBtn = container?.querySelector('button[aria-label*="Comentar"], button[class*="comment-button"]');
                    if (mainCommentBtn) mainCommentBtn.click();
                }

                // Wait for LinkedIn to render the editor
                setTimeout(() => {
                    let ed;
                    if (respBtn && container) {
                        // Look for editor CLOSEST to the comment container (Reply box)
                        // The reply box usually appears inside the comment component or slightly after it
                        ed = container.parentElement?.querySelector('.ql-editor[contenteditable="true"]') ||
                            container.querySelector('.ql-editor[contenteditable="true"]');
                        if (!ed) {
                            // Fallback: search globally for the last active one? No, too risky.
                            // LinkedIn structure: .comments-comment-item -> .comments-comment-box__reply-container -> .ql-editor
                            ed = container.closest('article')?.querySelector('.ql-editor[contenteditable="true"]'); // Broad search scoped to post?
                        }
                    } else if (container) {
                        // Main post comment box
                        ed = container.querySelector('.ql-editor[contenteditable="true"]');
                    }

                    // If improved scoping failed, fallback to the last focused editor
                    if (!ed) {
                        const editors = document.querySelectorAll('.ql-editor[contenteditable="true"]');
                        ed = editors[editors.length - 1];
                    }

                    if (ed) {
                        ed.innerHTML = `<p>${text}</p>`;
                        ed.focus();
                        // Trigger input events so LinkedIn detects change
                        ed.dispatchEvent(new Event('input', { bubbles: true }));
                        ed.dispatchEvent(new Event('focus', { bubbles: true }));
                    } else {
                        // Last resort
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
