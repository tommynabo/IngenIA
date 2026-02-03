// --- Constants ---
const OBSERVER_TARGET = document.body;

// 1. Post Selectors (Broader for 2026)
const POST_SELECTOR = '.feed-shared-update-v2, article, [data-urn]';
// Priority 1: The counts bar (Likes/Comments text)
const DETAILS_SELECTOR = '.social-details-social-counts, .feed-shared-social-counts, [class*="social-counts"]';
// Priority 2: The action bar (Like/Comment buttons)
const ACTION_BAR_SELECTOR = '.feed-shared-social-action-bar, [class*="social-action-bar"]';

const TEXT_SELECTOR = '.feed-shared-update-v2__description, .update-components-text, .feed-shared-text-view, [class*="update-components-text"]';
const AUTHOR_SELECTOR = '.update-components-actor__name, .feed-shared-actor__name, [class*="actor__name"]';

// --- Comment Selectors ---
const COMMENT_SELECTOR = '.comments-comment-item, .feed-shared-comment-item, [class*="comments-comment"]';
const COMMENT_TEXT_SELECTOR = '.comments-comment-item__main-content, [class*="comment-item__main-content"], [class*="comment-text"]';
const COMMENT_AUTHOR_SELECTOR = '.comments-post-meta__name-text, [class*="comment-meta__description"]';

// --- State ---
const INJECTED_ATTR = 'data-ingenia-injected';
const PROCESSED_PENCILS = new WeakSet();

// --- Observer ---
const observer = new MutationObserver((mutations) => {
    // Run if nodes added
    scanAndInject();
});

observer.observe(OBSERVER_TARGET, { childList: true, subtree: true });

// Initial scan
// Run immediately and then a few times to catch lazy loading
scanAndInject();
setTimeout(scanAndInject, 1000);
setTimeout(scanAndInject, 3000);
setInterval(scanAndInject, 2000);

function scanAndInject() {
    // ---------------------------------------------------------
    // 1. Post Buttons (Recovered Logic)
    // ---------------------------------------------------------
    const posts = document.querySelectorAll(POST_SELECTOR);
    posts.forEach(post => {
        // Prevent duplicates on this post
        if (post.hasAttribute(INJECTED_ATTR)) return;

        // SKIP if this "post" is actually just a comment acting like a post
        if (post.closest(COMMENT_SELECTOR)) return;

        // Try to find target container
        let targetContainer = post.querySelector(DETAILS_SELECTOR);
        if (!targetContainer) {
            targetContainer = post.querySelector(ACTION_BAR_SELECTOR);
        }

        if (targetContainer) {
            // Double check duplication inside container
            if (!targetContainer.querySelector('.ingenia-btn-container-small')) {
                injectButtons(targetContainer, post);
            }
            // Mark as done
            post.setAttribute(INJECTED_ATTR, 'true');
        }
    });

    // ---------------------------------------------------------
    // 2. Reply Buttons (Text Search Logic)
    // ---------------------------------------------------------
    // Narrow search to avoid performance hit, but cover all "buttons"
    const candidates = document.querySelectorAll('button, span[role="button"]');

    candidates.forEach(btn => {
        if (PROCESSED_PENCILS.has(btn)) return;

        const text = (btn.innerText || "").toLowerCase().trim();
        const label = (btn.getAttribute('aria-label') || "").toLowerCase();

        // Check if it's a "Reply" button
        const isReply = text === 'responder' || text === 'reply' ||
            label.includes('responder a') || label.includes('reply to');

        if (isReply) {
            // Must be inside a comment
            const commentContext = btn.closest(COMMENT_SELECTOR);
            if (!commentContext) return;

            // Prevent multiple pencils in same area
            if (btn.parentNode.querySelector('.ingenia-btn-mini') ||
                (btn.nextElementSibling && btn.nextElementSibling.classList.contains('ingenia-btn-mini'))) {
                PROCESSED_PENCILS.add(btn);
                return;
            }

            injectReplyButtonDirectly(btn, commentContext);
            PROCESSED_PENCILS.add(btn);
        }
    });
}

