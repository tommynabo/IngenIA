// IngenIA v11 - FINAL FIX based on actual screenshot
console.log('[IngenIA] v11 Starting...');

const processedPosts = new WeakSet();
const processedComments = new WeakSet();

// Run once after page load, then periodically
setTimeout(scan, 1500);
setInterval(scan, 3000);

function scan() {
    addPostButtons();
    addCommentPencils();
}

// === POST BUTTONS - Only on the social counts line ===
function addPostButtons() {
    // Target: The line with "X personas más | X comentarios"
    // This is the social-details-social-counts container
    document.querySelectorAll('.social-details-social-counts, [class*="social-counts"]').forEach(countsBar => {
        // Get the parent post
        const post = countsBar.closest('.feed-shared-update-v2') ||
            countsBar.closest('[data-urn*="activity"]') ||
            countsBar.closest('article');

        if (!post || processedPosts.has(post)) return;

        // Check if buttons already exist
        if (countsBar.querySelector('.ing-post-btns')) return;

        processedPosts.add(post);

        // Create buttons
        const container = document.createElement('span');
        container.className = 'ing-post-btns';
        container.style.cssText = 'display:inline-flex;gap:8px;margin-left:16px;vertical-align:middle;';
        container.innerHTML = `
            <button class="ing-btn-sum" style="background:#0a66c2;color:#fff;border:none;border-radius:16px;padding:6px 14px;font-weight:600;cursor:pointer;font-size:13px;display:inline-flex;align-items:center;gap:4px;">📝 Resumir</button>
            <button class="ing-btn-com" style="background:#0a66c2;color:#fff;border:none;border-radius:16px;padding:6px 14px;font-weight:600;cursor:pointer;font-size:13px;display:inline-flex;align-items:center;gap:4px;">⚡ Comentar</button>
        `;

        container.querySelector('.ing-btn-sum').onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            handlePost(post, 'summarize', e.target);
        };

        container.querySelector('.ing-btn-com').onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            handlePost(post, 'comment', e.target);
        };

        countsBar.appendChild(container);
        console.log('[IngenIA] Added post buttons');
    });
}

// === COMMENT PENCILS - Only next to "Responder" ===
function addCommentPencils() {
    // Find all comment containers
    document.querySelectorAll('.comments-comment-item, .comments-comment-entity, [class*="comments-comment"]').forEach(comment => {
        if (processedComments.has(comment)) return;

        // Find the Responder button
        let responderBtn = null;
        comment.querySelectorAll('button, span').forEach(el => {
            const text = el.innerText?.trim().toLowerCase();
            if (text === 'responder' || text === 'reply') {
                responderBtn = el;
            }
        });

        if (!responderBtn) return;

        // Check if pencil already exists
        if (responderBtn.nextElementSibling?.classList?.contains('ing-pencil')) return;

        processedComments.add(comment);

        // Create pencil
        const pencil = document.createElement('span');
        pencil.className = 'ing-pencil';
        pencil.innerHTML = '✏️';
        pencil.title = 'Generar respuesta con IA';
        pencil.style.cssText = 'cursor:pointer;margin-left:8px;font-size:16px;';
        pencil.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            handleComment(comment, pencil);
        };

        responderBtn.after(pencil);
        console.log('[IngenIA] Added pencil to comment');
    });
}

