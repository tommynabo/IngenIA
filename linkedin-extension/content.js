// IngenIA V16 - UI POLISH & PRECISION
console.log("🚀 IngenIA V16: UI Refined [Yellow Banner Active]");

// --- 1. VISUAL CHECK (Diagnostic) ---
const status = document.createElement('div');
status.innerText = "IngenIA V16: ONLINE";
status.style.cssText = "position:fixed; top:10px; right:10px; background:#00ff00; color:black; padding:4px 8px; z-index:999999; border-radius:4px; font-weight:bold; font-family:sans-serif; font-size:10px; opacity:0.8; pointer-events:none;";
document.body.appendChild(status);
setTimeout(() => status.remove(), 5000);

// --- 2. CONFIG ---
const PROCESSED = new WeakSet();

// --- 3. LOOP ---
setInterval(scan, 1000);

function scan() {
    // === A. POST BUTTONS (Small Rectangular Only) ===
    // User wants ONLY the small buttons next to Recomendar/Comentar action bar.
    // NOT the big ones at the top.

    // We look for the social action bar container
    const divs = document.querySelectorAll('.feed-shared-social-action-bar, .social-actions-bar, .comment-social-bar');

    divs.forEach(div => {
        if (PROCESSED.has(div)) return;

        // Validation: Must contain "Recomendar" or "Like" to be a valid bar
        if (!div.innerText.match(/Recomendar|Like|Gustar/i)) {
            // If it doesn't have these, it's not the main action bar
            return;
        }

        // Avoid Comment Action Bars (which have Reply/Responder)
        if (div.innerText.match(/Responder|Reply/i)) return;

        PROCESSED.add(div);

        // Inject Cluster
        const group = document.createElement('div');
        group.className = 'ingenia-group';
        group.style.cssText = "display: inline-flex; align-items: center; margin-left: 8px;";

        // "Flat/Rectangular" style requested
        const btnS = createFlatBtn('📝 Resumir', () => run(div, 'summarize', btnS));
        const btnC = createFlatBtn('⚡ Comentar', () => run(div, 'comment', btnC));

        group.append(btnS, btnC);
        div.appendChild(group);
    });

    // === B. COMMENT PENCILS (Fix Visibility) ===
    // Strategy: Find EVERY 'Responder' button and append pencil directly
    const buttons = document.querySelectorAll('button, span[role="button"]');

    buttons.forEach(btn => {
        if (PROCESSED.has(btn)) return;

        const txt = (btn.innerText || '').toLowerCase().trim();
        // Strict check for "Responder" or "Reply"
        if (txt === 'responder' || txt === 'reply') {

            // Validate: Must be inside a comment structure
            const comment = btn.closest('.comments-comment-item') ||
                btn.closest('.feed-shared-comment-item') ||
                btn.closest('article');

            if (!comment) return;

            PROCESSED.add(btn);

            // Create Pencil
            const pencil = document.createElement('span');
            pencil.className = 'ing-pencil';
            pencil.innerText = '✏️';
            pencil.title = 'Generar respuesta con IA';
            pencil.style.cssText = "cursor:pointer; font-size:16px; margin-left:8px; vertical-align:middle; display:inline-block;";

            pencil.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                run(comment, 'reply', pencil);
            };

            // Insert: Check if parent is the action bar flex container
            // If so, append. If not, insert after.
            if (btn.parentElement.style.display === 'flex' || btn.parentElement.classList.contains('actions')) {
                btn.parentElement.appendChild(pencil);
            } else {
                btn.after(pencil);
            }
        }
    });
}

function createFlatBtn(txt, cb) {
    const b = document.createElement('button');
    b.innerText = txt;
    // Style: Rectangular, flat, blue, small
    b.style.cssText = "background:#0a66c2; color:white; border:none; border-radius:4px; padding:4px 12px; margin-left:6px; font-weight:600; font-size:13px; cursor:pointer; line-height:1.2;";
    b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); cb(); };
    return b;
}

