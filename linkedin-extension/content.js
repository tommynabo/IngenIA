// --- Constants ---
const OBSERVER_TARGET = document.body;
// Broad selectors to catch any post type
const POST_SELECTOR = '.feed-shared-update-v2, div[data-urn], .occludable-update';
// Text selectors
const TEXT_SELECTOR = '.feed-shared-update-v2__description, .update-components-text, .feed-shared-text-view, .feed-shared-inline-show-more-text';
const AUTHOR_SELECTOR = '.update-components-actor__name, .feed-shared-actor__name, .update-components-actor__title';

// --- Comment Selectors ---
const COMMENT_SELECTOR = '.comments-comment-item, .feed-shared-comment-item, article.comments-comment-item';
const COMMENT_TEXT_SELECTOR = '.comments-comment-item__main-content, .feed-shared-comment-item__comment-content, .comments-comment-item-content-body';

// --- State ---
const INJECTED_ATTR = 'data-ingenia-injected';
const DEBUG_LOG = true;

function log(msg) {
    if (DEBUG_LOG) console.log("IngenIA: " + msg);
}

// --- Observer ---
const observer = new MutationObserver((mutations) => {
    scanAndInject();
});
observer.observe(OBSERVER_TARGET, { childList: true, subtree: true });

// Initial scan
setTimeout(scanAndInject, 1000); // Wait a bit for React to settle
setInterval(scanAndInject, 2000);

function scanAndInject() {
    try {
        injectPostButtons();
        injectCommentButtons();
    } catch (e) {
        log("Scan Error: " + e.message);
    }
}

// --- MAIN LOGIC: FEED POSTS ---
function injectPostButtons() {
    const posts = document.querySelectorAll(POST_SELECTOR);

    posts.forEach(post => {
        if (post.getAttribute(INJECTED_ATTR) === 'true') return;

        // VISUAL DEBUG: Check if we are finding posts
        // post.style.border = "1px solid red";

        // Find the Action Bar (Like, Comment, Share buttons)
        const actionBar = findActionBar(post);

        if (actionBar) {
            log("Found Action Bar. Creating Footer...");

            // Create our dedicated row
            const footerRow = document.createElement('div');
            footerRow.className = 'ingenia-feed-row';

            // FORCE VISIBILITY STYLES (Inline to override anything)
            footerRow.style.cssText = `
                display: flex !important;
                justify-content: flex-end !important;
                align-items: center !important;
                width: 100% !important;
                padding: 8px 12px !important;
                background-color: #f3f6f8 !important; 
                border-top: 1px solid #e0e0e0 !important;
                margin-top: 0px !important;
                box-sizing: border-box !important;
                z-index: 1000 !important;
                min-height: 44px !important;
            `;

            // Inject logic
            injectButtons(footerRow, post);

            // INSERTION: Insert AFTER the action bar
            // We use parentNode.insertBefore(newNode, referenceNode.nextSibling)
            if (actionBar.parentNode) {
                actionBar.parentNode.insertBefore(footerRow, actionBar.nextSibling);
                post.setAttribute(INJECTED_ATTR, 'true');
            }
        } else {
            log("No Action Bar found for this post.");
        }
    });
}

function findActionBar(post) {
    // 1. Try standard class name (sometimes works)
    let bar = post.querySelector('.feed-shared-social-action-bar');
    if (bar) return bar;

    // 2. Fallback: Find the "Like" or "Recomendar" button and get its parent
    const buttons = post.querySelectorAll('button');
    for (let btn of buttons) {
        const text = (btn.innerText || "").toLowerCase();
        const label = (btn.getAttribute('aria-label') || "").toLowerCase();

        if (text.includes('recomendar') || text.includes('like') || text.includes('gusta') ||
            label.includes('recomendar') || label.includes('like')) {

            // Usually the button is inside a span/div, which is inside the bar.
            // Check grand-parent or parent.
            let candidate = btn.parentElement;
            // Go up until we find a container that spans widely or has multiple buttons
            if (candidate && candidate.tagName === 'DIV') return candidate;
            if (candidate && candidate.parentElement && candidate.parentElement.tagName === 'DIV') return candidate.parentElement;

            return btn.parentElement; // Worst case
        }
    }
    return null;
}

