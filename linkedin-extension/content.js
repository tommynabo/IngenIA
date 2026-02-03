// IngenIA V17 - REDUNDANT FALLBACKS (The "Unmissable" Version)
console.log("🚀 IngenIA V17: Kitchen Sink Strategy [Green Banner]");

// --- 1. VISUAL DIAGNOSTIC ---
const status = document.createElement('div');
status.innerText = "IngenIA V17: ONLINE";
status.style.cssText = "position:fixed; top:10px; right:10px; background:#00ff00; color:black; padding:4px 8px; z-index:999999; border-radius:4px; font-weight:bold; font-family:sans-serif; pointer-events:none;";
document.body.appendChild(status);
setTimeout(() => status.remove(), 5000);

const PROCESSED = new WeakSet();

// --- 2. AGGRESSIVE POLLING ---
setInterval(scan, 800); // Fast check

function scan() {
    // =========================================================================
    // POST BUTTONS (Multiple Strategies)
    // Goal: Identify the Action Bar (Like/Comment/Send) and append buttons
    // =========================================================================

    // Strategy A: Class Selectors (Standard)
    const classBars = document.querySelectorAll('.feed-shared-social-action-bar, .social-actions-bar, .comment-social-bar');

    // Strategy B: Text Search (Brute Force Fallback)
    // Only search divs if we haven't found enough via classes, or just do both safe

    const allCandidates = [...classBars];

    // Scan all candidate action bars
    allCandidates.forEach(bar => {
        if (PROCESSED.has(bar)) return;

        // Validation: Must look like an action bar
        const txt = bar.innerText;
        // Check for specific Spanish or English keywords for the main buttons
        const isActionBar = (txt.includes('Recomendar') || txt.includes('Like')) &&
            (txt.includes('Comentar') || txt.includes('Comment'));

        if (!isActionBar) return;

        // Skip if it's a comment's action bar (which has Responder/Reply)
        // UNLESS we want to support nested posts, but usually main posts don't have Responder in the main bar
        if (txt.includes('Responder') || txt.includes('Reply')) return;

        PROCESSED.add(bar);
        injectPostButtons(bar);
    });

    // =========================================================================
    // COMMENT PENCILS (Multiple Strategies)
    // Goal: Find "Responder" button and append pencil
    // =========================================================================

    const buttons = document.querySelectorAll('button, span[role="button"], .artdeco-button');

    buttons.forEach(btn => {
        if (PROCESSED.has(btn)) return;

        const t = (btn.innerText || '').toLowerCase().trim();
        // Strict Match
        if (t === 'responder' || t === 'reply') {

            // Verify context (must be near a comment)
            const comment = btn.closest('.comments-comment-item') ||
                btn.closest('article') ||
                btn.closest('[data-type="comment"]');

            if (!comment) return;

            PROCESSED.add(btn);
            injectPencil(btn, comment);
        }
    });
}

function injectPostButtons(container) {
    if (container.querySelector('.ingenia-group')) return;

    const group = document.createElement('div');
    group.className = 'ingenia-group';
    group.style.cssText = "display: inline-flex; align-items: center; margin-left: auto; padding-right: 10px;"; // Push to right or sit inline

    // If container is flex, simple append works. If grid, might need adjustment.
    // Defaulting to simple append which works for Flex (LinkedIn default)

    // FLAT BUTTONS
    const btnS = createFlatBtn('📝 Resumir', () => run(container, 'summarize', btnS));
    const btnC = createFlatBtn('⚡ Comentar', () => run(container, 'comment', btnC));

    group.append(btnS, btnC);

    // Try to ensure it's visible. LinkedIn bars usually have 4 items.
    container.appendChild(group);
}

function injectPencil(targetBtn, commentContext) {
    // Check if pencil exists nearby
    if (targetBtn.parentElement.querySelector('.ing-pencil')) return;

    const pencil = document.createElement('span');
    pencil.className = 'ing-pencil';
    pencil.innerText = '✏️';
    // Forced visibility styles
    pencil.style.cssText = "display:inline-block; cursor:pointer; font-size:16px; margin-left:8px; vertical-align:middle; z-index:10; position:relative;";

    pencil.onclick = (e) => {
        e.preventDefault(); e.stopPropagation();
        run(commentContext, 'reply', pencil);
    };

    // Insertion Strategy:
    // 1. If parent is a flex container (action bar), append
    // 2. Otherwise insertAfter
    if (getComputedStyle(targetBtn.parentElement).display === 'flex') {
        targetBtn.parentElement.appendChild(pencil);
    } else {
        targetBtn.after(pencil);
    }
}