// === HANDLE POST ACTION ===
async function handlePost(post, action, btn) {
    if (!chrome?.storage?.sync) {
        alert('Error: Recarga la página');
        return;
    }

    let key;
    try {
        key = (await chrome.storage.sync.get('licenseKey')).licenseKey;
    } catch (e) {
        alert('Error: ' + e.message);
        return;
    }

    if (!key) {
        alert('Configura tu licencia en la extensión');
        return;
    }

    // Find post text - use multiple selectors
    let txt = '';
    const textSelectors = [
        '.feed-shared-update-v2__description',
        '.update-components-text',
        '.feed-shared-text-view',
        '[class*="update-components-text"]',
        '.feed-shared-text'
    ];

    for (const sel of textSelectors) {
        const el = post.querySelector(sel);
        if (el?.innerText?.trim()) {
            txt = el.innerText.trim();
            break;
        }
    }

    // Fallback: get any text from post (excluding comments section)
    if (!txt) {
        const clone = post.cloneNode(true);
        // Remove comments from clone
        clone.querySelectorAll('.comments-comments-list, [class*="comments-list"]').forEach(c => c.remove());
        txt = clone.innerText?.substring(0, 800)?.trim() || '';
    }

    if (!txt || txt.length < 10) {
        alert('No encontré texto del post');
        return;
    }

    const orig = btn.innerHTML;
    btn.innerHTML = '⏳';
    btn.disabled = true;

    const prompt = action === 'summarize'
        ? `Resume brevemente en español: ${txt}`
        : `Escribe un comentario profesional para este post de LinkedIn: ${txt}`;

    chrome.runtime.sendMessage({ action: 'generate_comment', licenseKey: key, prompt }, (r) => {
        btn.innerHTML = orig;
        btn.disabled = false;

        if (chrome.runtime.lastError) {
            alert('Error: ' + chrome.runtime.lastError.message);
            return;
        }

        if (r?.success) {
            showModal(r.result, post, null);
        } else {
            alert(r?.error || 'Error al generar');
        }
    });
}

// === HANDLE COMMENT REPLY ===
async function handleComment(comment, pencil) {
    if (!chrome?.storage?.sync) {
        alert('Error: Recarga la página');
        return;
    }

    let key;
    try {
        key = (await chrome.storage.sync.get('licenseKey')).licenseKey;
    } catch (e) {
        alert('Error: ' + e.message);
        return;
    }

    if (!key) {
        alert('Configura tu licencia en la extensión');
        return;
    }

    // Find comment text
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
        alert('No encontré texto del comentario');
        return;
    }

    pencil.innerHTML = '⏳';

    const prompt = `Responde cordialmente a este comentario de LinkedIn: "${txt}"`;

    chrome.runtime.sendMessage({ action: 'generate_comment', licenseKey: key, prompt }, (r) => {
        pencil.innerHTML = '✏️';

        if (chrome.runtime.lastError) {
            alert('Error: ' + chrome.runtime.lastError.message);
            return;
        }

        if (r?.success) {
            showModal(r.result, comment, true);
        } else {
            alert(r?.error || 'Error al generar');
        }
    });
}

// === MODAL ===
function showModal(text, context, isReply) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:999999;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
        <div style="background:#fff;padding:24px;border-radius:12px;max-width:550px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,.3);">
            <h3 style="margin:0 0 16px;color:#333;font-size:18px;">Resultado IngenIA</h3>
            <div style="background:#f5f5f5;padding:16px;border-radius:8px;max-height:300px;overflow:auto;margin-bottom:20px;white-space:pre-wrap;font-size:14px;line-height:1.6;">${text}</div>
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
        overlay.querySelector('#ing-copy').innerHTML = '✓ Copiado';
    };

    overlay.querySelector('#ing-insert').onclick = () => {
        // If reply, click the Responder button first
        if (isReply && context) {
            const respBtn = Array.from(context.querySelectorAll('button, span')).find(
                el => ['responder', 'reply'].includes(el.innerText?.trim().toLowerCase())
            );
            if (respBtn) respBtn.click();
        }

        setTimeout(() => {
            const editor = document.querySelector('.ql-editor[contenteditable="true"]') ||
                document.activeElement;

            if (editor?.isContentEditable) {
                editor.innerHTML = `<p>${text}</p>`;
                editor.focus();
                editor.dispatchEvent(new Event('input', { bubbles: true }));
            } else {
                navigator.clipboard.writeText(text);
                alert('Texto copiado (no encontré el editor)');
            }
            overlay.remove();
        }, 600);
    };

    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}

console.log('[IngenIA] v11 Loaded successfully');
