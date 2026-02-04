// --- Constants ---
const OBSERVER_TARGET = document.body;
// Wrapper typically used by LinkedIn feed updates
const POST_SELECTOR = '.feed-shared-update-v2';
// New target: The bar with "100 likes - 20 comments"
const DETAILS_SELECTOR = '.social-details-social-counts, .feed-shared-social-counts';
// Fallback: Action bar if counts are missing (e.g. 0 likes/comments)
const ACTION_BAR_SELECTOR = '.feed-shared-social-action-bar';
const TEXT_SELECTOR = '.feed-shared-update-v2__description, .update-components-text, .feed-shared-text-view';
const AUTHOR_SELECTOR = '.update-components-actor__name, .feed-shared-actor__name';

// --- Comment Selectors ---
const COMMENT_SELECTOR = '.comments-comment-item, .feed-shared-comment-item';
const COMMENT_ACTIONS_SELECTOR = '.comments-comment-social-bar__actions, .feed-shared-comment-social-bar__actions, .social-action-bar'; // Added generic generic
const COMMENT_TEXT_SELECTOR = '.comments-comment-item__main-content, .feed-shared-comment-item__comment-content';
const COMMENT_AUTHOR_SELECTOR = '.comments-post-meta__name-text, .comments-comment-meta__description-title';

// --- State ---
const INJECTED_ATTR = 'data-ingenia-injected';

// --- Observer ---
const observer = new MutationObserver((mutations) => {
    if (mutations.some(m => m.addedNodes.length > 0)) {
        scanAndInject();
    }
});

observer.observe(OBSERVER_TARGET, { childList: true, subtree: true });

// Initial scan
scanAndInject();

function scanAndInject() {
    // 1. Post Buttons (Old Logic - keep for posts)
    // We can keep the specific logic for main posts if it works, or unify it. 
    // Let's keep the main posts logic distinct for now to avoid breaking it.
    const posts = document.querySelectorAll(POST_SELECTOR);
    posts.forEach(post => {
        if (post.hasAttribute(INJECTED_ATTR)) return;
        const targetContainer = post.querySelector(DETAILS_SELECTOR) || post.querySelector(ACTION_BAR_SELECTOR);
        if (targetContainer) {
            injectButtons(targetContainer, post);
            post.setAttribute(INJECTED_ATTR, 'true');
        }
    });

    // 2. Reply Buttons (Robust "Find Text" Logic)
    // Find ALL buttons on the page
    const allButtons = document.querySelectorAll('button');

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
            if (container.querySelector('.ingenia-btn-mini')) {
                btn.dataset.ingeniaHandled = 'true';
                return;
            }

            // Find the closest "Comment" or "Post" context to get text later
            // We need to look up the tree for the comment text
            const commentItem = btn.closest('.comments-comment-item') ||
                btn.closest('.feed-shared-comment-item') ||
                btn.closest('article'); // fallback

            if (commentItem) {
                injectReplyButtonDirectly(btn, commentItem);
                btn.dataset.ingeniaHandled = 'true';
            }
        }
    });
}

function injectReplyButtonDirectly(referenceBtn, commentContext) {
    // Create mini button
    const iaBtn = createButton('✏️', '', () => handleAction(commentContext, 'reply', iaBtn));
    iaBtn.className = 'ingenia-btn-mini';
    iaBtn.title = "Generar respuesta con IA";

    // Inject specifically AFTER the reference button (The Reply button)
    referenceBtn.insertAdjacentElement('afterend', iaBtn);
}

function injectButtons(container, postElement) {
    const btnContainer = document.createElement('div');
    btnContainer.className = 'ingenia-btn-container-small';

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
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
    });
    return btn;
}

// --- Logic ---
// --- Logic ---
async function handleAction(postElement, type, button) {
    // 1. Get License Key
    let licenseKey;
    try {
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
    const textNode = postElement.querySelector(textSel) || postElement.querySelector(TEXT_SELECTOR); // Fallback
    const postText = textNode ? textNode.innerText.trim() : "";

    if (!postText) {
        showModal('Error', 'No pude encontrar texto para procesar.');
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
    // We send context so the LLM knows who the author is for citation.
    // Ensure clear separation.
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
    button.innerHTML = '<div class="ingenia-spinner"></div>';
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

    const modal = document.createElement('div');
    modal.className = 'ingenia-modal';

    // Header
    const header = document.createElement('div');
    header.className = 'ingenia-modal-header';
    // FIX: Removed spaces in H3 tags
    header.innerHTML = `<h3 class="ingenia-modal-title">${title}</h3>`;
    const close = document.createElement('button');
    close.className = 'ingenia-close-btn';
    close.innerHTML = '&times;';
    close.onclick = () => overlay.remove();
    header.appendChild(close);

    // Body
    const body = document.createElement('div');
    body.className = 'ingenia-modal-body';
    body.innerText = text;

    // Footer
    const footer = document.createElement('div');
    footer.className = 'ingenia-modal-footer';

    if (actions.length === 0) actions.push({ label: 'Cerrar' });

    actions.forEach(act => {
        const btn = document.createElement('button');
        btn.className = act.primary ? 'ingenia-primary-btn' : 'ingenia-secondary-btn';
        btn.textContent = act.label;
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
