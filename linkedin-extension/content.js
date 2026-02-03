// IngenIA ULTRA MINIMAL DEBUG VERSION
console.log('[IngenIA] ====== EXTENSION LOADED ======');

// Run immediately and every 2 seconds
scan();
setInterval(scan, 2000);

function scan() {
    console.log('[IngenIA] Scanning...');

    // === BRUTE FORCE: Find ANY element with text "Recomendar" or "Like" ===
    const allElements = document.querySelectorAll('*');
    let foundPosts = 0;
    let foundComments = 0;

    allElements.forEach(el => {
        const text = el.innerText?.toLowerCase().trim();

        // Skip if already processed
        if (el.dataset.ingDone) return;

        // FIND "Recomendar" button for POSTS
        if ((text === 'recomendar' || text === 'like') && !el.closest('.comments-comment-item')) {
            // This is likely a post action button
            const parent = el.parentElement;
            if (parent && !parent.querySelector('.ing-btn-container')) {
                el.dataset.ingDone = 'true';
                foundPosts++;

                const container = document.createElement('span');
                container.className = 'ing-btn-container';
                container.style.cssText = 'display:inline-flex;gap:8px;margin-left:12px;';
                container.innerHTML = `
                    <button class="ing-btn-sum" style="background:#0a66c2;color:#fff;border:none;border-radius:16px;padding:6px 14px;font-weight:600;cursor:pointer;font-size:13px;">📝 Resumir</button>
                    <button class="ing-btn-com" style="background:#0a66c2;color:#fff;border:none;border-radius:16px;padding:6px 14px;font-weight:600;cursor:pointer;font-size:13px;">⚡ Comentar</button>
                `;

                // Find the closest post for context
                const post = el.closest('article') || el.closest('[data-urn]') || el.closest('.feed-shared-update-v2');

                container.querySelector('.ing-btn-sum').onclick = (e) => {
                    e.stopPropagation();
                    handleAction(post, 'summarize', e.target);
                };
                container.querySelector('.ing-btn-com').onclick = (e) => {
                    e.stopPropagation();
                    handleAction(post, 'comment', e.target);
                };

                parent.appendChild(container);
                console.log('[IngenIA] Added post buttons to:', el);
            }
        }

        // FIND "Responder" button for COMMENTS
        if ((text === 'responder' || text === 'reply')) {
            const comment = el.closest('.comments-comment-item') || el.closest('[class*="comment-item"]') || el.closest('[class*="comment"]');
            if (comment && !el.nextElementSibling?.classList?.contains('ing-pencil')) {
                el.dataset.ingDone = 'true';
                foundComments++;

                const pencil = document.createElement('span');
                pencil.className = 'ing-pencil';
                pencil.innerHTML = '✏️';
                pencil.style.cssText = 'cursor:pointer;margin-left:8px;font-size:16px;';
                pencil.onclick = (e) => {
                    e.stopPropagation();
                    handleAction(comment, 'reply', pencil);
                };

                el.after(pencil);
                console.log('[IngenIA] Added pencil to:', el);
            }
        }
    });

    console.log(`[IngenIA] Found: ${foundPosts} post buttons, ${foundComments} comment pencils`);
}

async function handleAction(context, type, btn) {
    console.log('[IngenIA] handleAction called:', type);

    // Check chrome API
    if (typeof chrome === 'undefined' || !chrome?.storage?.sync) {
        alert('Error: Extension context lost. Refresh the page.');
        console.error('[IngenIA] Chrome API not available');
        return;
    }

    let key;
    try {
        const data = await chrome.storage.sync.get(['licenseKey']);
        key = data.licenseKey;
    } catch (e) {
        alert('Error accessing storage: ' + e.message);
        return;
    }

    if (!key) {
        alert('Please configure your license key in the extension popup.');
        return;
    }

    // Get text from context
    let txt = '';
    if (context) {
        const textEl = context.querySelector('.update-components-text, .feed-shared-text, [class*="comment-text"], [class*="main-content"]');
        txt = textEl?.innerText?.trim() || context.innerText?.substring(0, 500)?.trim() || '';
    }

    if (!txt || txt.length < 5) {
        alert('Could not find text to process.');
        return;
    }

    // Show loading
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '⏳';
    btn.disabled = true;

    // Build prompt
    let prompt = type === 'summarize'
        ? `Resume brevemente: ${txt}`
        : type === 'reply'
            ? `Responde cordialmente a: "${txt}"`
            : `Comenta profesionalmente: ${txt}`;

    // Call background
    chrome.runtime.sendMessage({ action: 'generate_comment', licenseKey: key, prompt }, (response) => {
        btn.innerHTML = originalHTML;
        btn.disabled = false;

        if (chrome.runtime.lastError) {
            alert('Error: ' + chrome.runtime.lastError.message);
            return;
        }

        if (response?.success) {
            showResult(response.result, context, type);
        } else {
            alert('Error: ' + (response?.error || 'Unknown error'));
        }
    });
}

function showResult(text, context, type) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:999999;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
        <div style="background:#fff;padding:24px;border-radius:12px;max-width:550px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,.3);">
            <h3 style="margin:0 0 16px;color:#333;">Resultado IngenIA</h3>
            <div style="background:#f5f5f5;padding:16px;border-radius:8px;max-height:300px;overflow:auto;margin-bottom:20px;white-space:pre-wrap;">${text}</div>
            <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button id="ing-insert" style="background:#0a66c2;color:#fff;border:none;padding:10px 20px;border-radius:20px;cursor:pointer;font-weight:600;">📥 Insertar</button>
                <button id="ing-copy" style="background:#fff;color:#0a66c2;border:2px solid #0a66c2;padding:10px 20px;border-radius:20px;cursor:pointer;font-weight:600;">📋 Copiar</button>
                <button id="ing-close" style="background:#f0f0f0;color:#333;border:none;padding:10px 20px;border-radius:20px;cursor:pointer;font-weight:600;">Cerrar</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#ing-close').onclick = () => overlay.remove();
    overlay.querySelector('#ing-copy').onclick = () => {
        navigator.clipboard.writeText(text);
        overlay.querySelector('#ing-copy').textContent = '✓ Copiado';
    };

    overlay.querySelector('#ing-insert').onclick = () => {
        // Find reply button and click it if reply mode
        if (type === 'reply' && context) {
            const replyBtn = Array.from(context.querySelectorAll('button, span')).find(
                el => (el.innerText || '').toLowerCase().includes('responder') || (el.innerText || '').toLowerCase().includes('reply')
            );
            if (replyBtn) replyBtn.click();
        }

        setTimeout(() => {
            const editor = document.querySelector('.ql-editor[contenteditable="true"]') ||
                document.querySelector('div[contenteditable="true"]');
            if (editor) {
                editor.innerHTML = `<p>${text}</p>`;
                editor.focus();
                editor.dispatchEvent(new Event('input', { bubbles: true }));
            } else {
                navigator.clipboard.writeText(text);
                alert('Texto copiado (no pude encontrar el editor)');
            }
            overlay.remove();
        }, 600);
    };

    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}

console.log('[IngenIA] Script initialized successfully');
