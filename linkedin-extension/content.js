// --- Floating Dashboard with Click Memory + Auto Insert ---

// 1. INJECT STYLES
const css = `
#ingenia-dashboard {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 300px;
    background: linear-gradient(135deg, #1e293b, #0f172a);
    color: white;
    padding: 16px;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    border: 1px solid #334155;
    z-index: 2147483647; 
    font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    animation: ingeniaSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes ingeniaSlideIn { to { opacity: 1; transform: translateY(0); } }
.ingenia-header { display: flex; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #334155; padding-bottom: 8px; }
.ingenia-title { font-weight: 700; font-size: 14px; color: #f8fafc; display: flex; align-items: center; gap: 8px; }
.ingenia-status { width: 8px; height: 8px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 8px #ef4444; transition: all 0.3s; }
.ingenia-status.active { background: #4ade80; box-shadow: 0 0 8px #4ade80; }
.ingenia-target { font-size: 12px; color: #94a3b8; margin-bottom: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ingenia-actions { display: flex; gap: 8px; }
.ingenia-btn { flex: 1; border: none; border-radius: 6px; padding: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; }
.ingenia-btn-secondary { background: rgba(255,255,255,0.05); color: #cbd5e1; border: 1px solid #475569; }
.ingenia-btn-secondary:hover { background: rgba(255,255,255,0.1); color: white; }
.ingenia-btn-primary { background: #0a66c2; color: white; }
.ingenia-btn-primary:hover { background: #004182; }
`;

function injectStyles() {
    if (document.getElementById('ingenia-styles')) return;
    const style = document.createElement('style');
    style.id = 'ingenia-styles';
    style.textContent = css;
    document.head.appendChild(style);
}

// 2. STATE
let lastClickedElement = null;
let lastClickedPostContainer = null; // Store the full post container for auto text extraction

// 3. DASHBOARD
function createDashboard() {
    if (document.getElementById('ingenia-dashboard')) return;
    const div = document.createElement('div');
    div.id = 'ingenia-dashboard';
    div.innerHTML = `
        <div class="ingenia-header">
            <div class="ingenia-title">
                <span class="ingenia-status" id="ingenia-status-dot"></span>
                IngenIA Panel
            </div>
        </div>
        <div class="ingenia-target" id="ingenia-target-text">Haz clic en un post...</div>
        <div class="ingenia-actions">
            <button class="ingenia-btn ingenia-btn-secondary" id="btn-summarize">📝 Resumir</button>
            <button class="ingenia-btn ingenia-btn-primary" id="btn-comment">💬 Comentar</button>
        </div>
    `;
    document.body.appendChild(div);
    document.getElementById('btn-summarize').onclick = () => runAction('summarize');
    document.getElementById('btn-comment').onclick = () => runAction('comment');
}

// 4. CLICK MEMORY - Enhanced to find full post container
function initClickMemory() {
    document.addEventListener('click', function (e) {
        if (e.target.closest('#ingenia-dashboard') || e.target.closest('#ingenia-modal')) return;

        lastClickedElement = e.target;

        // Try to find the full post container automatically
        lastClickedPostContainer = findPostContainer(e.target);

        console.log("IngenIA: Click stored. Post container:", lastClickedPostContainer);

        const dot = document.getElementById('ingenia-status-dot');
        const txt = document.getElementById('ingenia-target-text');
        if (dot) { dot.classList.add('active'); dot.style.background = '#4ade80'; }
        if (txt) txt.innerText = lastClickedPostContainer ? "Post capturado ✓" : "Click guardado";

    }, true);
}

// Find the entire post container from any clicked element
function findPostContainer(el) {
    if (!el) return null;
    let current = el;
    let levels = 0;

    while (current && current.tagName !== 'BODY' && levels < 20) {
        // Check for LinkedIn post markers
        if (current.getAttribute && current.getAttribute('data-urn')) return current;
        if (current.classList) {
            if (current.classList.contains('feed-shared-update-v2')) return current;
            if (current.classList.contains('occludable-update')) return current;
            if (current.classList.contains('feed-shared-update')) return current;
        }
        current = current.parentElement;
        levels++;
    }
    return null;
}

// 5. AUTOMATIC TEXT EXTRACTION - Gets ALL text from the post
function extractFullPostText() {
    // Priority 1: Use the found post container
    if (lastClickedPostContainer) {
        // Try to find the main text area within
        const textAreas = lastClickedPostContainer.querySelectorAll(
            '.feed-shared-update-v2__description, ' +
            '.update-components-text, ' +
            '.feed-shared-text-view, ' +
            '.feed-shared-inline-show-more-text'
        );

        if (textAreas.length > 0) {
            let combinedText = "";
            textAreas.forEach(area => {
                combinedText += area.innerText + " ";
            });
            if (combinedText.trim().length > 30) {
                return combinedText.trim();
            }
        }

        // Fallback: Get all text in the container
        return lastClickedPostContainer.innerText;
    }

    // Priority 2: Walk up from the clicked element
    if (lastClickedElement) {
        let current = lastClickedElement;
        let levels = 0;
        while (current && current.tagName !== 'BODY' && levels < 15) {
            const text = current.innerText || "";
            if (text.length > 100) return text;
            current = current.parentElement;
            levels++;
        }
    }

    return null;
}

