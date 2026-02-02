// IngenIA v4 - SIMPLIFIED
(function () {
    console.log('[IngenIA] v4');

    const done = new Set();

    setInterval(scan, 2000);
    setTimeout(scan, 500);

    function scan() {
        // POST BUTTONS
        document.querySelectorAll('button, span').forEach(el => {
            const t = el.innerText?.toLowerCase().trim();
            if ((t === 'recomendar' || t === 'like') && !done.has(el)) {
                done.add(el);
                const bar = el.closest('[class*="social-action"]') || el.parentElement?.parentElement;
                if (bar && !bar.querySelector('.ing-btn')) {
                    const post = bar.closest('[data-urn], .feed-shared-update-v2, article');
                    const c = document.createElement('div');
                    c.style.cssText = 'display:inline-flex;gap:6px;margin-left:12px;';
                    c.innerHTML = `<button class="ing-btn" data-action="summarize">📝 Resumir</button><button class="ing-btn" data-action="comment">⚡ Comentar</button>`;
                    c.querySelectorAll('.ing-btn').forEach(b => {
                        b.style.cssText = 'background:#0a66c2;color:#fff;border:none;border-radius:12px;padding:4px 10px;font-size:12px;font-weight:600;cursor:pointer;';
                        b.onclick = (e) => { e.stopPropagation(); doAction(post, b.dataset.action, b); };
                    });
                    bar.appendChild(c);
                }
            }
        });

        // PENCIL - only ONE per Responder
        document.querySelectorAll('button, span').forEach(el => {
            const t = el.innerText?.toLowerCase().trim();
            if ((t === 'responder' || t === 'reply') && !done.has(el)) {
                done.add(el);
                // Check no pencil already in parent
                if (el.parentElement?.querySelector('.ing-pencil')) return;

                const comment = el.closest('.comments-comment-item, [class*="comment"]');
                const p = document.createElement('span');
                p.className = 'ing-pencil';
                p.innerHTML = '✏️';
                p.style.cssText = 'cursor:pointer;margin-left:6px;opacity:0.6;';
                p.onmouseenter = () => p.style.opacity = '1';
                p.onmouseleave = () => p.style.opacity = '0.6';
                p.onclick = (e) => {
                    e.stopPropagation();
                    // Get comment text
                    const txt = comment?.querySelector('[class*="main-content"],[class*="comment-text"]')?.innerText || comment?.innerText?.split('\n').find(l => l.length > 20) || '';
                    if (!txt) { alert('No encontré texto'); return; }
                    doReply(txt, p, el);
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

        btn.innerHTML = '⏳';
        const prompt = action === 'summarize' ? `Resume: ${txt}` : `Comenta profesionalmente: ${txt}`;

        chrome.runtime.sendMessage({ action: 'generate_comment', licenseKey: key, prompt }, r => {
            btn.innerHTML = action === 'summarize' ? '📝 Resumir' : '⚡ Comentar';
            if (r?.success) modal(r.result, action === 'comment');
            else alert(r?.error || 'Error');
        });
    }

    async function doReply(txt, btn, respBtn) {
        const key = (await chrome.storage.sync.get('licenseKey')).licenseKey;
        if (!key) { alert('Configura tu licencia'); return; }

        btn.innerHTML = '⏳';
        const prompt = `Responde cordialmente a: "${txt}"`;

        chrome.runtime.sendMessage({ action: 'generate_comment', licenseKey: key, prompt }, r => {
            btn.innerHTML = '✏️';
            if (r?.success) modal(r.result, true, respBtn);
            else alert(r?.error || 'Error');
        });
    }

    function modal(text, showInsert, respBtn) {
        const o = document.createElement('div');
        o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:999999;display:flex;align-items:center;justify-content:center;';
        o.innerHTML = `
            <div style="background:#fff;padding:24px;border-radius:12px;max-width:550px;width:90%;">
                <h3 style="margin:0 0 16px;">Resultado IngenIA</h3>
                <div style="background:#f5f5f5;padding:14px;border-radius:8px;font-size:15px;line-height:1.6;max-height:300px;overflow:auto;">${text}</div>
                <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;">
                    ${showInsert ? '<button id="ing-insert" style="background:#0a66c2;color:#fff;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:600;">📥 Insertar</button>' : ''}
                    <button id="ing-copy" style="background:#0a66c2;color:#fff;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:600;">📋 Copiar</button>
                    <button id="ing-close" style="background:#ddd;color:#333;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:600;">Cerrar</button>
                </div>
            </div>`;
        document.body.appendChild(o);

        o.querySelector('#ing-close').onclick = () => o.remove();
        o.querySelector('#ing-copy').onclick = () => {
            navigator.clipboard.writeText(text);
            o.querySelector('#ing-copy').textContent = '✓ Copiado';
        };

        const ins = o.querySelector('#ing-insert');
        if (ins) {
            ins.onclick = () => {
                // Click Responder first if provided
                if (respBtn) respBtn.click();

                // Wait and find the editor
                setTimeout(() => {
                    const editors = document.querySelectorAll('.ql-editor[contenteditable="true"]');
                    const ed = editors[editors.length - 1]; // Last opened
                    if (ed) {
                        ed.innerHTML = `<p>${text}</p>`;
                        ed.focus();
                        ed.dispatchEvent(new Event('input', { bubbles: true }));
                    } else {
                        navigator.clipboard.writeText(text);
                    }
                    o.remove();
                }, 800);
            };
        }

        o.onclick = (e) => { if (e.target === o) o.remove(); };
    }
})();
