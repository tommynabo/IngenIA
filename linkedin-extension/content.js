// --- Floating Dashboard & Logic ---

// 1. INJECT STYLES PROGRAMMATICALLY
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
    transition: all 0.3s ease;
    animation: ingeniaSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes ingeniaSlideIn { to { opacity: 1; transform: translateY(0); } }

.ingenia-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 12px; border-bottom: 1px solid #334155; padding-bottom: 8px;
}
.ingenia-title { font-weight: 700; font-size: 14px; color: #f8fafc; display: flex; align-items: center; gap: 8px; }
.ingenia-status {
    width: 8px; height: 8px; border-radius: 50%; background: #ef4444;
    box-shadow: 0 0 8px #ef4444; transition: all 0.3s;
}
.ingenia-status.active { background: #4ade80; box-shadow: 0 0 8px #4ade80; }
.ingenia-target {
    font-size: 12px; color: #94a3b8; margin-bottom: 12px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.ingenia-actions { display: flex; gap: 8px; }
.ingenia-btn {
    flex: 1; border: none; border-radius: 6px; padding: 8px;
    font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;
    display: flex; align-items: center; justify-content: center; gap: 6px;
}
.ingenia-btn-secondary { background: rgba(255,255,255,0.05); color: #cbd5e1; border: 1px solid #475569; }
.ingenia-btn-secondary:hover { background: rgba(255,255,255,0.1); color: white; }
.ingenia-btn-primary { background: #0a66c2; color: white; }
.ingenia-btn-primary:hover { background: #004182; }
.ingenia-active-post {
    position: relative;
    border: 3px solid #0a66c2 !important;
    box-shadow: 0 0 15px rgba(10, 102, 194, 0.2) !important;
    border-radius: 8px;
}
`;

function injectStyles() {
    if (document.getElementById('ingenia-styles')) return;
    const style = document.createElement('style');
    style.id = 'ingenia-styles';
    style.textContent = css;
    document.head.appendChild(style);
}

// 2. STATE
let currentPost = null;

// 3. DASHBOARD CREATION
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
        <div class="ingenia-target" id="ingenia-target-text">
            Haz clic en un post para empezar...
        </div>
        <div class="ingenia-actions">
            <button class="ingenia-btn ingenia-btn-secondary" id="btn-summarize">📝 Resumir</button>
            <button class="ingenia-btn ingenia-btn-primary" id="btn-comment">💬 Comentar</button>
        </div>
    `;
    document.body.appendChild(div);

    document.getElementById('btn-summarize').onclick = () => runAction('summarize');
    document.getElementById('btn-comment').onclick = () => runAction('comment');
}

// 4. DETECTION LOGIC - CLICK & VISUAL CENTER
function initDetectors() {
    // A. Manual Click Selection
    document.addEventListener('click', (e) => {
        const post = findPostContainer(e.target);
        if (post) updateDashboardTarget(post);
    }, true);
}

// Helper: Walk up DOM to find ANY potential post container
function findPostContainer(el) {
    if (!el) return null;

    // 1. Try standard LinkedIn IDs
    const urn = el.closest('div[data-urn]');
    if (urn) return urn;

    // 2. Try common classes
    const cls = el.closest('.feed-shared-update-v2, .occludable-update, article, .feed-shared-update');
    if (cls) return cls;

    // 3. Heuristic: Is it a big div with text?
    // Stop if we hit body or too high up
    let cur = el;
    while (cur && cur.tagName !== 'BODY') {
        if (cur.classList && (cur.classList.contains('feed-shared-update-v2') || cur.getAttribute('data-urn'))) {
            return cur;
        }
        cur = cur.parentElement;
    }
    return null;
}

function updateDashboardTarget(post) {
    if (!post) return;
    if (currentPost && currentPost !== post) {
        currentPost.classList.remove('ingenia-active-post');
        currentPost.style.border = ''; // Clean cleanup
    }

    currentPost = post;
    post.classList.add('ingenia-active-post');
    post.style.border = '3px solid #0a66c2'; // Force inline

    // Try to get author name
    let authorName = "Post detectado";
    try {
        const authorEl = post.querySelector('.update-components-actor__name, .feed-shared-actor__name') ||
            post.querySelector('span[aria-hidden="true"]');
        if (authorEl) authorName = authorEl.innerText.split('\n')[0];
    } catch (e) { }

    const txt = document.getElementById('ingenia-target-text');
    const dot = document.getElementById('ingenia-status-dot');
    if (txt) txt.innerText = "Seleccionado: " + authorName.substring(0, 25);
    if (dot) {
        dot.classList.add('active');
        dot.style.background = '#4ade80';
    }
}


// --- THE NUCLEAR FALLBACK ---
// Finds what is physically in the center of the viewport
function getVisualCenterPost() {
    const x = window.innerWidth / 2;
    const y = window.innerHeight / 2;

    // Raycast: What element is at (x,y)?
    const el = document.elementFromPoint(x, y);
    if (!el) return null;

    console.log("IngenIA Raycast Hit:", el);

    // Walk up to find post
    return findPostContainer(el);
}


// 5. ACTION LOGIC
async function runAction(type) {
    let targetPost = currentPost;

    // JUST IN TIME: If no selection, use Visual Center
    if (!targetPost) {
        console.log("IngenIA: No selection. Using Visual Center Raycast...");
        targetPost = getVisualCenterPost();
        if (targetPost) {
            updateDashboardTarget(targetPost);
        }
    }

    if (!targetPost) {
        alert("⚠️ No encuentro ningún post. Haz clic en el texto del post que quieres comentar.");
        return;
    }

    const btn = document.getElementById(type === 'summarize' ? 'btn-summarize' : 'btn-comment');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳';
    btn.disabled = true;

    // Extract Text (Multiple strategies)
    let text = "";
    // Strategy A: Specific Classes
    const textEl = targetPost.querySelector('.feed-shared-update-v2__description, .update-components-text, .feed-shared-text-view');
    if (textEl) text = textEl.innerText;

    // Strategy B: If empty, grab all text in the container
    if (!text || text.length < 10) {
        text = targetPost.innerText;
    }

    // Clean up "See more" artifacts
    text = text.replace(/ver más|see more/gi, "");

    const { licenseKey } = await chrome.storage.sync.get(['licenseKey']);
    if (!licenseKey) {
        alert("Falta licencia.");
        btn.innerHTML = originalText;
        btn.disabled = false;
        return;
    }

    const prompt = type === 'summarize'
        ? "Resume esto en español (bullets): " + text
        : "Genera un comentario profesional y cercano: " + text;

    try {
        const res = await new Promise(resolve => chrome.runtime.sendMessage({
            action: 'generate_comment', licenseKey, prompt
        }, resolve));

        if (res.success) {
            navigator.clipboard.writeText(res.result);
            showModal(type === 'summarize' ? "Resumen" : "Comentario Sugerido", res.result);
        } else {
            alert("Error: " + res.error);
        }
    } catch (e) {
        alert("Error de conexión");
    }

    btn.innerHTML = originalText;
    btn.disabled = false;
}

// --- MODAL ---
function showModal(title, text) {
    const existing = document.getElementById('ingenia-modal');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.id = 'ingenia-modal';
    div.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:99999999;display:flex;justify-content:center;align-items:center;backdrop-filter:blur(5px);";
    div.innerHTML = `
        <div style="background:#1e293b;width:600px;max-width:90%;padding:25px;border-radius:12px;color:white;font-family:sans-serif;box-shadow:0 25px 50px rgba(0,0,0,0.5);border:1px solid #334155;">
            <h3 style="margin-top:0;font-size:18px;border-bottom:1px solid #334155;padding-bottom:10px;margin-bottom:15px;">${title}</h3>
            <div style="background:#0f172a;padding:20px;border-radius:8px;max-height:400px;overflow:auto;white-space:pre-wrap;line-height:1.6;color:#cbd5e1;font-size:15px;">${text}</div>
            <div style="text-align:right;margin-top:20px;">
                <button onclick="this.closest('#ingenia-modal').remove()" style="padding:10px 20px;background:#3b82f6;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;">Cerrar (Texto Copiado)</button>
            </div>
        </div>
    `;
    document.body.appendChild(div);
}

// Start
injectStyles();
createDashboard();
initDetectors();
