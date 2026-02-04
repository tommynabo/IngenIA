// --- Floating Dashboard & Logic ---

// 1. INJECT STYLES PROGRAMMATICALLY (To guarantee they exist)
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
    z-index: 2147483647; /* Max Z-Index */
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
    width: 8px; 
    height: 8px; 
    border-radius: 50%; 
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

.ingenia-actions {
    display: flex;
    gap: 8px;
}

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

.ingenia-btn-secondary {
    background: rgba(255,255,255,0.05);
    color: #cbd5e1;
    border: 1px solid #475569;
}

.ingenia-btn-secondary:hover {
    background: rgba(255,255,255,0.1);
    color: white;
}

.ingenia-btn-primary {
    background: #0a66c2;
    color: white;
}

.ingenia-btn-primary:hover {
    background: #004182;
}

/* Comment reply buttons */
.ingenia-reply-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px; height: 30px;
    background: transparent;
    border: none;
    cursor: pointer;
    border-radius: 50%;
    margin-left: 5px;
    font-size: 16px;
}
.ingenia-reply-btn:hover {
    background: rgba(10, 102, 194, 0.1);
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
            <!-- <button style="background:none;border:none;color:#64748b;cursor:pointer;">×</button> -->
        </div>
        <div class="ingenia-target" id="ingenia-target-text">
            Esperando post...
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

    // Bind Events
    document.getElementById('btn-summarize').onclick = () => runAction('summarize');
    document.getElementById('btn-comment').onclick = () => runAction('comment');
}

// 4. SCROLL OBSERVER (The "Eye")
function startObserving() {
    const check = () => {
        const posts = document.querySelectorAll('.feed-shared-update-v2, div[data-urn], .occludable-update');
        const viewportCenter = window.innerHeight / 2;
        let closest = null;
        let minDist = Infinity;

        posts.forEach(post => {
            const r = post.getBoundingClientRect();
            // Check if post overlaps center
            if (r.top < viewportCenter && r.bottom > viewportCenter) {
                const dist = Math.abs((r.top + r.height / 2) - viewportCenter);
                if (dist < minDist) {
                    minDist = dist;
                    closest = post;
                }
            }
        });

        if (closest && closest !== currentPost) {
            updateDashboardTarget(closest);
        }
    };

    window.addEventListener('scroll', check, { passive: true });
    setInterval(check, 1000); // Polling fallback
}

function updateDashboardTarget(post) {
    currentPost = post;
    const authorEl = post.querySelector('.update-components-actor__name, .feed-shared-actor__name');
    const authorName = authorEl ? authorEl.innerText.split('\n')[0] : "Usuario desconocido";

    const targetText = document.getElementById('ingenia-target-text');
    const dot = document.getElementById('ingenia-status-dot');

    if (targetText && dot) {
        targetText.innerText = "Detectado: " + authorName;
        dot.classList.add('active');
    }
}

// 5. ACTION LOGIC
async function runAction(type) {
    if (!currentPost) {
        alert("¡No he detectado ningún post! Haz scroll hasta centrar uno.");
        return;
    }

    const btn = document.getElementById(type === 'summarize' ? 'btn-summarize' : 'btn-comment');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳';
    btn.disabled = true;

    // Extract Text
    const textEl = currentPost.querySelector('.feed-shared-update-v2__description, .update-components-text') || currentPost;
    const text = textEl.innerText;

    // Get Key
    const { licenseKey } = await chrome.storage.sync.get(['licenseKey']);
    if (!licenseKey) {
        alert("Falta la licencia.");
        btn.innerHTML = originalText;
        btn.disabled = false;
        return;
    }

    // Prompt
    const prompt = type === 'summarize'
        ? "Resume esto en español (bullets): " + text
        : "Genera un comentario profesional y cercano: " + text;

    try {
        const res = await new Promise(resolve => chrome.runtime.sendMessage({
            action: 'generate_comment', licenseKey, prompt
        }, resolve));

        if (res.success) {
            navigator.clipboard.writeText(res.result);
            if (type === 'comment') {
                // Try to alert just the result
                showModal("Resultado", res.result);
            } else {
                showModal("Resumen", res.result);
            }
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

// --- MODAL (Simple, Reused) ---
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
                <button onclick="this.closest('#ingenia-modal').remove()" style="padding:8px 16px;background:#3b82f6;color:white;border:none;border-radius:6px;cursor:pointer;">Cerrar</button>
            </div>
        </div>
    `;
    document.body.appendChild(div);
}

// --- INITIALIZATION ---
injectStyles();
createDashboard();
startObserving();
console.log("IngenIA Dashboard Loaded 🚀");