// --- LOGIC: COMMENT REPLIES ---
function injectCommentButtons() {
    const allButtons = document.querySelectorAll('button');
    allButtons.forEach(btn => {
        if (btn.dataset.ingeniaHandled) return;

        const text = (btn.innerText || "").toLowerCase().trim();
        const label = (btn.getAttribute('aria-label') || "").toLowerCase();

        // Find "Reply" or "Responder" buttons
        const isReply = text === 'responder' || text === 'reply' ||
            label.includes('responder') || label.includes('reply');

        if (isReply) {
            const commentItem = btn.closest(COMMENT_SELECTOR) || btn.closest('article');
            if (commentItem) {
                const iaBtn = createButton('✏️', '', () => handleAction(commentItem, 'reply', iaBtn));
                iaBtn.className = 'ingenia-btn-mini';
                iaBtn.title = "IA Reply";
                iaBtn.style.marginLeft = "8px";

                btn.insertAdjacentElement('afterend', iaBtn);
                btn.dataset.ingeniaHandled = 'true';
            }
        }
    });
}

// --- HELPER: Create Buttons ---
function injectButtons(container, postElement) {
    // Summarize
    const btnSum = createButton('📝', 'Resumir', () => handleAction(postElement, 'summarize', btnSum));
    // Comment
    const btnComment = createButton('⚡️', 'Comentar', () => handleAction(postElement, 'comment', btnComment));

    container.appendChild(btnSum);
    container.appendChild(btnComment);
}

function createButton(icon, text, onClick) {
    const btn = document.createElement('button');
    btn.className = 'ingenia-btn'; // keeps class for hover effects
    btn.innerHTML = `<span style="margin-right:4px">${icon}</span> <span>${text}</span>`;

    // Inline default styles to ensure visibility
    btn.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background-color: #0a66c2;
        color: white;
        border: none;
        border-radius: 16px;
        padding: 5px 12px;
        font-weight: 600;
        font-size: 13px;
        margin-left: 8px;
        cursor: pointer;
        line-height: 1.2;
    `;

    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
    });
    return btn;
}

// --- ACTION HANDLER (Copy/Paste Logic) ---
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

    let selector = TEXT_SELECTOR;
    if (type === 'reply') selector = COMMENT_TEXT_SELECTOR;

    let textNode = element.querySelector(selector) || element.innerText;
    let text = (typeof textNode === 'string') ? textNode : textNode.innerText;

    if (!text || text.length < 5) text = element.innerText; // Fallback

    const originalHtml = button.innerHTML;
    button.innerHTML = '⏳...';
    button.disabled = true;

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
                { label: 'Copiar', primary: true, onClick: () => copyText(response.result) }
            ]);
        } else {
            alert("Error: " + response.error);
        }
    } catch (e) {
        console.error(e);
        alert("Error de conexión. Recarga.");
    } finally {
        button.innerHTML = originalHtml;
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

// --- MODAL UI ---
function showModal(title, content, btns) {
    let ol = document.querySelector('.ingenia-overlay');
    if (ol) ol.remove();

    ol = document.createElement('div');
    ol.className = 'ingenia-overlay';
    // Inline Overlay Styles
    ol.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:999999;display:flex;justify-content:center;align-items:center;";

    ol.innerHTML = `
    <div style="background:#1e293b;width:500px;max-width:90%;border-radius:12px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.5);color:#fff;font-family:sans-serif;">
        <div style="padding:15px;background:#0f172a;border-bottom:1px solid #334155;display:flex;justify-content:space-between;align-items:center;">
            <h3 style="margin:0;font-size:16px;">${title}</h3>
            <button onclick="this.closest('.ingenia-overlay').remove()" style="background:none;border:none;color:#999;cursor:pointer;font-size:18px;">×</button>
        </div>
        <div style="padding:20px;white-space:pre-wrap;line-height:1.5;color:#cbd5e1;max-height:60vh;overflow-y:auto;">${content}</div>
        <div style="padding:15px;background:#1e293b;border-top:1px solid #334155;text-align:right;" id="modal-footer"></div>
    </div>`;

    const ft = ol.querySelector('#modal-footer');
    btns.forEach(b => {
        const btn = document.createElement('button');
        btn.innerText = b.label;
        btn.style.cssText = "background:#3b82f6;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:bold;";
        btn.onclick = () => { if (b.onClick) b.onClick(); ol.remove(); };
        ft.appendChild(btn);
    });

    document.body.appendChild(ol);
}
