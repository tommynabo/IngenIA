// --- Constants ---
// Broad selectors to find the post container
const POST_SELECTOR = [
    'div.feed-shared-update-v2',
    'div.occludable-update',
    'div[data-urn]',
    'div[data-id]',
    'article',
    '.feed-shared-update-v2__description-wrapper'
];

// Selectors for the comment box (for the reply feature)
const COMMENT_SELECTOR = [
    '.comments-comment-item',
    '.feed-shared-comment-item',
    'article.comments-comment-item'
];

// --- State ---
const INJECTED_ATTR = 'data-ingenia-injected';
const REPLY_INJECTED_ATTR = 'data-ingenia-reply-injected';
let debugMode = true;

function log(msg, ...args) {
    if (debugMode) console.log(`[IngenIA] ${msg}`, ...args);
}

// --- Main Execution ---
console.log('[IngenIA] SCRIPT STARTED!');

// 0. Visual Debugger (To confirm script load)
createDebugIndicator();

// 1. Initial aggressive scan
scanAndInject();

// 2. Interval "Hammer" - Checks every 1 second.
setInterval(() => {
    scanAndInject();
}, 1000);

// 3. Mutation Observer
// Observe documentElement to catch body creation if run_at is early, though default is idle.
const observer = new MutationObserver((mutations) => {
    scanAndInject();
});
observer.observe(document.documentElement, { childList: true, subtree: true });

function createDebugIndicator() {
    const ind = document.createElement('div');
    ind.title = 'IngenIA Active';
    ind.innerText = '•';
    ind.style.cssText = 'position:fixed;bottom:10px;left:10px;width:20px;height:20px;background:#00ff00;border:2px solid white;border-radius:50%;z-index:2147483647;pointer-events:none;box-shadow:0 0 5px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:16px;';
    document.body ? document.body.appendChild(ind) : document.documentElement.appendChild(ind);
}



function scanAndInject() {
    try {
        injectPostButtons();
        injectReplyButtons();
    } catch (err) {
        log('Critical Error in scanAndInject:', err);
    }
}

// --- Post Buttons Logic ---

function injectPostButtons() {
    // 1. Find all possible posts
    const allDivs = document.querySelectorAll('div, article');

    // We filter "smartly" instead of relying on a huge querySelectorAll string if we can
    // But querySelectorAll is faster. Let's use the combined selector.
    const combinedSelector = POST_SELECTOR.join(', ');
    const potentialPosts = document.querySelectorAll(combinedSelector);

    potentialPosts.forEach(post => {
        if (post.hasAttribute(INJECTED_ATTR)) return;

        // Validation: Must have some text content (don't inject on ads or empty skeletons)
        if ((post.innerText || "").trim().length < 5) return;

        // FIND THE ACTION BAR (Like/Comment/Share/Send)
        let actionBar = findActionBar(post);

        if (actionBar) {
            // Double check: does this action bar already have our buttons?
            if (actionBar.querySelector('.ingenia-btn-container-small')) {
                post.setAttribute(INJECTED_ATTR, 'true');
                return;
            }

            log('Found target, injecting buttons...', post);
            injectButtonsIntoBar(actionBar, post);
            post.setAttribute(INJECTED_ATTR, 'true');
        }
    });
}

function findActionBar(post) {
    // Strategy: Look for the "Like" / "Recomendar" button.
    // It is usually the first button in the action bar.

    // 1. Try to find a button with specific text or label
    const buttons = post.querySelectorAll('button');
    for (const btn of buttons) {
        const text = (btn.innerText || "").toLowerCase();
        const label = (btn.getAttribute('aria-label') || "").toLowerCase();

        // Common words for the Like button in various languages
        const isLikeButton =
            text.includes('recomendar') ||
            text.includes('like') ||
            text.includes('gustar') ||
            text.includes('gusta') ||
            label.includes('reaction') ||
            label.includes('recomendar') ||
            label.includes('like');

        if (isLikeButton) {
            // The action bar is usually the parent (or grandparent) of this button
            // We want the container that holds all these big buttons.
            // Usually standard structure: Action Bar > Button
            return btn.parentElement;
        }
    }

    // 2. Fallback: Try specific classes if text search failed
    return post.querySelector('.feed-shared-social-action-bar') ||
        post.querySelector('.social-actions-bar');
}

