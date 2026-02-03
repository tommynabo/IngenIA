// --- Constants ---
const OBSERVER_TARGET = document.body;
// Wrapper typically used by LinkedIn feed updates
const POST_SELECTOR = '.feed-shared-update-v2, [data-urn*="activity"], article';
// New target: The bar with "100 likes - 20 comments" OR the action bar
const DETAILS_SELECTOR = '.social-details-social-counts, .feed-shared-social-counts, .social-counts';
// Fallback: Action bar if counts are missing (e.g. 0 likes/comments)
const ACTION_BAR_SELECTOR = '.feed-shared-social-action-bar, [class*="social-action-bar"], .social-actions-bar';
const TEXT_SELECTOR = '.feed-shared-update-v2__description, .update-components-text, .feed-shared-text-view, [class*="update-components-text"]';
const AUTHOR_SELECTOR = '.update-components-actor__name, .feed-shared-actor__name, [class*="actor__name"]';

// --- Comment Selectors ---
const COMMENT_SELECTOR = '.comments-comment-item, .feed-shared-comment-item, .comments-comment-entity, [class*="comment-item"]';
const COMMENT_ACTIONS_SELECTOR = '.comments-comment-social-bar__actions, .feed-shared-comment-social-bar__actions, .social-action-bar';
const COMMENT_TEXT_SELECTOR = '.comments-comment-item__main-content, .feed-shared-comment-item__comment-content, [class*="comment-text"], [class*="main-content"]';
const COMMENT_AUTHOR_SELECTOR = '.comments-post-meta__name-text, .comments-comment-meta__description-title';

// --- State ---
const INJECTED_ATTR = 'data-ingenia-injected';

// --- Observer ---
const observer = new MutationObserver((mutations) => {
    // Debounce slightly or just run if nodes added
    scanAndInject();
});

observer.observe(OBSERVER_TARGET, { childList: true, subtree: true });

// Initial scan
setTimeout(scanAndInject, 1000);
setInterval(scanAndInject, 2000); // Fail-safe fallback

function scanAndInject() {
    // 1. Post Buttons (Old Logic - keep for posts)
    // We can keep the specific logic for main posts if it works, or unify it. 
    // Let's keep the main posts logic distinct for now to avoid breaking it.
    const posts = document.querySelectorAll(POST_SELECTOR);
    posts.forEach(post => {
        if (post.hasAttribute(INJECTED_ATTR)) return;

        // Try multiple selectors to find where to put the buttons
        const targetContainer = post.querySelector(DETAILS_SELECTOR) || post.querySelector(ACTION_BAR_SELECTOR);

        if (targetContainer) {
            injectButtons(targetContainer, post);
            post.setAttribute(INJECTED_ATTR, 'true');
        }
    });

    // 2. Reply Buttons (Robust "Find Text" Logic)
    // Find ALL buttons on the page
    const allButtons = document.querySelectorAll('button, span[role="button"]');

    allButtons.forEach(btn => {
        // Filter for "Reply" or "Responder"
        // Check innerText and aria-label
        const text = (btn.innerText || "").toLowerCase().trim();
        const label = (btn.getAttribute('aria-label') || "").toLowerCase();

        // Conditions to be a "Reply" button
        const isReply = text === 'responder' || text === 'reply' ||
            label.includes('reply to') || label.includes('responder a');

        // Verify it hasn't been handled
        if (isReply && !btn.dataset.ingeniaHandled) {
            // Find the container (usually the parent)
            const container = btn.parentElement;

            // Check if we already injected in this container (avoid dupes)
            if (container.querySelector('.ingenia-btn-mini') || btn.nextElementSibling?.classList.contains('ingenia-btn-mini')) {
                btn.dataset.ingeniaHandled = 'true';
                return;
            }

            // Find the closest "Comment" or "Post" context to get text later
            // We need to look up the tree for the comment text
            const commentItem = btn.closest(COMMENT_SELECTOR) ||
                btn.closest('article'); // fallback

            if (commentItem) {
                // IMPORTANT: Ensure we are in a comment, NOT a main post (main posts have big buttons)
                // Use a check to see if this is a comment item
                const isComment = commentItem.matches(COMMENT_SELECTOR);

                if (isComment) {
                    injectReplyButtonDirectly(btn, commentItem);
                    btn.dataset.ingeniaHandled = 'true';
                }
            }
        }
    });
}

function injectReplyButtonDirectly(referenceBtn, commentContext) {
    // Create mini button
    const iaBtn = createButton('✏️', '', () => handleAction(commentContext, 'reply', iaBtn));
    iaBtn.className = 'ingenia-btn-mini';
    iaBtn.title = "Generar respuesta con IA";
    iaBtn.style.marginLeft = '8px'; // Add spacing

    // Inject specifically AFTER the reference button (The Reply button)
    if (referenceBtn.parentNode) {
        referenceBtn.after(iaBtn);
    }
}

