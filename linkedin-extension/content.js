// --- Floating Dashboard & Logic ---

// 1. INJECT STYLES PROGRAMMATICALLY (Includes visual highlight for active post)
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
    opacity: 0;
    transform: translateY(20px);
    animation: ingeniaSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes ingeniaSlideIn {
    to { opacity: 1; transform: translateY(0); }
}

.ingenia-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    border-bottom: 1px solid #334155;
    padding-bottom: 8px;
}

.ingenia-title {
    font-weight: 700;
    font-size: 14px;
    color: #f8fafc;
    display: flex;
    align-items: center;
    gap: 8px;
}

.ingenia-status {
    width: 8px; height: 8px; border-radius: 50%; 
    background: #ef4444;
    box-shadow: 0 0 8px #ef4444;
    transition: all 0.3s;
}
.ingenia-status.active {
    background: #4ade80;
    box-shadow: 0 0 8px #4ade80;
}

.ingenia-target {
    font-size: 12px;
    color: #94a3b8;
    margin-bottom: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ingenia-actions { display: flex; gap: 8px; }

.ingenia-btn {
    flex: 1;
    border: none;
    border-radius: 6px;
    padding: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
}
.ingenia-btn-secondary { background: rgba(255,255,255,0.05); color: #cbd5e1; border: 1px solid #475569; }
.ingenia-btn-secondary:hover { background: rgba(255,255,255,0.1); color: white; }
.ingenia-btn-primary { background: #0a66c2; color: white; }
.ingenia-btn-primary:hover { background: #004182; }

/* ACTIVE POST HIGHLIGHT */
.ingenia-active-post {
    position: relative;
    border: 2px solid #0a66c2 !important;
    box-shadow: 0 0 15px rgba(10, 102, 194, 0.1) !important;
    border-radius: 8px;
    transition: all 0.3s ease;
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
            Haz clic en "Ver más" o haz scroll...
        </div>
        <div class="ingenia-actions">
            <button class="ingenia-btn ingenia-btn-secondary" id="btn-summarize">
                📝 Resumir
            </button>
            <button class="ingenia-btn ingenia-btn-primary" id="btn-comment">
                💬 Comentar
            </button>
        </div>
    `;

    document.body.appendChild(div);

    document.getElementById('btn-summarize').onclick = () => runAction('summarize');
    document.getElementById('btn-comment').onclick = () => runAction('comment');
}

// 4. DETECTION LOGIC ("See More" Click + Scroll fallback)

function initDetectors() {
    // A. CLICK DETECTOR (Aggressive)
    // Listens for ANY click. If it's inside a post, select it.
    document.addEventListener('click', (e) => {
        const target = e.target;

        // Robust strategy: Find any ancestor with 'data-urn' (standard LinkedIn post ID)
        // or the class 'feed-shared-update-v2'
        const post = target.closest('div[data-urn]') ||
            target.closest('.feed-shared-update-v2') ||
            target.closest('.occludable-update');

        if (post) {
            console.log("IngenIA: Click interaction detected on post", post);
            updateDashboardTarget(post, true);
        }
    }, true); // Capture phase

    // B. SCROLL DETECTOR (Passive background update)
    const scrollCheck = () => {
        // Only update if we don't have a confirmed "Click Selection"
        // OR if the user has scrolled significantly away from the selected post
        if (currentPost) {
            const rect = currentPost.getBoundingClientRect();
            // If active post is off-screen, auto-release hash to allow visual scanner
            if (rect.bottom < 0 || rect.top > window.innerHeight) {
                // optionally clear selection or let the code below pick a new one
            }
        }

        // Optional: Continuous scanning could be added here if desired, 
        // but User prefers "Click to Select" or "Auto-use on Action".
    };

    // We remove the aggressive scroll interval to avoid "jumping" selection
    // while the user is reading a specific post.
    // window.addEventListener('scroll', scrollCheck, { passive: true });
}

function updateDashboardTarget(post, isClick) {
    if (currentPost && currentPost !== post) {
        currentPost.classList.remove('ingenia-active-post');
        // Clean up old border immediately
        currentPost.style.border = '';
        currentPost.style.boxShadow = '';
    }

    currentPost = post;

    // Force Visual Feedback
    post.classList.add('ingenia-active-post');
    post.style.border = '2px solid #0a66c2'; // Force inline to be sure
    post.style.borderRadius = '8px';
    post.style.boxShadow = '0 0 10px rgba(10,102,194,0.2)';

    // Update Text
    const authorEl = post.querySelector('.update-components-actor__name, .feed-shared-actor__name, .update-components-actor__title');
    const authorName = authorEl ? authorEl.innerText.split('\n')[0] : "Post";

    const targetText = document.getElementById('ingenia-target-text');
    const dot = document.getElementById('ingenia-status-dot');

    if (targetText && dot) {
        targetText.innerText = "Seleccionado: " + authorName;
        dot.classList.add('active');
        dot.style.background = '#4ade80';
    }
}

// 5. ACTION LOGIC
async function runAction(type) {
    const btn = document.getElementById(type === 'summarize' ? 'btn-summarize' : 'btn-comment');
    const originalText = btn.innerHTML;

    // --- JUST IN TIME SELECTION ---
    // If no post is selected, find the one mostly visible on screen RIGHT NOW.
    if (!currentPost) {
        console.log("IngenIA: No post selected. Searching visible post...");
        const posts = document.querySelectorAll('div[data-urn], .feed-shared-update-v2');
        const viewportCenter = window.innerHeight / 2;
        let bestCandidate = null;
        let minDist = Infinity;

        posts.forEach(p => {
            const r = p.getBoundingClientRect();
            if (r.top < window.innerHeight && r.bottom > 0) {
                const dist = Math.abs((r.top + r.height / 2) - viewportCenter);
                if (dist < minDist) {
                    minDist = dist;
                    bestCandidate = p;
                }
            }
        });

        if (bestCandidate) {
            updateDashboardTarget(bestCandidate, false);
        } else {
            alert("⚠️ No encuentro ningún post en pantalla. Haz clic en uno.");
            return;
        }
    }
    // -----------------------------

    btn.innerHTML = '⏳';
    btn.disabled = true;

    // Extract Text (and expand if needed)
    const textEl = currentPost.querySelector('.feed-shared-update-v2__description, .update-components-text') || currentPost;
    const text = textEl.innerText;

    const { licenseKey } = await chrome.storage.sync.get(['licenseKey']);
    if (!licenseKey) {
        alert("Falta licencia. Configúrala en la extensión.");
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
        console.error(e);
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
    div.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:99999999;display:flex;justify-content:center;align-items:center;";
    div.innerHTML = `
        <div style="background:#1e293b;width:500px;padding:20px;border-radius:12px;color:white;font-family:sans-serif;box-shadow:0 20px 50px rgba(0,0,0,0.5);">
            <h3 style="margin-top:0">${title}</h3>
            <div style="background:#0f172a;padding:15px;border-radius:8px;margin:15px 0;max-height:300px;overflow:auto;white-space:pre-wrap;">${text}</div>
            <div style="text-align:right;">
                <button onclick="this.closest('#ingenia-modal').remove()" style="padding:8px 16px;background:#3b82f6;color:white;border:none;border-radius:6px;cursor:pointer;">Cerrar (Copiado)</button>
            </div>
        </div>
    `;
    document.body.appendChild(div);
}

// --- INITIALIZATION ---
injectStyles();
createDashboard();
initDetectors();
console.log("IngenIA Dashboard Loaded 🚀");