// --- RUNNER ---
async function run(context, type, btn) {
    if (!chrome?.storage?.sync) return alert("Recarga la página");

    // License
    const k = await chrome.storage.sync.get('licenseKey');
    if (!k.licenseKey) return alert("Falta licencia");

    // Text extraction
    let txt = '';
    // robust clone method to remove noise
    let root = context.closest('.feed-shared-update-v2') || context.closest('article') || context.parentElement;
    if (root) {
        const clone = root.cloneNode(true);
        // Remove Action bars, Existing comments
        clone.querySelectorAll('button, .video-player, .comments-comment-list, .feed-shared-social-action-bar').forEach(n => n.remove());
        txt = clone.innerText || '';
    }

    if (!txt || txt.length < 5) txt = context.innerText; // Fallback

    const prompt = type === 'summarize' ? `Resume: ${txt}` : `Responde/Comenta: ${txt}`;

    const old = btn.innerText;
    btn.innerText = "⏳";

    chrome.runtime.sendMessage({ action: 'generate_comment', licenseKey: k.licenseKey, prompt }, r => {
        btn.innerText = old;
        if (r?.success) showNiceModal(r.result, context, type);
        else alert(r?.error || "Error");
    });
}

// --- NEW UI MODAL ---
function showNiceModal(text, context, type) {
    // Remove old
    const old = document.getElementById('ing-modal-v16');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'ing-modal-v16';
    overlay.style.cssText = "position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:999999; display:flex; justify-content:center; align-items:center; backdrop-filter:blur(2px);";

    const modal = document.createElement('div');
    modal.style.cssText = "background:white; width:550px; max-width:95%; border-radius:12px; padding:24px; box-shadow:0 10px 40px rgba(0,0,0,0.3); font-family:-apple-system,system-ui,sans-serif;";

    modal.innerHTML = `
        <h3 style="margin:0 0 16px; color:#333; font-size:18px; display:flex; justify-content:space-between;">
            Resultado IngenIA
            <span style="font-size:12px; color:#666; font-weight:normal; margin-top:4px;">v16</span>
        </h3>
        <textarea id="ing-area" style="width:100%; height:120px; padding:12px; border:1px solid #ccc; border-radius:8px; font-family:inherit; font-size:14px; line-height:1.5; resize:vertical; margin-bottom:20px; outline:none;">${text}</textarea>
        <div style="display:flex; justify-content:flex-end; gap:12px;">
            <button id="ing-close" style="padding:8px 16px; border:none; background:transparent; color:#666; font-weight:600; cursor:pointer;">Cancelar</button>
            <button id="ing-copy" style="padding:8px 20px; border:1px solid #0a66c2; background:white; color:#0a66c2; border-radius:24px; font-weight:600; cursor:pointer;">Copiar</button>
            <button id="ing-insert" style="padding:8px 24px; border:none; background:#0a66c2; color:white; border-radius:24px; font-weight:600; cursor:pointer;">Insertar</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Logic
    const close = () => overlay.remove();
    modal.querySelector('#ing-close').onclick = close;

    modal.querySelector('#ing-copy').onclick = () => {
        const val = modal.querySelector('#ing-area').value;
        navigator.clipboard.writeText(val);
        const b = modal.querySelector('#ing-copy');
        b.innerText = "¡Copiado!";
        setTimeout(() => b.innerText = "Copiar", 2000);
    };

    modal.querySelector('#ing-insert').onclick = () => {
        const val = modal.querySelector('#ing-area').value;
        directInsert(val, context);
        close();
    };

    overlay.onclick = (e) => { if (e.target === overlay) close(); };
}

function directInsert(text, context) {
    // 1. Try to find an OPEN editor in the context first
    let editor = context.querySelector('.ql-editor') || context.querySelector('[contenteditable="true"]');

    // 2. If no editor, try to Click "Reply" or "Comment" to open it
    if (!editor) {
        // Find a button that opens the editor
        const trigger = Array.from(context.querySelectorAll('button')).find(b => {
            const t = b.innerText.toLowerCase();
            return t.includes('responder') || t.includes('reply') || t.includes('comentar');
        });

        if (trigger) {
            trigger.click(); // Open editor
            // Wait for DOM update
            setTimeout(() => {
                editor = context.querySelector('.ql-editor') ||
                    context.querySelector('[contenteditable="true"]') ||
                    document.activeElement; // Fallback to focused element

                if (editor && editor.isContentEditable) {
                    writeTo(editor, text);
                } else {
                    fallbackCopy(text);
                }
            }, 600);
            return;
        }
    }

    if (editor) {
        writeTo(editor, text);
    } else {
        fallbackCopy(text);
    }
}

function writeTo(el, text) {
    el.focus();
    // Use execCommand for broader compatibility with LinkedIn's editor events
    document.execCommand('insertText', false, text);
    // Fire manual events just in case
    el.dispatchEvent(new Event('input', { bubbles: true }));
}

function fallbackCopy(text) {
    navigator.clipboard.writeText(text);
    alert("No encontré el campo de texto. Copiado al portapapeles.");
}