function injectButtons(container, postElement) {
    // Check if buttons already exist in this container
    if (container.querySelector('.ingenia-btn-container-small')) return;

    const btnContainer = document.createElement('div');
    btnContainer.className = 'ingenia-btn-container-small';
    btnContainer.style.display = 'inline-flex';
    btnContainer.style.alignItems = 'center';
    btnContainer.style.marginLeft = '12px';

    // Summarize
    const btnSum = createButton('📝', 'Resumir', () => handleAction(postElement, 'summarize', btnSum));
    // Comment
    const btnComment = createButton('⚡️', 'Comentar', () => handleAction(postElement, 'comment', btnComment));

    btnContainer.appendChild(btnSum);
    btnContainer.appendChild(btnComment);
    container.appendChild(btnContainer);
}

function createButton(icon, text, onClick) {
    const btn = document.createElement('button');
    btn.className = 'ingenia-btn';
    btn.innerHTML = `<span class="ingenia-icon">${icon}</span> ${text}`;
    // Inline styles to ensure visibility regardless of CSS loading
    btn.style.cssText = `
        background-color: #0a66c2;
        color: white;
        border: none;
        border-radius: 16px;
        padding: 5px 12px;
        margin-right: 6px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        font-size: 13px;
        transition: background-color 0.2s;
    `;

    if (text === '') { // Pencil style
        btn.style.backgroundColor = 'transparent';
        btn.style.color = '#333';
        btn.style.fontSize = '16px';
        btn.style.padding = '0';
        btn.style.margin = '0 0 0 8px';
    }

    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
    });
    return btn;
}

// --- Logic ---
async function handleAction(postElement, type, button) {
    // 1. Get License Key
    let licenseKey;
    try {
        // Safe check for chrome storage which might fail if context invalidated
        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
            showModal('Error', 'La extensión necesita recargarse. Por favor refresca la página.');
            return;
        }

        const store = await chrome.storage.sync.get(['licenseKey']);
        licenseKey = store.licenseKey;
    } catch (err) {
        showToast("⚠️ Extensión invalidada. Recarga la página por favor.");
        return;
    }

    if (!licenseKey) {
        showModal('Falta Configuración', 'No tienes configurada la Clave de Licencia. Abre la extensión y pégala.');
        return;
    }

    // 2. Get Text & Author based on type
    let textSel = TEXT_SELECTOR;
    let authSel = AUTHOR_SELECTOR;

    if (type === 'reply') {
        textSel = COMMENT_TEXT_SELECTOR;
        authSel = COMMENT_AUTHOR_SELECTOR;
    }

    // Try finding text
    let postText = "";
    // Try primary selector
    let textNode = postElement.querySelector(textSel);

    // If not found, try fallback specific selectors
    if (!textNode) {
        if (type === 'reply') {
            // Try to find ANY text container in the comment
            textNode = postElement.querySelector('[class*="comment"]');
        } else {
            // Main post text fallback
            textNode = postElement.querySelector('.feed-shared-update-v2__description');
        }
    }

    // If still just getting the container, try to get cleaned text
    if (textNode) {
        postText = textNode.innerText.trim();
    } else {
        // Last resort: just get all text from the element
        postText = postElement.innerText.substring(0, 1000).trim();
    }

    if (!postText || postText.length < 5) {
        showModal('Error', 'No pude encontrar texto suficiente para procesar.');
        return;
    }

    // 3. Get Author
    const authorNode = postElement.querySelector(authSel) ||
        postElement.querySelector('.update-components-actor__name') ||
        postElement.querySelector('.feed-shared-actor__name') ||
        postElement.querySelector('.comments-post-meta__name-text');

    let authorName = "Desconocido";
    if (authorNode) {
        const srOnly = authorNode.querySelector('.visually-hidden');
        if (srOnly) srOnly.remove();
        authorName = authorNode.innerText.trim().split('\n')[0];
    }

    // 4. Prepare Prompt
    let prompt;
    if (authorName && authorName !== "Desconocido") {
        prompt = `CONTEXT: The author of the following post is "${authorName}".\n\nPOST CONTENT:\n${postText}\n\n(INSTRUCTION: You MUST cite the author "@${authorName}" in your response, preferably at the end)`;
    } else {
        prompt = `POST CONTENT:\n${postText}`;
    }

    if (type === 'summarize') {
        prompt = `Resume esto brevemente en español con puntos clave. El autor es ${authorName}.\n\nTexto: ${postText}`;
    } else if (type === 'reply') {
        prompt = `CONTEXTO: Estás respondiendo a un comentario en LinkedIn. El autor del comentario es "${authorName}".\n\nCONTENIDO DEL COMENTARIO:\n${postText}\n\n(INSTRUCCIÓN: Escribe una respuesta amable, profesional y breve (max 2 frases) a este comentario. Usa "@${authorName}" si es apropiado para el contexto. Tono: Cercano pero profesional.)`;
    }

    // 5. UI Loading
    const originalHTML = button.innerHTML;
    button.innerHTML = '⏳';
    button.disabled = true;

    // 5. Send Message to Background
    try {
        const response = await sendMessageToBackground({
            action: 'generate_comment',
            licenseKey: licenseKey,
            prompt: prompt
        });

        if (response.success) {
            if (type === 'comment' || type === 'reply') {
                showModal(type === 'reply' ? 'Respuesta Generada' : 'Comentario Generado', response.result, [
                    { label: 'Insertar', primary: true, onClick: () => insertText(postElement, response.result) },
                    { label: 'Copiar', onClick: () => copyToClipboard(response.result) }
                ]);
            } else {
                showModal('Resumen', response.result, [
                    { label: 'Copiar', primary: true, onClick: () => copyToClipboard(response.result) }
                ]);
            }
        } else {
            throw new Error(response.error || "Error desconocido");
        }
    } catch (err) {
        console.error(err);
        showModal('Error', err.message);
    } finally {
        button.innerHTML = originalHTML;
        button.disabled = false;
    }
}