function injectReplyButtonDirectly(referenceBtn, commentContext) {
    // Create mini pencil button
    const iaBtn = createButton('✏️', '', () => handleAction(commentContext, 'reply', iaBtn));
    iaBtn.className = 'ingenia-btn-mini';
    iaBtn.title = "Generar respuesta con IA";
    iaBtn.style.cssText = 'cursor:pointer; margin-left:8px; font-size:16px; vertical-align:middle;';

    // Inject AFTER the Responder button
    // Check if parent is flex, if so just append, otherwise insert after
    if (referenceBtn.parentNode) {
        referenceBtn.parentNode.insertBefore(iaBtn, referenceBtn.nextSibling);
    }
}

function injectButtons(container, postElement) {
    const btnContainer = document.createElement('div');
    btnContainer.className = 'ingenia-btn-container-small';
    // Style to ensure it sits nicely inline
    btnContainer.style.cssText = 'display:inline-flex; gap:8px; margin-left:12px; align-items:center; vertical-align:middle;';

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

    // Inline styles for reliability
    if (text !== '') {
        btn.style.cssText = `
            background-color: #0a66c2;
            color: white;
            border: none;
            border-radius: 16px;
            padding: 5px 12px;
            font-weight: 600;
            cursor: pointer;
            font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto;
            font-size: 14px;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            transition: background 0.2s;
        `;
        btn.onmouseover = () => btn.style.backgroundColor = '#004182';
        btn.onmouseout = () => btn.style.backgroundColor = '#0a66c2';
    } else {
        // Pencil style handled in inject func or here
        btn.style.background = 'transparent';
        btn.style.border = 'none';
        btn.style.padding = '0';
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
    // 0. Chrome API Check
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
        alert('⚠️ Extensión desconectada. Recarga la página.');
        return;
    }

    // 1. Get License Key
    let licenseKey;
    try {
        const store = await chrome.storage.sync.get(['licenseKey']);
        licenseKey = store.licenseKey;
    } catch (err) {
        alert("⚠️ Error accediendo a la licencia. Recarga la página.");
        return;
    }

    if (!licenseKey) {
        alert('⚠️ Falta la Clave de Licencia. Abre la extensión para configurarla.');
        return;
    }

    // 2. Get Text & Author
    let textSel = TEXT_SELECTOR;
    let authSel = AUTHOR_SELECTOR;

    if (type === 'reply') {
        textSel = COMMENT_TEXT_SELECTOR;
        authSel = COMMENT_AUTHOR_SELECTOR;
    }

    // Finding Text Strategy
    let postText = "";

    // Strategy A: Direct selector
    let textNode = postElement.querySelector(textSel);

    // Strategy B: If not found, look for general text blocks
    if (!textNode) {
        if (type === 'reply') {
            // Often comment text is just in a span dir="ltr"
            textNode = postElement.querySelector('span[dir="ltr"]');
        } else {
            // Post text
            textNode = postElement.querySelector('.feed-shared-update-v2__description-wrapper');
        }
    }

    // Strategy C: Clone and strip (Robust)
    if (textNode) {
        postText = textNode.innerText.trim();
    } else {
        // Fallback: Clone element, remove buttons/comments, get text
        const clone = postElement.cloneNode(true);
        // Remove Action bars, Existing comments, etc from clone to avoid noise
        clone.querySelectorAll('button, .video-player, .comments-comment-list, .feed-shared-social-action-bar').forEach(e => e.remove());
        // Clean text
        postText = clone.innerText.replace(/\s+/g, ' ').trim();
    }

    if (!postText || postText.length < 3) {
        alert('⚠️ No pude leer el texto (post vacío o imagen).');
        return;
    }

    // 3. Get Author
    const authorNode = postElement.querySelector(authSel) ||
        postElement.querySelector('.update-components-actor__title') ||
        postElement.querySelector('.feed-shared-actor__name');

    let authorName = "el autor";
    if (authorNode) {
        // Clean up "View profile" hidden text
        authorName = authorNode.innerText.split('\n')[0].trim();
    }

    // 4. Prepare Prompt
    let prompt;
    if (type === 'summarize') {
        prompt = `Resume esto brevemente en español con puntos clave. Autor: ${authorName}.\n\nTexto: ${postText}`;
    } else if (type === 'reply') {
        prompt = `CONTEXTO: Respuesta a comentario de LinkedIn de "${authorName}".\nCOMENTARIO: "${postText}"\n\nINSTRUCCIÓN: Genera una respuesta breve, amable y profesional (max 2 oraciones). Puedes mencionar a @${authorName}.`;
    } else { // Comment
        prompt = `CONTEXTO: Comentario para un post de LinkedIn de "${authorName}".\nPOST: "${postText}"\n\nINSTRUCCIÓN: Genera un comentario profesional, perspicaz y breve (max 2 oraciones).`;
    }

    // 5. UI Loading
    const originalHTML = button.innerHTML;
    button.innerText = '...';
    button.disabled = true;

    // 6. Send Message
    try {
        const response = await sendMessageToBackground({
            action: 'generate_comment',
            licenseKey: licenseKey,
            prompt: prompt
        });

        if (response.success) {
            showModalResult(type, response.result, postElement, button);
        } else {
            throw new Error(response.error || "Error desconocido");
        }
    } catch (err) {
        console.error(err);
        alert('Error: ' + err.message);
    } finally {
        button.innerHTML = originalHTML;
        button.disabled = false;
    }
}