// 6. ACTION
async function runAction(type) {
    if (!lastClickedElement && !lastClickedPostContainer) {
        alert("⚠️ Primero haz clic en el post.");
        return;
    }

    const btn = document.getElementById(type === 'summarize' ? 'btn-summarize' : 'btn-comment');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳';
    btn.disabled = true;

    // Auto-extract full post text
    let text = extractFullPostText();

    if (!text || text.length < 20) {
        alert("No pude extraer texto suficiente. Intenta hacer clic en el texto del post.");
        btn.innerHTML = originalText;
        btn.disabled = false;
        return;
    }

    // Clean up
    text = text.replace(/ver más|see more|mostrar menos|show less/gi, "").trim();
    if (text.length > 3000) text = text.substring(0, 3000);

    const { licenseKey } = await chrome.storage.sync.get(['licenseKey']);
    if (!licenseKey) {
        alert("Configura tu licencia primero.");
        btn.innerHTML = originalText;
        btn.disabled = false;
        return;
    }

    const prompt = type === 'summarize'
        ? "Resume esto en español (bullet points): " + text
        : "Genera un comentario profesional y cercano para este post de LinkedIn: " + text;

    try {
        const res = await new Promise(resolve => chrome.runtime.sendMessage({
            action: 'generate_comment', licenseKey, prompt
        }, resolve));

        if (res && res.success) {
            showModal(type === 'summarize' ? "Resumen" : "Comentario Sugerido", res.result, type);
        } else {
            alert("Error: " + (res?.error || "Respuesta vacía"));
        }
    } catch (e) {
        console.error(e);
        alert("Error de conexión.");
    }

    btn.innerHTML = originalText;
    btn.disabled = false;
}

// --- MODAL with Copy + Insert buttons ---
function showModal(title, text, actionType) {
    const existing = document.getElementById('ingenia-modal');
    if (existing) existing.remove();

    const div = document.createElement('div');
    div.id = 'ingenia-modal';
    div.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:99999999;display:flex;justify-content:center;align-items:center;backdrop-filter:blur(5px);";

    div.innerHTML = `
        <div style="background:#1e293b;width:600px;max-width:90%;padding:25px;border-radius:12px;color:white;font-family:sans-serif;box-shadow:0 25px 50px rgba(0,0,0,0.5);border:1px solid #334155;">
            <h3 style="margin-top:0;font-size:18px;border-bottom:1px solid #334155;padding-bottom:10px;margin-bottom:15px;">${title}</h3>
            <div id="modal-content" style="background:#0f172a;padding:20px;border-radius:8px;max-height:400px;overflow:auto;white-space:pre-wrap;line-height:1.6;color:#cbd5e1;font-size:15px;">${text}</div>
            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
                <button id="btn-copy" style="padding:10px 20px;background:#475569;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;">📋 Copiar</button>
                <button id="btn-insert" style="padding:10px 20px;background:#0a66c2;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;">✍️ Insertar</button>
                <button id="btn-close" style="padding:10px 20px;background:#334155;color:white;border:none;border-radius:6px;cursor:pointer;">Cerrar</button>
            </div>
        </div>
    `;

    document.body.appendChild(div);

    // Button handlers
    document.getElementById('btn-copy').onclick = () => {
        navigator.clipboard.writeText(text);
        document.getElementById('btn-copy').innerText = "✅ Copiado!";
        setTimeout(() => { document.getElementById('btn-copy').innerText = "📋 Copiar"; }, 2000);
    };

    document.getElementById('btn-insert').onclick = () => {
        insertTextIntoCommentBox(text);
        div.remove();
    };

    document.getElementById('btn-close').onclick = () => div.remove();
}

// --- INSERT INTO COMMENT BOX ---
function insertTextIntoCommentBox(text) {
    // Strategy 1: Find the comment input near the clicked post
    let commentBox = null;

    if (lastClickedPostContainer) {
        // Look for comment input within or near the post
        commentBox = lastClickedPostContainer.querySelector('.ql-editor, [contenteditable="true"], .comments-comment-box__form textarea');
    }

    // Strategy 2: Find any open/visible comment editor on the page
    if (!commentBox) {
        const allEditors = document.querySelectorAll('.ql-editor[contenteditable="true"], .comments-comment-texteditor .ql-editor');
        for (let editor of allEditors) {
            if (editor.offsetParent !== null) { // Is visible
                commentBox = editor;
                break;
            }
        }
    }

    // Strategy 3: Look for a focused comment area
    if (!commentBox) {
        commentBox = document.querySelector('.comments-comment-box-comment__text-editor .ql-editor');
    }

    // Strategy 4: Any visible contenteditable in comment area
    if (!commentBox) {
        const candidates = document.querySelectorAll('[contenteditable="true"]');
        for (let c of candidates) {
            const rect = c.getBoundingClientRect();
            if (rect.height > 30 && rect.width > 200 && c.offsetParent !== null) {
                commentBox = c;
                break;
            }
        }
    }

    if (commentBox) {
        // Focus and insert
        commentBox.focus();

        // Clear existing content if it's just placeholder
        if (commentBox.innerText.trim().length < 5) {
            commentBox.innerHTML = '';
        }

        // Insert text
        document.execCommand('insertText', false, text);

        // Trigger input event so LinkedIn knows content changed
        commentBox.dispatchEvent(new Event('input', { bubbles: true }));

        console.log("IngenIA: Text inserted into comment box!");
    } else {
        // Fallback: Copy and notify user
        navigator.clipboard.writeText(text);
        alert("No encontré la caja de comentarios abierta. El texto se ha copiado al portapapeles. Haz clic en 'Comentar' en LinkedIn primero y luego pega (Ctrl+V).");
    }
}

// Start
injectStyles();
createDashboard();
initClickMemory();
console.log("IngenIA: Ready with Auto-Insert! 🚀");