// Wrapper to handle "Extension context invalidated" gracefully
function sendMessageToBackground(payload) {
    return new Promise((resolve, reject) => {
        try {
            chrome.runtime.sendMessage(payload, (response) => {
                if (chrome.runtime.lastError) {
                    return reject(new Error(chrome.runtime.lastError.message));
                }
                resolve(response);
            });
        } catch (e) {
            reject(new Error("Contexto invalidado. Recarga la página."));
        }
    });
}

function insertText(postElement, text) {
    // Attempt multiple strategies to find the comment box
    // Strategy 1: Find "Reply" button and click it to open editor if needed
    const replyBtn = postElement.querySelector('button.reply-action') ||
        Array.from(postElement.querySelectorAll('button')).find(b => (b.innerText || '').toLowerCase().includes('reply') || (b.innerText || '').toLowerCase().includes('responder'));

    if (replyBtn) replyBtn.click();

    setTimeout(() => {
        const editor = postElement.querySelector('.ql-editor') ||
            postElement.querySelector('div[contenteditable="true"]') ||
            document.activeElement; // Fallback to active element if click focused it

        if (editor && editor.isContentEditable) {
            editor.focus();
            // Deprecated but reliable for rich text editors
            document.execCommand('insertText', false, text);
            editor.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            copyToClipboard(text);
            showToast("No encontré el editor, copiado al portapapeles.");
        }
    }, 600); // Slightly reduced wait
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    showToast("¡Copiado!");
}

// --- UI Components ---

function showToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = `
    position: fixed; bottom: 20px; right: 20px;
    background: #333; color: white; padding: 12px 24px;
    border-radius: 8px; z-index: 10001; font-family: sans-serif;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function showModal(title, text, actions = []) {
    // Cleanup existing
    const existing = document.querySelector('.ingenia-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'ingenia-modal-overlay';
    // Ensure overlay style exists if css didn't load
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); z-index: 10000;
        display: flex; justify-content: center; align-items: center;
    `;

    const modal = document.createElement('div');
    modal.className = 'ingenia-modal';
    modal.style.cssText = `
        background: white; width: 500px; max-width: 90%;
        border-radius: 12px; padding: 20px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        display: flex; flex-direction: column; gap: 16px;
    `;

    // Header
    const header = document.createElement('div');
    header.className = 'ingenia-modal-header';
    header.style.cssText = "display: flex; justify-content: space-between; align-items: center;";

    header.innerHTML = `<h3 class="ingenia-modal-title" style="margin:0; font-size: 18px; color: #333;">${title}</h3>`;
    const close = document.createElement('button');
    close.className = 'ingenia-close-btn';
    close.innerHTML = '&times;';
    close.style.cssText = "background:none; border:none; font-size: 24px; cursor: pointer; color: #666;";
    close.onclick = () => overlay.remove();
    header.appendChild(close);

    // Body
    const body = document.createElement('div');
    body.className = 'ingenia-modal-body';
    body.style.cssText = "padding: 10px; background: #f9f9f9; border-radius: 8px; max-height: 300px; overflow-y: auto; white-space: pre-wrap; font-size: 14px; line-height: 1.5; color: #444;";
    body.innerText = text;

    // Footer
    const footer = document.createElement('div');
    footer.className = 'ingenia-modal-footer';
    footer.style.cssText = "display: flex; justify-content: flex-end; gap: 10px;";

    if (actions.length === 0) actions.push({ label: 'Cerrar' });

    actions.forEach(act => {
        const btn = document.createElement('button');
        btn.textContent = act.label;
        if (act.primary) {
            btn.style.cssText = "background: #0a66c2; color: white; border: none; padding: 8px 16px; border-radius: 16px; font-weight: 600; cursor: pointer;";
        } else {
            btn.style.cssText = "background: white; color: #0a66c2; border: 1px solid #0a66c2; padding: 8px 16px; border-radius: 16px; font-weight: 600; cursor: pointer;";
        }

        btn.onclick = () => {
            if (act.onClick) act.onClick();
            overlay.remove();
        };
        footer.appendChild(btn);
    });

    modal.append(header, body, footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}