function createFlatBtn(txt, cb) {
    const b = document.createElement('button');
    b.innerText = txt;
    b.style.cssText = "background:#0a66c2; color:white; border:none; border-radius:4px; padding:4px 12px; margin-left:6px; font-weight:600; font-size:13px; cursor:pointer;";
    b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); cb(); };
    return b;
}

// --- RUNNER & UI ---
async function run(context, type, btn) {
    if (!chrome?.storage?.sync) return alert("Recarga la página");
    const k = await chrome.storage.sync.get('licenseKey');
    if (!k.licenseKey) return alert("Falta licencia");

    // Text Extraction
    let txt = '';
    // Go up to the post/comment root
    const root = context.closest('.feed-shared-update-v2') || context.closest('article') || context.closest('.comments-comment-item') || context.parentElement;

    if (root) {
        const clone = root.cloneNode(true);
        // Nuke noise
        clone.querySelectorAll('button, .video-player, .comments-comment-list, .feed-shared-social-action-bar').forEach(n => n.remove());
        txt = clone.innerText;
    } else {
        txt = document.body.innerText.substring(0, 500); // Fail safe
    }

    if (!txt || txt.length < 5) return alert("No encontré texto");

    const prompt = type === 'summarize' ? `Resume: ${txt}` : `Responde/Comenta: ${txt}`;
    const old = btn.innerText;
    btn.innerText = "⏳";

    chrome.runtime.sendMessage({ action: 'generate_comment', licenseKey: k.licenseKey, prompt }, r => {
        btn.innerText = old;
        if (r?.success) showSmartModal(r.result, root);
        else alert(r?.error || "Error");
    });
}

function showSmartModal(text, context) {
    const old = document.getElementById('ing-modal-v17');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'ing-modal-v17';
    overlay.style.cssText = "position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:999999; display:flex; justify-content:center; align-items:center; font-family:sans-serif;";

    const modal = document.createElement('div');
    modal.style.cssText = "background:white; width:550px; max-width:90%; border-radius:12px; padding:20px; box-shadow:0 10px 40px rgba(0,0,0,0.3);";

    modal.innerHTML = `
        <h3 style="margin-top:0; color:#333;">Resultado</h3>
        <textarea id="ing-area" style="width:100%; height:120px; padding:10px; border:1px solid #ccc; border-radius:8px; font-family:inherit; margin-bottom:15px;">${text}</textarea>
        <div style="text-align:right; gap:10px; display:flex; justify-content:flex-end;">
            <button id="ing-copy" style="padding:8px 16px; border:1px solid #0a66c2; background:white; color:#0a66c2; border-radius:20px; cursor:pointer;">Copiar</button>
            <button id="ing-insert" style="padding:8px 16px; border:none; background:#0a66c2; color:white; border-radius:20px; cursor:pointer;">Insertar</button>
            <button id="ing-close" style="padding:8px 16px; border:none; background:#eee; color:#333; border-radius:20px; cursor:pointer;">Cerrar</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    modal.querySelector('#ing-close').onclick = close;

    modal.querySelector('#ing-copy').onclick = () => {
        navigator.clipboard.writeText(text);
        modal.querySelector('#ing-copy').innerText = "Copiado!";
    };

    modal.querySelector('#ing-insert').onclick = () => {
        if (context) insertText(text, context);
        else {
            navigator.clipboard.writeText(text);
            alert("Copiado (no encontré el editor)");
        }
        close();
    };

    overlay.onclick = (e) => { if (e.target === overlay) close(); };
}

function insertText(text, context) {
    // Try to find open editor
    let editor = context.querySelector('.ql-editor') || context.querySelector('[contenteditable="true"]');

    if (!editor) {
        // Find reply/comment button to open it
        const trigger = Array.from(context.querySelectorAll('button')).find(b => {
            const t = b.innerText.toLowerCase();
            return t.includes('responder') || t.includes('reply') || t.includes('comentar');
        });
        if (trigger) {
            trigger.click();
            setTimeout(() => {
                const fresh = context.querySelector('.ql-editor') || context.querySelector('[contenteditable="true"]') || document.activeElement;
                if (fresh) safeWrite(fresh, text);
            }, 600);
            return;
        }
    }

    if (editor) safeWrite(editor, text);
    else navigator.clipboard.writeText(text);
}

function safeWrite(el, text) {
    el.focus();
    document.execCommand('insertText', false, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
}