function injectButtonsIntoBar(container, postElement) {
    const btnContainer = document.createElement('div');
    btnContainer.className = 'ingenia-btn-container-small';
    btnContainer.style.display = 'flex';
    btnContainer.style.alignItems = 'center';
    btnContainer.style.marginLeft = 'auto'; // Push to the right if in a flex container (optional)
    btnContainer.style.gap = '8px';

    // Summarize Button
    const btnSum = createStyledButton('📝', 'Resumir', () => handleAction(postElement, 'summarize', btnSum));

    // Comment Button
    const btnComment = createStyledButton('⚡️', 'Comentar', () => handleAction(postElement, 'comment', btnComment));

    btnContainer.appendChild(btnSum);
    btnContainer.appendChild(btnComment);

    // Append to the action bar
    container.appendChild(btnContainer);
}

// --- Reply Buttons Logic ---

function injectReplyButtons() {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        if (btn.hasAttribute(REPLY_INJECTED_ATTR)) return;

        const text = (btn.innerText || "").toLowerCase().trim();
        const label = (btn.getAttribute('aria-label') || "").toLowerCase();

        const isReply = (text === 'responder' || text === 'reply') ||
            (label.includes('reply to') || label.includes('responder a'));

        if (isReply) {
            // It's a reply button. Check if it's inside a comment.
            const commentItem = btn.closest(COMMENT_SELECTOR.join(', '));

            if (commentItem) {
                // Check if we already injected
                if (btn.parentNode.querySelector('.ingenia-btn-mini')) {
                    btn.setAttribute(REPLY_INJECTED_ATTR, 'true');
                    return;
                }

                injectReplyButtonDirectly(btn, commentItem);
                btn.setAttribute(REPLY_INJECTED_ATTR, 'true');
            }
        }
    });
}

function injectReplyButtonDirectly(referenceBtn, commentContext) {
    const iaBtn = createStyledButton('✏️', '', () => handleAction(commentContext, 'reply', iaBtn));
    iaBtn.className = 'ingenia-btn-mini';
    iaBtn.title = "Generar respuesta con IA";
    iaBtn.style.marginLeft = '5px';
    iaBtn.style.padding = '4px 8px'; // Smaller for reply

    if (referenceBtn.parentNode) {
        referenceBtn.parentNode.insertBefore(iaBtn, referenceBtn.nextSibling);
    }
}

// --- Helper Functions ---

function createStyledButton(icon, text, onClick) {
    const btn = document.createElement('button');
    btn.className = 'ingenia-btn';
    btn.innerHTML = `<span style="font-size: 1.2em; margin-right: 4px;">${icon}</span> ${text}`;

    // Inline styles to guarantee visibility
    btn.style.display = 'inline-flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.backgroundColor = 'transparent';
    btn.style.border = '1px solid #0a66c2';
    btn.style.color = '#0a66c2';
    btn.style.borderRadius = '16px';
    btn.style.padding = '0 12px';
    btn.style.height = '32px';
    btn.style.fontSize = '14px';
    btn.style.fontWeight = '600';
    btn.style.cursor = 'pointer';
    btn.style.transition = 'background-color 0.2s';

    btn.onmouseover = () => {
        btn.style.backgroundColor = 'rgba(10, 102, 194, 0.1)';
    };
    btn.onmouseout = () => {
        btn.style.backgroundColor = 'transparent';
    };

    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
    });
    return btn;
}

// --- Backend Action Logic ---