function sendMessageToBackground(payload) {
    return new Promise((resolve, reject) => {
        try {
            chrome.runtime.sendMessage(payload, (response) => {
                if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
                resolve(response);
            });
        } catch (e) {
            reject(new Error("Contexto invalidado. Recarga la página."));
        }
    });
}

// --- Results UI ---
function showModalResult(type, text, contextEl, triggerBtn) {
    // Simply use alert/confirm for simplicity if user wants pure backup, 
    // BUT backup had a modal. Let's use the nice modal logic but inline to be safe.

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; z-index:99999; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center;';

    const modal = document.createElement('div');
    modal.style.cssText = 'background:white; width:500px; max-width:90%; padding:20px; border-radius:8px; box-shadow:0 4px 15px rgba(0,0,0,0.2); font-family:sans-serif;';

    modal.innerHTML = `
        <h3 style="margin-top:0; color:#0a66c2;">Resultado (${type === 'summarize' ? 'Resumen' : 'Generado'})</h3>
        <textarea style="width:100%; height:120px; padding:8px; margin:10px 0; border:1px solid #ccc; border-radius:4px; font-family:inherit;">${text}</textarea>
        <div style="display:flex; justify-content:flex-end; gap:10px;">
            <button id="btn-copy" style="padding:6px 12px; border:1px solid #0a66c2; color:#0a66c2; background:white; border-radius:4px; cursor:pointer;">Copiar</button>
            ${type !== 'summarize' ? '<button id="btn-insert" style="padding:6px 12px; border:none; background:#0a66c2; color:white; border-radius:4px; cursor:pointer;">Insertar</button>' : ''}
            <button id="btn-close" style="padding:6px 12px; border:none; background:#eee; border-radius:4px; cursor:pointer;">Cerrar</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const close = () => overlay.remove();

    modal.querySelector('#btn-close').onclick = close;

    modal.querySelector('#btn-copy').onclick = () => {
        navigator.clipboard.writeText(text);
        modal.querySelector('#btn-copy').innerText = "Copiado!";
    };

    const btnInsert = modal.querySelector('#btn-insert');
    if (btnInsert) {
        btnInsert.onclick = () => {
            insertTextIntoEditor(contextEl, text);
            close();
        };
    }
}

function insertTextIntoEditor(contextEl, text) {
    // 1. Try to find open editor in context
    let editor = contextEl.querySelector('.ql-editor') ||
        contextEl.querySelector('[contenteditable="true"]');

    // 2. If no editor, try clicking Reply/Comment button to open it
    if (!editor) {
        // Try finding "Responder" button to open reply box
        const replyBtn = Array.from(contextEl.querySelectorAll('button')).find(b => {
            const t = (b.innerText || '').toLowerCase();
            return t.includes('responder') || t.includes('reply');
        });
        if (replyBtn) {
            replyBtn.click();
            // Wait briefly for editor to appear
            setTimeout(() => {
                const freshEditor = contextEl.querySelector('[contenteditable="true"]') || document.activeElement;
                if (freshEditor && freshEditor.isContentEditable) {
                    writeToField(freshEditor, text);
                } else {
                    alert("No encontré el campo de texto. El texto ha sido copiado al portapapeles.");
                    navigator.clipboard.writeText(text);
                }
            }, 500);
            return;
        }
    }

    if (editor) {
        writeToField(editor, text);
    } else {
        alert("Texto copiado al portapapeles.");
        navigator.clipboard.writeText(text);
    }
}

function writeToField(element, text) {
    element.focus();
    // Simulate user typing for React/Frameworks
    document.execCommand('insertText', false, text);
    element.dispatchEvent(new Event('input', { bubbles: true }));
}
