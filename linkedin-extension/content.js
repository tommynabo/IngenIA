// --- Constants ---
const OBSERVER_TARGET = document.body;
const POST_SELECTOR = '.feed-shared-update-v2, div[data-urn], .occludable-update';
const TEXT_SELECTOR = '.feed-shared-update-v2__description, .update-components-text, .feed-shared-text-view, .feed-shared-inline-show-more-text';
const AUTHOR_SELECTOR = '.update-components-actor__name, .feed-shared-actor__name, .update-components-actor__title';

// --- State ---
let currentVisiblePost = null;
let dashboardElement = null;

// --- Initialization ---
function init() {
    createDashboard();
    startScrollObserver();

    // Also handle comment buttons (keep those as they were working fine usually)
    setInterval(injectCommentButtons, 2000);
}

// --- Dashboard UI ---
function createDashboard() {
    if (document.getElementById('ingenia-dashboard')) return;

    const dash = document.createElement('div');
    dash.id = 'ingenia-dashboard';

    // HTML Structure
    dash.innerHTML = `
        <div class="ingenia-dash-header">
            <span class="ingenia-status-dot"></span>
            <span id="ingenia-target-name">Esperando post...</span>
        </div>
        <div class="ingenia-dash-actions">
            <button id="ingenia-btn-summarize" class="ingenia-dash-btn">
                📝 Resumir
            </button>
            <button id="ingenia-btn-comment" class="ingenia-dash-btn primary">
                ⚡️ Comentar
            </button>
        </div>
    `;

    document.body.appendChild(dash);
    dashboardElement = dash;

    // Event Listeners
    document.getElementById('ingenia-btn-summarize').addEventListener('click', () => {
        if (currentVisiblePost) handleAction(currentVisiblePost, 'summarize', document.getElementById('ingenia-btn-summarize'));
    });

    document.getElementById('ingenia-btn-comment').addEventListener('click', () => {
        if (currentVisiblePost) handleAction(currentVisiblePost, 'comment', document.getElementById('ingenia-btn-comment'));
    });
}

function updateDashboard(post) {
    if (!post) return;

    currentVisiblePost = post;
    const authorEl = post.querySelector(AUTHOR_SELECTOR);
    const authorName = authorEl ? authorEl.innerText.split('\n')[0] : "Post desconocido"; // Clean up name

    const targetNameEl = document.getElementById('ingenia-target-name');
    if (targetNameEl) targetNameEl.innerText = limitText(authorName, 20);

    const dot = document.querySelector('.ingenia-status-dot');
    if (dot) dot.style.background = '#4ade80'; // Green active
}

function limitText(text, len) {
    if (text.length <= len) return text;
    return text.substring(0, len) + '...';
}

// --- Scroll/Visibility Logic ---
function startScrollObserver() {
    // We scan for posts and check which one is closest to center of screen
    const checkVisibility = () => {
        const posts = document.querySelectorAll(POST_SELECTOR);
        let closestPost = null;
        let minDistance = Infinity;

        const viewportCenter = window.innerHeight / 2;

        posts.forEach(post => {
            const rect = post.getBoundingClientRect();
            // Calculate distance from post center to viewport center
            const postCenter = rect.top + (rect.height / 2);
            const distance = Math.abs(viewportCenter - postCenter);

            // Only consider posts that are actually somewhat on screen
            if (rect.bottom > 0 && rect.top < window.innerHeight) {
                if (distance < minDistance) {
                    minDistance = distance;
                    closestPost = post;
                }
            }
        });

        if (closestPost && closestPost !== currentVisiblePost) {
            updateDashboard(closestPost);

            // Optional: Highlight border to show user what's selected (Subtle)
            // posts.forEach(p => p.style.border = 'none');
            // closestPost.style.border = '2px solid #3b82f6';
        }
    };

    // Check on scroll and interval (for dynamic loading)
    window.addEventListener('scroll', checkVisibility, { passive: true });
    setInterval(checkVisibility, 1000);
}

// --- Logic for Comments (Keep existing injection for specific replies) ---
const COMMENT_SELECTOR = '.comments-comment-item, .feed-shared-comment-item';
function injectCommentButtons() {
    const allButtons = document.querySelectorAll('button');
    allButtons.forEach(btn => {
        if (btn.dataset.ingeniaHandled) return;
        const width = btn.offsetWidth;
        if (width === 0) return; // Skip hidden

        const text = (btn.innerText || "").toLowerCase().trim();
        const label = (btn.getAttribute('aria-label') || "").toLowerCase();

        const isReply = text === 'responder' || text === 'reply' || label.includes('responder') || label.includes('reply');

        if (isReply) {
            const commentItem = btn.closest(COMMENT_SELECTOR) || btn.closest('article');
            if (commentItem) {
                const iaBtn = document.createElement('button');
                iaBtn.innerHTML = '✏️';
                iaBtn.className = 'ingenia-btn-mini';
                iaBtn.title = "IA Reply";
                iaBtn.style.marginLeft = "8px";
                iaBtn.onclick = (e) => {
                    e.preventDefault();
                    handleAction(commentItem, 'reply', iaBtn);
                };

                btn.insertAdjacentElement('afterend', iaBtn);
                btn.dataset.ingeniaHandled = 'true';
            }
        }
    });
}

