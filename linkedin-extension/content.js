// IngenIA v13 - THE FINAL RESET
// Based on December Backup Architecture + 2026 Selectors

console.log("🚀 IngenIA v13 LOADED 🚀");

// --- 1. VISUAL CHECK (The "Nuclear" Test) ---
// If the user can't see this, the extension isn't running.
const status = document.createElement('div');
status.innerText = "IngenIA v13: ONLINE";
status.style.cssText = "position:fixed; top:10px; right:10px; background:yellow; color:black; padding:5px; z-index:999999; border:2px solid red; font-weight:bold;";
document.body.appendChild(status);
setTimeout(() => status.remove(), 5000); // Remove after 5s

// --- 2. LOGIC (Backup Architecture) ---
const OBSERVER_TARGET = document.body;
const INJECTED_ATTR = 'data-ingenia-v13';

// 2026 Selectors (MATCHED TO SCREENSHOT)
const POST_SELECTOR = '.feed-shared-update-v2'; // The card
// The bar with "Like | Comment | Repost | Send"
const ACTION_BAR_SELECTOR = '.feed-shared-social-action-bar';
// The bar with "100 likes | 20 comments" (PREFERRED, based on screenshot)
const SOCIAL_COUNTS_SELECTOR = '.social-details-social-counts, .feed-shared-social-counts';

const COMMENT_SELECTOR = '.comments-comment-item';
const REPLY_BTN_SELECTOR = '.comments-comment-social-bar__actions .reply-button, button[aria-label*="Responder"], button[aria-label*="Reply"]';


// --- OBSERVER ---
const observer = new MutationObserver((mutations) => {
    scan();
});
observer.observe(OBSERVER_TARGET, { childList: true, subtree: true });

// Loop for backup
setInterval(scan, 2000);

function scan() {
    addPostButtons();
    addCommentPencils();
}

function addPostButtons() {
    // Strategy: Look for the COUNTS bar first (per user screenshot preference), fallback to ACTION bar
    const posts = document.querySelectorAll(POST_SELECTOR);

    posts.forEach(post => {
        if (post.hasAttribute(INJECTED_ATTR)) return;

        // 1. Try finding the counts bar (Best for "Next to Recommend")
        // NOTE: In screenshot, buttons are in the same row as "Like/Comment" buttons? 
        // User said: "Los botones de resumir y comentar al lado del recomendar son los que quiero para el post"
        // "Recomendar" is an ACTION button. So we should target the Action Bar.

        let container = post.querySelector(ACTION_BAR_SELECTOR);

        // Safety: If no action bar, maybe it's a different type of update
        if (!container) return;

        // Verify we aren't inside a comment (nested update?)
        if (post.closest('.comments-comment-item')) return;

        // Check if already injected specifically here
        if (container.querySelector('.ingenia-post-btn')) return;

        // Mark post as processed
        post.setAttribute(INJECTED_ATTR, 'true');

        // Render Buttons
        const div = document.createElement('div');
        div.className = 'ingenia-post-group';
        div.style.cssText = "display: inline-flex; align-items: center; margin-left: 8px;";

        const btnSum = createBtn('📝 Resumir', () => handlePost(post, 'summarize', btnSum));
        const btnCom = createBtn('⚡ Comentar', () => handlePost(post, 'comment', btnCom));

        div.appendChild(btnSum);
        div.appendChild(btnCom);

        // Append to the Action Bar (it usually has flex, so this puts it at the end)
        container.appendChild(div);
    });
}

function addCommentPencils() {
    const comments = document.querySelectorAll(COMMENT_SELECTOR);

    comments.forEach(comment => {
        if (comment.dataset.ingPencil) return;

        // Find "Responder" button "deeply"
        // Most reliable: Find button with text "Responder" or "Reply"
        const btns = comment.querySelectorAll('button');
        let replyBtn = null;

        for (let b of btns) {
            const t = b.innerText.toLowerCase().trim();
            if (t === 'responder' || t === 'reply') {
                replyBtn = b;
                break;
            }
        }

        if (replyBtn && !replyBtn.nextElementSibling?.classList.contains('ingenia-pencil')) {
            comment.dataset.ingPencil = 'true';

            const pencil = document.createElement('button');
            pencil.className = 'ingenia-pencil';
            pencil.innerHTML = '✏️';
            pencil.style.cssText = "background:none; border:none; cursor:pointer; font-size:16px; margin-left:5px; vertical-align:middle;";
            pencil.title = "Generar respuesta";

            pencil.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleReply(comment, pencil);
            };

            // Insert after the reply button
            if (replyBtn.parentNode) {
                replyBtn.parentNode.insertBefore(pencil, replyBtn.nextSibling);
            }
        }
    });
}

function createBtn(text, onClick) {
    const btn = document.createElement('button');
    btn.className = 'ingenia-post-btn';
    btn.innerText = text;
    btn.style.cssText = `
        background: #0a66c2; color: white; border: none; 
        border-radius: 16px; padding: 4px 10px; margin-left: 5px; 
        font-weight: 600; font-size: 13px; cursor: pointer;
    `;
    btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
    }
    return btn;
}

// --- LOGIC ---

async function handlePost(postEl, action, btn) {
    if (!chrome?.storage) return alert("Error: Recarga la página");

    const { licenseKey } = await chrome.storage.sync.get('licenseKey');
    if (!licenseKey) return alert("Falta licencia");

    // Extract Text (Robust Clone)
    const clone = postEl.cloneNode(true);
    // kill comments
    clone.querySelectorAll('.comments-comment-list, .feed-shared-social-action-bar').forEach(e => e.remove());
    const text = clone.innerText.trim();

    if (text.length < 5) return alert("No hay texto");

    // Author
    let author = "Autor";
    const authEl = postEl.querySelector('.update-components-actor__name');
    if (authEl) author = authEl.innerText.split('\n')[0].trim();

    const prompt = action === 'summarize'
        ? `Resume: ${text}`
        : `Comenta post de ${author}: ${text}`;

    callLLM(action, prompt, licenseKey, btn);
}

async function handleReply(commentEl, btn) {
    if (!chrome?.storage) return alert("Error: Recarga la página");

    const { licenseKey } = await chrome.storage.sync.get('licenseKey');
    if (!licenseKey) return alert("Falta licencia");

    const text = commentEl.innerText.split('\n')[0] || commentEl.innerText; // Basic extraction

    const prompt = `Responde a comentario: ${text}`;
    callLLM('reply', prompt, licenseKey, btn);
}

function callLLM(action, prompt, key, btn) {
    const originalText = btn.innerText;
    btn.innerText = "⏳";
    btn.disabled = true;

    chrome.runtime.sendMessage({
        action: 'generate_comment',
        licenseKey: key,
        prompt: prompt
    }, (res) => {
        btn.innerText = originalText;
        btn.disabled = false;

        if (chrome.runtime.lastError) return alert(chrome.runtime.lastError.message);
        if (res.success) {
            showModal(res.result);
        } else {
            alert(res.error);
        }
    });
}

function showModal(text) {
    const div = document.createElement('div');
    div.style.cssText = "position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:99999;";
    div.innerHTML = `
        <div style="background:white; padding:20px; border-radius:10px; max-width:500px; width:90%;">
            <textarea style="width:100%; height:150px; margin-bottom:10px;">${text}</textarea>
            <div style="text-align:right;">
                <button onclick="navigator.clipboard.writeText('${text.replace(/'/g, "\\'")}')">Copiar</button>
                <button onclick="this.closest('div').parentElement.parentElement.remove()">Cerrar</button>
            </div>
        </div>
    `;
    document.body.appendChild(div);
}