async function handleAction(postElement, type, button) {
    // 1. Get License
    let licenseKey;
    try {
        const store = await chrome.storage.sync.get(['licenseKey']);
        licenseKey = store.licenseKey;
    } catch (err) {
        showToast("⚠️ Error de extensión. Recarga la página.");
        return;
    }

    if (!licenseKey) {
        showModal('Falta Licencia', 'Por favor configura tu clave de licencia en la extensión.');
        return;
    }

    // 2. Extract Text
    const textSel = (type === 'reply')
        ? '.comments-comment-item__main-content, .feed-shared-comment-item__comment-content'
        : '.feed-shared-update-v2__description, .update-components-text, .feed-shared-text-view';

    const textNode = postElement.querySelector(textSel) || postElement; // Fallback to whole element text
    const postText = textNode.innerText.trim();

    if (!postText) {
        showToast("⚠️ No encontré texto para procesar.");
        return;
    }

    // 3. Extract Author (Best effort)
    const authorSel = (type === 'reply')
        ? '.comments-post-meta__name-text, .comments-comment-meta__description-title'
        : '.update-components-actor__name, .feed-shared-actor__name';

    const authorNode = postElement.querySelector(authorSel);
    let authorName = authorNode ? authorNode.innerText.trim().split('\n')[0] : "Autor";

    // 4. Send to Background
    const originalContent = button.innerHTML;
    button.innerHTML = '⏳';
    button.disabled = true;

    try {
        let prompt = "";
        if (type === 'summarize') {
            prompt = `Resume esto brevemente. El autor es ${authorName}:\n\n${postText}`;
        } else if (type === 'comment') {
            prompt = `Genera un comentario profesional para este post de ${authorName}:\n\n${postText}`;
        } else if (type === 'reply') {
            prompt = `Responde a este comentario de ${authorName}:\n\n${postText}`;
        }

        const response = await sendMessageToBackground({
            action: 'generate_comment',
            licenseKey: licenseKey,
            prompt: prompt
        });

        if (response.success) {
            showModal('Resultado de IngenIA', response.result, [
                { label: 'Copiar', primary: true, onClick: () => copyToClipboard(response.result) }
            ]);
        } else {
            showToast("❌ Error: " + (response.error || "Desconocido"));
        }

    } catch (error) {
        console.error(error);
        showToast("❌ Error de conexión");
    } finally {
        button.innerHTML = originalContent;
        button.disabled = false;
    }
}

function sendMessageToBackground(payload) {
    return new Promise((resolve, reject) => {
        try {
            chrome.runtime.sendMessage(payload, (response) => {
                if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
                resolve(response);
            });
        } catch (e) {
            reject(e);
        }
    });
}

// --- UI Helpers ---

function showToast(msg) {
    const t = document.createElement('div');
    t.innerText = msg;
    t.style.cssText = `position:fixed;bottom:20px;right:20px;background:#333;color:#fff;padding:10px 20px;border-radius:5px;z-index:99999;`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    showToast("¡Copiado al portapapeles!");
}

function showModal(title, text, actions = []) {
    // Simple modal implementation
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';

    const panel = document.createElement('div');
    panel.style.cssText = 'background:white;padding:20px;border-radius:8px;max-width:500px;width:90%;box-shadow:0 4px 12px rgba(0,0,0,0.2);';

    const h3 = document.createElement('h3');
    h3.innerText = title;
    h3.style.marginTop = '0';

    const p = document.createElement('div');
    p.innerText = text;
    p.style.margin = '15px 0';
    p.style.whiteSpace = 'pre-wrap';
    p.style.maxHeight = '300px';
    p.style.overflowY = 'auto';

    const footer = document.createElement('div');
    footer.style.textAlign = 'right';

    actions.push({ label: 'Cerrar', onClick: () => { } });

    actions.forEach(action => {
        const btn = document.createElement('button');
        btn.innerText = action.label;
        btn.style.cssText = `margin-left:10px;padding:8px 16px;border:none;border-radius:4px;cursor:pointer;background:${action.primary ? '#0a66c2' : '#ddd'};color:${action.primary ? 'white' : 'black'};`;
        btn.onclick = () => {
            if (action.onClick) action.onClick();
            overlay.remove();
        };
        footer.appendChild(btn);
    });

    panel.appendChild(h3);
    panel.appendChild(p);
    panel.appendChild(footer);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
}
