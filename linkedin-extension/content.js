// IngenIA V19 - PROPER POST vs COMMENT DISTINCTION
console.log("🚀 IngenIA V19: Context-Aware Injection");

// Banner
const banner = document.createElement('div');
banner.innerText = "✅ V19";
banner.style.cssText = "position:fixed; top:10px; right:10px; background:lime; color:black; padding:4px 8px; z-index:999999; border-radius:4px; font-weight:bold; font-size:11px;";
document.body.appendChild(banner);
setTimeout(() => banner.remove(), 3000);

const done = new WeakSet();

setInterval(inject, 600);

function inject() {
    // =================================================================
    // 1. POSTS: Find "Recomendar" that is NOT inside a comment
    //    -> Add Resumir + Comentar buttons
    // =================================================================
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);

    while (walker.nextNode()) {
        const node = walker.currentNode;
        const txt = node.textContent.trim();
        const parent = node.parentElement;

        if (!parent || done.has(parent)) continue;

        // --- POST BUTTONS (Only on main posts, NOT comments) ---
        if (txt === 'Recomendar' || txt === 'Like') {
            // CHECK: Is this inside a comment? If YES, skip (comments get pencil only)
            const isInComment = parent.closest('.comments-comment-item') ||
                parent.closest('.comments-comment-entity') ||
                parent.closest('[class*="comment-item"]');

            if (isInComment) continue; // SKIP - this is comment's Recomendar

            done.add(parent);

            // Find action bar container (go up to the flex row)
            const row = parent.closest('ul') || parent.closest('[class*="action-bar"]') || parent.parentElement?.parentElement;
            if (!row || row.querySelector('.ing-btns')) continue;

            // Create buttons
            const group = document.createElement('span');
            group.className = 'ing-btns';
            group.style.cssText = 'display:inline-flex; align-items:center; margin-left:10px;';
            group.innerHTML = `
                <button class="ing-s" style="background:#0a66c2; color:white; border:none; border-radius:16px; padding:6px 14px; margin-right:6px; font-weight:600; font-size:13px; cursor:pointer; display:flex; align-items:center; gap:4px;">📝 Resumir</button>
                <button class="ing-c" style="background:#0a66c2; color:white; border:none; border-radius:16px; padding:6px 14px; font-weight:600; font-size:13px; cursor:pointer; display:flex; align-items:center; gap:4px;">⚡ Comentar</button>
            `;

            // Find the POST container for text extraction
            const post = row.closest('.feed-shared-update-v2') ||
                row.closest('article') ||
                row.closest('[data-urn]') ||
                row.closest('.occludable-update');

            group.querySelector('.ing-s').onclick = e => { e.stopPropagation(); runPost(post, 'summarize', e.target); };
            group.querySelector('.ing-c').onclick = e => { e.stopPropagation(); runPost(post, 'comment', e.target); };

            row.appendChild(group);
        }

        // --- COMMENT PENCIL (Only on "Responder" buttons) ---
        if (txt === 'Responder' || txt === 'Reply') {
            // Find the comment container
            const comment = parent.closest('.comments-comment-item') ||
                parent.closest('.comments-comment-entity') ||
                parent.closest('article');

            if (!comment) continue;

            done.add(parent);

            // Check no duplicate pencil
            if (parent.parentElement.querySelector('.ing-pencil')) continue;

            const pencil = document.createElement('span');
            pencil.className = 'ing-pencil';
            pencil.innerText = '✏️';
            pencil.title = 'Generar respuesta';
            pencil.style.cssText = 'cursor:pointer; font-size:16px; margin-left:8px; vertical-align:middle;';
            pencil.onclick = e => { e.stopPropagation(); runComment(comment, pencil); };

            // Insert after the Responder button/span
            parent.after(pencil);
        }
    }
}

// --- POST ACTION ---
async function runPost(post, type, btn) {
    if (!chrome?.storage?.sync) return alert("Recarga la página");
    const { licenseKey } = await chrome.storage.sync.get('licenseKey');
    if (!licenseKey) return alert("Configura tu licencia");

    // TEXT EXTRACTION (Aggressive)
    let txt = '';
    if (post) {
        // Clone and clean
        const clone = post.cloneNode(true);
        // Remove action bars, comments, buttons
        clone.querySelectorAll('button, .comments-comments-list, .feed-shared-social-action-bar, [class*="action-bar"]').forEach(n => n.remove());
        txt = clone.innerText.trim().substring(0, 1500);
    }

    // Fallback: Get text from visible area if post not found
    if (!txt || txt.length < 10) {
        const visiblePost = document.querySelector('.feed-shared-update-v2');
        if (visiblePost) {
            const c = visiblePost.cloneNode(true);
            c.querySelectorAll('button').forEach(n => n.remove());
            txt = c.innerText.substring(0, 1000);
        }
    }

    if (!txt || txt.length < 10) {
        alert("No encontré texto del post. Haz scroll para cargarlo.");
        return;
    }

    const prompt = type === 'summarize'
        ? `Resume brevemente este post de LinkedIn:\n\n${txt}`
        : `Escribe un comentario profesional para este post:\n\n${txt}`;

    sendToAI(prompt, licenseKey, btn, post);
}

