// --- IngenIA Dashboard - With Comment Reply Support ---

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
.ingenia-status.comment { background: #f59e0b; box-shadow: 0 0 8px #f59e0b; }
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
let lastClickedPostContainer = null;
let lastClickedCommentContainer = null;
let lastClickedType = null; // 'post' or 'comment'
let linkedInCommentButton = null;

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
        <div class="ingenia-target" id="ingenia-target-text">Haz clic en un post o comentario...</div>
        <div class="ingenia-actions">
            <button class="ingenia-btn ingenia-btn-secondary" id="btn-summarize">📝 Resumir</button>
            <button class="ingenia-btn ingenia-btn-primary" id="btn-comment">💬 Comentar</button>
        </div>
    `;
    document.body.appendChild(div);
    document.getElementById('btn-summarize').onclick = () => runAction('summarize');
    document.getElementById('btn-comment').onclick = () => runAction('comment');
}

// 4. CLICK MEMORY - Detects Post vs Comment
function initClickMemory() {
    document.addEventListener('click', function (e) {
        if (e.target.closest('#ingenia-dashboard') || e.target.closest('#ingenia-modal')) return;

        lastClickedElement = e.target;

        // Check if click was inside a COMMENT first (more specific)
        const commentContainer = findCommentContainer(e.target);

        if (commentContainer) {
            lastClickedType = 'comment';
            lastClickedCommentContainer = commentContainer;
            lastClickedPostContainer = findPostContainer(e.target); // Also capture parent post
            console.log("IngenIA: Comment detected!", commentContainer);
        } else {
            // Check if it's a post
            const postContainer = findPostContainer(e.target);
            if (postContainer) {
                lastClickedType = 'post';
                lastClickedPostContainer = postContainer;
                lastClickedCommentContainer = null;
                console.log("IngenIA: Post detected!", postContainer);
            }
        }

        // Check for LinkedIn button clicks
        const btnText = (e.target.innerText || "").toLowerCase();
        if (btnText.includes('comentar') || btnText.includes('comment')) {
            linkedInCommentButton = e.target.closest('button') || e.target;
        }

        // Update Dashboard UI
        updateDashboardUI();

    }, true);
}

function updateDashboardUI() {
    const dot = document.getElementById('ingenia-status-dot');
    const txt = document.getElementById('ingenia-target-text');
    const btnComment = document.getElementById('btn-comment');

    if (!dot || !txt || !btnComment) return;

    if (lastClickedType === 'comment') {
        dot.classList.add('active');
        dot.style.background = '#f59e0b'; // Orange for comment
        txt.innerText = "💬 Comentario capturado ✓";
        btnComment.innerHTML = "💬 Responder";
    } else if (lastClickedType === 'post') {
        dot.classList.add('active');
        dot.style.background = '#4ade80'; // Green for post
        txt.innerText = "📄 Post capturado ✓";
        btnComment.innerHTML = "💬 Comentar";
    }
}

function findCommentContainer(el) {
    if (!el) return null;
    let current = el;
    let levels = 0;
    while (current && current.tagName !== 'BODY' && levels < 15) {
        if (current.classList) {
            if (current.classList.contains('comments-comment-item')) return current;
            if (current.classList.contains('feed-shared-comment-item')) return current;
            if (current.tagName === 'ARTICLE' && current.closest('.comments-comments-list')) return current;
        }
        current = current.parentElement;
        levels++;
    }
    return null;
}

function findPostContainer(el) {
    if (!el) return null;
    let current = el;
    let levels = 0;
    while (current && current.tagName !== 'BODY' && levels < 20) {
        if (current.getAttribute && current.getAttribute('data-urn')) return current;
        if (current.classList) {
            if (current.classList.contains('feed-shared-update-v2')) return current;
            if (current.classList.contains('occludable-update')) return current;
        }
        current = current.parentElement;
        levels++;
    }
    return null;
}

// 5. TEXT EXTRACTION - Handles both Post and Comment
function extractText() {
    if (lastClickedType === 'comment' && lastClickedCommentContainer) {
        // Extract comment text specifically
        const contentEl = lastClickedCommentContainer.querySelector(
            '.comments-comment-item__main-content, ' +
            '.feed-shared-comment-item__comment-content, ' +
            '.comments-comment-item-content-body'
        );
        if (contentEl && contentEl.innerText.length > 10) {
            return contentEl.innerText;
        }
        return lastClickedCommentContainer.innerText;
    }

    if (lastClickedType === 'post' && lastClickedPostContainer) {
        const textAreas = lastClickedPostContainer.querySelectorAll(
            '.feed-shared-update-v2__description, .update-components-text, .feed-shared-text-view, .feed-shared-inline-show-more-text'
        );
        if (textAreas.length > 0) {
            let combinedText = "";
            textAreas.forEach(area => combinedText += area.innerText + " ");
            if (combinedText.trim().length > 30) return combinedText.trim();
        }
        return lastClickedPostContainer.innerText;
    }

    // Fallback
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
    if (!lastClickedElement && !lastClickedPostContainer && !lastClickedCommentContainer) {
        alert("⚠️ Primero haz clic en un post o comentario.");
        return;
    }

    const btn = document.getElementById(type === 'summarize' ? 'btn-summarize' : 'btn-comment');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳';
    btn.disabled = true;

    let text = extractText();
    if (!text || text.length < 10) {
        alert("No pude extraer texto suficiente.");
        btn.innerHTML = originalText;
        btn.disabled = false;
        return;
    }

    text = text.replace(/ver más|see more|mostrar menos|show less/gi, "").trim();
    if (text.length > 3000) text = text.substring(0, 3000);

    const { licenseKey } = await chrome.storage.sync.get(['licenseKey']);
    if (!licenseKey) {
        alert("Configura tu licencia primero.");
        btn.innerHTML = originalText;
        btn.disabled = false;
        return;
    }

    // DIFFERENT PROMPTS based on context
    let prompt;
    let modalTitle;

    if (type === 'summarize') {
        prompt = "Resume esto en español (bullet points): " + text;
        modalTitle = "Resumen";
    } else {
        // Comment action - different for posts vs comments
        if (lastClickedType === 'comment') {
            prompt = "Genera una respuesta breve, amable y profesional para este comentario de LinkedIn. Máximo 2-3 frases: " + text;
            modalTitle = "Respuesta Sugerida";
        } else {
            prompt = "Genera un comentario profesional y cercano para este post de LinkedIn: " + text;
            modalTitle = "Comentario Sugerido";
        }
    }

    try {
        const res = await new Promise(resolve => chrome.runtime.sendMessage({
            action: 'generate_comment', licenseKey, prompt
        }, resolve));

        if (res && res.success) {
            showModal(modalTitle, res.result, type);
        } else {
            alert("Error: " + (res?.error || "Respuesta vacía"));
        }
    } catch (e) {
        alert("Error de conexión.");
    }

    btn.innerHTML = originalText;
    btn.disabled = false;
}

// --- MODAL ---
function showModal(title, text, actionType) {
    const existing = document.getElementById('ingenia-modal');
    if (existing) existing.remove();

    const div = document.createElement('div');
    div.id = 'ingenia-modal';
    div.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:99999999;display:flex;justify-content:center;align-items:center;backdrop-filter:blur(5px);";

    div.innerHTML = `
        <div style="background:#1e293b;width:600px;max-width:90%;padding:25px;border-radius:12px;color:white;font-family:sans-serif;box-shadow:0 25px 50px rgba(0,0,0,0.5);border:1px solid #334155;">
            <h3 style="margin-top:0;font-size:18px;border-bottom:1px solid #334155;padding-bottom:10px;margin-bottom:15px;">${title}</h3>
            <div style="background:#0f172a;padding:20px;border-radius:8px;max-height:400px;overflow:auto;white-space:pre-wrap;line-height:1.6;color:#cbd5e1;font-size:15px;">${text}</div>
            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
                <button id="btn-copy" style="padding:10px 20px;background:#475569;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;">📋 Copiar</button>
                <button id="btn-insert" style="padding:10px 20px;background:#0a66c2;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;">✍️ Insertar</button>
                <button id="btn-close" style="padding:10px 20px;background:#334155;color:white;border:none;border-radius:6px;cursor:pointer;">Cerrar</button>
            </div>
        </div>
    `;

    document.body.appendChild(div);

    document.getElementById('btn-copy').onclick = () => {
        navigator.clipboard.writeText(text);
        document.getElementById('btn-copy').innerText = "✅ Copiado!";
        setTimeout(() => { document.getElementById('btn-copy').innerText = "📋 Copiar"; }, 2000);
    };

    document.getElementById('btn-insert').onclick = () => {
        insertText(text);
        div.remove();
    };

    document.getElementById('btn-close').onclick = () => div.remove();
}

// --- INSERT - Handles both Comment Box and Reply Box ---
function insertText(text) {
    // Open the appropriate input first
    openInputBox();

    setTimeout(() => {
        let inputBox = findInputBox();

        if (inputBox) {
            inputBox.focus();
            if (inputBox.innerText.trim().length < 5 || inputBox.innerText.includes('Añade')) {
                inputBox.innerHTML = '';
            }
            document.execCommand('insertText', false, text);
            inputBox.dispatchEvent(new Event('input', { bubbles: true }));
            console.log("IngenIA: Text inserted!");
        } else {
            navigator.clipboard.writeText(text);
            alert("✅ Texto copiado. Pega con Ctrl+V.");
        }
    }, 600);
}

function openInputBox() {
    // If we're replying to a comment, click "Responder"
    if (lastClickedType === 'comment' && lastClickedCommentContainer) {
        const btns = lastClickedCommentContainer.querySelectorAll('button');
        for (let btn of btns) {
            const txt = (btn.innerText || "").toLowerCase();
            if (txt.includes('responder') || txt.includes('reply')) {
                console.log("IngenIA: Clicking Reply button");
                btn.click();
                return;
            }
        }
    }

    // For posts, click "Comentar"
    if (lastClickedPostContainer) {
        const btns = lastClickedPostContainer.querySelectorAll('button');
        for (let btn of btns) {
            const txt = (btn.innerText || "").toLowerCase();
            const label = (btn.getAttribute('aria-label') || "").toLowerCase();
            if (txt.includes('comentar') || txt.includes('comment') || label.includes('comentar')) {
                console.log("IngenIA: Clicking Comment button");
                btn.click();
                return;
            }
        }
    }

    if (linkedInCommentButton) {
        linkedInCommentButton.click();
    }
}

function findInputBox() {
    // For comment replies, look inside the comment container first
    if (lastClickedType === 'comment' && lastClickedCommentContainer) {
        const replyBox = lastClickedCommentContainer.querySelector('.ql-editor[contenteditable="true"]');
        if (replyBox && replyBox.offsetParent !== null) return replyBox;
    }

    // For posts, look in the post container
    if (lastClickedPostContainer) {
        const box = lastClickedPostContainer.querySelector('.ql-editor[contenteditable="true"]');
        if (box && box.offsetParent !== null) return box;
    }

    // Global search
    const allEditors = document.querySelectorAll('.ql-editor[contenteditable="true"]');
    for (let editor of allEditors) {
        if (editor.offsetParent !== null && editor.getBoundingClientRect().height > 20) {
            return editor;
        }
    }

    const contentEditables = document.querySelectorAll('[contenteditable="true"]');
    for (let ce of contentEditables) {
        const rect = ce.getBoundingClientRect();
        if (rect.height > 30 && rect.width > 200 && ce.offsetParent !== null) {
            return ce;
        }
    }

    return null;
}

// Start
injectStyles();
createDashboard();
initClickMemory();
console.log("IngenIA: Ready with Comment Reply Support! 🚀");