// --- Action Handler (Unified) ---
async function handleAction(element, type, button) {
    let licenseKey;
    try {
        const store = await chrome.storage.sync.get(['licenseKey']);
        licenseKey = store.licenseKey;
    } catch { return; }

    if (!licenseKey) {
        alert('Configura tu clave en la extensión primero.');
        return;
    }

    // Selector logic
    let selector = TEXT_SELECTOR;
    if (type === 'reply') selector = '.comments-comment-item__main-content';

    let textNode = element.querySelector(selector) || element.innerText;
    let text = (typeof textNode === 'string') ? textNode : textNode.innerText;

    if (!text || text.length < 5) text = element.innerText;

    // UI Loading state
    const originalText = button.innerHTML;
    button.innerHTML = '⏳';
    button.disabled = true;

    // Prompts
    let promptPrefix = "";
    if (type === 'summarize') promptPrefix = "Resume este post de LinkedIn en español (bullet points): ";
    if (type === 'comment') promptPrefix = "Genera un comentario profesional y cercano para este post: ";
    if (type === 'reply') promptPrefix = "Genera una respuesta breve y amable para este comentario: ";

    try {
        const response = await sendMessage({
            action: 'generate_comment',
            licenseKey: licenseKey,
            prompt: promptPrefix + "\n\n" + text
        });

        if (response.success) {
            showModal('Resultado IA', response.result, [
                { label: 'Copiar', primary: true, onClick: () => copyText(response.result) },
                { label: 'Insertar', primary: false, onClick: () => insertText(element, response.result) }
            ]);
        } else {
            alert("Error: " + response.error);
        }
    } catch (e) {
        console.error(e);
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

function sendMessage(payload) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(payload, r => {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError.message);
            else resolve(r);
        });
    });
}

function copyText(txt) {
    navigator.clipboard.writeText(txt);
}

function insertText(context, text) {
    // Find closest open editor or click reply/comment to open it
    let triggerBtn = context.querySelector('.comment-button') || context.querySelector('.reply-action') || context.querySelector('button[aria-label*="Reply"]');
    if (triggerBtn) triggerBtn.click();

    setTimeout(() => {
        const editor = document.activeElement.classList.contains('ql-editor') ? document.activeElement : context.querySelector('.ql-editor');
        if (editor) {
            editor.focus();
            document.execCommand('insertText', false, text);
        } else {
            copyText(text);
            alert("Texto copiado al portapapeles (No se pudo insertar automáticamente).");
        }
    }, 800);
}


// --- Modal UI ---
function showModal(title, content, btns) {
    let ol = document.querySelector('.ingenia-overlay');
    if (ol) ol.remove();

    ol = document.createElement('div');
    ol.className = 'ingenia-overlay';
    // Forced Inline Styles for Modal Overlay
    ol.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9999999;display:flex;justify-content:center;align-items:center;backdrop-filter:blur(2px);";

    ol.innerHTML = `
    <div style="background:#1e293b;width:500px;max-width:90%;border-radius:12px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.5);color:#fff;font-family:system-ui, sans-serif;border:1px solid #334155;">
        <div style="padding:16px 20px;background:#0f172a;border-bottom:1px solid #334155;display:flex;justify-content:space-between;align-items:center;">
            <h3 style="margin:0;font-size:16px;font-weight:600;color:#f8fafc;">${title}</h3>
            <button onclick="this.closest('.ingenia-overlay').remove()" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:24px;line-height:1;">×</button>
        </div>
        <div style="padding:24px;white-space:pre-wrap;line-height:1.6;color:#cbd5e1;max-height:60vh;overflow-y:auto;font-size:15px;">${content}</div>
        <div style="padding:16px 24px;background:#1e293b;border-top:1px solid #334155;display:flex;justify-content:flex-end;gap:10px;" id="modal-footer"></div>
    </div>`;

    const ft = ol.querySelector('#modal-footer');
    btns.forEach(b => {
        const btn = document.createElement('button');
        btn.innerText = b.label;
        if (b.primary) {
            btn.style.cssText = "background:#3b82f6;color:white;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-weight:600;transition:background 0.2s;";
        } else {
            btn.style.cssText = "background:transparent;color:#94a3b8;border:1px solid #475569;padding:8px 16px;border-radius:8px;cursor:pointer;font-weight:600;transition:all 0.2s;";
        }
        btn.onclick = () => { if (b.onClick) b.onClick(); ol.remove(); };
        ft.appendChild(btn);
    });

    document.body.appendChild(ol);
}


// Start
init();