// --- COMMENT ACTION ---
async function runComment(comment, btn) {
    if (!chrome?.storage?.sync) return alert("Recarga la página");
    const { licenseKey } = await chrome.storage.sync.get('licenseKey');
    if (!licenseKey) return alert("Configura tu licencia");

    // TEXT from comment
    let txt = '';

    // Try specific selectors first
    const textEl = comment.querySelector('.comments-comment-item__main-content') ||
        comment.querySelector('[class*="comment-text"]') ||
        comment.querySelector('span[dir="ltr"]');

    if (textEl) {
        txt = textEl.innerText.trim();
    } else {
        // Fallback: clone and strip
        const clone = comment.cloneNode(true);
        clone.querySelectorAll('button, img, [class*="profile"]').forEach(n => n.remove());
        txt = clone.innerText.trim().substring(0, 500);
    }

    if (!txt || txt.length < 5) {
        alert("No encontré texto del comentario.");
        return;
    }

    const prompt = `Responde profesionalmente a este comentario de LinkedIn:\n\n"${txt}"`;

    sendToAI(prompt, licenseKey, btn, comment);
}

// --- AI CALL ---
function sendToAI(prompt, licenseKey, btn, context) {
    const orig = btn.innerText || btn.innerHTML;
    btn.innerHTML = '⏳';

    chrome.runtime.sendMessage({ action: 'generate_comment', licenseKey, prompt }, r => {
        btn.innerHTML = orig;
        if (r?.success) showModal(r.result, context);
        else alert(r?.error || 'Error al generar');
    });
}

// --- MODAL UI ---
function showModal(text, context) {
    document.getElementById('ing-modal')?.remove();

    const ov = document.createElement('div');
    ov.id = 'ing-modal';
    ov.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:999999; display:flex; justify-content:center; align-items:center; font-family:-apple-system,sans-serif;';

    ov.innerHTML = `
        <div style="background:white; padding:24px; border-radius:12px; width:520px; max-width:92%; box-shadow:0 8px 30px rgba(0,0,0,0.25);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <h3 style="margin:0; font-size:18px; color:#333;">✨ Resultado IngenIA</h3>
                <span id="close-x" style="cursor:pointer; font-size:22px; color:#999;">×</span>
            </div>
            <textarea id="ing-text" style="width:100%; height:130px; padding:12px; border:1px solid #ddd; border-radius:8px; font-size:14px; line-height:1.5; resize:vertical; margin-bottom:18px;">${text}</textarea>
            <div style="display:flex; gap:10px; justify-content:flex-end;">
                <button id="b-copy" style="padding:10px 20px; border:1px solid #0a66c2; background:white; color:#0a66c2; border-radius:24px; font-weight:600; cursor:pointer;">📋 Copiar</button>
                <button id="b-insert" style="padding:10px 24px; border:none; background:#0a66c2; color:white; border-radius:24px; font-weight:600; cursor:pointer;">📥 Insertar</button>
            </div>
        </div>
    `;

    document.body.appendChild(ov);

    const close = () => ov.remove();
    ov.querySelector('#close-x').onclick = close;
    ov.onclick = e => { if (e.target === ov) close(); };

    ov.querySelector('#b-copy').onclick = () => {
        navigator.clipboard.writeText(ov.querySelector('#ing-text').value);
        ov.querySelector('#b-copy').innerHTML = '✓ Copiado';
    };

    ov.querySelector('#b-insert').onclick = () => {
        insertText(ov.querySelector('#ing-text').value, context);
        close();
    };
}

function insertText(text, context) {
    // Find or open editor
    let ed = document.querySelector('.ql-editor[contenteditable="true"]');

    if (!ed && context) {
        // Click Responder/Comentar to open
        const trigger = [...context.querySelectorAll('button, span')].find(b => {
            const t = (b.innerText || '').toLowerCase();
            return t.includes('responder') || t.includes('comentar');
        });
        if (trigger) {
            trigger.click();
            setTimeout(() => {
                ed = document.querySelector('.ql-editor[contenteditable="true"]') || document.activeElement;
                if (ed && ed.isContentEditable) {
                    ed.focus();
                    document.execCommand('insertText', false, text);
                } else {
                    navigator.clipboard.writeText(text);
                    alert('Copiado (abre el editor manualmente)');
                }
            }, 600);
            return;
        }
    }

    if (ed) {
        ed.focus();
        document.execCommand('insertText', false, text);
    } else {
        navigator.clipboard.writeText(text);
    }
}
